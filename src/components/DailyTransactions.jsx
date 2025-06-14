// components/DailyTransactions.jsx
import React, { useEffect, useState, useRef } from "react";
import "./DailyTransactions.css";

export default function DailyTransactions({ triggerNote }) {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(-1);
  const idxRef = useRef(0);

  // compute next UTC 04:00 update time
  const getNextUpdate = () => {
    const now = new Date();
    const next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      4, 0, 0
    ));
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString().replace("T", " ").split(".")[0] + " UTC";
  };
  const nextUpdate = getNextUpdate();

  // fetch once on mount, handle 204 (no content) as empty array
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/daily-tx");
        if (res.status === 204) {
          setDailyData([]);
        } else {
          const arr = await res.json();
          setDailyData(arr);
        }
      } catch (err) {
        console.error("Failed to load daily tx:", err);
        setDailyData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // pulse bars on each new block
  const max = dailyData.length ? Math.max(...dailyData.map(d => d.count)) : 0;
  useEffect(() => {
    if (!loading && triggerNote != null && dailyData.length) {
      const i = idxRef.current;
      setActiveIdx(i);
      idxRef.current = (i + 1) % dailyData.length;
      setTimeout(() => setActiveIdx(-1), 400);
    }
  }, [triggerNote, loading, dailyData.length]);

  // --- Dynamic Min-Max Scaling for bar heights ---
  const counts = dailyData.map(d => d.count);
  const min = counts.length ? Math.min(...counts) : 0;
  const minHeight = 15;
  const maxHeight = 100;

  return (
    <div className="daily-container">
      <h2 className="center-text">Daily Audience (TX)</h2>

      {loading ? (
        <div className="status">Loading daily transactions…</div>
      ) : dailyData.length === 0 ? (
        <div className="status">
          No data yet. Next update at {nextUpdate}.
        </div>
      ) : null}

      <div className="bars">
        {dailyData.map(({ date, count }, i) => {
          const pct = max > min
            ? minHeight + ((count - min) / (max - min)) * (maxHeight - minHeight)
            : 100;
          return (
            <div className="bar-wrapper" key={date}>
              <div className="bar-label">{count.toLocaleString()}</div>
              <div
                className={`bar${activeIdx === i ? " pulse" : ""}`}
                style={{ flexGrow: 0, height: `${pct}%` }}
                title={`${date}: ${count} tx`}
              />
              <div className="bar-date">{date}</div>
            </div>
          );
        })}
      </div>

      {!loading && dailyData.length > 0 && (
        <div className="status">Next update at {nextUpdate}.</div>
      )}
    </div>
  );
}
