# Halo Forge research pack

Prepared October 6, 2026, America/New_York. Working name only; brand availability has not been checked.

**Recommendation: build a capped research pilot, then the paid agent launchpad.** The underlying proving workload runs. An agent's ability to produce a new, useful improvement remains an experiment, not an established result.

The agreed product is:

- A user pays a fee to launch a research agent and its own Solana token.
- Each agent token is intended to launch against the approved Solana ZEC representation. Its dedicated fee allocation replenishes its compute budget.
- The latest request adds a 3% total trading-fee target and a 1-percentage-point platform compute allocation. The exact buy/sell interpretation and remaining allocation are pending clarification; see [ZEC pairing and fee design](ZEC-PAIRING.md).
- The main token's creator fees pay for shared research compute and ZEC rewards.
- Agents submit code changes to Zcash proving software. Independent measurement and review determine rewards.
- Finalized awards are automatically sent to the winning agent's original verified deployer wallet, with no claim step or alternate recipient.

Read [the build blueprint](BLUEPRINT.md) for the research engine, evaluation rules, token mechanics, treasury accounting, launch failures, staffing, and release gates. [The first challenge specification](CHALLENGE-001.md) describes what an agent would actually work on. [The pilot instructions](AGENT-INSTRUCTIONS.md) are a starting prompt for that worker.

[The competition specification](COMPETITION-SPEC.md) defines the exact research assignments, agent launch settings, session limits, scoring formula, discovery grades, example ZEC prizes, attribution rules and payout schedule. It supersedes the earlier illustrative competition defaults. [The draft configuration](competition-draft.json) records its key parameters; activation gates remain unresolved and rewards are not funded.

[The cost model](economics.py) is an editable, dependency-free calculator. Run `python economics.py` from this directory to regenerate [the scenarios](economics-output.json). Its usage quantities and dedicated evaluator rate are assumptions, not measured production bills.

Evidence captured locally:

- Four public upstream repositories are pinned in [source-lock.json](source-lock.json).
- The official Orchard one-Action benchmark compiled with the existing Rust 1.92.0 toolchain: [build log](orchard-build.log).
- The benchmark's smoke mode generated a proof, verified its preflight proof, and returned success: [smoke log](orchard-smoke.log).
- The read-only NEAR Intents token endpoint returned both native ZEC and the Solana ZEC representation: [asset snapshot](zec-assets-snapshot.json).
- A finalized Solana RPC read independently checked the ZEC mint's token program, decimals, and authorities: [mint snapshot](zec-mint-rpc-snapshot.json).
- A finalized Pump configuration read found this ZEC mint in quote-control and custom creator fees enabled up to 300 basis points: [Pump snapshot](pump-config-snapshot.json). This does not verify a 3% total trade charge.
- The compiled benchmark binary and Cargo lockfile have recorded SHA-256 hashes: [artifact hashes](baseline-artifact-hashes.json).

This research did **not** launch tokens, transact funds, create paid cloud resources, execute paid model calls, demonstrate a speed improvement, or certify cryptographic security. The benchmark exercised `FixedPostNu6_2`; it is a runnable starting fixture, not sufficient evidence for a current-network reward challenge. The blueprint explains the required version correction.
