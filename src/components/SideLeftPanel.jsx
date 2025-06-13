// SideLeftPanel.jsx
import React, { useEffect, useState } from "react";
import "./SideLeftPanel.css";

const HYPER_RPC = "https://monad-testnet.rpc.hypersync.xyz";
const ERC20_TRANSFER_SIG =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const TOKEN_NAME_MAP = {
  "native": "MON",
  "0xf817257fed379853cde0fa4f97ab987181b1e5ea": "USDC",
  "0x88b8e2161dedc77ef4ab7585569d2415a1c1055d": "USDT",
  "0x0f0bdebf0f83cd1ee3974779bcb7315f9808c714": "DAK",
  "0xfe140e1dce99be9f4f15d657cd9b7bf622270c50": "YAKI",
  "0xe0590015a873bf326bd645c3e1266d4db41c4e6b": "CHOG",
  "0x760afe86e5de5fa0ee542fc7b7b713e1c5425701": "WMON",
  "0xb5a30b0fdc5ea94a52fdc42e3e9760cb8449fb37": "WETH",
  "0xcf5a6076cfa32686c0df13abad a2b40dec133f1d": "WBTC",
  "0x5387c85a4965769f6b0df430638a1388493486f1": "WSOL",
  "0x268e4e24e0051ec27b3d27a95977e71ce6875a05": "BEAN",
  "0x3a98250f98dd388c211206983453837c8365bdc1": "shMON",
  "0xc8527e96c3cb9522f6e35e95c0a28feab8144f15": "MAD",
  "0xe1d2439b75fb9746e7bc6cb777ae10aa7f7ef9c5": "sMON",
  "0xb2f82d0f38dc453d596ad40a37799446cc89274a": "aprMON",
  "0xaeef2f6b429cb59c9b2d7bb2141ada993e8571c3": "gMON"
};

const fetchTokenName = async (tokenAddress) =>
  TOKEN_NAME_MAP[tokenAddress.toLowerCase()] || "Unknown";

const SideLeftPanel = ({ onNewTransfer }) => {
  const [transfers, setTransfers] = useState([]);

  const fetchLatestTransfer = async () => {
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [
        {
          fromBlock: "latest",
          toBlock: "latest",
          topics: [ERC20_TRANSFER_SIG],
        },
      ],
    };

    try {
      const res = await fetch(HYPER_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const logs = data.result || [];

      if (logs.length > 0) {
        const log = logs[logs.length - 1];
        const tokenName = await fetchTokenName(log.address);
        const newTx = { hash: log.transactionHash, asset: tokenName };

        setTransfers((prev) =>
          [newTx, ...prev.filter((t) => t.hash !== newTx.hash)].slice(0, 5)
        );

        if (typeof onNewTransfer === "function") {
          onNewTransfer(tokenName);
        }
      }
    } catch (err) {
      console.error("HyperRPC transfer fetch error:", err);
    }
  };

  useEffect(() => {
    fetchLatestTransfer();
    const interval = setInterval(fetchLatestTransfer, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="side-panel-box">
      <div className="side-stats-boxes">
        <div className="side-stat-item">
          <strong>Latest Token Transfers</strong>
          <div className="side-token-list">
            {transfers.map((tx, idx) => (
              <div key={idx}>
                <span>🔗</span>
                <span style={{ fontFamily: "monospace" }}>
                  {tx.hash.slice(0, 10)}…
                </span>
                <span>—</span>
                <strong>{tx.asset}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SideLeftPanel;
