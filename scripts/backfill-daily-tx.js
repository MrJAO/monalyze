// scripts/backfill-daily-tx.js
import { Redis }   from '@upstash/redis';
import { Alchemy } from 'alchemy-sdk';

// —————————————————————————————
// 1) Alchemy + RPC setup
const MONAD_RPC = "https://monad-testnet.rpc.hypersync.xyz";
const alchemy   = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url:   `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});

// —————————————————————————————
// 2) Redis
const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

// small pause helper
const sleep = ms => new Promise(r => setTimeout(r, ms));

// —————————————————————————————
// 3) Helpers to locate blocks by timestamp
async function fetchBlockHeader(number) {
  const hex = '0x' + number.toString(16);
  const res = await fetch(MONAD_RPC, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      jsonrpc: '2.0',
      method:  'eth_getBlockByNumber',
      params:  [hex, false],
      id:      1,
    }),
  });
  return (await res.json()).result;
}

async function findBlockByTs(targetTs, low, high) {
  let left = low, right = high;
  while (left <= right) {
    const mid = (left + right) >> 1;
    const blk = await fetchBlockHeader(mid);
    const ts  = typeof blk.timestamp === 'number'
      ? blk.timestamp
      : parseInt(blk.timestamp, 16);
    if (ts < targetTs) left = mid + 1;
    else           right = mid - 1;
    await sleep(20);
  }
  return left;
}

// —————————————————————————————
// 4) Count transactions in a block range, in batches
async function countTransactions(start, end) {
  let total = 0;
  const batchSize = 50;
  for (let i = start; i < end; i += batchSize) {
    const batch = [];
    const upTo  = Math.min(end, i + batchSize);
    for (let b = i; b < upTo; b++) {
      batch.push({
        jsonrpc: '2.0',
        id:      b,
        method:  'eth_getBlockTransactionCountByNumber',
        params:  ['0x' + b.toString(16)],
      });
    }
    const resp = await fetch(MONAD_RPC, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(batch),
    });
    const arr = await resp.json();
    for (const r of arr) {
      total += parseInt(r.result || '0x0', 16);
    }
    await sleep(50);
  }
  return total;
}

// —————————————————————————————
// 5) Fetch last 7 days’ tx counts
async function fetchDailyTransactionCounts() {
  const top    = await alchemy.core.getBlockNumber();
  const latest = top;  // latest block number
  const today  = new Date();
  const results = [];

  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    // UTC midnight timestamp
    const dayStartTs = Math.floor(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - daysAgo
      ) / 1000
    );
    const nextTs     = dayStartTs + 86400;

    // locate blocks
    const startB = await findBlockByTs(dayStartTs, 0, latest);
    const endB   = await findBlockByTs(nextTs,     startB, latest);
    let count    = 0;
    if (endB > startB) {
      count = await countTransactions(startB, endB);
    }

    results.push({
      date:  new Date(dayStartTs * 1000).toISOString().split('T')[0],
      count,
    });
  }

  return results;
}

// —————————————————————————————
// 6) Main backfill
async function main() {
  console.log("🕒 backfill started");
  const data = await fetchDailyTransactionCounts();

  if (!Array.isArray(data)) {
    console.error("❌ fetchDailyTransactionCounts did not return an array:", data);
    process.exit(1);
  }

  // compute TTL until next UTC 00:05
  const now     = Date.now();
  const tomorrow0500 = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate() + 1,
    0, 5, 0
  );
  const ttl = Math.max(300, Math.floor((tomorrow0500 - now) / 1000));

  // store in KV
  await redis.set('daily-tx', data, { ex: ttl });
  console.log(`✅ cache updated (${data.length} days), expires in ${ttl}s`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
