// StatsPanel.jsx
import React, { useEffect, useState, useRef } from "react";
import "./StatsPanel.css";
import Auditorium from "./Auditorium";
import { Alchemy } from "alchemy-sdk";

const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_KEY;
const alchemy = new Alchemy({
  apiKey: ALCHEMY_API_KEY,
  url: `https://monad-testnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
});
const MONAD_RPC = "https://monad-testnet.rpc.hypersync.xyz";

const StatsPanel = () => {
  const [stats, setStats] = useState({
    currentBlock: 0,
    txPerSecond: 0,
    gasFee: "-",
    avgGasUsed: "-",
  });
  const [countdown, setCountdown] = useState(60);
  const blockCacheRef = useRef({});

  const fetchBlockByNumber = async (hex) => {
    const res = await fetch(MONAD_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: [hex, true],
        id: 1,
      }),
    });
    return (await res.json()).result;
  };

  const updateBlockCache = async () => {
    const res = await fetch(MONAD_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1,
      }),
    });
    const latest = parseInt((await res.json()).result, 16);
    const cache = blockCacheRef.current;
    const missing = [];
    for (let i = latest; i > latest - 2000; i--) {
      if (!cache[i]) missing.push(i);
      if (missing.length >= 100) break;
    }
    const hexes = missing.map((n) => "0x" + n.toString(16));
    const batch = await Promise.all(hexes.map((h) => fetchBlockByNumber(h).catch(() => null)));
    batch.forEach((b) => {
      if (b?.number) cache[parseInt(b.number, 16)] = b;
    });
    return latest;
  };

  const fetchFastStats = async () => {
    try {
      const latest = await updateBlockCache();
      const recents = [latest, latest - 1, latest - 2, latest - 3, latest - 4];
      const blocks = recents.map((n) => blockCacheRef.current[n]).filter(Boolean);
      let totalTx = 0, totalGas = 0;
      blocks.forEach((b) => {
        totalTx += b.transactions.length;
        totalGas += b.transactions.reduce((sum, tx) => sum + parseInt(tx.gas || "0"), 0);
      });
      const avgGasUsed = totalGas / blocks.length;
      const tps = totalTx / (blocks.length * 12);
      setStats((p) => ({
        ...p,
        currentBlock: latest,
        txPerSecond: tps.toFixed(2),
        avgGasUsed: (avgGasUsed / 1e9).toFixed(5) + " MON",
      }));
    } catch (err) {
      console.error("Fast stats error:", err);
    }
  };

  const fetchAlchemyStats = async () => {
    try {
      const gasPrice = await alchemy.core.getGasPrice();
      const gwei = (parseInt(gasPrice._hex, 16) / 1e9).toFixed(1);
      setStats((p) => ({ ...p, gasFee: gwei + " gwei" }));
      setCountdown(60);
    } catch (err) {
      console.error("Alchemy stats error:", err);
    }
  };

  useEffect(() => {
    fetchFastStats();
    const fast = setInterval(fetchFastStats, 5000);
    return () => clearInterval(fast);
  }, []);

  useEffect(() => {
    fetchAlchemyStats();
    const slow = setInterval(fetchAlchemyStats, 60000);
    const timer = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 60)), 1000);
    return () => {
      clearInterval(slow);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="stats-panel-wrapper">
      {/* top: stats + auditorium side by side */}
      <div className="stats-main">
        <div className="stats-boxes">
          <div className="stat-item">
            <strong>Current Block:</strong>
            <div>{stats.currentBlock.toLocaleString()}</div>
          </div>
          <div className="stat-item">
            <strong>TPS (Last 20 Blocks):</strong>
            <div>{stats.txPerSecond}</div>
          </div>
          <div className="stat-item">
            <strong>Gas Fee:</strong>
            <div>{stats.gasFee}</div>
          </div>
          <div className="stat-item">
            <strong>Average Gas Fee Used:</strong>
            <div>{stats.avgGasUsed}</div>
          </div>
        </div>

        <div className="auditorium-container">
          <Auditorium rows={7} cols={10} />
        </div>
      </div>

      {/* bottom: music line */}
      <div className="music-line-box">
        <span className="clef">🎼</span>
        <div className="music-line-content">
          <span className="note">♪</span>
          <span className="note">♫</span>
          <span className="note">♩</span>
          <span className="note">♬</span>
        </div>
        <div className="music-desc">Playing: Moonlight Sonata</div>
      </div>
    </div>
  );
};

export default StatsPanel;
