// api/daily-tx.js

import { Redis } from '@upstash/redis';
import { Alchemy } from 'alchemy-sdk';

const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url: `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});

const MONAD_RPC = "https://monad-testnet.rpc.hypersync.xyz";
const CACHE_KEY = 'daily-tx';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// small helper to pause between batches
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// batch‐sum tx counts via JSON‐RPC with throttling
async function sumRangeTx(start, end) {
  let total = 0;
  const chunkSize = 50;      // reduced chunk size to avoid hitting rate limits
  for (let i = start; i < end; i += chunkSize) {
    const batch = [];
    const upTo = Math.min(i + chunkSize, end);
    for (let b = i; b < upTo; b++) {
      batch.push({
        jsonrpc: "2.0",
        id: b,
        method: "eth_getBlockTransactionCountByNumber",
        params: ["0x" + b.toString(16)],
      });
    }
    const res = await fetch(MONAD_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    const arr = await res.json();
    total += arr.reduce((sum, r) => sum + parseInt(r.result, 16), 0);

    // brief pause to buffer requests
    await sleep(100);
  }
  return total;
}

// fetch only header timestamps for binary search
async function fetchBlockHeader(number) {
  const hex = "0x" + number.toString(16);
  const res = await fetch(MONAD_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBlockByNumber",
      params: [hex, false],
      id: 1,
    }),
  });
  return (await res.json()).result;
}

// binary‐search for first block ≥ target timestamp
async function findBlockByTs(targetTs, low, high) {
  let left = low, right = high;
  while (left <= right) {
    const mid = (left + right) >> 1;
    const ts = parseInt((await fetchBlockHeader(mid)).timestamp, 16);
    if (ts < targetTs) left = mid + 1;
    else right = mid - 1;
  }
  return left;
}

async function fetchDailyTransactionCounts() {
  // get latest block number
  const top = await fetch(MONAD_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
  });
  const latestNum = parseInt((await top.json()).result, 16);

  const results = [];
  const today = new Date();

  // only days 1–7 ago
  for (let i = 7; i >= 1; i--) {
    const dayStartTs = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - i
    ) / 1000;
    const nextDayTs = dayStartTs + 86400;

    const startBlock = await findBlockByTs(dayStartTs, 0, latestNum);
    const endBlock   = await findBlockByTs(nextDayTs, startBlock, latestNum);
    const totalTx    = await sumRangeTx(startBlock, endBlock);

    results.push({
      date: new Date(dayStartTs * 1000).toISOString().split('T')[0],
      count: totalTx,
    });
  }

  return results;
}

export default async function handler(req, res) {
  // manual purge
  if (req.method === 'DELETE' || req.query?.purge === 'true') {
    await redis.del(CACHE_KEY);
    console.log("🗑️ cache purged");
    return res.status(200).json({ purged: true });
  }

  // attempt cache
  let data = await redis.get(CACHE_KEY);
  if (data) {
    console.log("✅ cache hit");
  } else {
    console.log("🔄 cache miss – fetching on-chain");
    const fresh = await fetchDailyTransactionCounts();

    // set TTL until next UTC midnight
    const now    = Date.now();
    const tmwMid = Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate() + 1
    );
    const ttlSec = Math.floor((tmwMid - now) / 1000);

    await redis.set(CACHE_KEY, fresh, { ex: ttlSec });
    data = fresh;
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(data);
}
