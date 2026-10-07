# Build and review ledger

Implement sequentially: domain and persistence; wallet authentication; overview; directory; launch; agent detail and budgets; challenges; submissions; leaderboard; rewards; review workspace; settings; research runtime integration; end-to-end review.

Each stage gets a functional check. Final browser review covers desktop and mobile in one batch, followed by a bounded correction pass. Production financial operations fail closed until integration prerequisites are met. Preview data never becomes real reward eligibility.

## Completed checks — October 6, 2026

- App production build, TypeScript and ESLint passed.
- 20 automated tests passed. Domain: deployer binding, ownership, idempotency, atomic reservation/refund, caps, pause, immutable submissions, live/preview separation, review conflicts, qualification gates, tie allocation, prefunding, award destination and preview replay. Auth/API: valid and forged signatures, consumed/expired nonces, sessions, origin checks, malformed requests, private patch visibility, logout and preview activation. Measurement: known ratios, workload regression gates, seeded bootstrap, input validation.
- Worker TypeScript and eve production build passed. Build required the local just-bash package; no paid model call or remote sandbox was started. Default model tools are disabled. Typed controller integration remains unconnected.
- Browser acceptance: local identity, two-step agent registration, immutable original deployer, add $20 preview credit, queue/reserve $20, cancel/refund $20, submit QA artifact, observe locked submission. The QA record explicitly makes no optimization claim.
- Browser directory search and owner filter passed. Agent Token & rewards tab exposes mint-not-deployed, unresolved fee allocation and original reward recipient. Challenge scoring tab shows full-prover qualification gates. All navigation routes rendered; a non-reviewer sees the protected reviewer-access state.
- Desktop and mobile overview screenshots saved under `.impeccable/review/`. Mobile document width and scroll width both measured 422 CSS pixels with the provider's requested 390px viewport; no horizontal page overflow. The provider's scaling means this is not a claim of exact 390 CSS pixels.
- Impeccable detector ran once: two typography warnings for Geist and Geist Mono. These were retained as the recorded shadcn-based typography choice, not silently counted as detector success.
- Fresh-context finish reviewer requested two changes: remove mission eyebrow and enforce 44px mobile targets. Both were implemented. Corrected DOM reports 44px computed minimums (43.993 measured due renderer rounding). Follow-up disposition: **ship**, scoped only to those two resolved fixes.
- Browser kept open on the local overview. No external deployment or financial transaction performed.

## Verification limits

Screenshots cover the overview; route smoke checks are not full accessibility certification of every page. Real injected-wallet interaction was not exercised in this browser; Ed25519 sign-in was verified in automated tests. Ranking and payout rules were tested as domain functions, not through a blockchain. Paid worker execution, signed evaluator ingestion, Pump creation, fee collection and real ZEC settlement do not have end-to-end integration evidence.

The app production dependency audit reports zero advisories; its development tree has nine high-severity transitive CLI/lint findings. The worker retains four moderate transitive findings after pinning patched Undici 7.29.1. These are recorded in the READMEs and remain release-review work.

See README.md for the concrete live implementation backlog. The fee split, production chain program, controller and evaluator are unfinished engineering; they cannot be enabled by flipping a preview flag.

CSV follow-up: the initial Blob-based download did not emit a completion event in the embedded browser. Export now uses authenticated GET /api/ledger.csv, with owner filtering and spreadsheet-formula escaping. The new API privacy test passes; the browser downloaded halo-preview-ledger.csv successfully and its three rows reconcile +20 credit, -20 reservation, +20 release.

## Platform team and research diversity update

Added exactly three persistent platform agents and a nine-method research planner. The active API hides earlier illustrative records without deleting them. Existing user balances, identity and submissions survive migration; a SQLite snapshot was saved before applying it. Server-allocated experiments are unique by method and development workload, and queued runs snapshot their assignments. Platform agents have zero spend and Awaiting setup status; no worker or financial operation was started.

Validation: 25 tests, ESLint and the production build passed. Browser confirmed all three platform profiles on the overview, an explicit method/measurement/guardrail brief on Bucket Scout, and balanced coverage selected by default during launch. Mobile launch width equaled scroll width (422 CSS pixels in the browser provider). Captures are platform-desktop.jpg, platform-mobile.jpg and launch-methods-mobile.jpg. These checks do not certify paid execution.


## 2026-10-06 visual redesign

Applied the Hashsmashers structural reference through Impeccable and existing shadcn controls. Latest user direction governs: clean non-pixel typography, black and white dominant, subtle gold. Replaced sidebar with responsive masthead/Sheet navigation, rebuilt overview with research totals and three method-specific agent records, propagated neutral tokens throughout existing routes. Preserved API/domain behavior.

Validation: production build passes; lint passes; 25 tests pass. Browser checked overview desktop/mobile, mobile launch form and mobile navigation. Mobile document clientWidth and scrollWidth both 390. Evidence in `.impeccable/review/zec-*.jpg`. The local preview remains at http://127.0.0.1:3210; paid research and on-chain transactions remain disabled.


## Logo and visual character refinement

Replaced the Z-style mark with the three-part Forge mark in the desktop/mobile header, footer and icon.svg; removed default Next favicon. Added a shadcn-tab research explorer with three conceptual diagrams, clear method/agent links and no invented measurements. Increased type hierarchy and method-specific agent graphics. Simplified the mobile header. Existing APIs and accounting untouched.

Production build and lint pass. Browser: all three method tabs switch to the matching content/link; mobile launch remains readable; no horizontal overflow (clientWidth=scrollWidth). Fresh Impeccable reviewer disposition: ship, no material findings in the scoped visual refinement. Final screenshots forge-desktop.jpg, forge-mobile.jpg, forge-launch-mobile.jpg. Updated mobile image uploaded to Google Drive and metadata verified. Live research/token/payout integrations remain disabled.


## Supabase connection, October 6, 2026

Added a Postgres adapter while retaining explicit SQLite development mode. Asynchronous wallet authentication and API calls preserve ownership checks. Supabase uses a private schema, RLS, a restricted runtime role, verified TLS, bounded pooling and row locks. The administrator password is not stored. The committed certificate is public; runtime credentials are ignored.

Validation: 26 local tests, four live Postgres integration tests, TypeScript, lint and production build pass. Concurrent update and nonce replay tests pass; test fixtures were removed. Supabase security advisors return no findings. Performance advisories are informational and documented in SUPABASE.md. The connected site runs from H/halo-forge; original SQLite records remain untouched. Funded launchpad integrations remain disabled.


## Turnkey wallet flow and header cleanup, October 6, 2026

Removed the requested global preview strip and Pilot preparation caption. Added a lazy-loaded, custom shadcn wallet dialog backed by Turnkey's headless authentication and signing methods. Solana wallet ownership still requires the server nonce challenge; the browser does not assign a deployer identity. Email OTP, existing/new passkeys, Solana account selection, optional Turnstile, sign-out and existing injected wallets are wired. Missing public configuration is handled explicitly without a fake successful connection.

29 local tests and the production build pass. Live Turnkey verification is pending the organization/configuration IDs. No transaction-signing capability, paid research or payout integration was enabled by removing the labels.


Browser follow-up: the requested labels are absent, the custom wallet dialog loads on mobile and desktop, missing Turnkey IDs show an explicit setup-pending state, and injected-wallet errors remain inside the dialog. Saved turnkey-wallet.png. Production dependency audit reports zero advisories. Live OTP/passkey verification remains pending public IDs.
