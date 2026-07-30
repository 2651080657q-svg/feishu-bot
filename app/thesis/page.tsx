"use client";

export default function Thesis() {
  const milestones = [
    { id: 1, title: "文献整理与综述撰写", deadline: "10月中旬", status: "completed" },
    { id: 2, title: "大论文初稿完成", deadline: "11月初", status: "in-progress" },
    { id: 3, title: "降重与查重", deadline: "11月中旬", status: "pending" },
    { id: 4, title: "小论文（水刊）发表跟进", deadline: "12月初", status: "pending" },
    { id: 5, title: "终稿提交与盲审", deadline: "12月底", status: "pending" },
  ];

  return (
    <div className="container">
      <header className="header" style={{ textAlign: "left" }}>
        <h1>毕业倒计时</h1>
        <p>12月底前硬指标拆解与追踪</p>
      </header>

      <div className="glass-panel">
        <h3 style={{ marginBottom: "24px", color: "var(--accent)" }}>核心 Milestone</h3>
        
        <div style={{ position: "relative", paddingLeft: "24px" }}>
          {/* Vertical line */}
          <div style={{ 
            position: "absolute", left: "7px", top: "10px", bottom: "10px", 
            width: "2px", background: "rgba(255,255,255,0.1)" 
          }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
            {milestones.map((m, index) => {
              const isActive = m.status === "in-progress";
              const isCompleted = m.status === "completed";
              
              return (
                <div key={m.id} style={{ position: "relative" }}>
                  {/* Timeline dot */}
                  <div style={{
                    position: "absolute",
                    left: "-24px",
                    top: "4px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: isCompleted ? "#10b981" : isActive ? "var(--accent)" : "#334155",
                    border: "3px solid var(--bg-gradient)",
                    boxShadow: isActive ? "0 0 10px var(--accent)" : "none"
                  }} />
                  
                  <div style={{ 
                    padding: "16px",
                    background: isActive ? "rgba(139,92,246,0.1)" : "rgba(255,255,255,0.02)",
                    borderRadius: "12px",
                    border: isActive ? "1px solid rgba(139,92,246,0.3)" : "1px solid transparent"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <h4 style={{ 
                        fontSize: "1.1rem", 
                        color: isCompleted ? "var(--text-secondary)" : "var(--text-primary)",
                        textDecoration: isCompleted ? "line-through" : "none"
                      }}>{m.title}</h4>
                      <span style={{ 
                        fontSize: "0.85rem", 
                        padding: "4px 8px", 
                        borderRadius: "4px",
                        background: "rgba(255,255,255,0.1)",
                        color: "var(--text-secondary)"
                      }}>
                        {m.deadline}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
