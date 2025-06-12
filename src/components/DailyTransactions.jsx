// components/DailyTransactions.jsx
import React, { useEffect, useState, useRef } from "react";
import "./DailyTransactions.css";

export default function DailyTransactions({ triggerNote }) {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeIdx, setActiveIdx] = useState(-1);
  const idxRef = useRef(0);

  // compute next 00:05 UTC update time
  const getNextUpdate = () => {
    const now = new Date();
    const next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 5, 0
    ));
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().replace("T", " ").split(".")[0] + " UTC";
  };
  const nextUpdate = getNextUpdate();

  // fetch data once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/daily-tx");
        const arr = await res.json();
        setDailyData(arr);
      } catch (err) {
        console.error("Failed to load daily tx:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // pulse on each new block
  const max = Math.max(...dailyData.map((d) => d.count), 0);
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
      <h2>Daily Transactions</h2>

      {loading ? (
        <div className="status">Loading daily transactions…</div>
      ) : dailyData.length === 0 ? (
        <div className="status">
          No data yet. Next update at {nextUpdate}.
        </div>
      ) : null}

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

      {!loading && dailyData.length > 0 && (
        <div className="status">
          Next update at {nextUpdate}.
        </div>
      )}
    </div>
  );
}
