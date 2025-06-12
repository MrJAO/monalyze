// api/cron-daily-tx.js

import { Redis } from '@upstash/redis';
import fetchDailyTransactionCounts from './daily-tx'; // export your fetcher
const redis = new Redis({ url: process.env.KV_REST_API_URL, token: process.env.KV_REST_API_TOKEN });
const CACHE_KEY = 'daily-tx';

// on a DELETE or via Cron, force refill
export default async function handler(req, res) {
  const results = await fetchDailyTransactionCounts();

  // set TTL until next UTC midnight
  const now    = Date.now();
  const tmwMid = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate() + 1
  );
  const ttlSec = Math.floor((tmwMid - now) / 1000);

  await redis.set(CACHE_KEY, results, { ex: ttlSec });
  console.log('🕒 Cron: daily-tx cache refreshed');
  res.status(200).json({ ok: true });
}
