"use client";

import { useState, useEffect } from "react";

const INITIAL_TASKS = [
  { text: "搭建自己的数据平台（豆包提取文案）", done: false, reason: "" },
  { text: "aihot 每日必看", done: false, reason: "" },
  { text: "银行题刷 2-3 小时左右", done: false, reason: "" },
  { text: "摄影课情商课，每天看一点", done: false, reason: "" },
  { text: "看《失控》，一定要有定力", done: false, reason: "" },
  { text: "定时复习预习做计划，捡起遗忘知识", done: false, reason: "" },
  { text: "运维和大模型架构师的知识学习", done: false, reason: "" },
  { text: "正式开始总结秋招和投简历，接入记录", done: false, reason: "" },
];

export default function Dashboard() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [logs, setLogs] = useState<{record_id: string, content: string}[]>([]);
  const [tasks, setTasks] = useState<{record_id: string, id: number, text: string, done: boolean, reason: string}[]>([]);
  const [fitnessTask, setFitnessTask] = useState({ done: false, reason: "" });
  
  const [chores, setChores] = useState<{record_id: string, id: number, text: string, done: boolean, reason: string}[]>([]);
  const [newChoreText, setNewChoreText] = useState("");

  const [showReportPanel, setShowReportPanel] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reports, setReports] = useState<{record_id: string, date: string, type?: string, content: string}[]>([]);
  const [reportType, setReportType] = useState<"daily" | "weekly">("daily");

  const syncLog = async (text: string) => {
    const res = await fetch("/api/feishu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        action: "add", 
        table: "Logs", 
        fields: { Content: text, CreatedAt: new Date().getTime() } 
      })
    });
    const json = await res.json();
    return json?.data?.record?.record_id;
  };

  const addLog = async (text: string, isDone: boolean) => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    const logContent = `[${m}-${d} ${timeStr}] ${isDone ? '✅ 完成了' : '🔄 撤销了'}：${text}`;
    
    // Optimistic UI
    const tempLog = { record_id: Date.now().toString(), content: logContent };
    setLogs(prev => [tempLog, ...prev]);
    
    const record_id = await syncLog(logContent);
    if (record_id) {
      setLogs(prev => prev.map(l => l.record_id === tempLog.record_id ? { ...l, record_id } : l));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/feishu?action=get_all");
        const data = await res.json();
        
        let loadedTasks = data.tasks?.map((t: any, i: number) => ({
          record_id: t.record_id,
          id: i,
          text: t.TaskName,
          done: t.Status === '已完成',
          reason: t.Reason || ''
        })) || [];

        // If tasks are empty (first run), populate them
        if (loadedTasks.length === 0) {
          const records = INITIAL_TASKS.map(t => ({
            TaskName: t.text,
            Status: t.done ? '已完成' : '未完成',
            Reason: t.reason
          }));
          await fetch('/api/feishu', { 
            method: 'POST', 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: 'batch_add', table: 'Tasks', records }) 
          });
          // re-fetch tasks
          const res2 = await fetch("/api/feishu?action=get_all");
          const data2 = await res2.json();
          loadedTasks = data2.tasks?.map((t: any, i: number) => ({
            record_id: t.record_id,
            id: i,
            text: t.TaskName,
            done: t.Status === '已完成',
            reason: t.Reason || ''
          })) || [];
        }
        setTasks(loadedTasks);

        setChores(data.chores?.map((c: any, i: number) => ({
          record_id: c.record_id,
          id: i,
          text: c.ChoreName,
          done: c.Status === '已完成',
          reason: c.Reason || ''
        })) || []);

        setLogs(data.logs?.sort((a: any, b: any) => (b.CreatedAt || 0) - (a.CreatedAt || 0))?.map((l: any) => ({
          record_id: l.record_id,
          content: l.Content
        })) || []);

        setReports(data.reports?.map((r: any) => ({
          record_id: r.record_id,
          date: r.Date,
          type: r.Type,
          content: r.Content
        })).reverse() || []); // reverse for newest first assuming appended

      } catch (err) {
        console.error("Failed to load from Feishu", err);
      }

      setDayOfWeek(new Date().getDay());
      setIsLoaded(true);
    };

    fetchData();
  }, []);

  const getFitnessPlan = (day: number) => {
    switch(day) {
      case 1: return "胸 + 三头";
      case 2: return "肩 + 前中后束";
      case 3: return "背 + 二头 (有氧提上日程)";
      case 4: return "胸 + 三头";
      case 5: return "肩 + 前中后束";
      case 6: return "背 + 二头 & 带练 1-2 组腿";
      case 0: return "休息，出去玩！🎉";
      default: return "";
    }
  };

  const isRestDay = dayOfWeek === 0;

  const toggleTask = async (id: number, record_id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const newStatus = !task.done;
    
    // Optimistic UI
    setTasks(tasks.map(t => t.id === id ? { ...t, done: newStatus } : t));
    addLog(task.text, newStatus);

    await fetch("/api/feishu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", table: "Tasks", record_id, fields: { Status: newStatus ? '已完成' : '未完成' } })
    });
  };

  const toggleFitness = () => {
    // Note: Fitness task is dynamic, not in DB for now, just logging it
    const newStatus = !fitnessTask.done;
    addLog(`健身: ${getFitnessPlan(dayOfWeek)}`, newStatus);
    setFitnessTask({ ...fitnessTask, done: newStatus });
  };

  const handleAddChore = async () => {
    if (!newChoreText.trim()) return;
    const text = newChoreText;
    setNewChoreText("");
    
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    const logContent = `[${m}-${d} ${timeStr}] 📌 新增杂活：${text}`;
    
    // Optimistic UI
    const tempId = Date.now();
    const tempChore = { record_id: tempId.toString(), id: tempId, text, done: false, reason: "" };
    setChores([...chores, tempChore]);
    
    const tempLog = { record_id: Date.now().toString(), content: logContent };
    setLogs(prev => [tempLog, ...prev]);

    // Push Chore
    const res = await fetch("/api/feishu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", table: "Chores", fields: { ChoreName: text, Status: '未完成', Reason: '' } })
    });
    const json = await res.json();
    if (json?.data?.record?.record_id) {
      setChores(prev => prev.map(c => c.id === tempId ? { ...c, record_id: json.data.record.record_id } : c));
    }
    
    // Push Log
    const record_id = await syncLog(logContent);
    if (record_id) {
      setLogs(prev => prev.map(l => l.record_id === tempLog.record_id ? { ...l, record_id } : l));
    }
  };

  const toggleChore = async (id: number, record_id: string) => {
    const chore = chores.find(c => c.id === id);
    if (!chore) return;
    
    const newStatus = !chore.done;
    setChores(chores.map(c => c.id === id ? { ...c, done: newStatus } : c));
    addLog(chore.text, newStatus);

    await fetch("/api/feishu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", table: "Chores", record_id, fields: { Status: newStatus ? '已完成' : '未完成' } })
    });
  };

  const deleteChore = async (id: number, record_id: string) => {
    const target = chores.find(c => c.id === id);
    if (!target) return;

    setChores(chores.filter(c => c.id !== id));
    
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
    const logContent = `[${m}-${d} ${timeStr}] 🗑️ 删除了杂活：${target.text}`;
    
    const tempLog = { record_id: Date.now().toString(), content: logContent };
    setLogs(prev => [tempLog, ...prev]);

    await fetch("/api/feishu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", table: "Chores", record_id })
    });
    
    const log_record_id = await syncLog(logContent);
    if (log_record_id) {
      setLogs(prev => prev.map(l => l.record_id === tempLog.record_id ? { ...l, record_id: log_record_id } : l));
    }
  };

  const updateReason = async (id: number | 'fitness', record_id: string, reason: string) => {
    if (id === 'fitness') {
      setFitnessTask({ ...fitnessTask, reason });
    } else {
      setTasks(tasks.map(t => t.id === id ? { ...t, reason } : t));
      // Debounce would be better, but firing request on blur is simple
      await fetch("/api/feishu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", table: "Tasks", record_id, fields: { Reason: reason } })
      });
    }
  };

  const updateChoreReason = async (id: number, record_id: string, reason: string) => {
    setChores(chores.map(c => c.id === id ? { ...c, reason } : c));
    await fetch("/api/feishu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", table: "Chores", record_id, fields: { Reason: reason } })
    });
  };

  const allDisplayTasks = isRestDay ? [] : [
    { id: 'fitness', record_id: '', text: `🏋️ 健身打卡: ${getFitnessPlan(dayOfWeek)}`, done: fitnessTask.done, reason: fitnessTask.reason, toggle: toggleFitness },
    ...tasks.map(t => ({ id: t.id, record_id: t.record_id, text: t.text, done: t.done, reason: t.reason, toggle: () => toggleTask(t.id, t.record_id) }))
  ];

  const totalItemsCount = allDisplayTasks.length + chores.length;
  const completedItemsCount = allDisplayTasks.filter(t => t.done).length + chores.filter(c => c.done).length;
  const progress = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 100;

  const handleGenerateReport = async (type: "daily" | "weekly") => {
    setReportType(type);
    setGeneratingReport(true);
    try {
      const reportData = type === "daily" ? {
        completed: [
          ...allDisplayTasks.filter(t => t.done).map(t => t.text),
          ...chores.filter(c => c.done).map(c => c.text)
        ],
        incomplete: [
          ...allDisplayTasks.filter(t => !t.done).map(t => ({ task: t.text, reason: t.reason || "未填写原因" })),
          ...chores.filter(c => !c.done).map(c => ({ task: c.text, reason: c.reason || "未填写原因" }))
        ],
        logs: logs.slice(0, 20).map(l => l.content)
      } : {
        past_reports: reports.slice(0, 7).map(r => `【${r.date} ${r.type || '日报'}】\n${r.content}`),
        all_logs: logs.map(l => l.content)
      };

      const res = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "report", reportType: type, reportData })
      });
      const data = await res.json();
      
      const dateStr = new Date().toLocaleDateString('zh-CN');
      const typeStr = type === "daily" ? "日分析报告" : "周总结报告";
      
      const newReport = { record_id: Date.now().toString(), date: dateStr, type: typeStr, content: data.result };
      setReports(prev => [newReport, ...prev]);

      // Sync to Feishu
      const syncRes = await fetch("/api/feishu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", table: "Reports", fields: { Date: dateStr, Type: type === "daily" ? "日报" : "周报", Content: data.result } })
      });
      const syncJson = await syncRes.json();
      if (syncJson?.data?.record?.record_id) {
        setReports(prev => prev.map(r => r.record_id === newReport.record_id ? { ...r, record_id: syncJson.data.record.record_id } : r));
      }

    } catch (error) {
      alert("生成分析报告失败，请检查网络。");
    } finally {
      setGeneratingReport(false);
    }
  };

  if (!isLoaded) return <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>正从飞书多维表格云端同步数据，请稍候...</div>;

  return (
    <div className="container" style={{ maxWidth: "1200px" }}>
      <header className="header" style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1>指挥中心 <span style={{fontSize: "0.8rem", background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: "12px", verticalAlign: "middle", marginLeft: "10px"}}>⚡ 已连接飞书 Bitable</span></h1>
          <p>今日核心焦点与计划执行报告</p>
        </div>
        <button 
          onClick={() => setShowReportPanel(!showReportPanel)}
          style={{ padding: "12px 24px", background: "white", border: "1px solid var(--glass-border)", borderRadius: "12px", cursor: "pointer", fontWeight: 600, color: "var(--accent)" }}
        >
          {showReportPanel ? "返回指挥中心" : "📈 切换到分析报告"}
        </button>
      </header>

      {!showReportPanel ? (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", alignItems: "start" }}>
          
          {/* 左侧：进度与任务列表 */}
          <div>
            <div className="glass-panel" style={{ marginBottom: "24px", padding: "24px" }}>
              <h3 style={{ marginBottom: "16px", color: "var(--text-primary)", display: "flex", justifyContent: "space-between" }}>
                今日总进度
                <span style={{ fontSize: "1rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                  {isRestDay && chores.length === 0 ? "今日休息" : `已完成 ${completedItemsCount} / ${totalItemsCount}`}
                </span>
              </h3>
              
              <div style={{ background: "#f1f5f9", borderRadius: "8px", height: "12px", overflow: "hidden" }}>
                <div 
                  style={{ 
                    background: "linear-gradient(to right, var(--accent), #818cf8)", 
                    height: "100%", 
                    width: `${progress}%`,
                    transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
                  }} 
                />
              </div>
              <p style={{ marginTop: "12px", color: "var(--text-secondary)", fontSize: "0.95rem", fontWeight: 500 }}>
                {isRestDay && chores.length === 0 ? "好好享受周末！没有待办事项哦！" : `当前完成度 ${progress}%`}
              </p>
            </div>

            {!isRestDay && (
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={{ marginBottom: "16px", color: "var(--text-primary)", fontSize: "1.1rem" }}>🎯 核心定力任务</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {allDisplayTasks.map(task => (
                    <label 
                      key={task.id} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "14px",
                        padding: "16px",
                        background: task.done ? "#f8fafc" : "#ffffff",
                        border: `1px solid ${task.done ? "transparent" : "var(--glass-border)"}`,
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: task.done ? "none" : "0 1px 2px rgba(0,0,0,0.02)"
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={task.done} 
                        onChange={task.toggle} 
                        style={{ width: "22px", height: "22px", accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                      <span style={{ 
                        textDecoration: task.done ? "line-through" : "none",
                        color: task.done ? "#94a3b8" : "var(--text-primary)",
                        fontSize: "1.05rem",
                        fontWeight: task.done ? 400 : 500,
                        transition: "all 0.2s ease"
                      }}>
                        {task.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 临时杂项与碎片任务 */}
            <div className="glass-panel" style={{ padding: "24px", marginTop: "24px" }}>
              <h3 style={{ marginBottom: "16px", color: "var(--text-primary)", fontSize: "1.1rem" }}>📌 临时杂活与碎片任务</h3>
              
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <input 
                  type="text" 
                  value={newChoreText}
                  onChange={(e) => setNewChoreText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddChore()}
                  placeholder="例如：去驿站拿个快递、给xxx打个电话..."
                  style={{ flex: 1, padding: "12px 16px", borderRadius: "12px", border: "1px solid var(--glass-border)", outline: "none", background: "#f8fafc", fontSize: "1rem" }}
                />
                <button 
                  onClick={handleAddChore}
                  style={{ padding: "0 24px", background: "var(--accent)", color: "white", borderRadius: "12px", border: "none", cursor: "pointer", fontWeight: 600 }}
                >
                  添加
                </button>
              </div>

              {chores.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>今日暂无杂活，保持专注！</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {chores.map(chore => (
                    <div key={chore.id} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 16px", background: chore.done ? "#f8fafc" : "#ffffff", border: `1px solid ${chore.done ? "transparent" : "var(--glass-border)"}`, borderRadius: "12px", transition: "all 0.2s ease" }}>
                      <input 
                        type="checkbox" 
                        checked={chore.done} 
                        onChange={() => toggleChore(chore.id, chore.record_id)} 
                        style={{ width: "20px", height: "20px", accentColor: "var(--accent)", cursor: "pointer" }}
                      />
                      <span style={{ flex: 1, textDecoration: chore.done ? "line-through" : "none", color: chore.done ? "#94a3b8" : "var(--text-primary)", fontSize: "1rem" }}>
                        {chore.text}
                      </span>
                      <button 
                        onClick={() => deleteChore(chore.id, chore.record_id)} 
                        style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.9rem", padding: "4px 8px", opacity: 0.8 }}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* 右侧：日志记录板 */}
          <div className="glass-panel" style={{ padding: "24px", position: "sticky", top: "40px", height: "600px", display: "flex", flexDirection: "column" }}>
            <h3 style={{ marginBottom: "20px", color: "var(--text-primary)", borderBottom: "1px solid var(--glass-border)", paddingBottom: "12px" }}>
              📋 云端持久化日志
            </h3>
            {logs.length === 0 ? (
              <div style={{ color: "var(--text-secondary)", textAlign: "center", marginTop: "60px", fontSize: "0.95rem" }}>
                暂无动态，开始完成今天的任务吧！
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", paddingRight: "8px" }}>
                {logs.map((log) => (
                  <div key={log.record_id} style={{ 
                    fontSize: "0.9rem", 
                    color: log.content.includes('✅') ? "#10b981" : (log.content.includes('🌅') ? "var(--accent)" : "var(--text-secondary)"),
                    background: "#f8fafc",
                    padding: "10px 12px",
                    borderRadius: "8px"
                  }}>
                    {log.content}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="glass-panel" style={{ animation: "slideUp 0.4s ease" }}>
          <h2 style={{ marginBottom: "20px" }}>日/周计划 AI 分析报告</h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "30px" }}>
            在生成报告前，如果有未完成的任务，请简要说明原因，AI 教练会为你提供针对性的复盘建议。
          </p>

          <div style={{ marginBottom: "30px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", color: "var(--text-primary)" }}>未完成项及原因</h3>
            {allDisplayTasks.filter(t => !t.done).length === 0 && chores.filter(c => !c.done).length === 0 ? (
              <div style={{ padding: "16px", background: "#f0fdf4", color: "#166534", borderRadius: "12px" }}>
                🎉 太棒了，今日任务全部完成！直接生成表彰报告吧。
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {allDisplayTasks.filter(t => !t.done).map(t => (
                  <div key={t.id} style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ width: "40%", fontWeight: 500, color: "var(--text-secondary)" }}>🎯 {t.text}</div>
                    <input 
                      type="text" 
                      placeholder="未完成原因 (选填)..."
                      value={t.reason || ""}
                      onBlur={(e) => updateReason(t.id as any, t.record_id, e.target.value)}
                      onChange={(e) => setTasks(tasks.map(tt => tt.id === t.id ? { ...tt, reason: e.target.value } : tt))}
                      style={{ 
                        flex: 1, padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--glass-border)",
                        outline: "none", background: "#f8fafc"
                      }}
                    />
                  </div>
                ))}
                
                {chores.filter(c => !c.done).map(c => (
                  <div key={c.id} style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <div style={{ width: "40%", fontWeight: 500, color: "var(--text-secondary)" }}>📌 {c.text}</div>
                    <input 
                      type="text" 
                      placeholder="未完成原因 (选填)..."
                      value={c.reason || ""}
                      onBlur={(e) => updateChoreReason(c.id, c.record_id, e.target.value)}
                      onChange={(e) => setChores(chores.map(cc => cc.id === c.id ? { ...cc, reason: e.target.value } : cc))}
                      style={{ 
                        flex: 1, padding: "10px 16px", borderRadius: "8px", border: "1px solid var(--glass-border)",
                        outline: "none", background: "#f8fafc"
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "16px", marginBottom: "30px" }}>
            <button 
              className="btn-primary" 
              onClick={() => handleGenerateReport("daily")}
              disabled={generatingReport}
              style={{ width: "auto", padding: "12px 32px", marginTop: "0", flex: 1 }}
            >
              {generatingReport && reportType === "daily" ? "AI 日报分析中..." : "🚀 生成今日分析报告"}
            </button>
            <button 
              className="btn-primary" 
              onClick={() => handleGenerateReport("weekly")}
              disabled={generatingReport}
              style={{ width: "auto", padding: "12px 32px", marginTop: "0", flex: 1, background: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)", boxShadow: "0 4px 12px rgba(236, 72, 153, 0.25)" }}
            >
              {generatingReport && reportType === "weekly" ? "AI 周报分析中..." : "📆 生成本周总结报告"}
            </button>
          </div>

          {reports.length > 0 && (
            <div style={{ marginTop: "40px" }}>
              <h3 style={{ marginBottom: "20px", color: "var(--text-primary)" }}>历史报告云端归档</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {reports.map((report) => (
                  <div key={report.record_id} style={{ padding: "24px", background: "#f8fafc", borderRadius: "16px", border: "1px solid var(--glass-border)" }}>
                    <h4 style={{ marginBottom: "12px", color: "var(--accent)", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ background: report.type?.includes("周") ? "#fdf2f8" : "#e0e7ff", color: report.type?.includes("周") ? "#db2777" : "var(--accent)", padding: "4px 10px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 700 }}>
                        {report.type || "日分析报告"}
                      </span>
                      {report.date}
                    </h4>
                    <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, color: "var(--text-primary)" }}>{report.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
