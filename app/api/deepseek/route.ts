import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, text, question, reportData, currentTasks } = body;
    const inputContent = text || question;

    const apiKey = process.env.DEEPSEEK_API_KEY;
    
    // Mock Response
    if (!apiKey || apiKey === "your_deepseek_api_key_here") {
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (type === "report") {
        return NextResponse.json({ 
          result: "【Mock 分析报告】\n\n📊 **完成概况**\n今日整体完成率尚可，但在规划落实上存在一些折扣。\n\n💡 **未完成原因剖析**\n关于未完成任务的理由，暴露出时间管理上的短板，建议调整优先级排期。\n\n🚀 **明日/下周建议**\n1. 将最耗精力的硬骨头放在精力最充沛的时段。\n2. 保持对学习的定力，减少碎片信息的干扰。"
        });
      } else if (type === "interview") {
        return NextResponse.json({ 
          result: "【Mock 分析结果】\n1. 核心卡壳点：在回答 React 原理时逻辑不连贯。\n2. 优化建议：系统学习虚拟 DOM 和 Diff 算法。\n3. 表达优化：减少口语化词汇。"
        });
      } else if (type === "info") {
        return NextResponse.json({ 
          result: "【Mock 提取结果】\n今日核心：\n1. OpenAI 发布新模型。\n2. AI 将进一步改变生产力工具形态。"
        });
      } else if (type === "intent") {
        // Mock fallback for intent
        let action = "unknown";
        if (inputContent.includes("做完") || inputContent.includes("完成") || inputContent.includes("去了")) action = "complete_task";
        else if (inputContent.includes("去趟") || inputContent.includes("帮我加")) action = "add_chore";
        
        return NextResponse.json({ 
          action: action,
          targets: [inputContent],
          reply: `好的，已记录（Mock）`
        });
      } else {
        return NextResponse.json({ 
          solution: "【Mock 解析】这道题考察的是逻辑推理。选 C。",
          similar_questions: ["如果 B 推导 C，选什么？", "一道类似的数学题。"]
        });
      }
    }

    // Real API Call
    let systemPrompt = "你是一个智能助手。";
    let userPrompt = inputContent;

    if (type === "intent") {
      const taskListStr = (currentTasks || []).map((t: any) => `- ${t.name} (状态: ${t.status})`).join('\n') || "当前没有任务记录";
      
      systemPrompt = `你是一个个人任务助理兼AI大管家。
主人的多维表格中当前已有的任务清单如下：
${taskListStr}

用户会对你说一句话，你需要解析出他们的意图，并严格返回以下 JSON 格式：
{
  "action": "complete_task" | "add_chore" | "delete_chore" | "record_idea" | "record_expense" | "summarize_knowledge" | "record_mood" | "set_reminder" | "chat",
  "targets": ["任务1", "任务2"],
  "reply": "你作为贴心、智能的AI大管家对用户说的回复"
}
如果用户说“今天跑完了步”、“完成了xx”、“xx已完成”、“做完了”，强制设置 action 为 complete_task，无论提及了多少个任务！
如果用户说“今天要去拿快递”、“帮我加个杂活写邮件”，action为add_chore。
如果用户说“不去了”、“删掉xx杂活”，action为delete_chore。
如果用户说“记住这个灵感”、“帮我记一下：xxx”、“有个好主意：xxx”，action为record_idea，同时将灵感内容完整放到 targets 中。
如果用户说“花了XX钱”、“午饭吃海底捞200”，action为record_expense，将“分类 - 金额 - 描述”放到 targets 中（如“餐饮 - 200元 - 午饭吃海底捞”）。
如果用户转发文章链接，或者说“帮我总结一下”，action为summarize_knowledge，将知识的总结和提炼放到 targets 中。
如果用户说“今天好累”、“气死我了”、“心情不错”，action为record_mood，将“情绪标签 - 具体事件”放到 targets 中（如“烦躁 - 今天被领导骂了”），并在 reply 中给予高情商的安慰或互动。
如果用户说“提醒我下周去打针”、“记住后天买花”，action为set_reminder，将“时间 - 事件”放到 targets 中（如“下周三 - 妈妈生日”）。
如果用户问问题、闲聊、询问当前还有什么任务，或者让你出主意，action为chat。

非常重要的规则：
1. 如果用户的意图是修改、完成或删除任务（complete_task, delete_chore），你必须极尽所能从用户的简写中推断出对应的【已有任务清单】里的原名！并将该任务的【最完整原名】放入 targets。如果用户一次性完成了多个，请将它们的原名都放入 targets 数组！绝对不能返回空数组 []，只要用户提到了完成，就必须找出最接近的任务放入 targets！
2. 对于 record_idea / record_expense / summarize_knowledge / record_mood / set_reminder 这五类，你必须提取用户的核心内容并按照格式放到 targets 数组的第一个元素中。
3. 如果用户的意图是查询任务（比如“还有哪些没完成”），使用 action="chat"，并在 reply 中直接根据【已有任务清单】告诉他们！
4. targets 必须是一个字符串数组。
5. 请在 reply 字段中直接给出符合你管家身份的完整回答。`;
      userPrompt = inputContent;
    } else if (type === "report") {
      const isWeekly = body.reportType === "weekly";
      if (isWeekly) {
        systemPrompt = "你是一个专业的个人成长与效率管理教练。用户将提供过去几天的【历史日报】和【执行日志】。请根据这些长期数据，生成一份结构化、有深度的【AI 周计划分析报告】。你需要总结本周的核心亮点、暴露出的结构性问题（如哪些任务频繁未完成），并给出下周的系统性调整建议。";
        userPrompt = `以下是本周执行数据：\n${JSON.stringify(reportData, null, 2)}`;
      } else {
        systemPrompt = "你是一个全能的个人管家和效率教练。用户会提供今天的任务清单以及所有活动的日志（包括记账💰、知识📚、情绪💖、提醒⏰和任务完成✅）。请生成一份精美、结构化的【AI 每日复盘与财务报告】。内容应包含：1. 今日任务概览 2. 财务记账小计（加总金额） 3. 情绪波动关心 4. 知识沉淀总结 5. 近期提醒（如果有）。排版要清晰美观，语气贴心。";
        userPrompt = `以下是今日执行数据：\n${JSON.stringify(reportData, null, 2)}`;
      }
    } else if (type === "interview") {
      systemPrompt = "你是一个资深面试官。请分析面试复盘文本，指出表达卡壳点并给出优化建议。";
    } else if (type === "info") {
      systemPrompt = "你是一个资讯提取专家。请提取核心观点，要求简明扼要。";
    } else {
      systemPrompt = "你是一个行测和银行考试私教。请给出错题解析，并提供 3 道举一反三题目。返回 JSON，包含 'solution' (string) 和 'similar_questions' (string[])。";
    }

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: (type === "interview" || type === "info" || type === "report") ? { type: "text" } : { type: "json_object" }
      })
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    const content = data.choices[0].message.content;

    if (type === "interview" || type === "info" || type === "report") {
      return NextResponse.json({ result: content });
    } else {
      return NextResponse.json(JSON.parse(content));
    }
    
  } catch (error) {
    console.error("DeepSeek API Error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
