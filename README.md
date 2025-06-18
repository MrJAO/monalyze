# Monalyze

**Monalyze** is a simple RPC visualizer and tracker for both **Monad's own RPC** and **Envio RPC**.  
I believe having an RPC tracker is important to monitor the RPC statuses during both **testnet** and **mainnet** phases.

### What It Tracks

Monalyze displays real-time and near-real-time status by tracking:

1. **Current Blocks**
2. **TPS** (Transactions Per Second over the last 20 blocks)
3. **Gas Fee**
4. **Average Gas Fee Used** (over the last 20 blocks)

### Ecosystem Tab

The **Ecosystem** section is a bonus feature showing useful information for users who need related details about the Monad ecosystem.

### Important Note

- **Current Block**, **TPS**, and **Average Gas Fee Used** may take a few minutes to reflect the most up-to-date values.
- This is due to intentional throttling in block fetching to avoid exceeding RPC rate limits.
