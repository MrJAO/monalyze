// api/daily-tx.js

import { Redis } from '@upstash/redis';

const CACHE_KEY = 'daily-tx';
const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  // manual purge if needed
  if (req.method === 'DELETE' || req.query?.purge === 'true') {
    await redis.del(CACHE_KEY);
    console.log("🗑️ cache purged for daily-tx");
    return res.status(200).json({ purged: true });
  }

  // pure read from cache
  const data = await redis.get(CACHE_KEY);

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(data || []);
}
