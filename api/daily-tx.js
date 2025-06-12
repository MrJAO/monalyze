// api/daily-tx.js

import { Redis } from '@upstash/redis';

// your KV config
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const CACHE_KEY = 'daily-tx';

export default async function handler(req, res) {
  console.log('🔔 daily-tx invoked (method=' + req.method + ')');

  // allow manual purge
  if (req.method === 'DELETE' || req.query?.purge === 'true') {
    console.log('🗑️ Purging cache for', CACHE_KEY);
    await redis.del(CACHE_KEY);
    return res.status(200).json({ purged: true });
  }

  // read from KV
  let data = await redis.get(CACHE_KEY);

  if (!data) {
    console.log('❌ cache miss — no data found under key', CACHE_KEY);
    data = [];
  } else {
    console.log(`✅ cache hit — returning ${data.length} days of data`);
    console.log('   sample ➡️', JSON.stringify(data.slice(0, 3)));
  }

  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(data);
}
