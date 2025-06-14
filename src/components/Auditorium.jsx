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

  // audience count & start time
  const [count, setCount] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // active audience avatars
  const [audiences, setAudiences] = useState([]);

  // on each new block, increment count and place an avatar
  const handleNewBlock = useCallback(() => {
    // record the moment we start counting (only once)
    setStartTime((prev) => prev ?? new Date());
    setCount((c) => c + 1);

    // find empty seats
    const empties = [];
    seating.forEach((rowArr, i) =>
      rowArr.forEach((_, j) => {
        if (!audiences.find((a) => a.row === i && a.col === j)) {
          empties.push({ row: i, col: j });
        }
      })
    );
    if (!empties.length) return;

    // choose a random seat and avatar
    const { row, col } = empties[Math.floor(Math.random() * empties.length)];
    const pics = [molandak, moyaki, chog];
    const src = pics[Math.floor(Math.random() * pics.length)];
    const id = `${Date.now()}-${row}-${col}`;

    // add to audience
    setAudiences((prev) => [...prev, { id, row, col, src }]);

    // remove after 15–20 seconds
    const delay = 15000 + Math.random() * 5000;
    setTimeout(() => {
      setAudiences((prev) => prev.filter((a) => a.id !== id));
    }, delay);
  }, [audiences, seating]);

  return (
    <div className="auditorium">
      {/* hidden listener */}
      <div style={{ display: "none" }}>
        <LatestBlocksMock setAvgGasUsed={() => {}} onNewBlock={handleNewBlock} />
      </div>

      {/* audience count header */}
      <div className="transaction-header">
        <div className="trans-count">Audience Counts (TX): {count}</div>
        <div className="trans-start">
          Count Started: {startTime ? startTime.toLocaleString() : "-"}
        </div>
      </div>

      {/* seating with avatars */}
      <div className="seating">
        {seating.map((rowArr, i) => (
          <div className="row" key={i}>
            {rowArr.map((_, j) => {
              const occ = audiences.find((a) => a.row === i && a.col === j);
              return occ ? (
                <img
                  key={j}
                  className="audience"
                  src={occ.src}
                  alt="audience"
                />
              ) : (
                <div className="seat" key={j} />
              );
            })}
          </div>
        ))}
      </div>

      {/* walls & speakers */}
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
