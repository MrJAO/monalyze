import React, { useEffect, useState, useRef } from "react";
import "./StatsPanel.css";
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
    const json = await res.json();
    return json.result;
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
    const json = await res.json();
    const latest = parseInt(json.result, 16);
    const currentCache = blockCacheRef.current;

    const missing = [];
    for (let i = latest; i > latest - 2000; i--) {
      if (!currentCache[i]) missing.push(i);
      if (missing.length >= 100) break;
    }

    const hexes = missing.map((n) => "0x" + n.toString(16));
    const batch = await Promise.all(hexes.map((hex) => fetchBlockByNumber(hex).catch(() => null)));

    batch.forEach((b) => {
      if (b?.number) {
        const num = parseInt(b.number, 16);
        blockCacheRef.current[num] = b;
      }
    });

    return latest;
  };

  const fetchFastStats = async () => {
    try {
      const latest = await updateBlockCache();
      const recent = [latest, latest - 1, latest - 2, latest - 3, latest - 4];
      const blocks = recent.map((n) => blockCacheRef.current[n]).filter(Boolean);

      let totalTx = 0;
      let totalGas = 0;

      blocks.forEach((b) => {
        totalTx += b.transactions.length;
        totalGas += b.transactions.reduce((sum, tx) => sum + parseInt(tx.gas || "0"), 0);
      });

      const avgGasUsed = totalGas / blocks.length;
      const txPerSecond = totalTx / (blocks.length * 12);

      setStats((prev) => ({
        ...prev,
        currentBlock: latest,
        txPerSecond: txPerSecond.toFixed(2),
        avgGasUsed: (avgGasUsed / 1e9).toFixed(5) + " MON",
      }));
    } catch (err) {
      console.error("Fast stats error:", err);
    }
  };

  const fetchAlchemyStats = async () => {
    try {
      const gasPrice = await alchemy.core.getGasPrice();
      const gasGwei = (parseInt(gasPrice._hex, 16) / 1e9).toFixed(1);

      setStats((prev) => ({
        ...prev,
        gasFee: gasGwei + " gwei",
      }));
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
    <div className="panel-box w-full">
      <div className="stats-boxes">
        <div className="stat-item"><strong>Current Block:</strong><div>{stats.currentBlock.toLocaleString()}</div></div>
        <div className="stat-item"><strong>TPS (Last 20 Blocks):</strong><div>{stats.txPerSecond}</div></div>
        <div className="stat-item"><strong>Gas Fee:</strong><div>{stats.gasFee}</div></div>
        <div className="stat-item"><strong>Average Gas Fee Used:</strong><div>{stats.avgGasUsed}</div></div>
      </div>

      <div className="music-line-box">
        <div className="music-line-content">
          <span className="clef">🎼</span>
          <span className="note">♪</span>
          <span className="note">♫</span>
          <span className="note">♩</span>
          <span className="note">♬</span>
        </div>
        <div className="music-desc">
          Playing: Moonlight Sonata
        </div>
      </div>

      <div className="refresh-countdown">Data Buffering: {countdown}s</div>
    </div>
  );
};

export default StatsPanel;
