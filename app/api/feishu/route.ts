import { NextResponse } from 'next/server';
import * as lark from '@larksuiteoapi/node-sdk';

const client = new lark.Client({
  appId: process.env.LARK_APP_ID || '',
  appSecret: process.env.LARK_APP_SECRET || '',
  appType: lark.AppType.SelfBuild,
  domain: lark.Domain.Feishu,
});

const APP_TOKEN = process.env.LARK_APP_TOKEN || '';

const TABLE_NAMES = {
  TASKS: 'Tasks',
  CHORES: 'Chores',
  LOGS: 'Logs',
  REPORTS: 'Reports'
};

async function getTableId(name: string) {
  const res = await client.bitable.appTable.list({ path: { app_token: APP_TOKEN } });
  const table = res.data?.items?.find(t => t.name === name);
  return table?.table_id;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'get_all') {
      const taskTableId = await getTableId(TABLE_NAMES.TASKS);
      const choresTableId = await getTableId(TABLE_NAMES.CHORES);
      const logsTableId = await getTableId(TABLE_NAMES.LOGS);
      const reportsTableId = await getTableId(TABLE_NAMES.REPORTS);

      const [tasksRes, choresRes, logsRes, reportsRes] = await Promise.all([
        client.bitable.appTableRecord.list({ path: { app_token: APP_TOKEN, table_id: taskTableId! } }),
        client.bitable.appTableRecord.list({ path: { app_token: APP_TOKEN, table_id: choresTableId! } }),
        client.bitable.appTableRecord.list({ path: { app_token: APP_TOKEN, table_id: logsTableId! } }),
        client.bitable.appTableRecord.list({ path: { app_token: APP_TOKEN, table_id: reportsTableId! } })
      ]);

      const mapRecords = (res: any) => res.data?.items?.map((item: any) => ({ record_id: item.record_id, ...item.fields })) || [];

      return NextResponse.json({
        tasks: mapRecords(tasksRes),
        chores: mapRecords(choresRes),
        logs: mapRecords(logsRes),
        reports: mapRecords(reportsRes)
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Feishu GET Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, table, records, record_id, fields } = body;

    const tableId = await getTableId(table);
    if (!tableId) throw new Error(`Table ${table} not found`);

    if (action === 'add') {
      const res = await client.bitable.appTableRecord.create({
        path: { app_token: APP_TOKEN, table_id: tableId },
        data: { fields }
      });
      return NextResponse.json({ success: true, data: res.data });
    } 
    
    if (action === 'batch_add') {
      const res = await client.bitable.appTableRecord.batchCreate({
        path: { app_token: APP_TOKEN, table_id: tableId },
        data: { records: records.map((f: any) => ({ fields: f })) }
      });
      return NextResponse.json({ success: true, data: res.data });
    }

    if (action === 'update') {
      const res = await client.bitable.appTableRecord.update({
        path: { app_token: APP_TOKEN, table_id: tableId, record_id },
        data: { fields }
      });
      return NextResponse.json({ success: true, data: res.data });
    }
    
    if (action === 'delete') {
      const res = await client.bitable.appTableRecord.delete({
        path: { app_token: APP_TOKEN, table_id: tableId, record_id }
      });
      return NextResponse.json({ success: true, data: res.data });
    }

    if (action === 'batch_delete') {
      const res = await client.bitable.appTableRecord.batchDelete({
        path: { app_token: APP_TOKEN, table_id: tableId },
        data: { records: records } // records is array of record_ids
      });
      return NextResponse.json({ success: true, data: res.data });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Feishu POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
