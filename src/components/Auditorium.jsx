// Auditorium.jsx
import React, { useState, useCallback } from "react";
import LatestBlocksMock from "./LatestBlocksMock";
import "./Auditorium.css";

import molandak from "./Molandak.png";
import moyaki from "./Moyaki.png";
import chog from "./Chog.png";

export default function Auditorium({ rows = 7, cols = 10 }) {
  // build empty seating grid
  const seating = Array.from({ length: rows }, () =>
    Array.from({ length: cols })
  );

  // transaction counter
  const [count, setCount] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // list of active audiences: { id, row, col, src }
  const [audiences, setAudiences] = useState([]);

  // callback invoked by LatestBlocksMock on each new block
  const handleNewBlock = useCallback(() => {
    if (count === 0) {
      setStartTime(new Date());
    }
    setCount((c) => c + 1);

    // pick a random empty seat
    const empties = [];
    seating.forEach((r, i) =>
      r.forEach((_, j) => {
        if (!audiences.find((a) => a.row === i && a.col === j)) {
          empties.push({ row: i, col: j });
        }
      })
    );
    if (!empties.length) return;
    const { row, col } = empties[Math.floor(Math.random() * empties.length)];

    // pick a random avatar
    const pics = [molandak, moyaki, chog];
    const src = pics[Math.floor(Math.random() * pics.length)];
    const id = `${Date.now()}-${row}-${col}`;
    setAudiences((prev) => [...prev, { id, row, col, src }]);

    // now disappear after 15–20 seconds
    const delay = 15000 + Math.random() * 5000;
    setTimeout(() => {
      setAudiences((prev) => prev.filter((a) => a.id !== id));
    }, delay);
  }, [audiences, count, seating]);

  return (
    <div className="auditorium">
      {/* background listener (UI hidden) */}
      <div style={{ display: "none" }}>
        <LatestBlocksMock
          setAvgGasUsed={() => {}}
          onNewBlock={handleNewBlock}
        />
      </div>

      {/* 1) Transaction header */}
      <div className="transaction-header">
        <div className="trans-count">Audience Counts (TX): {count}</div>
        <div className="trans-start">
          Count Started: {startTime ? startTime.toLocaleString() : "-"}
        </div>
      </div>

      {/* 2) Seating with audiences */}
      <div className="seating">
        {seating.map((rowArr, i) => (
          <div className="row" key={i}>
            {rowArr.map((_, j) => {
              const occupant = audiences.find(
                (a) => a.row === i && a.col === j
              );
              return occupant ? (
                <img
                  key={j}
                  className="audience"
                  src={occupant.src}
                  alt="audience"
                />
              ) : (
                <div className="seat" key={j} />
              );
            })}
          </div>
        ))}
      </div>

      {/* 3) Side walls & speakers */}
      <div className="wall wall-left">
        {Array(rows)
          .fill()
          .map((_, i) => (
            <div className="speaker" key={`L${i}`} />
          ))}
      </div>
      <div className="wall wall-right">
        {Array(rows)
          .fill()
          .map((_, i) => (
            <div className="speaker" key={`R${i}`} />
          ))}
      </div>
    </div>
  );
}
