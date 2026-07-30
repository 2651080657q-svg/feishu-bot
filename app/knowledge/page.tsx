"use client";

import { useState } from "react";

export default function KnowledgeBase() {
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
        body: JSON.stringify({ type: "info", text: input })
      });
      const data = await res.json();
      setResult(data.solution || data.result || "提取完成");
    } catch (e) {
      setResult("提取失败，请检查网络或 API Key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header" style={{ textAlign: "left" }}>
        <h1>知识与技能库</h1>
        <p>输入文章链接或文本，AI 自动提取核心</p>
      </header>

      <main className="glass-panel">
        <h3 style={{ marginBottom: "16px", color: "var(--accent)" }}>AI 资讯提取器</h3>
        <textarea 
          placeholder="在此粘贴行业新闻、猫哥文章，或长篇研报..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          className="btn-primary" 
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
        >
          {loading ? "提取中..." : "一键提取核心观点"}
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
            <h3>核心观点与摘要</h3>
            <p>{result}</p>
          </div>
        </div>
      )}
    </div>
  );
}
