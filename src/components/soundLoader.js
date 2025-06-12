const NOTE_ALIASES = {
  "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb"
};

const buildFilename = (note) => {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return null;
  const [_, base, octave] = match;
  const resolved = NOTE_ALIASES[base] || base;
  return `${resolved}${octave}.mp3`;
};

const buildRawFilename = (note) => {
  const match = note.match(/^([A-G]#?)(\d)$/);
  if (!match) return null;
  const [_, base, octave] = match;
  return `${base}${octave}.mp3`; // No aliasing
};

export const loadPianoSounds = () => {
  return loadInstrumentSounds("/sounds", 3, 5, 1.0, buildFilename);
};

export const loadViolinSounds = () => {
  return loadInstrumentSounds("/sounds/violin", 3, 5, 0.05, buildFilename);
};

const loadInstrumentSounds = (basePath, startOctave, endOctave, volume = 1.0, filenameBuilder) => {
  const soundMap = {};
  const white = ["C", "D", "E", "F", "G", "A", "B"];
  const black = ["C#", "D#", "F#", "G#", "A#"];
  const notes = [...white, ...black];

  for (let oct = startOctave; oct <= endOctave; oct++) {
    notes.forEach((note) => {
      const full = `${note}${oct}`;
      const file = filenameBuilder(full);
      if (!file) return;

      const audio = new Audio(`${basePath}/${file}`);
      audio.preload = "auto";
      audio.volume = volume;
      soundMap[full] = audio;
    });
  }

  return soundMap;
};
