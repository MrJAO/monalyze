import React, { useEffect, useRef, useState } from "react";
import "./ViolinVisualizer.css";
import { loadViolinSounds } from "./soundLoader";
import { MOONLIGHT_SONATA } from "./compositions/moonlight";

const VIOLIN_STRINGS = ["G3", "D4", "A4", "E5"]; // standard violin tuning

const ViolinVisualizer = ({ triggerNote }) => {
  const [activeString, setActiveString] = useState(null);
  const noteIndexRef = useRef(0);
  const sounds = useRef({});

  useEffect(() => {
    sounds.current = loadViolinSounds(); // separate loader
  }, []);

  useEffect(() => {
    if (!triggerNote || MOONLIGHT_SONATA.length === 0) return;

    const note = MOONLIGHT_SONATA[noteIndexRef.current];
    noteIndexRef.current = (noteIndexRef.current + 1) % MOONLIGHT_SONATA.length;

    // Determine which string to light up (simple mapping for demo)
    const string = VIOLIN_STRINGS[noteIndexRef.current % VIOLIN_STRINGS.length];
    setActiveString(string);

    const audio = sounds.current[note];
    if (audio) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch((e) => console.warn("Violin play error:", e.message));
      }
    }

    const clear = setTimeout(() => setActiveString(null), 1000);
    return () => clearTimeout(clear);
  }, [triggerNote]);

  return (
    <div className="violin-wrapper">
      <div className="violin-strings">
        {VIOLIN_STRINGS.map((stringNote) => (
          <div
            key={stringNote}
            className={`violin-string ${activeString === stringNote ? "active" : ""}`}
          >
            <span className="string-label">{stringNote}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ViolinVisualizer;
