import { NextResponse } from 'next/server';
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID || '',
  appSecret: process.env.LARK_APP_SECRET || '',
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

export async function GET(request: Request) {
  try {
    const BITABLE_APP_TOKEN = 'X5xxbly88ayzz1sxPDPcJ3Eunze';
    const BITABLE_TABLE_ID = 'tblpyoNQij8s7osz';
    const BITABLE_LOGS_TABLE_ID = 'tblPdai5I8CYlSvf';
    const BITABLE_REPORTS_TABLE_ID = 'tblHAQdLHSzaRMJX';

    // 1. 获取所有长期任务 (Tasks)
    let currentTasks: any[] = [];
    const taskRes = await client.bitable.appTableRecord.list({
      path: { app_token: BITABLE_APP_TOKEN, table_id: BITABLE_TABLE_ID },
      params: { page_size: 500 }
    });
    currentTasks = (taskRes.data?.items || []).map((item: any) => item.fields.TaskName);

    // 2. 获取今天的 Logs
    // 由于 Bitable API 没法方便地按时间过滤，我们拉取最后 500 条并在内存过滤
    const logsRes = await client.bitable.appTableRecord.list({
      path: { app_token: BITABLE_APP_TOKEN, table_id: BITABLE_LOGS_TABLE_ID },
      params: { page_size: 500 }
    });
    const allLogs = logsRes.data?.items || [];
    
    // 获取当天的前缀，格式形如 "2026/7/31" 或 "2026-07-31" （取决于 toLocaleString 的实现，我们做个模糊匹配）
    const today = new Date();
    // 使用简单的日期比较：获取 Logs 的 CreatedAt
    const todayStrStart = today.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }).split(' ')[0]; 

    let todaysLogs: string[] = [];
    let userOpenId = '';

    allLogs.forEach((item: any) => {
      const content = item.fields.Content || '';
      const createdAt = item.fields.CreatedAt || '';
      if (createdAt.includes(todayStrStart) || createdAt.includes(today.toISOString().split('T')[0]) || createdAt.includes(`${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}`)) {
        todaysLogs.push(content);
        // 提取 open_id: ✅ [任务完成] xxx - ou_xxxx
        const match = content.match(/- (ou_[a-zA-Z0-9]+)$/);
        if (match && match[1]) {
          userOpenId = match[1];
        }
      }
    });

    if (todaysLogs.length === 0) {
      return NextResponse.json({ message: "No logs today, skipping report." });
    }

    if (!userOpenId) {
       console.error("Could not find user open_id in today's logs.");
    }

    // 3. 构建发送给 DeepSeek 的数据
    const reportData = {
      tasks: currentTasks,
      logs: todaysLogs
    };

    // 4. 调用 DeepSeek API 生成报告
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const deepseekUrl = `${protocol}://${host}/api/deepseek`;

    const dsRes = await fetch(deepseekUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'report', reportType: 'daily', reportData: reportData })
    });
    const dsJson = await dsRes.json();
    const reportContent = dsJson.result;

    // 5. 将报告存入 Reports 表
    const nowStr = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    await client.bitable.appTableRecord.create({
      path: { app_token: BITABLE_APP_TOKEN, table_id: BITABLE_REPORTS_TABLE_ID },
      data: { fields: { "Date": todayStrStart, "Type": "日报", "Content": reportContent } }
    });

    // 6. 发送飞书消息给用户
    if (userOpenId) {
       await client.im.message.create({
         params: { receive_id_type: 'open_id' },
         data: {
           receive_id: userOpenId,
           content: JSON.stringify({ text: `🌙 晚上好，主人！这是您的今日复盘报告：\n\n${reportContent}` }),
           msg_type: 'text'
         }
       });
    }

    return NextResponse.json({ success: true, report: reportContent });

  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
