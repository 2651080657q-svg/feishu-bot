const lark = require('@larksuiteoapi/node-sdk');
const client = new lark.Client({
  appId: 'cli_aae046b9b3789bb3',
  appSecret: 'Px9VXNJ8y87qrXwPQYVaFfPDzUJ7ffaZ',
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});
async function main() {
  const target = '搭建自己的数据平台（豆包提取文案）';
  const senderOpenId = 'ou_xxxx';
  const nowTs = Date.now();
  const res = await client.bitable.appTableRecord.create({
    path: { app_token: 'X5xxbly88ayzz1sxPDPcJ3Eunze', table_id: 'tblPdai5I8CYlSvf' },
    data: { fields: { 'Content': `✅ [任务完成] ${target} - ${senderOpenId}`, 'CreatedAt': nowTs } }
  });
  console.log(JSON.stringify(res, null, 2));
}
main();
