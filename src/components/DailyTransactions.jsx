// components/DailyTransactions.jsx
import React, { useEffect, useState, useRef } from "react";
import "./DailyTransactions.css";

export default function DailyTransactions({ triggerNote }) {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(-1);
  const idxRef = useRef(0);

  // fetch data once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/daily-tx");
        const data = await res.json();
        setDailyData(data);
      } catch (err) {
        console.error("Failed to load daily tx:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // pulse animation on each new block
  const max = Math.max(...dailyData.map(d => d.count), 0);
  useEffect(() => {
    if (!loading && triggerNote != null) {
      const i = idxRef.current;
      setActiveIdx(i);
      idxRef.current = (i + 1) % dailyData.length;
      setTimeout(() => setActiveIdx(-1), 400);
    }
  }, [triggerNote, loading, dailyData.length]);

  return (
    <div className="daily-container">
      {/* only show loading status */}
      {loading && <div>Loading daily transactions…</div>}

      <h2>Daily Transactions</h2>
      <div className="bars">
        {dailyData.map(({ date, count }, i) => {
          const pct = max ? (count / max) * 100 : 0;
          return (
            <div className="bar-wrapper" key={date}>
              <div
                className={`bar${activeIdx === i ? " pulse" : ""}`}
                style={{ height: `${pct}%` }}
                title={`${date}: ${count} tx`}
              >
                <div className="bar-label">{count}</div>
              </div>
              <div className="bar-date">{date}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
