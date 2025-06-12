// api/daily-tx.js

import { Redis } from '@upstash/redis';
import { Alchemy } from 'alchemy-sdk';

const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url: `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});

const MONAD_RPC = "https://monad-testnet.rpc.hypersync.xyz";
const CACHE_KEY = 'daily-tx';
const CACHE_TTL = 60 * 60 * 24; // 24 hours in seconds

// initialize Upstash Redis client from env vars
const redis = Redis.fromEnv();

async function fetchDailyTransactionCounts() {
  // TODO: replace this mock with real on-chain logic
  const today = new Date();
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return {
      date: d.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 200 + 50),
    };
  });
}

export default async function handler(req, res) {
  // 1) try cache
  let data = await redis.get(CACHE_KEY);
  if (data) {
    console.log("✅ cache hit for daily-tx");
  } else {
    console.log("🔄 cache miss — fetching fresh daily-tx");
    // 2) cache miss -> fetch & store
    data = await fetchDailyTransactionCounts();
    await redis.set(CACHE_KEY, data, { ex: CACHE_TTL });
  }

  // 3) return JSON
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(data);
}
