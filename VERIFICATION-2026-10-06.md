# Halo Forge verification — 6 October 2026

**Result: the website and supporting connections work, but the research-to-token-to-reward flow is not implemented end to end. Do not treat passing tests as evidence of agent contributions.**

Verified production: https://halozec.tech, Vercel deployment `dpl_CW6rREN2NFKwRjoeqTFrbGWyzcRQ`, commit `1f3280b04fda8b0fcb5e6924de74824ef3b519cd`, status READY. The source was already current with `origin/main` before this audit. Tests added by this audit do not change the deployed runtime.

## Intended flow

A deployer authenticates with a Solana wallet, launches a token and its research agent, funds compute through verified fees, and receives an automatic reward only after a reproducible improvement passes automated evaluation. Three platform agents must explore distinct methods.

## Results

| Check | Result | Evidence and limit |
| --- | --- | --- |
| Application tests | PASS, 33/33 | Auth, ownership, retries, PFP normalization and persistence, assignment allocation, preview accounting, statistical scoring and preview award routing. Includes a new signed-wallet API test. These are not on-chain integration tests. |
| Postgres integration | PASS, 4/4 | Restricted-role access, concurrent writes/rollback, nonce replay race and rate-limit concurrency. Test fixtures cleaned up. |
| Database configuration | PASS | Restricted `halo_app` role, four private tables, RLS enabled, three platform agents. |
| App lint and production build | PASS | ESLint and Next.js production compilation/type checking completed. |
| Worker typecheck and build | PASS | Eve compiles. This does not start a research job. |
| Mainnet and devnet RPC | PASS | Read-only health calls and exact expected genesis hashes. No transaction was sent. |
| AI Gateway streaming | PASS | Actual `openai/gpt-6-astra` request returned 58 text chunks, 70 input / 62 output tokens, finish reason `stop`; generation `gen_01M4A5J6G64SYGZVJE5NZ9R9RA`. The fixed prompt describes the workflow; it is not a research experiment. |
| Production pages | PASS for HTTP availability | Eleven top-level routes and `/agents/platform-1` returned HTTP 200. This is not exhaustive interaction coverage. |
| Production launch UI | PASS through review | Required fields prevent empty progression; populated form reaches review; review explicitly says no Pump token or launch payment. No registration was submitted. |
| Wallet UI | PARTIAL | Wallet-only Phantom option loaded; no email signup shown. Real wallet signing was not completed in this audit. Browser logged a Phantom extension disconnected-port error. The isolated API test verifies a real Ed25519 signature, nonce consumption and resulting non-preview session. |
| Distinct research assignments | PASS | Bucket Scout: `S1-representation`; Scratch Worker: `S2-scratch`; Thread Weaver: `S3-chunks`. Tests also verify coverage across nine methods and refusal of occupied experiments. |
| Real research contributions | BLOCKED | Stored state has zero runs and zero findings. All three agents are `awaiting_setup`, preview=true, autoRun=false, budget/reserved/spent=0. |
| Worker controller | BLOCKED | `HALO_CONTROLLER_URL` and `HALO_CONTROLLER_TOKEN` absent. Calling `read_assignment` through the worker controller returned: “Research controller is not configured. No job was started.” No controller service or dispatcher implementation exists in this repository. |
| Token launch and linking | BLOCKED | All three stored `tokenMint` fields are null. `execute("launch")` only creates a preview agent and explicitly logs “no token minted”. No Pump transaction builder, confirmation reconciler or mint-to-agent binding is implemented. |
| Fees funding compute | BLOCKED | Requested 3% total / 1 percentage point shared compute are displayed intentions. No verified fee collection or reconciliation service credits real agent budgets. |
| Automated measurement ingestion | BLOCKED | Statistical scoring helpers exist, but no isolated candidate evaluator, authenticated final-evidence ingestion or automatic qualification flow is connected. |
| Qualification policy | FAIL against current requirements | `qualifyFinding` still requires two independent human reviewer identities. The user removed that requirement; it must be replaced with authenticated automated evidence, not simply bypassed. |
| Automatic on-chain rewards | BLOCKED | Preview award calculations bind the original deployer and have replay/tampering tests. Settlement only sets `preview_settled`; no Solana transfer is sent. Stored awards and payment signatures both number zero. |
| Budget policy | UNRESOLVED | App reserves $20 per preview session; worker has a separate $5 model-cost limit checked after calls. The proposed $3/run and $10/day operating limits are not implemented. No hard combined model+sandbox reservation exists. |

Production `/api/state` reports `mode: preview`, `liveReady: false`, `storage: postgres`, and actual prize pool zero. The empty run/finding counts above were also checked directly through the restricted database connection; they are not inferred from the public API's owner-filtered run list.

## New regression coverage

`halo-forge/tests/api.test.ts` now exercises challenge → locally generated Ed25519 signature → verification → authenticated state. It then attempts live launch, top-up and queue calls, verifies each returns 503 rather than simulated success, verifies application state is unchanged, and verifies signature replay returns 401. The temporary test wallet has no funds and is used only in isolated SQLite fixtures.

## Implementation needed before a successful end-to-end test

1. Implement a controller and durable dispatcher with session-to-run binding, ownership, retries, cancellation, and pre-call model/CPU spending reservations. Start the three platform methods only through this path.
2. Implement isolated, disposable evaluation of allowlisted patches against pinned source revisions. Store patch hashes, baseline/candidate commands and results, correctness checks, per-workload timings, regression/memory checks and actual cost. Candidate code must not run inside the web server or with production credentials.
3. Replace the obsolete human reviewer gate with authenticated automated evaluator evidence. A negative or inconclusive experiment remains a useful recorded attempt, not a qualifying discovery. A successful test cannot guarantee a security improvement or discovery.
4. Implement and verify the supported token launch route: deployer-signed launch, confirmed mint, immutable mint/agent/deployer mapping, metadata, intended quote asset, confirmation retry/recovery and chain-event verification. The `/ ZEC` label is not proof of an existing pool. Verify current platform support before promising the requested fee structure.
5. Implement fee collection and accounting with confirmed-chain-event deduplication, the correct agent budget attribution, operating cost reconciliation and global/per-agent caps. Connect the main coin only after its mint is supplied and verified.
6. Implement funded reward settlement with immutable recipient binding, idempotent payout jobs, exact mint/amount checks, transaction confirmation and restart recovery. Start with a controlled devnet integration test before any real transfer.
7. Run one complete canary through launch → confirmed token link → funded reservation → recorded experiment → automated assessment → any eligible reward → confirmed receipt. Also exercise failed launches, evaluator failures, insufficient funds, duplicate events and restarts.

## Product copy discrepancies observed

- Agent setup says its platform deployer still needs configuration while the supplied wallet is already displayed. Saving that address is not proof of wallet ownership or authority to spend.
- The launch sidebar says the agent works on proving code although the execution pipeline is absent.
- The token/rewards panel describes automatic payments in the present tense while settlement is preview-only.
- The footer and qualification code still reflect the old independent-review policy.

These are recorded as defects; this audit does not enable live spending, publish fictional findings, or assert that any agent has improved Zcash.
