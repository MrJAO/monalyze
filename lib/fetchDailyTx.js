// lib/fetchDailyTx.js
import { Alchemy } from 'alchemy-sdk';
const MONAD_RPC = 'https://monad-testnet.rpc.hypersync.xyz';
export const alchemy = new Alchemy({
  apiKey: process.env.VITE_ALCHEMY_KEY,
  url:    `https://monad-testnet.g.alchemy.com/v2/${process.env.VITE_ALCHEMY_KEY}`,
});
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function fetchDailyTransactionCounts() {
  console.log('🔄 backfill: fetching last 7 days');
  // latest block
  const latest = await alchemy.core.getBlockNumber();
  console.log(`✔️ latest block: ${latest}`);
  const today = new Date();
  const out = [];

  // for each of the last 7 days…
  for (let d = 7; d >= 1; d--) {
    const dayStartTs = Date.UTC(
      today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - d
    ) / 1000;
    const nextDayTs = dayStartTs + 86400;
    console.log(`🔄 day ${d} ago → ${new Date(dayStartTs*1e3).toISOString().split('T')[0]}`);

    // find start/end blocks
    let l = 0, r = latest, m, header;
    while (l <= r) {
      m = (l+r)>>1;
      header = await alchemy.core.getBlock(m, false);
      const ts = typeof header.timestamp==='number'
        ? header.timestamp
        : parseInt(header.timestamp,16);
      if (ts < dayStartTs) l = m+1;
      else r = m-1;
      await sleep(20);
    }
    const startB = l;
    // now find end
    l = startB; r = latest;
    while (l <= r) {
      m = (l+r)>>1;
      header = await alchemy.core.getBlock(m, false);
      const ts = typeof header.timestamp==='number'
        ? header.timestamp
        : parseInt(header.timestamp,16);
      if (ts < nextDayTs) l = m+1;
      else r = m-1;
      await sleep(20);
    }
    const endB = l;

    console.log(`  block range ${startB}→${endB-1}`);

    // sum tx counts in 50-block batches
    let total = 0;
    for (let i = startB; i < endB; i += 50) {
      const upTo = Math.min(endB, i+50);
      const batch = [];
      for (let b=i; b<upTo; b++) {
        batch.push({
          jsonrpc: '2.0',
          id:      b,
          method:  'eth_getBlockTransactionCountByNumber',
          params:  [`0x${b.toString(16)}`],
        });
      }
      console.log(`⏳ counting tx ${i}→${upTo-1}`);
      const resp = await fetch(MONAD_RPC, {
        method:  'POST',
        headers: {'Content-Type':'application/json'},
        body:    JSON.stringify(batch),
      });
      const arr = await resp.json();
      arr.forEach(r => total += parseInt(r.result||'0x0',16));
      await sleep(50);
    }

    console.log(`  ✔️ day ${d} count = ${total}`);
    out.push({
      date:  new Date(dayStartTs*1e3).toISOString().split('T')[0],
      count: total
    });
  }

  return out;
}
