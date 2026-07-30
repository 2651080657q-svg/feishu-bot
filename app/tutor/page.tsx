"use client";

import { useState } from "react";

interface AIResponse {
  solution: string;
  similar_questions: string[];
}

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIResponse | null>(null);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input })
      });
      
      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error("Error fetching AI response", error);
      alert("解析失败，请检查网络或 API Key 设置");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1>粉笔错题私教</h1>
        <p>粘贴你的错题，一键获取深度解析与举一反三</p>
      </header>

      <main className="glass-panel">
        <textarea 
          placeholder="在此粘贴题目文本，或输入错题关键信息..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          className="btn-primary" 
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
        >
          {loading ? "AI 正在思考..." : "开始解析"}
        </button>
      </main>

      {loading && (
        <div className="loader">
          <div className="dot"></div>
          <div className="dot"></div>
          <div className="dot"></div>
        </div>
      )}

      {result && !loading && (
        <div className="glass-panel result-card">
          <div className="result-section">
            <h3>深度解析</h3>
            <p>{result.solution}</p>
          </div>
          
          <div className="result-section">
            <h3>举一反三</h3>
            {result.similar_questions.map((q, idx) => (
              <div key={idx} className="similar-question">
                <p><strong>题目 {idx + 1}:</strong> {q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
