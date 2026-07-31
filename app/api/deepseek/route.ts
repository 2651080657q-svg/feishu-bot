import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, text, question, reportData } = body;
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
  "action": "complete_task" | "add_chore" | "delete_chore" | "chat",
  "targets": ["任务1", "任务2"],
  "reply": "你作为贴心、智能的AI大管家对用户说的回复"
}
如果用户说“今天跑完了步”、“完成了xx”，action为complete_task。
如果用户说“今天要去拿快递”、“帮我加个杂活写邮件”，action为add_chore。
如果用户说“不去了”、“删掉xx杂活”，action为delete_chore。
如果用户问问题、闲聊、询问当前还有什么任务，或者让你出主意，action为chat。

非常重要的规则：
1. 如果用户的意图是修改、完成或删除任务（complete_task, delete_chore），你必须结合上面的【已有任务清单】来推断用户指的是哪个任务！并且在 targets 数组中必须输出该任务在清单里的【最完整原名】（绝对不能自己编名字或缩写）。如果用户提到的任务在清单中不存在，也要尽量找出最相关的，或者直接正常提取。
2. 如果用户的意图是查询任务（比如“我还有什么任务没做”），请使用 action="chat"，并在 reply 中直接根据【已有任务清单】告诉他们！
3. targets 必须是一个字符串数组。如果不是任务操作，targets 必须为空数组 []。
4. 请在 reply 字段中直接给出符合你管家身份的完整回答。`;
      userPrompt = inputContent;
    } else if (type === "report") {
      const isWeekly = body.reportType === "weekly";
      if (isWeekly) {
        systemPrompt = "你是一个专业的个人成长与效率管理教练。用户将提供过去几天的【历史日报】和【执行日志】。请根据这些长期数据，生成一份结构化、有深度的【AI 周计划分析报告】。你需要总结本周的核心亮点、暴露出的结构性问题（如哪些任务频繁未完成），并给出下周的系统性调整建议。";
        userPrompt = `以下是本周执行数据：\n${JSON.stringify(reportData, null, 2)}`;
      } else {
        systemPrompt = "你是一个专业的个人成长与效率管理教练。用户会提供今天的任务完成情况、未完成原因以及日志。请根据这些信息，生成一份结构化、富有洞察力且鼓励人心的【AI 日分析报告】。";
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
