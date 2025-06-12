// LatestBlocksMock.jsx
import React, { useEffect, useState, useRef } from "react";
import "./LatestBlocksMock.css";

const MONAD_RPC = "https://testnet-rpc.monad.xyz";

const LatestBlocksMock = ({ setAvgGasUsed, onNewBlock }) => {
  const [blocks, setBlocks] = useState([]);
  const lastBlockRef = useRef(null);

  const fetchLatestBlock = async () => {
    const res = await fetch(MONAD_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBlockByNumber",
        params: ["latest", true],
        id: 1,
      }),
    });
    const json = await res.json();
    return json.result;
  };

  const pollBlock = async () => {
    try {
      const latestBlock = await fetchLatestBlock();
      if (!latestBlock) return;

      const blockNumber = parseInt(latestBlock.number, 16);
      if (blockNumber === lastBlockRef.current) return;
      lastBlockRef.current = blockNumber;

      const formattedBlock = {
        blockNumber,
        formattedNumber: blockNumber.toLocaleString(),
        hash: latestBlock.hash,
        timestamp: latestBlock.timestamp
          ? new Date(parseInt(latestBlock.timestamp, 16) * 1000).toLocaleTimeString()
          : "–",
      };

      setBlocks((prev) => {
        const updated = [formattedBlock, ...prev.filter(b => b.blockNumber !== blockNumber)];
        return updated.slice(0, 2);
      });

      if (typeof onNewBlock === "function") {
        onNewBlock(blockNumber);
      }

      if (typeof setAvgGasUsed === "function" && latestBlock.transactions?.length) {
        const totalGas = latestBlock.transactions.reduce((sum, tx) => sum + parseInt(tx.gas || "0"), 0);
        const avg = totalGas / 1 / 1e9;
        setAvgGasUsed(avg.toFixed(5) + " MON");
      }
    } catch (e) {
      console.error("Error polling latest block:", e);
    }
  };

  useEffect(() => {
    pollBlock();
    const interval = setInterval(pollBlock, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="blocks-wrapper">
      <h2 className="block-title">Latest 2 Blocks (Live)</h2>
      <div className="block-list">
        {blocks.map((block) => (
          <div className="block-item" key={block.blockNumber}>
            <div className="staff-lines">
              <div className="clef">🎼</div>
              <div className="block-info">
                <div><strong>Block #{block.formattedNumber}</strong></div>
                <div>{block.hash}</div>
                <div>{block.timestamp}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LatestBlocksMock;
