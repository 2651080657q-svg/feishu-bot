require('dotenv').config({ path: '.env.local' });
const lark = require('@larksuiteoapi/node-sdk');

const appId = process.env.LARK_APP_ID || '';
const appSecret = process.env.LARK_APP_SECRET || '';

const client = new lark.Client({
  appId,
  appSecret,
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

const wsClient = new lark.WSClient({
  appId,
  appSecret,
});

const eventDispatcher = new lark.EventDispatcher({}).register({
    'im.message.receive_v1': async (data) => {
        try {
            const message = data.message;
            if (message.message_type === 'text') {
                const contentObj = JSON.parse(message.content);
                let text = contentObj.text || '';
                text = text.replace(/@_user_[^\s]+/g, '').trim();

                if (text) {
                    console.log(`[Feishu Bot] 收到消息: ${text}`);

                    const deepseekUrl = `http://localhost:3000/api/deepseek`;
                    const res = await fetch(deepseekUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'intent', text: text })
                    });
                    
                    const parsedData = await res.json();
                    console.log(`[Feishu Bot] 解析意图:`, parsedData);

                    let replyText = "我没太明白你的意思，可以说得再具体一点吗？";

                    if (parsedData.action) {
                        if (parsedData.action === 'unsupported' || parsedData.action === 'unknown') {
                            replyText = "抱歉，目前我只能处理：添加任务、标记完成、记录日志等操作哦~";
                        } else {
                            replyText = `我已理解你的意图是：[${parsedData.action}]。由于我目前是纯本地代码，这部分入库逻辑正在完善中！`;
                        }
                    }

                    await client.im.message.reply({
                        path: { message_id: message.message_id },
                        data: {
                            content: JSON.stringify({ text: replyText }),
                            msg_type: 'text'
                        }
                    });
                }
            }
        } catch (err) {
            console.error("处理消息失败:", err);
        }
        return { code: 0 };
    }
});

wsClient.start({
    eventDispatcher,
    logger: console
});

console.log("================================");
console.log("🚀 飞书长连接机器人已启动，等待消息...");
console.log("================================");
