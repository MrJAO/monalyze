// scripts/backfill-daily-tx.js
import 'dotenv/config'
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
  console.log(`🔍 fetchBlockHeader: fetching header for block #${number}`);
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
  console.log(`🔍 findBlockByTs: locating first block ≥ ${targetTs} between ${low} and ${high}`);
  let left = low, right = high;
  while (left <= right) {
    const mid = (left + right) >> 1;
    const blk = await fetchBlockHeader(mid);
    const ts  = typeof blk.timestamp === 'number'
      ? blk.timestamp
      : parseInt(blk.timestamp, 16);
    if (ts < targetTs) left = mid + 1;
    else              right = mid - 1;
    await sleep(20);
  }
  console.log(`   → findBlockByTs result: block #${left}`);
  return left;
}

// —————————————————————————————
// 4) Count transactions in a block range (optimized)
async function countTransactions(start, end) {
  console.log(`⏳ countTransactions: counting TXs from block ${start} to ${end - 1}`);
  let total = 0;
  let scanned = 0;

  for (let b = start; b < end; b++) {
    const hex = '0x' + b.toString(16);
    const res = await fetch(MONAD_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: b,
        method: 'eth_getBlockByNumber',
        params: [hex, true],
      }),
    });

    const json = await res.json();
    const txs = json?.result?.transactions || [];
    total += txs.length;

    scanned++;
    if (scanned % 500 === 0) {
      console.log(`   → scanned ${scanned} blocks so far, total TXs: ${total}`);
    }

    await sleep(25);
  }

  console.log(`   → countTransactions total: ${total} TX`);
  return total;
}

// —————————————————————————————
// 5) Fetch last 7 days’ tx counts
async function fetchDailyTransactionCounts() {
  console.log("🕒 fetchDailyTransactionCounts started");
  const latest = await alchemy.core.getBlockNumber();
  console.log(`✔️ latest block number: ${latest}`);
  const today  = new Date();
  const results = [];

  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const dayStartTs = Math.floor(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - daysAgo
      ) / 1000
    );
    const nextTs     = dayStartTs + 86400;
    const dateStr    = new Date(dayStartTs * 1000).toISOString().split('T')[0];

    console.log(`\n🔄 computing ${dateStr}`);
    const startB = await findBlockByTs(dayStartTs, 0, latest);
    const endB   = await findBlockByTs(nextTs,     startB, latest);
    console.log(`   block range: ${startB}–${endB - 1}`);

    let count = 0;
    if (endB > startB) {
      count = await countTransactions(startB, endB);
    } else {
      console.log("   ⚠️ empty range, count=0");
    }

    console.log(`✔️ ${dateStr} → ${count} TX`);
    results.push({ date: dateStr, count });
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

  console.log(`💾 storing ${data.length} days in KV`);
  await redis.set('daily-tx', data);
  console.log(`✅ cache updated (${data.length} days)`);
}

main().catch(err => {
  console.error("💥 backfill error:", err);
  process.exit(1);
});
