// scripts/backfill-daily-tx.js
import 'dotenv/config'
import { Redis }   from '@upstash/redis';
import { Alchemy } from 'alchemy-sdk';

const MONAD_RPC = "https://monad-testnet.rpc.hypersync.xyz";
const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url:    `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});
const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

// —————————————————————————————
async function fetchBlockHeader(number) {
  const hex = '0x' + number.toString(16);
  const res = await fetch(MONAD_RPC, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: [hex, false],
      id: 1,
    }),
  });
  return (await res.json()).result;
}

async function findBlockByTs(targetTs, low, high) {
  let left = low, right = high;
  while (left <= right) {
    const mid = (left + right) >> 1;
    const blk = await fetchBlockHeader(mid);
    const ts = typeof blk.timestamp === 'number' ? blk.timestamp : parseInt(blk.timestamp, 16);
    if (ts < targetTs) left = mid + 1;
    else right = mid - 1;
    await sleep(20);
  }
  return left;
}

async function countTransactions(start, end) {
  let total = 0;
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
    await sleep(25);
  }
  return total;
}

async function fetch1MissingDayTx(existingDates) {
  const today = new Date();
  const latest = await alchemy.core.getBlockNumber();

  for (let i = 7; i >= 1; i--) {
    const ts = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i) / 1000;
    const next = ts + 86400;
    const dateStr = new Date(ts * 1000).toISOString().split("T")[0];

    if (existingDates.has(dateStr)) continue;

    console.log(`\n🔄 backfilling ${dateStr}...`);
    const startB = await findBlockByTs(ts, 0, latest);
    const endB   = await findBlockByTs(next, startB, latest);
    const count  = await countTransactions(startB, endB);
    console.log(`✔️ ${dateStr} → ${count} TX`);
    return { date: dateStr, count };
  }

  return null;
}

// —————————————————————————————
async function main() {
  console.log("🕒 backfill started (1-day mode)");
  const existing = await redis.get('daily-tx') || [];
  const dateSet = new Set(existing.map(d => d.date));
  const newDay = await fetch1MissingDayTx(dateSet);

  if (!newDay) {
    console.log("✅ All 7 days already cached.");
    return;
  }

  const updated = [...existing.filter(d => d.date !== newDay.date), newDay];
  updated.sort((a, b) => a.date.localeCompare(b.date));
  await redis.set('daily-tx', updated);
  console.log(`✅ Saved ${newDay.date} (${newDay.count} tx) — ${updated.length}/7 complete`);
}

main().catch(err => {
  console.error("💥 backfill error:", err);
  process.exit(1);
});
