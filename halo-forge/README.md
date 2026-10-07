# Halo Forge

A research-first cryptography agent workspace built with Next.js, TypeScript, shadcn/ui and the user-selected Impeccable design workflow. The main screen follows research progress; each agent owns its token, compute and reward details.

**Current release: working local preview.** It does not mint tokens, collect fees, run paid research, or transfer ZEC. Do not deploy it as a funded launchpad. Three built-in platform agents have persisted assignments and an explicit setup-pending status; they have not begun research. Local test identities have no associated private keys.

## Run

Requires Node.js 24 and npm. The preview uses Node's built-in SQLite module, which currently emits an experimental-feature warning.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3210
```

Open http://127.0.0.1:3210. The configured `HALO_APP_ORIGIN` must match the browser origin exactly. Use **Connect wallet → Use local preview account** to exercise setup without funds. Wallet signature sign-in is also implemented for compatible injected Solana wallets; live spending remains disabled.

Without Supabase configuration, the local SQLite database lives in `.data/halo.sqlite`. Keep that file and its WAL together when backing up; stop the process or use SQLite's online backup facilities. Supabase Postgres is now supported through a restricted server role and verified TLS; see [SUPABASE.md](SUPABASE.md). Postgres state mutations lock the state row so concurrent requests cannot overwrite each other. The state document remains a low-volume preview design, not a scalable financial ledger. Sessions expire after 24 hours. Signing out of a preview identity makes its existing records read-only unless that session was preserved; preview identities are not recoverable wallets.

## Working pages and behavior

| Surface | Implemented |
|---|---|
| Overview | Research progression, challenge criteria, agents and latest artifacts |
| Agents | Search, assignment/ownership filters, detail pages |
| Launch | Validated two-step setup, server-derived immutable deployer |
| Agent research | Assignment, session history, frozen submissions |
| Agent compute | Preview credits, atomic $20 reservations, daily cap, cancellation/refund, pause/resume |
| Agent token & rewards | ZEC mint, fee requirements and original reward recipient; no invented mint or market |
| Challenges | S1/S2/S3 targets, full-prover rules, grading, prize allocation and timeline |
| Findings | Search/status filters, immutable SHA-256 artifacts, owner/reviewer-only patch contents |
| Leaderboard | Qualified distinct contributions, conservative scores, deterministic tie allocation |
| Rewards | Proposed pool and award history; no fake transaction receipts |
| Compute | Owner-scoped balances, itemized ledger and CSV export |
| Review | Reviewer-only rejection; qualification cannot be entered as a browser score |
| Settings | Wallet identity, readiness and audit history |
| Guide | Research process and precise local/live boundaries |

The application has origin checks, nonce-based Ed25519 wallet verification, hashed HTTP-only sessions, mutation rate limits, strict input schemas, ownership checks and idempotent commands. Tests are evidence of these implemented paths, not a security audit.

`src/lib/measurement.ts` implements the proposed weighted log-ratio score and deterministic matched-block bootstrap. `src/lib/domain.ts` implements qualification gates, duplicate-family ranking, exact base-unit prize splitting, frozen deployer-bound awards and preview settlement. These are internal rules, not a deployed evaluator or on-chain program. There is no public approval/settlement endpoint.

## Verification

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

26 local tests cover domain accounting, identity, API privacy/authorization, idempotency, eligibility, ranking, award destination, settlement replay and benchmark mathematics. Browser testing exercised local registration, credit, queue/cancel, immutable submission and responsive layout. See [BUILD-REVIEW.md](BUILD-REVIEW.md) for exact scope.

The application production dependency audit reported zero advisories on October 6, 2026. The full development tree still reports nine high-severity findings in CLI/lint dependency chains; do not treat a clean production audit as a clean development audit. No breaking downgrade was applied automatically.

## Required live implementation

1. Finalize the fee policy: a requested 3% total, the 1% platform compute share, remaining allocation and whether it applies per trade side. A 300-bps creator fee setting does not establish a 3% all-in swap fee. No split has been invented.
2. Implement and test the Pump ZEC quote creation flow, signed launch receipts, creator-fee destination, finality reconciliation and immutable deployer registry. Confirm the approved ZEC representation and its backing arrangements.
3. Connect the separately built `../halo-forge-worker` to a paid-run dispatcher and pre-call billing controller. Provision isolated, network-disabled compilation workers. Its tool contract is implemented; the remote controller is not.
4. Pin the current released Orchard circuit mapping, real fixture generator, two evaluator host profiles, public baseline, edit allowlist and signed evidence ingestion. Calibrate actual cost and noise before accepting paid entries.
5. Implement and review the on-chain reward distributor, prefunded vault, two-reviewer attestation, dispute holds, duplicate-award protection and automatic executor. The executor must pay gas and token-account creation, transfer only to the original deployer, reconcile finalized signatures, and retry safely.
6. Normalize the Postgres state document into independently constrained records before funded operation. Add private artifact storage, service authorization, monitoring, backup/recovery and operational review. The initial Supabase migration and serialized row-locking adapter are implemented. Fund compute and prize reserves separately. No reward reserve may silently pay compute expenses.

These are remaining engineering/infrastructure work, not just environment variables. Neither a wallet connection nor a model API key enables them.

## Source and design records

- `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`
- `.impeccable/review/` — desktop/mobile captures and independent finish review
- `../halo-forge-research/` — cited research, source locks, competition specification, economics and ZEC/Pump snapshots
- `../halo-forge-worker/WORKER-CONTRACT.md` — exact worker/controller integration boundaries

Design components come from shadcn/ui; Impeccable supplies the design workflow. No other design system, generated imagery or paid template was used.

See [RESEARCH-ALLOCATION.md](RESEARCH-ALLOCATION.md) for the three platform agents, nine research methods, unique experiment allocation and startup behavior.
