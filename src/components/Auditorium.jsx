import React from "react";
import "./Auditorium.css";

export default function Auditorium({ rows = 7, cols = 10 }) {
  // build a 2D array of empty seats
  const seating = Array.from({ length: rows }, () =>
    Array.from({ length: cols })
  );

  return (
    <div className="auditorium">
      {/* Stage */}
      <div className="stage" />

      {/* Seats */}
      <div className="seating">
        {seating.map((row, i) => (
          <div className="row" key={i}>
            {row.map((_, j) => (
              <div className="seat" key={j} />
            ))}
          </div>
        ))}
      </div>

      {/* Side walls & speakers */}
      <div className="wall wall-left">
        {[...Array(rows)].map((_, i) => (
          <div className="speaker" key={`L${i}`} />
        ))}
      </div>
      <div className="wall wall-right">
        {[...Array(rows)].map((_, i) => (
          <div className="speaker" key={`R${i}`} />
        ))}
      </div>
    </div>
  );
}
