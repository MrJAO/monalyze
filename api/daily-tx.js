// api/daily-tx.js

import { Redis } from '@upstash/redis';
import { Alchemy } from 'alchemy-sdk';

const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url: `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});

const MONAD_RPC = "https://monad-testnet.rpc.hypersync.xyz";
const CACHE_KEY = 'daily-tx';
const CACHE_TTL = 60 * 60 * 24; // 24 hours

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// fetch a block header via hypersync RPC
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
  const json = await res.json();
  return json.result;
}

// find the first block ≥ target timestamp via binary search
async function findBlockByTs(targetTs, low, high) {
  let left = low, right = high;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const header = await fetchBlockHeader(mid);
    const ts = parseInt(header.timestamp, 16);
    if (ts < targetTs) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return left;
}

async function fetchDailyTransactionCounts() {
  // 1. get latest block number
  const topRes = await fetch(MONAD_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1
    }),
  });
  const latestNum = parseInt((await topRes.json()).result, 16);

  const results = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    // compute UTC midnight timestamp for this day
    const dayStart = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate() - i
    ));
    const startTs = Math.floor(dayStart.getTime() / 1000);
    const nextTs  = startTs + 86400;

    // 2. locate start/end blocks
    const startBlock = await findBlockByTs(startTs, 0, latestNum);
    const endBlock   = await findBlockByTs(nextTs, startBlock, latestNum);

    // 3. sum tx counts using Alchemy
    let totalTx = 0;
    for (let b = startBlock; b < endBlock; b++) {
      const blk = await alchemy.core.getBlock(b, true);
      totalTx += blk.transactions.length;
    }

    results.push({
      date: dayStart.toISOString().split('T')[0],
      count: totalTx
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

  // cache fetch
  let data = await redis.get(CACHE_KEY);
  if (data) {
    console.log("✅ cache hit");
  } else {
    console.log("🔄 cache miss – running on-chain fetch");
    data = await fetchDailyTransactionCounts();
    await redis.set(CACHE_KEY, data, { ex: CACHE_TTL });
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(data);
}
