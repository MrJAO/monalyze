// api/cron-daily-tx.js
import { Redis } from '@upstash/redis';
import { fetchDailyTransactionCounts } from '../lib/fetchDailyTx.js';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const CACHE_KEY = 'daily-tx';

export default async function handler(req, res) {
  console.log('🕒 cron-daily-tx invoked');
  // purge if requested
  if (req.query.purge === 'true') {
    await redis.del(CACHE_KEY);
    console.log('🗑️ cache purged');
    return res.json({ ok: true });
  }
  // back-fill (or re-run) all 7 days
  const data = await fetchDailyTransactionCounts();
  // expire at next UTC midnight + 5m
  const now = Date.now();
  const tmwMid = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()+1, 0,5,0
  );
  const ttl = Math.max(300, Math.floor((tmwMid - now)/1000));
  await redis.set(CACHE_KEY, data, { ex: ttl });
  console.log(`✅ cache updated (${data.length} days), expires in ${ttl}s`);
  res.json({ ok: true });
}
