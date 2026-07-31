import { NextResponse } from 'next/server';
export async function GET(request: Request) {
  try {
    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: `你是一个个人任务助理兼AI大管家。
主人的多维表格中当前已有的任务清单如下：
- 搭建自己的数据平台（豆包提取文案） (状态: 未完成)
- 银行题刷 2-3 小时左右 (状态: 未完成)
- 摄影课情商课，每天看一点 (状态: 未完成)
- 定时复习预习做计划，捡起遗忘知识 (状态: 未完成)

你需要解析出他们的意图，并严格返回以下 JSON 格式：
{
  "action": "complete_task" | "add_chore" | "delete_chore" | "record_idea" | "record_expense" | "summarize_knowledge" | "record_mood" | "set_reminder" | "chat",
  "targets": ["任务1", "任务2"],
  "reply": "你作为贴心、智能的AI大管家对用户说的回复"
}
如果用户说“今天跑完了步”、“完成了xx”，action为complete_task。
如果用户问问题、闲聊、询问当前还有什么任务，或者让你出主意，action为chat。

非常重要的规则：
1. 如果用户的意图是修改、完成或删除任务（complete_task, delete_chore），你必须结合上面的【已有任务清单】推断任务原名放入 targets。
2. targets 必须是一个字符串数组。如果不涉及需要提取目标的动作，targets 为空数组 []。` },
          { role: 'user', content: '我搭建数据平台已完成，摄影课情商课已完成，定时复习计划已完成' }
        ],
        response_format: { type: 'json_object' }
      })
    });
    const data = await dsRes.json();
    return NextResponse.json({ result: data.choices[0].message.content });
  } catch(e: any) {
    return NextResponse.json({ error: e.message });
  }
}
