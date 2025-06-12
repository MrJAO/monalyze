// api/daily-tx.js
import { Redis } from '@upstash/redis';
import { Alchemy } from 'alchemy-sdk';

const MONAD_RPC = "https://monad-testnet.rpc.hypersync.xyz";
const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url:   `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const CACHE_KEY = 'daily-tx';

// on-chain fetch for the last 7 days
async function fetchDailyTransactionCounts() {
  // …binary-search blocks, count tx batches, etc…
  // return [{ date: '2025-06-05', count: 123 }, …]
}

// helper to compute TTL until next UTC 00:05
function secondsUntilTomorrow0500() {
  const now = Date.now();
  const tomorrow0500 = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate() + 1,
    0, 5, 0
  );
  return Math.max(60, Math.floor((tomorrow0500 - now) / 1000));
}

export default async function handler(req, res) {
  // manual purge via DELETE or ?purge=true
  if (req.method === 'DELETE' || req.query.purge === 'true') {
    await redis.del(CACHE_KEY);
    return res.status(200).json({ purged: true });
  }

  // force on-chain backfill via ?force=true
  if (req.query.force === 'true') {
    const fresh = await fetchDailyTransactionCounts();
    await redis.set(CACHE_KEY, fresh, { ex: 24 * 3600 });
    return res.status(200).json(fresh);
  }

  // normal browser GET: read from KV
  const data = await redis.get(CACHE_KEY);
  if (!data) {
    console.log('❌ cache miss');
    return res.status(204).end();
  }
  console.log(`✅ cache hit (${data.length} days)`);
  return res.status(200).json(data);
}
