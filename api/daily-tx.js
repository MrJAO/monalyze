// api/daily-tx.js
import { Redis } from '@upstash/redis';
import { fetchDailyTransactionCounts } from '../lib/fetchDailyTx.js';

const redis = new Redis({
  url:   process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const CACHE_KEY = 'daily-tx';

export default async function handler(req, res) {
  console.log('🔔 /api/daily-tx', req.query);

  // manual purge
  if (req.method==='DELETE' || req.query.purge==='true') {
    await redis.del(CACHE_KEY);
    return res.json({ purged: true });
  }

  // force-fetch now (will run backfill, may be slow!)
  if (req.query.force==='true') {
    console.log('🚨 force on-chain backfill');
    const fresh = await fetchDailyTransactionCounts();
    await redis.set(CACHE_KEY, fresh, { ex: 24*3600 });
    return res.json(fresh);
  }

  // normal: try KV
  let data = await redis.get(CACHE_KEY);
  if (!data) {
    console.log('❌ cache miss');
    return res.status(204).end();    // no content yet
  }
  console.log(`✅ cache hit (${data.length} days)`);
  res.json(data);
}
