import { NextResponse } from 'next/server';
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID || '',
  appSecret: process.env.LARK_APP_SECRET || '',
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. 处理飞书 URL 验证
    if (body.type === 'url_verification') {
      return NextResponse.json({ challenge: body.challenge });
    }

    // 2. 处理消息事件
    if (body.header?.event_type === 'im.message.receive_v1') {
      const event = body.event;
      const message = event.message;
      
      // 只处理文本消息
      if (message.message_type === 'text') {
        const contentObj = JSON.parse(message.content);
        let text = contentObj.text || '';
        text = text.replace(/@_user_[^\s]+/g, '').trim();

        if (text) {
          console.log(`[Feishu Webhook] Received message: ${text}`);
          
          const protocol = request.headers.get('x-forwarded-proto') || 'http';
          const host = request.headers.get('host');
          const deepseekUrl = `${protocol}://${host}/api/deepseek`;

          const BITABLE_APP_TOKEN = 'X5xxbly88ayzz1sxPDPcJ3Eunze';
          const BITABLE_TABLE_ID = 'tblpyoNQij8s7osz';

          // 直接 await 处理，因为目前处理速度很快（<3秒），不需要用 after 导致 Vercel 吞任务
          await processMessageAsync(text, message.message_id, deepseekUrl, BITABLE_APP_TOKEN, BITABLE_TABLE_ID).catch(err => {
            console.error('[Feishu Webhook] Async processing error:', err);
          });
        }
      }
    }

    return NextResponse.json({ code: 0, msg: "success" });
  } catch (error: any) {
    console.error("Feishu Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 异步处理大模型解析和数据入库
async function processMessageAsync(text: string, messageId: string, deepseekUrl: string, bitableAppToken: string, bitableTableId: string) {
  try {
    // 0. 提前拉取当前任务列表，作为上下文喂给大模型
    let currentTasks: any[] = [];
    try {
      const listRes = await client.bitable.appTableRecord.list({
        path: { app_token: bitableAppToken, table_id: bitableTableId },
        params: { page_size: 500 }
      });
      currentTasks = (listRes.data?.items || []).map((item: any) => ({
        name: item.fields.TaskName,
        status: item.fields.Status
      }));
    } catch(err) {
      console.error("Failed to fetch bitable records before deepseek", err);
    }

    // 1. 调用本地大模型 API 解析意图
    const res = await fetch(deepseekUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'intent', text: text, currentTasks: currentTasks })
    });
    
    const parsedData = await res.json();
    let replyText = parsedData.reply || "我没太明白你的意思，可以说得再具体一点吗？";

    if (parsedData.action && parsedData.action !== 'chat' && parsedData.action !== 'unknown') {
      const targets = parsedData.targets || [];
      for (const target of targets) {
        if (!target) continue;
        
        if (parsedData.action === 'add_chore') {
           await client.bitable.appTableRecord.create({
             path: { app_token: bitableAppToken, table_id: bitableTableId },
             data: { fields: { "TaskName": target, "Status": "未完成" } }
           });
        } else if (parsedData.action === 'complete_task') {
           const listRes = await client.bitable.appTableRecord.list({
             path: { app_token: bitableAppToken, table_id: bitableTableId },
             params: { page_size: 500 }
           });
           const records = listRes.data?.items || [];
           const existing = records.find(r => r.fields.TaskName === target);
           
           if (existing) {
              await client.bitable.appTableRecord.update({
                 path: { app_token: bitableAppToken, table_id: bitableTableId, record_id: existing.record_id },
                 data: { fields: { "Status": "已完成" } }
              });
           } else {
              await client.bitable.appTableRecord.create({
                 path: { app_token: bitableAppToken, table_id: bitableTableId },
                 data: { fields: { "TaskName": target, "Status": "已完成" } }
              });
           }
        } else if (parsedData.action === 'delete_chore') {
           const listRes = await client.bitable.appTableRecord.list({
             path: { app_token: bitableAppToken, table_id: bitableTableId },
             params: { page_size: 500 }
           });
           const records = listRes.data?.items || [];
           const existing = records.find(r => r.fields.TaskName === target);
           
           if (existing) {
              await client.bitable.appTableRecord.delete({
                 path: { app_token: bitableAppToken, table_id: bitableTableId, record_id: existing.record_id }
              });
           }
        }
      }
    }

    // 2. 回复用户
    await client.im.message.reply({
      path: { message_id: messageId },
      data: {
        content: JSON.stringify({ text: replyText }),
        msg_type: 'text'
      }
    });

  } catch (err) {
    console.error("Error in processMessageAsync:", err);
    await client.im.message.reply({
      path: { message_id: messageId },
      data: {
        content: JSON.stringify({ text: "哎呀，处理消息的时候报错了，请检查后端日志。" }),
        msg_type: 'text'
      }
    });
  }
}
