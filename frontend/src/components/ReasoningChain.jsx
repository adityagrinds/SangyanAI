import { useEffect, useRef } from "react";

function ReasoningChain({ chain }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chain]);

  if (!chain || chain.length === 0) {
    return (
      <div className="card reasoning-chain">
        <div className="card-header">
          <h2>🧠 Agent Reasoning Chain</h2>
        </div>
        <div className="empty-state">
          <p>Submit a report to see how agents communicate and reason together.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card reasoning-chain">
      <div className="card-header">
        <h2>🧠 Agent Reasoning Chain</h2>
        <span className="update-count">{chain.length} steps</span>
      </div>
      <div className="chain-content" ref={scrollRef}>
        {chain.map((step, i) => {
          const isTransfer = step.agent.includes("→");
          return (
            <div key={i} className={`chain-step ${isTransfer ? "transfer" : "action"}`}>
              <div className="chain-line">
                <div className={`chain-dot ${isTransfer ? "transfer-dot" : ""}`}></div>
                {i < chain.length - 1 && <div className="chain-connector"></div>}
              </div>
              <div className="chain-detail">
                <div className="chain-agent">{step.agent}</div>
                <div className="chain-action">{step.action}</div>
                <div className="chain-time">{new Date(step.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ReasoningChain;
