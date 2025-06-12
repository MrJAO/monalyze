// api/cron-daily-tx.js

import { Redis } from '@upstash/redis';
import { Alchemy } from 'alchemy-sdk';

const MONAD_RPC = "https://monad-testnet.rpc.hypersync.xyz";
const alchemy   = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url:   `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});

const CACHE_KEY = 'daily-tx';
const redis     = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

// binary‐search for first block ≥ timestamp
async function findBlockByTs(targetTs, low, high) {
  let left = low, right = high;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    console.log(`🔍 getBlock(${mid}) for timestamp`);
    const blk = await alchemy.core.getBlock(mid, false);
    const blkTs = typeof blk.timestamp === 'number'
      ? blk.timestamp
      : parseInt(blk.timestamp, 16);
    if (blkTs < targetTs) left = mid + 1;
    else right = mid - 1;
    await sleep(50);
  }
  return left;
}

// sum tx counts in parallel batches
async function countTransactions(startB, endB) {
  let total = 0;
  const batchSize   = 100;
  const concurrency = 4;
  const batches     = [];
  for (let i = startB; i < endB; i += batchSize) {
    const upTo = Math.min(endB, i + batchSize);
    const calls = [];
    for (let b = i; b < upTo; b++) {
      calls.push({
        jsonrpc: "2.0",
        id:      b,
        method:  "eth_getBlockTransactionCountByNumber",
        params:  [`0x${b.toString(16)}`],
      });
    }
    batches.push({ from: i, to: upTo - 1, calls });
  }
  const fetchBatch = async ({ calls, from, to }) => {
    console.log(`⏳ txCount ${from}→${to}`);
    const res = await fetch(MONAD_RPC, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(calls),
    });
    const arr = await res.json();
    return arr.reduce((sum, r) => sum + parseInt(r.result||"0x0",16), 0);
  };
  for (let i = 0; i < batches.length; i += concurrency) {
    const wave    = batches.slice(i, i + concurrency);
    const results = await Promise.all(wave.map(fetchBatch));
    total += results.reduce((a,b) => a + b, 0);
    await sleep(200);
  }
  return total;
}

// Cron handler: one date per run
export default async function handler(req, res) {
  console.log("🕒 cron-daily-tx invoked");

  let arr = (await redis.get(CACHE_KEY)) || [];

  let targetDate;
  if (arr.length < 7) {
    // backfill phase: start at June 5, 2025
    const backfillStart = Date.UTC(2025, 5, 5);
    targetDate = new Date(backfillStart + arr.length * 86400e3);
    console.log(`🔄 backfill: processing ${targetDate.toISOString().split('T')[0]}`);
  } else {
    // daily update phase: just yesterday
    const yesterday = new Date(Date.now() - 86400e3);
    targetDate = yesterday;
    const ds = targetDate.toISOString().split('T')[0];
    if (arr.some(e => e.date === ds)) {
      console.log(`✔️ ${ds} already cached`);
      return res.status(200).json({ ok: true });
    }
    console.log(`🔄 daily update: processing ${ds}`);
  }

  const dateStr = targetDate.toISOString().split('T')[0];
  const tsStart = Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate()
  ) / 1000;
  const tsEnd = tsStart + 86400;

  const latest = await alchemy.core.getBlockNumber();
  console.log(`✔️ latest block: ${latest}`);

  const startB = await findBlockByTs(tsStart,      0,      latest);
  const endB   = await findBlockByTs(tsEnd,        startB, latest);
  console.log(`  block range ${startB}–${endB - 1}`);

  const count = endB > startB
    ? await countTransactions(startB, endB)
    : 0;
  console.log(`  ✔️ ${dateStr}: ${count} tx`);

  arr.push({ date: dateStr, count });
  arr = arr
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);

  // TTL to next UTC midnight
  const now          = Date.now();
  const nextMidnight = new Date();
  nextMidnight.setUTCHours(24, 0, 0, 0);
  const ttl = Math.floor((nextMidnight.getTime() - now) / 1000);

  await redis.set(CACHE_KEY, arr, { ex: ttl });
  console.log(`✅ cache updated (${arr.length} days); expires in ${ttl}s`);

  res.status(200).json({ ok: true });
}