// scripts/backfill-daily-tx.js
import { Redis }   from '@upstash/redis';
import { Alchemy } from 'alchemy-sdk';

// 1️⃣ on-chain fetch for the last 7 days
async function fetchDailyTransactionCounts() {
  // …binary-search blocks, count tx batches, etc…
}

// KV + Alchemy config
const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url:   `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});

async function main() {
  console.log("🕒 backfill started");

  // ➡️ Early exit if already have 7 days cached
  const existing = await redis.get('daily-tx');
  if (Array.isArray(existing) && existing.length >= 7) {
    console.log('✅ already backfilled; exiting');
    return;
  }

  const data = await fetchDailyTransactionCounts();

  // TTL until next UTC 00:05
  const now    = Date.now();
  const tmw0500 = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate() + 1,
    0, 5, 0
  );
  const ttl = Math.max(300, Math.floor((tmw0500 - now) / 1000));

  await redis.set('daily-tx', data, { ex: ttl });
  console.log(`✅ cache updated (${data.length} days), expires in ${ttl}s`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
