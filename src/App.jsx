// App.jsx
// Force Rebuild
import './App.css';
import StatsPanel from './components/StatsPanel';
import PianoVisualizer from './components/PianoVisualizer';
import ViolinVisualizer from './components/ViolinVisualizer';
import LatestBlocksMock from './components/LatestBlocksMock';
import SideLeftPanel from './components/SideLeftPanel';
import DailyTransactions from './components/DailyTransactions';
import React, { useState, useEffect } from 'react';

function App() {
  const [noteTrigger, setNoteTrigger] = useState(null);

  useEffect(() => {
    const unlock = () => {
      document.removeEventListener('click', unlock);
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    };
    document.addEventListener('click', unlock);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 text-white py-10 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-16">
      <div className="app-container">
        <div className="w-full flex justify-start mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span>🎹</span> Monalyze
          </h1>
        </div>

        <div className="main-layout">
          <div className="left-panel">
            <SideLeftPanel onNewTransfer={setNoteTrigger} />
            <ViolinVisualizer triggerNote={noteTrigger} />
            <LatestBlocksMock onNewBlock={setNoteTrigger} />
          </div>

          <div className="center-panel">
            <StatsPanel />
            <PianoVisualizer triggerNote={noteTrigger} />
          </div>
        </div>

        <DailyTransactions triggerNote={noteTrigger} />
      </div>
    </div>
  );
}

export default App;
