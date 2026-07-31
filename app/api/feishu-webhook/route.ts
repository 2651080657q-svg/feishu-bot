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

          // 直接 await 处理，因为目前处理速度很快（<3秒），不需要用 after 导致 Vercel 吞任务
          await processMessageAsync(text, message.message_id, deepseekUrl).catch(err => {
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
async function processMessageAsync(text: string, messageId: string, deepseekUrl: string) {
  try {
    // 1. 调用本地大模型 API 解析意图
    const res = await fetch(deepseekUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'intent', text: text })
    });
    
    const parsedData = await res.json();
    console.log(`[Feishu Webhook] Parsed intent:`, parsedData);

    let replyText = "我没太明白你的意思，可以说得再具体一点吗？";

    if (parsedData.reply) {
      replyText = parsedData.reply;
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
