# Halo Forge: research and implementation blueprint

Prepared October 6, 2026. Facts below are tied to source snapshots or linked primary documentation. Proposed policies, budgets, and schedules are explicitly design recommendations. No production deployment or financial transaction was performed.

For specific assignments, agent limits, ranking, grades and prizes, use the newer [competition specification](COMPETITION-SPEC.md). It supersedes this document's illustrative competition defaults, including the acceptance threshold and schedule. The token fee clarification remains tracked in [ZEC pairing](ZEC-PAIRING.md).

## 1. The product we are building

A person chooses a research strategy, pays a launch fee, and receives a public agent page associated with a newly created Solana token. The platform runs that agent in funded sessions. It investigates performance bottlenecks in Zcash proving code, proposes patches, and receives measurements from an independent evaluator. Accepted, reviewed improvements earn ZEC for the agent's registered launching wallet.

The funding arrangement, including the latest ZEC-pair request, is below. The user requested a 3% total fee and 1% on buys/sells for platform compute; the precise interpretation and remaining split are awaiting clarification. See [ZEC pairing and fee design](ZEC-PAIRING.md) for verified configuration and integration requirements.

| Source | Destination | Restriction |
|---|---|---|
| Launch payment | Disclosed setup costs plus the agent's initial compute entitlement | Must cover the promised starting service without future trading |
| Each agent token's dedicated fee allocation | That agent's dedicated compute budget | Exact share pending the latest fee split; no general reward diversion |
| Requested platform share of child trading fees | Shared compute treasury | Target is 1 percentage point of eligible trade value, subject to clarification and executable fee design |
| Main token's creator fees | Shared compute, verification/operations, and the ZEC reward pool | Allocate only money actually received |
| Optional direct top-up | Named agent's compute budget | Explicit separate payment; no token purchase required |

An agent is a persistent research identity with code history and a budget. It does not require an always-running machine. Its worker starts when a session has a funded reservation and stops when it finishes or exhausts that reservation.

The user has specified that every finalized agent award is automatically sent to its original verified deployer wallet. Bind that address at launch and keep it immutable; no claim step or alternate reward recipient is offered. The launch authorization identifies the user even when a platform relayer pays transaction fees. Buying the token does not redirect rewards. Other proposed v1 terms give the launching wallet control of the agent, while token purchases convey no ownership of code or treasury assets. Launching a token also does not mean its creator receives the entire supply: an initial token purchase, if offered, must be separately quoted and explicit.

## 2. What the research can realistically improve

The target is implementation efficiency of cryptographic operations used in Zcash: proof preparation time, CPU consumption, and memory. Transaction confirmation time, ZEC market price, and Zcash fee rules do not become lower merely because a prover implementation is faster. ZIP 317 bases conventional fees on transaction structure. [Fee specification](https://zips.z.cash/zip-0317)

Start with compatible implementation changes. Freeze the circuit, security parameters, accepted statement, proof format, and reference verifier. Changes to circuit constraints or proof systems are a different research category requiring protocol and cryptographic review; they do not belong in an automatic speed competition.

There is evidence for the overall search method: DeepMind's AlphaEvolve combines code-generating models, executable evaluation, and a database of promising programs. This supports testing a similar workflow; it does not establish that our agents will improve Zcash or that a token economy improves research quality. [AlphaEvolve paper](https://arxiv.org/abs/2506.13131)

The open question is measurable: can the platform produce previously unavailable, reviewable improvements more efficiently than a competent developer using the same tooling and budget?

## 3. What the current source actually says

Repositories were cloned read-only for research and pinned to these commits:

| Repository | Commit | Relevant finding |
|---|---|---|
| `zcash/halo2` | `4afa97f221b439450626f2fd03b390e252341e67` | `halo2_proofs` 0.4.0; real arithmetic and proving benchmarks |
| `zcash/orchard` | `616a669df8c9a59c33d47064d3ce04b25d026b2e` | Orchard 0.16.0; depends on Halo 2 proofs 0.4 and gadgets 0.6 |
| `zcash/librustzcash` | `eb3e586765236a808dc82eee85f2be47e11e48c6` | Current development tree uses Orchard 0.16; contains prerelease wallet components |
| `pump-fun/pump-public-docs` | `cb188ce08b5069196eef1f3e4a0c43b70099793b` | Current launch, creator-fee collection, sharing, and holder-reward instructions |

The Halo 2 dependency is the Zcash implementation. Do not substitute an unrelated KZG-based Halo 2 fork because the names match. [Pinned Halo 2 manifest](https://github.com/zcash/halo2/blob/4afa97f221b439450626f2fd03b390e252341e67/halo2_proofs/Cargo.toml)

The current code already incorporates performance work. For example, Orchard 0.16 includes proving-key reuse and batch Merkle hashing; Halo 2 0.4 describes arithmetic changes. Agents must compare against a current, competitive baseline instead of rediscovering already shipped changes. [Orchard changes](https://github.com/zcash/orchard/blob/616a669df8c9a59c33d47064d3ce04b25d026b2e/CHANGELOG.md), [Halo 2 changes](https://github.com/zcash/halo2/blob/4afa97f221b439450626f2fd03b390e252341e67/halo2_proofs/CHANGELOG.md)

### A version mismatch that must be fixed before paid research

The official `orchard_k11_prover` benchmark explicitly selects `FixedPostNu6_2`, creates one coinbase-style output, uses deterministic fixture/proof seeds, and excludes key generation from the timed proof routine. It is a useful controlled fixture, but is too narrow for our final evaluator. [Pinned benchmark implementation](https://github.com/zcash/orchard/blob/616a669df8c9a59c33d47064d3ce04b25d026b2e/benches/orchard_k11_prover.rs)

Current code also contains `PostNu6_3`. The pinned librustzcash consensus code specifies NU6.3 mainnet activation at height 3,428,143 and maps NU6.3 to the V3 Orchard protocol revision. Some explanatory comments and proposal status labels lag other documents. The Ironwood design describes the newer circuit and separate pool. Therefore, bind each challenge to a particular released wallet/node dependency graph, network branch, bundle version, circuit version, and verifying-key digest. Check those against the target network before offering rewards. A repository's newest branch alone does not establish which release a user's wallet runs. [Consensus source](https://github.com/zcash/librustzcash/blob/eb3e586765236a808dc82eee85f2be47e11e48c6/components/zcash_protocol/src/consensus.rs), [Ironwood design](https://zcash.github.io/ironwood/design.html), [NU6.3 deployment specification](https://zips.z.cash/zip-0258)

Our first paid challenge should target the applicable post-NU6.3 proving path once that release mapping is signed off. Keep the older benchmark as a regression case, clearly labeled.

### Local validation performed

The official benchmark compiled with `cargo +stable bench --locked --bench orchard_k11_prover --no-run` using the existing Rust 1.92.0 Windows toolchain. Its `-- --test` smoke run, with `RAYON_NUM_THREADS=1`, succeeded. This establishes that the fixture builds and its real proof path executes in this environment. It is not a performance measurement, a cryptographic audit, or an AI-generated optimization. The upstream recommended toolchain is 1.88; the production runner must pin one exact compiler rather than use a moving `stable` label.

## 4. Research tracks with a plausible path to impact

| Track | Agent experiments | Required evidence | Initial priority |
|---|---|---|---|
| MSM implementation | Public-size window choices, scalar representation reuse, scratch buffers, work scheduling | Correct group result across distributions; full-prover gain | First pilot |
| Polynomial/FFT implementation | Memory access, loop arrangement, temporary allocation, parallel thresholds | Field-equivalent results and no end-to-end regression | Second pilot |
| Prover memory | Reuse temporary storage; reduce unnecessary materialization | Peak RSS and allocation measurements plus correct full proofs | First or second, based on profile |
| Verification/batching | Improve processing of many valid/invalid proofs | Independent rejection corpus and verifier review | Later, separate challenge |
| Wallet scanning | Note-decryption and batch operations | Representative scanning workload and privacy review | Later, a distinct product claim |
| Formal verification support | Prove a narrowly specified lemma or implementation equivalence | Trusted Lean build, no new axioms or weakened statement | Specialist track later |

The current arithmetic source exposes `best_multiexp`, `best_fft`, `eval_polynomial`, and `compute_inner_product`. Its MSM implementation chooses a window from public input size and traverses scalar representations during bucket processing. These are concrete places to profile, not assurances of an easy speedup. [Pinned arithmetic implementation](https://github.com/zcash/halo2/blob/4afa97f221b439450626f2fd03b390e252341e67/halo2_proofs/src/arithmetic.rs)

For the first experiment, test whether preparing scalar byte representations once per MSM invocation reduces repeated conversion enough to help. It may lose because of extra memory traffic or compiler optimization; rejecting that hypothesis is a valid result. Also test window/scheduling changes across different public vector lengths, with parameters fixed before final scoring. Never specialize on a secret scalar or a known proof fixture.

Use profiling to decide which track matters. A 20% microbenchmark gain in a routine consuming 10% of runtime would yield only about a 2% total improvement even if the rest were unaffected. Report whole-prover results prominently.

## 5. The agent loop

The model is a proposal engine. The controller, compiler, measurement service, and reviewer establish what happened.

Each session receives a signed challenge manifest, pinned source, baseline profiles, its approved strategy, remaining budget, and a compact record of earlier attempts. It receives synthetic inputs only. No user's spending keys, wallet data, or live private transaction witnesses are used.

The loop:

1. Inspect the profile and retrieve relevant source and previous experiment records.
2. Write one falsifiable hypothesis with an expected benefit and possible cost.
3. Make a small patch in the challenge's permitted functions.
4. Run inexpensive compilation, property tests, and differential tests.
5. If those pass, run exploratory microbenchmarks.
6. Promote promising patches to full proving tests; discard or archive regressions.
7. Submit a frozen patch plus its provenance to the independent evaluator.
8. Record a concise result and choose the next experiment until the budget/attempt cap is reached.

Models do not train their weights during this process. The system improves through better patches, experiment history, and selection. An agent's name is not a different foundation model. Users can choose from validated model/strategy combinations, but all use the same protected challenge rules.

Use a cheap model for source retrieval and summaries and a stronger coding model for promising changes, if the pilot shows that division saves money. Compare model choices on cost per independently accepted improvement, not benchmark marketing or amount of generated text. Pin model/provider versions where available and retain exact identifiers and usage receipts. Reasoning tokens and retries belong in the bill.

The proposed runtime is an eve TypeScript service with durable sessions, backed by an explicit database state machine. eve supports durable agent work and tool-based applications, but it does not replace our accounting, evaluator, or idempotency rules. [eve setup](https://eve.dev/docs/getting-started), [execution model](https://eve.dev/docs/concepts/execution-model-and-durability)

Give the agent narrow tools: read approved source, edit its worktree, compile, test, request a profile, query its own budget, and submit a patch. It cannot edit its own permissions, challenge, test corpus, model-spend limit, treasury settings, or reviewer decision. Runtime instructions are provided separately in `AGENT-INSTRUCTIONS.md`.

Keep a novelty index keyed by base commit, normalized patch, affected function, hypothesis, and evaluation outcome. Diversify hypotheses between workers rather than paying ten agents to repeat the same failed experiment. Share accepted source improvements at epoch boundaries and preserve contribution attribution.

## 6. Evaluation that cannot be bought or rewritten by the agent

There are four separate statuses: **candidate**, **independently reproduced**, **reviewed for release**, and **adopted upstream**. Passing tests does not mean cryptographic security or upstream adoption.

### Protected build and correctness

The trusted builder checks out the pinned baseline, applies only the submitted patch, and verifies the allowlist. It supplies the compiler, lockfile, build flags, fixture generator, and harness itself. Agent edits to tests, dependencies, compiler settings, verification keys, RNG, serialization, or the judge cause rejection. Build scripts and procedural macros are untrusted execution too, so builds belong in isolation.

The reference verifier is a separately built, unchanged binary. It never links against the candidate library. Otherwise a patch to shared arithmetic could make both the prover and its checker agree on a bug.

Use edge cases and randomized differential tests for arithmetic; valid spend/output bundles across action counts for proving; altered public inputs and malformed proofs for rejection testing. Generate final fixtures after patch freeze. The model never receives final fixture seeds or the verifier's environment. Do not require randomized proof bytes to match byte-for-byte: verify the same statement with the pinned verifier. Record RNG use and review any execution path that might alter blinding or expose private data.

The source benchmark is a useful starting point, but its single public deterministic fixture is not an anti-cheating evaluator. We must add realistic spend witnesses, multiple action counts, fresh proof randomness, and an immutable outer measurement process.

### Timing and memory

Exploration can use disposable cloud workers. Reward measurements use one defined CPU class with an exclusive worker slot, consistent OS/compiler/flags, fixed thread counts, controlled power/thermal conditions, and no competing builds. Run baseline and candidate sequentially in balanced brackets; retain raw samples and host telemetry. Reimage or recreate the isolated runner between untrusted candidates. Dedicated hosts improve comparability but are not a license to execute arbitrary code directly on the host.

Publish a primary metric before the epoch. Suggested first gate: at least 3% full-prover speed improvement, with a paired 95% confidence interval excluding zero, no test-case regression above 2%, and no peak-memory increase above 5%. These are proposed starting thresholds, not scientifically universal numbers. Calibrate repeatability and sample count first; if host noise exceeds the threshold, fix the host. Confirm finalists with a fresh holdout run and a second representative machine. Account for selection across many candidates; one exploratory significant result is not a win.

Measure key generation/cold start separately from steady-state proof generation. A persistent prover's warmed keys do not describe a cold mobile wallet. CPU time, wall time, peak RSS, allocated bytes, proof size, and verifier time are different metrics; keep them separate.

For a fixed workload mix, rank by a geometric mean of baseline/candidate runtime ratios using precommitted weights. Freeze the mix for the epoch. Keep a secondary single-core track and a separate multicore track so changing thread count cannot masquerade as an algorithm improvement.

### Cryptographic review

A valid proof can still leak its witness through timing, memory access, logs, or biased randomness. Review the patch's side-channel behavior under the threat model of the target library. Preserve existing protections, zeroization, input validation, and randomness. Do not claim the entire upstream prover is constant-time merely because one changed routine is reviewed. Constant-time tests can detect some issues but are not a proof of absence.

For accepted patches, require a Rust performance reviewer and a reviewer competent in the affected cryptography. Establish this relationship before selling a service dependent on their approval. If an agent finds a possible security flaw, stop public publication of that artifact and route it through the project's current disclosure process. No live-chain exploit testing is part of this platform. [Zcash disclosure policy](https://github.com/zcash/halo2/security)

## 7. Rewards and attribution

Fund each epoch's ZEC award budget before entries begin. Record the exact wrapped-ZEC mint and base-unit amount. No award depends on future volume, a token price increase, or future entrants.

Suggested initial rules:

- An award is earned after independent reproduction and review against published criteria, not for generating proofs or submitting many patches.
- Automatically pay the original verified deployer wallet after final award approval and the applicable dispute/waiting period. No user claim is required. Token holders receive no automatic award entitlement in v1.
- Timestamp a salted commitment to the patch artifact, challenge, parent, and creator. The full artifact is submitted privately to the evaluator before the deadline, then disclosed after novelty review unless a security embargo applies.
- Only the first eligible independent contribution earns the main award for the same change. A later independent reproduction can earn a separately capped replication bounty if the epoch offered one.
- Evaluate incremental improvement against the accepted epoch baseline and any attributed parent. Group related patch fragments into one contribution so splitting a patch cannot multiply payouts.
- Proposed administrative schedule: seven-day epoch, a clearly bounded review window, then a 72-hour dispute period and payout. Exact review SLA requires a committed reviewer; if that capacity is absent, stop admitting paid submissions.
- Publish failed and zero-improvement epochs honestly. A reward pool can remain unspent.

Version and hash the rules with every submission. Never retroactively alter scoring or split percentages for an existing funded epoch. A payout record contains submission ID, award ID, immutable deployer recipient, token mint, integer amount, approvals, and finalized transaction signature. The proposed distribution program atomically transfers the award and records its unique paid receipt to prevent duplicate payments. Reconcile chain state before retrying an uncertain payout. Pay destination-account setup and transaction costs from platform operations funds so the deployer receives the full awarded ZEC. See the competition specification for binding, automatic execution and failure-state rules.

Reviewers cannot approve their own agents. Keep final decisions and reasons in an append-only audit trail. A valid disclosure embargo may hide code temporarily, but must not create an unexplained change to treasury balances.

## 8. Token launch mechanics

Use the official Pump SDK/IDL, pin its version, and verify program IDs against deployed accounts. The npm registry returned `@pump-fun/pump-sdk` version 2.0.0 during this research; this identifies a package candidate, not a tested integration. The current `create_v2` instruction creates a Token-2022 mint. Its parameters support regular creator-fee coins; set `is_holder_reward=false`, `is_cashback_enabled=false`, and `is_mayhem_mode=false` for this product. Holder-reward mode directs the fee away from our research budget. [Coin creation](https://github.com/pump-fun/pump-public-docs/blob/cb188ce08b5069196eef1f3e4a0c43b70099793b/docs/instructions/COIN_CREATION.md), [holder-reward behavior](https://github.com/pump-fun/pump-public-docs/blob/cb188ce08b5069196eef1f3e4a0c43b70099793b/docs/HOLDER_REWARDS_README.md)

At launch, establish a fee-sharing configuration routing the agreed agent allocation to its compute vault and the agreed platform allocation to shared compute. Do not finalize an irreversible split until its interpretation and exact fee arithmetic are settled. The earlier 100%-to-child design is superseded as a blanket rule by the user's latest platform-share request. The documented lifecycle uses `create_fee_sharing_config`, then `update_fee_shares_v2`; the latter finalizes recipients and revokes further admin updates under the documented program rules. It is not a globally permissionless protocol guarantee against every future upgrade. [Fee-sharing instructions](https://github.com/pump-fun/pump-public-docs/blob/cb188ce08b5069196eef1f3e4a0c43b70099793b/docs/instructions/CREATOR_FEE_SHARING.md)

The required quote asset is the Solana ZEC representation, mint `A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS`. A finalized read at slot 454018869 found it in Pump's quote-control account and found configurable creator fees enabled with a 300-basis-point maximum. This establishes configuration eligibility, not a completed launch integration. Use the quote-control account with `create_v2`, verify the curve's actual quote mint, and test graduation into the canonical ZEC pool. [Snapshot and design](ZEC-PAIRING.md)

Use distinct fee-sharing configurations and compute destinations for each child. Ordinary creator vaults can be shared by creator address, so pointing every token at one undifferentiated creator would make per-agent attribution harder. Keep the source mint and destination agent in the ledger even when settling funds into a common provider bill.

### Proposed atomic path

Create a launch intent containing an unguessable ID, wallet, mint, immutable agent configuration hash, token metadata hash, compute package, exact service charge, fee recipient, deadline, and policy version. Reserve worker capacity before asking for payment.

Build one transaction with token creation, fee-sharing initialization/finalization, and a small platform registry instruction that validates the resulting accounts, charges the agreed service fee, and creates a launch receipt keyed by the intent. The registry should not custody reward funds. Simulation must confirm account ownership, configured recipients, rent, and program behavior. The user's wallet signs; the platform never requests their private key.

This combined flow is a design to validate, not a claim that it has already been simulated. The official Solana docs now distinguish legacy/v0 1,232-byte transactions from v1 4,096-byte transactions and report v1 activation. Wallet/SDK support still must be tested. Try a supported format with actual measured size and compute limits. If the complete sequence does not fit or the SDK cannot encode it correctly, use an explicit recoverable staged flow rather than advertise one signature. [Solana formats](https://solana.com/docs/core/transactions/versioned-transactions)

An alternative staged flow creates the token, completes fee routing, then accepts the service charge and queues compute. Show incomplete setup honestly. Do not take an unconditional launch-service payment and leave the user with an unconfigured token.

No optional initial buy should be silently added. If a user requests one, show token amount, maximum quote spend, slippage, and all additional charges. Chain fees and rent are separate from research service pricing.

### Launch state and failure recovery

`DRAFT -> QUOTED -> AWAITING_SIGNATURE -> SUBMITTED -> FINALIZED -> CONFIG_VERIFIED -> BUDGET_RESERVED -> QUEUED -> RUNNING`

Alternative states: `EXPIRED`, `RECONCILING`, `SETUP_INCOMPLETE`, `PAUSED_NO_BUDGET`, `FAILED_REFUND_DUE`, and `REFUNDED`.

On an RPC timeout, reconcile the same transaction and mint before requesting a new signature. Check transaction success, finality, payer, mint, registry receipt, service amount, and fee configuration using chain data. Do not trust a frontend signature string or webhook alone. Rebuilding with a new blockhash must retain application-level intent identity. A unique registry receipt prevents a second charge under a second signature.

A database outbox creates the worker job after the verified launch is committed. Worker retries are safe because a run lease and reservation are unique. If token creation succeeded but our service cannot deliver its promised initial session, refund the unused service entitlement according to published terms. The token cannot be uncreated, and already spent network fees must not be described as refundable by the platform.

## 9. Collecting fees and paying real bills

Pump distinguishes protocol, LP, and creator fees. Its published SOL/USDC bonding-curve creator rate is currently 0.300%; canonical PumpSwap rates vary with market-cap bands, while the page lists zero creator fees for noncanonical pools. Do not apply those published SOL/USDC tables to the custom ZEC route without verification. A custom creator setting of 300 basis points does not itself establish a 3% total charge. Total token trading volume is not a reliable measure of our revenue. Read actual accruals and settled receipts. [Fee schedule](https://pump.fun/docs/fees)

Before graduation, fees accrue through the bonding-curve path; afterward there is an AMM path as well. For sharing-config coins, sweep AMM fees into the proper Pump creator vault and distribute them under the sharing configuration. Do not use single-creator collection instructions after migration to shared distribution. [Single-creator collection distinctions](https://github.com/pump-fun/pump-public-docs/blob/cb188ce08b5069196eef1f3e4a0c43b70099793b/docs/instructions/COLLECT_CREATOR_FEE.md)

A deterministic treasury service should:

1. Discover accrued balances, batch economically worthwhile collection transactions, and reconcile finalized receipts.
2. Credit the child's compute ledger and platform compute ledger according to its finalized policy, or credit the main-token revenue ledger, exactly once.
3. Keep a small SOL reserve for transactions and rent; convert operating funds to a budget unit matching actual provider invoices.
4. Acquire the announced wrapped-ZEC reward inventory before an epoch starts.
5. Reserve compute before use, record consumption, release unused reservations, and reconcile provider invoices.

Model and cloud vendors usually need their supported billing payment method. Holding USDC in a wallet does not itself pay a vendor invoice. The operating entity needs a legitimate conversion/payment route, provider accounts, prepaid credit or working capital, and reconciled receipts. Do not put a treasury key into an AI agent to solve billing.

The initial proposed main-fee allocation remains 60% research compute, 25% ZEC rewards, and 15% verification/operations/reserve. These are policy assumptions. If fixed review and operations costs exceed 15%, fund them explicitly or change the allocation for future epochs before launch. The child's assigned compute share funds its disclosed service, including its own qualifying evaluation if the terms define it that way. The newly requested platform share funds shared compute. The remaining fee allocation is pending clarification; it must not silently become reward or development revenue.

Ledger fields: asset, base-unit amount, mint, chain, agent ID, source transaction/instruction, quoted exchange rate, realized proceeds, cost category, reservation ID, provider receipt, and policy version. Separate available funds, committed compute, earned unpaid awards, prepaid service liabilities, and free operating reserve. Provider spend and rewards cannot consume refundable/unused customer credit.

## 10. ZEC rewards and treasury authority

For v1, pay a specifically allowlisted ZEC representation on Solana. The read-only 1Click token endpoint returned native `nep141:zec.omft.near` and Solana mint `A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS`, with eight decimals, on the research date. A finalized Solana `getAccountInfo` read at slot 454018113 independently returned an initialized, 82-byte legacy SPL Token mint, eight decimals, no freeze authority, and mint authority `FvULawNPGBbuwYus74ECaQoV1oH9Tk6XPN7VPN51NYds`. The response is saved as `zec-mint-rpc-snapshot.json`. Those observations do not establish who controls the mint authority or audit backing. Verify that authority's canonical bridge relationship, backing, and redemption route before using it. Never select an asset by ticker alone. [Token endpoint](https://1click.chaindefuser.com/v0/tokens), [Solana ZEC listing](https://tokens.solana.com/zcash)

Acquire reward inventory through an allowlisted swap route with exact input/output mints, maximum spend, price-impact bounds, and minimum received amount. Jupiter's current documentation uses Swap API v2, with an API key and separate assembled-transaction versus raw-instruction paths. Decode and validate any supplied transaction before signing. [Jupiter Swap API](https://developers.jup.ag/docs/swap)

Native Zcash payout can be added later. The NEAR Intents chain-support page currently documents transparent Zcash addresses only. Its confidential-swap feature does not, by itself, establish Orchard/Ironwood shielded delivery. A claim of native shielded payout requires a separately demonstrated route, custody explanation, supported address decoder, completion/refund tracking, and privacy analysis. Do not infer support from a unified-address prefix. [Chain support](https://docs.near-intents.org/resources/chain-support), [confidential-swap documentation](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/confidential-swaps)

Use a multisig reserve and a narrowly funded operations signer. Squads exposes spending limits for designated members; verify exact destination/asset/time controls in the chosen integration. Limit treasury automation by transaction purpose, destination, amount, and daily total. Rewards require independent approval. The research workers hold no signing authority. [Squads spending limits](https://docs.squads.so/main/development/reference/spending-limits)

Every on-chain destination is public, but a multisig controlling a compute vault still has custody and operational discretion. Describe those trust assumptions honestly. An immutable fee recipient alone does not prove honest off-chain compute spending. Publish receipts, liabilities, operator permissions, and reconciliation totals.

## 11. Infrastructure and data flow

| Component | Proposed role |
|---|---|
| Next.js web app | Wallet connection, launch quote, agent pages, experiment history, budgets |
| TypeScript/eve controller | Durable research sessions and narrow tool orchestration |
| Postgres plus durable queue/outbox | Authoritative agents, reservations, jobs, state transitions, ledger |
| Object storage | Immutable patches, profiles, raw results, signed manifests, build artifacts |
| Disposable microVM builders | Compile/test untrusted patches with resource and egress controls |
| Exclusive benchmark workers | Reproducible final measurement; isolated candidate execution |
| Independent verifier service | Pinned unchanged checker and signed evaluation records |
| Solana indexer/reconciler | Finalized launch, fee, swap, and payout events |
| Treasury service/multisig | Collect fees, fund billing, acquire rewards, approve payments |

The web app and controller can run on Vercel; long-running Rust builds and final benchmarks should not run inside a web request. Use separate workers so traffic spikes cannot distort timing or make launch requests wait for compilation.

Vercel Sandbox is one viable exploration environment: its documentation describes microVM isolation, egress policies, and credential brokering. Use a clean, pinned image with vendored dependencies, and deny network access while candidate code executes. Keep model credentials outside the worker and call models through the controller. Managed sandbox timing remains exploratory unless the hardware conditions are demonstrably stable. [Sandbox](https://vercel.com/sandbox), [network boundary](https://vercel.com/blog/a-sandbox-without-a-network-boundary-is-only-half-a-sandbox)

Block candidate access to cloud metadata, host sockets, other agents' files, treasury services, and final judging secrets. Enforce CPU, RAM, process-count, disk, output-size, and wall-clock limits. An LLM telling a worker to respect a budget is not a budget control.

Suggested core tables: `agents`, `agent_configs`, `launch_intents`, `chain_events`, `fee_receipts`, `ledger_entries`, `reservations`, `research_sessions`, `experiments`, `submissions`, `evaluations`, `review_decisions`, `awards`, `payout_attempts`, `outbox`, and `audit_events`. Use integer base units and fixed-precision accounting, never floating point for balances.

Uniqueness keys include `(chain, signature, instruction_index, event_kind)`, launch intent ID, `(agent_id, session_number)`, normalized patch digest plus challenge version, and award ID. Out-of-order callbacks, duplicate webhooks, process restarts, and uncertain submissions must converge through reconciliation.

Expose useful summaries, code diffs, compiler/test results, raw benchmark samples, and costs. Do not present fabricated agent monologue or imply a research session is running when it is queued. Public pages show budget status, funding sources, last completed experiment, current baseline, and review status.

## 12. Budgets and capacity

Launch fees buy a bounded service package. Quote in a stable accounting unit, offer payment in SOL or an accepted stablecoin, set a short expiry, and show network costs separately. Never promise lifetime compute for a one-time fee.

Use this formula:

`session cost = model usage + builder CPU + provisioned memory + evaluator allocation + storage/egress + review allocation`

Model usage includes every input turn, cached versus uncached tokens, billable reasoning/output, tool charges, and retries. Memory billing continues while a sandbox waits if memory remains provisioned. Freeze/snapshot idle sessions instead of paying to keep all agents awake.

For a transparent scenario, `economics.py` uses $4 per million input tokens and $20 per million output tokens, a currently listed gateway model price. This is a costing reference, not a model-selection verdict. It assumes no cache discounts. It uses Vercel's published default-region rates of $0.128 per active vCPU-hour and $0.0212 per provisioned GB-hour. The dedicated evaluator rate of $1.50 per worker-hour is an explicit planning assumption requiring a quote. [Model price reference](https://vercel.com/ai-gateway/models/gpt-6-sol-fast), [sandbox pricing](https://vercel.com/docs/sandbox/pricing)

A standard illustrative session of 40 calls with 60,000 input and 2,000 output tokens per call costs $11.20 in model usage. Add four active vCPU-hours, 16 GB-hours, and 0.75 evaluator-hours: $13.1762 before reserve. A 20% contingency makes $15.81144. Human review, support, monthly platform minimums, rent, gas, swaps, and legal/development costs are additional. This is why an arbitrary very small SOL fee cannot promise hours of premium-model research.

Ongoing main-token capacity is constrained by realized revenue. At an assumed effective creator rate of 0.30%, $100,000 of eligible daily volume produces $300 gross creator fees, of which a 60% compute allocation is $180. At $16 per session that supports 11 complete sessions, before additional exclusions. At 0.05%, the same volume produces $50 and only $30 for compute. These are scenarios, not forecasts; neither price nor trading volume is promised.

For 50 sessions a day at a $16 compute allowance, $800 is needed. With 60% allocated to compute, the required daily revenue is about $1,333.33. That corresponds to about $444,444 of eligible volume at 0.30%, or $2.67 million at 0.05%, ignoring further costs. Child-token fees reduce the shared subsidy needed only after those fees are actually received and credited to their child.

Set hard daily treasury spend limits, a minimum operating reserve, and maximum concurrent sessions. Pre-reserve worst-case spend before an API call or worker starts; settle actual charges afterward. Provider dashboards are a second line of defense, not the accounting system.

Suggested initial scheduler: guaranteed purchased credits first; each child's fee-funded sessions second; a capped shared-subsidy queue for promising, diverse research. Keep some shared slots for new hypotheses so incumbents cannot consume everything. Token market cap and trading volume must not decide whether a patch is correct or wins a reward.

Multiple wallets defeat simple per-wallet anti-Sybil rules. Require paid initial service, cap the total shared pool, detect duplicate experiments, and allocate scarce subsidy based on documented research criteria. Do not claim wallet limits establish unique humans.

## 13. Operations that must exist before launch

Monitor queue age, pending launch receipts, RPC divergence, fee-collection lag, remaining prepaid credits, budget overspend, worker failures, benchmark variance, provider price changes, review backlog, and payout reconciliation. Alerts should lead to a documented response: pause new launch quotes, stop new jobs, isolate an evaluator, or hold an uncertain payment.

Publish incident and refund policies. If an agent runs out of funds, checkpoint and pause it. If the platform fails to provide purchased compute, preserve the ledger and refund the unused entitlement under the service terms. Child trading fees are earmarked research funds, not the launcher’s refundable purchase balance. Before permanently fixing fee destinations, define a wind-down/successor-operator policy for remaining and future accrued compute funds. That policy needs legal and operator review.

Maintain encrypted database backups, object versioning, reproducible builds, dependency updates, signer recovery procedures, and a tested restore drill. Provider charges must be recoverable from invoice reconciliation even if a worker dies before reporting usage.

Review licensing for every submitted patch. The inspected Halo 2 and Orchard revisions use MIT/Apache-2.0 licensing. Preserve notices and obtain contributor permission consistent with upstream requirements. Have a qualified reviewer submit only tested, useful patches upstream; do not spam maintainers with agent-generated PRs. Adoption is a separate decision made by upstream maintainers. [Halo 2 license and contribution policy](https://github.com/zcash/halo2/blob/4afa97f221b439450626f2fd03b390e252341e67/README.md), [Orchard license](https://github.com/zcash/orchard/blob/616a669df8c9a59c33d47064d3ce04b25d026b2e/README.md)

The operator's country, user countries, fee custody, token marketing, and reward rights remain unspecified. Have qualified counsel review the concrete design before public paid launch, particularly the combination of token sales, ongoing managerial promises, and monetary awards. A token's label does not settle its treatment. Current SEC staff FAQs address promises of managerial efforts; FinCEN's guidance addresses different virtual-currency business models. These sources identify review questions, not a classification or exemption for this project. [SEC FAQs, September 25, 2026](https://www.sec.gov/about/divisions-offices/division-corporation-finance/faqs-crypto-assets), [FinCEN business-model guidance](https://www.fincen.gov/resources/statutes-regulations/guidance/application-fincens-regulations-certain-business-models)

## 14. Implementation sequence and measurable gates

The time ranges below are planning estimates for experienced developers, not a delivery promise. Reviewer availability and research outcomes can change the schedule.

| Phase | Work | Exit evidence |
|---|---|---|
| 0: baseline, roughly 3-5 working days | Confirm deployed release mapping; pin current circuit; build full workload fixtures; profile; qualify host | Baseline verifies; A/A comparisons are stable; old/new circuit distinction recorded |
| 1: research pilot, roughly 1-2 weeks | Run capped agents on approved hypotheses; independent tests; human review | A new, reproducible, reviewable end-to-end improvement or a documented no-improvement result |
| 2: launch integration, roughly 1-2 weeks, can overlap | SDK/IDL adapter; metadata; fee routing; launch receipts; duplicate/retry tests | Devnet/local integration proof and observed transaction-size/compute data |
| 3: economics and treasury, roughly 1-2 weeks | Ledger, budgets, conversion/billing, vaults, fees, rewards | Every dollar/base unit reconciles; zero-volume behavior and duplicate payout tests pass |
| 4: limited mainnet beta | Small operational caps after reviews | One complete launch-to-research-to-reviewed-award lifecycle with real reconciliation |
| 5: broader access | Increase capacity from evidence | Stable costs, reviewer throughput, several useful research results, clear service terms |

A lean team needs a Rust/performance engineer, a Solana/backend engineer, and an agent/runtime engineer; one strong person can cover roles more slowly. Retain a cryptography reviewer independently of performance judging. Smart-contract review, deployment operations, and legal/accounting support are additional services.

Proposed pilot budget: 20 capped sessions at up to $20 variable spend each, plus $200 for repeat evaluation capacity, totals $600 before expert time, provider minimums, taxes, and development. Use founder-funded research money for this experiment. A hard cap is useful even if the first ten sessions produce nothing.

Do not enable public paid launches solely because the landing page and token transaction work. Require a functioning research loop, qualified evaluator, auditable budget controls, tested launch recovery, and a real reviewer commitment. The pilot need not promise a particular percentage gain, but if it never finds a useful improvement, revise the task selection before selling the scientific premise.

## 15. First implementation backlog

1. Map current wallet/node release to pinned Orchard/Halo 2 lockfiles and the appropriate circuit/version key.
2. Implement the production-like proving corpus and an unchanged verifier executable.
3. Build the protected evaluator; establish variance and correctness baselines.
4. Add profiles and implement the first narrow agent session using `AGENT-INSTRUCTIONS.md`.
5. Run the first cost-capped experiment cohort and review the best candidate.
6. Prototype the complete unsigned token/fee-routing/registry transaction; prove finality and retry handling in test environments.
7. Implement double-entry accounting, per-agent earmarks, compute reservations, and fee reconciliation.
8. Add treasury purchase/payout policies and vendor billing reconciliation.
9. Build the launch page and public experiment evidence once backend truth exists.
10. Complete review, operational drills, and a small beta before opening broad paid access.

## 16. What remains unverified

- No AI agent has yet demonstrated a new speed or memory improvement in this task.
- The complete current-network proving corpus and immutable evaluator have not been implemented.
- Source compilation/smoke execution is not a security audit.
- The combined token launch and fee-routing transaction has not been simulated or broadcast.
- ZEC quote eligibility and the 300-basis-point creator-fee ceiling were observed on-chain, but total custom-route fees, exact requested allocation, quote-token fee sharing, and graduation behavior remain unverified.
- Pump SDK 2.0.0 was identified, but deployed-program compatibility, wallet v1 support, launch-account authorities, minted child-token controls, and compute limits still need an integration probe.
- The observed ZEC mint has not been independently audited for bridge backing, authority risk, or redemption reliability.
- Model quality, actual per-agent bills, reviewer availability, and sustained fee revenue remain unknown.
- Native shielded Zcash payouts are deliberately outside v1 until independently validated.
- Pricing, reward schedule, child-token holder rights, and wind-down terms are proposed defaults for product/legal approval; the funding destinations themselves follow the user's confirmed instructions.

Research can identify these dependencies and design tests. Only the pilot, integration tests, and specialist reviews can establish that the whole service works.

## 17. Required end-to-end acceptance tests

These are implementation tests to write, not tests already passed by this research pack.

| Scenario | Required behavior |
|---|---|
| User rejects signature or quote expires | No service debit, no worker allocation, quote capacity released |
| Atomic token/fee-route/receipt instruction fails | No partial service launch; report network transaction cost accurately |
| Submission times out after landing | Reconcile existing intent/mint; never charge or create another token blindly |
| Callback is duplicated or arrives out of order | One fee credit and one run reservation |
| Child token fee collection before and after graduation | Both accrual paths reconcile to that child's own budget |
| Holder-reward mode or wrong recipient is detected | Launch is not accepted as correctly configured |
| API provider retries or worker dies | Spend remains bounded; usage reconciles; no repeated billed experiment without policy |
| No main-token trading for a week | Only prepaid/child-funded work continues; shared jobs pause without overdraft |
| Many new wallets launch copies | Purchased service is delivered; global subsidy cap and duplicate detection hold |
| Agent edits tests, RNG, verifier, or benchmark timer | Patch rejected before reward evaluation |
| Agent submits a canned proof or leaks a fixture | Fresh fixtures/reference checks reject it; privacy review records the issue |
| Microbenchmark improves but full prover regresses | No qualifying speed award |
| Host variance or thermal drift exceeds threshold | Measurement is invalidated, not treated as a win |
| Two submissions contain the same effective change | Attribution policy pays only the eligible original contribution |
| Swap returns an unexpected mint, excessive spend, or stale quote | Treasury signer refuses it |
| Payout RPC times out after transaction lands | Award is reconciled and recorded once; no duplicate transfer |
| Evaluator/report signing key is compromised | Stop awards; revoke key; independently re-evaluate affected results |
| Platform shuts down or changes operator | Published refund and earmarked-compute succession rules govern remaining balances |

Prove these flows with simulated failures and test funds before expanding mainnet limits. A happy-path demonstration alone is insufficient for paid launches.
