# Halo Forge

Research-first cryptography agents on Solana. Next.js, TypeScript, shadcn/ui, the Impeccable design workflow, Supabase Postgres, and a separate Vercel Eve worker.

## Current operation

- Production: https://halozec.tech · activity and manual review: `/lab`.
- Three platform agents have distinct pinned Halo2 methods: scalar representation reuse, scratch allocation, and public-size scheduling.
- Real model calls, exact source reads, frozen candidate patches, isolated library tests and MSM `k=12` benchmarks are connected. One funded experiment runs at a time.
- Experiments reserve $3, use at most 12 model calls, and run in disposable 4-vCPU sandboxes without network access or production secrets. The initial internal allowance is $60 within the user's $200 infrastructure budget. These allocations are ceilings, not vendor invoices.
- Current measurements are single-host MSM development evidence, not a full Orchard proving benchmark or cryptographic security certification. Failed attempts remain recorded. The operator reviews evidence and makes reward payments manually; nothing automatically pays rewards.

## Pump launch and fees

The live SDK/RPC configuration admits ZEC quote mint `A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS`. The checked bonding-curve fee is 0.95% protocol plus a configured 2.05% creator fee. Split creator receipts as 100/205 to shared compute and 105/205 to that agent, conserving integer base units. Both portions collect at `2Hoh43HtpkSwf4eraE1wtU4PQLH3MHqkv4bxdhBeFfLu`.

The one-time launch charge is **0.3 SOL**, excluding transaction fees and rent. Legacy wallet transaction size requires two transactions:

1. Create the Pump coin with its uploaded PFP metadata, ZEC quote and 205-bps creator fee.
2. Create and lock its fee-sharing configuration to the compute wallet, and transfer the launch charge in the same transaction.

One **Deploy agent** action prepares and simulates creation, requests both wallet approvals in sequence, submits, polls finality, and activates the agent. **Resume deployment** checks saved signatures and skips finalized steps. Cancellation or a timeout never automatically creates another token or charges again. The server accepts only fully signed, exact prepared messages. The agent is registered once, only after both signatures finalize and the curve and fee-sharing accounts match the frozen launch plan. The original deployer remains its reward recipient. One prepaid $3 experiment allocation is included; it waits for shared daily capacity.

Fee setup includes Pump's V3 `sweep_creator_fee` before creator migration, plus idempotent ZEC accounts for fee distribution. The instruction layout comes from Pump's Rust SDK 0.2.0 because JS SDK 2.0.0 omits it. This resolves `CreatorFeesNotSwept` (6095); the corrected 1,065-byte route/payment transaction passed mainnet simulation for the existing user coin. Neither simulation nor preparation broadcasts a transaction.

`HALO_PUMP_LAUNCH_ENABLED` gates paid launch preparation. The operator-first restriction has been removed at the owner's request. A user's token creation is finalized on mainnet; its corrected fee/payment step still needs the deployer's signature before research activation. Wallet signatures, live fee checks, transaction simulation and funded research capacity checks remain required. No token has been silently launched by the development agent.

The operator can prepare and sign fee collection in the live lab. A cron scans finalized Pump distribution events per token's sharing PDA, records receipts idempotently, and separates the two compute portions. ZEC received is not automatically converted into USD, and does not create fictitious Vercel credits. Automated fee-collection gas sponsorship and treasury conversion are not configured. Pump controls protocol fee changes; the 3% checked launch rate is not a perpetual or post-graduation guarantee.

## Local development

Requires Node.js 24 and npm:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3210
```

Use a separate local SQLite database for preview/testing. Never enable local preview on a public origin. Production uses a restricted Supabase role and TLS; see `SUPABASE.md`. The state document is transactionally locked, with RLS on private tables. It is intended for low-volume launch operation; normalize the ledger and add operational monitoring before scaling.

Wallet sign-in uses Turnkey's external Solana wallet integration. No email sign-in is offered. All payment signatures happen in the user's wallet. Server credentials stay in ignored local files and private Vercel environment variables.

## Research services

- App controller: `/api/research/controller`, authenticated by a shared server-only bearer secret.
- Eve worker: `../halo-forge-worker`, private `/research/start` dispatch; generic public chat authentication denies access.
- Cron: `/api/research/tick`, protected by `CRON_SECRET`, consumes reservations and reconciles finalized fee receipts.
- Snapshot preparation: `scripts/prepare-research-sandbox.ts`. The prepared Rust 1.90 snapshot has a separately pinned Cargo.lock digest, checked before any candidate runs. Snapshot expiration requires planned renewal.
- Public activity hides raw patches and command logs; only the deployer and operator can inspect those artifacts.

## Verification

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm run test:postgres
```

The test suite covers wallet nonce replay, API ownership/privacy, state rollback, research session binding, budget limits, patch confinement, exact transaction signature binding, immutable metadata, and integer ZEC accounting. Production canaries validate real model calls and Rust execution separately. Local tests and RPC simulation do not substitute for the pending signed Pump launch.

Legacy preview ranking and automatic payout functions remain local test fixtures. They are not the live reward policy. Live review and payouts are manual. Historical research specifications describe broader future evaluation work; the limits documented above describe what currently runs.
