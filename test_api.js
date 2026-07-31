const fetch = require('node-fetch');
async function test() {
  const res = await fetch('https://feishu-bot-seven-nu.vercel.app/api/deepseek', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: "intent",
      text: "我搭建数据平台已完成，摄影课情商课已完成，定时复习计划已完成",
      currentTasks: [
        {name: "搭建自己的数据平台 (豆包提取文案)", status: "未完成"},
        {name: "银行题刷 2-3 小时左右", status: "未完成"},
        {name: "摄影课情商课每天看一点", status: "未完成"},
        {name: "定时复习预习做计划捡起遗忘知识", status: "未完成"}
      ]
    })
  });
  console.log(await res.text());
}
test();
