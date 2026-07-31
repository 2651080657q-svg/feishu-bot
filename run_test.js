const fetch = require('node-fetch');
async function test() {
  const res = await fetch('https://feishu-bot-seven-nu.vercel.app/api/test-ds', {
    method: 'GET'
  });
  console.log(await res.text());
}
test();
