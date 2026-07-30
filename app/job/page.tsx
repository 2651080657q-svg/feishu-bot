"use client";

import { useState } from "react";

export default function JobRoom() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    
    try {
      const res = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "interview", text: input })
      });
      const data = await res.json();
      setResult(data.solution || data.result || "分析完成");
    } catch (e) {
      setResult("分析失败，请检查网络或 API Key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header" style={{ textAlign: "left" }}>
        <h1>秋招战情室</h1>
        <p>面试复盘与投递追踪</p>
      </header>

      <main className="glass-panel">
        <h3 style={{ marginBottom: "16px", color: "var(--accent)" }}>AI 面试复盘助手</h3>
        <textarea 
          placeholder="在此粘贴面试的录音转写文本，AI 将自动分析卡壳点和逻辑弱点..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          className="btn-primary" 
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
        >
          {loading ? "深度分析中..." : "开始复盘"}
        </button>
      </main>

      {loading && (
        <div className="loader">
          <div className="dot"></div><div className="dot"></div><div className="dot"></div>
        </div>
      )}

      {result && !loading && (
        <div className="glass-panel result-card">
          <div className="result-section">
            <h3>分析结论</h3>
            <p>{result}</p>
          </div>
        </div>
      )}
    </div>
  );
}
