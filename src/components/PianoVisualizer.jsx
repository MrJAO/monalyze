import React, { useEffect, useRef, useState } from "react";
import "./PianoVisualizer.css";
import { loadPianoSounds } from "./soundLoader";
import { MOONLIGHT_SONATA } from "./compositions/moonlight";

const WHITE_NOTES = ["C", "D", "E", "F", "G", "A", "B"];
const BLACK_NOTES = ["C#", "D#", "F#", "G#", "A#"];

const buildNotes = (startOctave, count) => {
  const whiteKeys = [];
  const blackKeys = [];
  for (let i = 0; i < count; i++) {
    const octave = startOctave + i;
    WHITE_NOTES.forEach((note) => whiteKeys.push(`${note}${octave}`));
    BLACK_NOTES.forEach((note) => blackKeys.push(`${note}${octave}`));
  }
  return { whiteKeys, blackKeys };
};

const { whiteKeys, blackKeys } = buildNotes(3, 3);

const PianoVisualizer = ({ triggerNote }) => {
  const [activeNote, setActiveNote] = useState(null);
  const noteIndexRef = useRef(0);
  const sounds = useRef({});

  useEffect(() => {
    sounds.current = loadPianoSounds();
  }, []);

  useEffect(() => {
    if (!triggerNote || MOONLIGHT_SONATA.length === 0) return;

    const note = MOONLIGHT_SONATA[noteIndexRef.current];
    noteIndexRef.current = (noteIndexRef.current + 1) % MOONLIGHT_SONATA.length;

    setActiveNote(note);

    const audio = sounds.current[note];
    if (audio) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise?.catch) {
        playPromise.catch((e) => console.warn("Play error:", e.message));
      }
    }

    const clear = setTimeout(() => setActiveNote(null), 800);
    return () => clearTimeout(clear);
  }, [triggerNote]);

  return (
    <div className="piano-wrapper">
      <div className="white-keys">
        {whiteKeys.map((note) => (
          <div
            key={note}
            className={`white-key ${activeNote === note ? "active" : ""}`}
          >
            <span>{note}</span>
          </div>
        ))}
      </div>
      <div className="black-keys">
        {whiteKeys.map((whiteNote, i) => {
          const [note, octave] = [whiteNote[0], whiteNote.slice(1)];
          const blackNote =
            ["C", "D", "F", "G", "A"].includes(note) ? `${note}#${octave}` : null;
          if (!blackNote || !blackKeys.includes(blackNote)) return null;

          return (
            <div
              key={blackNote}
              className={`black-key ${activeNote === blackNote ? "active" : ""}`}
              style={{ left: `${i * 42 + 28}px` }}
            >
              <span>{blackNote}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PianoVisualizer;
