// components/DailyTransactions.jsx
import React, { useEffect, useState, useRef } from "react";
import "./DailyTransactions.css";

export default function DailyTransactions({ triggerNote }) {
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFreshFetch, setIsFreshFetch] = useState(false);
  const [lastFetchedBlock, setLastFetchedBlock] = useState(null);
  const [nextRefreshSec, setNextRefreshSec] = useState(0);
  const [fetchDuration, setFetchDuration] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);
  const idxRef = useRef(0);

  // helper to format mm:ss
  const fmtMS = (s) => {
    const m = Math.floor(s/60).toString().padStart(2,"0");
    const sec = Math.floor(s%60).toString().padStart(2,"0");
    return `${m}:${sec}`;
  };
  // helper to format hh:mm:ss
  const fmtHMS = (s) => {
    const h = Math.floor(s/3600).toString().padStart(2,"0");
    const m = Math.floor((s%3600)/60).toString().padStart(2,"0");
    const sec = Math.floor(s%60).toString().padStart(2,"0");
    return `${h}h ${m}min ${sec}s`;
  };

  // fetch + cache logic
  useEffect(() => {
    const load = async () => {
      const t0 = Date.now();
      const res = await fetch("/api/daily-tx");
      const t1 = Date.now();
      const j = await res.json();
      setFetchDuration((t1 - t0)/1000);
      setDailyData(j.data || j);
      setLastFetchedBlock(j.lastFetchedBlock);
      setNextRefreshSec(j.nextRefreshIn || 0);
      setIsFreshFetch(Boolean(j.isFreshFetch));
      setLoading(false);
    };
    load();
  }, []);

  // countdown for next refresh
  useEffect(() => {
    if (loading) return;
    const iv = setInterval(() => {
      setNextRefreshSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(iv);
  }, [loading]);

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
      {/* Status line above the chart */}
      {loading ? (
        <>
          <div>
            {typeof triggerNote === "number"
              ? `Block #${triggerNote.toLocaleString()} loading…`
              : "Block loading…"}
          </div>
          <div>Loading daily transactions…</div>
        </>
      ) : isFreshFetch ? (
        <div>
          Fetching Data: Block #{lastFetchedBlock}, approx. time {fmtMS(fetchDuration)}
        </div>
      ) : (
        <div>
          Fetching Updated Data in: {fmtHMS(nextRefreshSec)}
        </div>
      )}

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
