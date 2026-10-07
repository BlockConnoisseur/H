# Challenge 001: improve the actual Zcash prover

Status: proposed pilot specification. **Paid entry and rewards remain disabled** until the target-release mapping, current circuit fixtures, protected evaluator, and reviewer assignments are complete.

The detailed [competition specification](COMPETITION-SPEC.md) now governs proposed assignments, grading, ranking, prizes and session limits. It tightens the speed gate to a conservative lower-bound improvement of at least 3% on both defined hosts. Numerical examples below are earlier pilot guidance where not superseded by that document. No rules apply to a paid competition until its complete manifest is frozen and activated.

Objective: reduce end-to-end proof-generation time on a fixed CPU without weakening the proven statement, changing the reference verifier, or introducing unacceptable memory or privacy regressions.

## Scope and pins

Starting research snapshots are recorded in `source-lock.json`: Orchard 0.16.0 and Zcash Halo 2 proofs 0.4.0. Those pins are research inputs. Before activation, select a released wallet/node integration, record its lockfile, and verify the applicable post-NU6.3 circuit/bundle mapping. Do not silently upgrade a running challenge.

Required immutable manifest fields:

```json
{
  "challenge_id": "prover-cpu-001",
  "status": "DRAFT_NOT_REWARD_ELIGIBLE",
  "target_release": null,
  "network_branch_id": null,
  "circuit_version": null,
  "bundle_versions": [],
  "reference_verifying_key_digest": null,
  "source_lock_digest": null,
  "compiler_and_flags_digest": null,
  "evaluator_image_digest": null,
  "hardware_class": null,
  "workload_manifest_digest": null,
  "rng_policy_digest": null,
  "reviewer_policy_digest": null,
  "reward_mint": null,
  "funded_reward_base_units": "0"
}
```

Null values are intentional unresolved launch gates. This is a specification, not a usable job manifest.

## First task

Profile the complete prover. If MSM takes material time, test scalar-representation reuse in `halo2_proofs/src/arithmetic.rs` around `best_multiexp` and `Buckets::sum`. The existing code converts each scalar to its representation while processing buckets. A candidate can prepare representations once per call, provided mathematical behavior and the accepted leakage model remain unchanged.

Why this is a suitable first experiment: it is a narrow code change with a clear hypothesis and a straightforward reference group result. It might save conversion work, but it might be neutral or slower due to allocation and cache pressure. Do not preannounce a gain.

Alternatives after profiling: reuse temporary allocations; tune public-size bucket/window choices; reduce parallel scheduling overhead; improve FFT locality. A thread-count-only tuning result is reported as configuration tuning, not a novel algorithmic contribution.

For this first task, candidate patches may change only approved function regions in the arithmetic implementation. Trusted maintainers can expand the allowlist for a future challenge version. Candidate edits to tests, manifest/lockfile, compiler flags, RNG, circuit constraints, proof encoding, transcript logic, key derivation, or verifier acceptance rules are disallowed.

## Fixtures and correctness

Use the official one-Action fixture only as a smoke/regression test. It uses an older explicit circuit version and fixed seeds, so it cannot be the final score.

The proposed qualifying workload includes:

- Real synthetic spend witnesses and outputs, including change and zero/dummy actions where the target API permits them.
- Representative action counts such as 2, 4, 8, and 16. Final weights must be based on an identified wallet use case rather than arbitrary larger sizes that favor a patch.
- Fresh fixture seeds sampled after patch freeze, with reproducibility secrets retained by the evaluator and released with results where appropriate.
- Independently randomized proof blinding. Deterministic test randomness is restricted to fixtures; it must never replace production CSPRNG behavior.
- Random, zero, maximal, repeated, and sparse scalar distributions in differential arithmetic tests, including public input lengths near algorithm-switch thresholds.
- Negative tests that alter public inputs, truncate proofs, corrupt encodings, or violate the target statement. Only the unchanged verifier decides acceptance.

The trusted evaluator generates expected results outside the candidate process. It builds reference and candidate in isolated environments, and retains reference binary hashes. The agent cannot supply its own expected answers or performance scores.

## Measurement protocol

Build both binaries before timing. Pin compiler, CPU feature flags, source, dependencies, thread count, OS image, and hardware class. Qualify the host with repeated baseline-versus-baseline comparisons. Run baseline/candidate/candidate/baseline brackets, with at least 20 measured samples per leg for the initial calibration, adjusting based on observed variance and cost. No universal significance claim follows merely from using 20 samples.

Record wall-clock proof time, CPU time, peak RSS, allocation data where available, proof length, verification time, cold-start/key-generation cost, and raw samples. The wall-clock timer and memory collector live outside the candidate. Do not include compilation in proof time or silently exclude candidate precomputation costs that a real user would pay.

Proposed first acceptance thresholds: at least 3% primary end-to-end speed improvement, paired 95% interval excluding zero, no individual case slowdown above 2%, and no peak RSS increase above 5%. Recalibrate thresholds if the baseline's variance makes them unreliable. Confirm the selected candidate on fresh fixtures and a second representative host; comparisons against many attempts require a held-out confirmation stage.

A separate memory challenge can reward lower RSS under a small bounded runtime regression. Do not combine those objectives into a hidden scoring formula.

## Attempt and cost limits

Initial proposal: at most 40 model calls per session, a prepaid spend cap, two compile-repair retries per candidate, and no more than one final submission per agent per epoch. Model-call count is secondary to the actual token/cost limit. Reserve remaining output cost before starting a call.

Stop after the funded allowance is exhausted. Also stop unproductive loops after a configured plateau, preserving findings so the next funded session does not repeat them. Give the user useful negative results without claiming that unsuccessful work improved Zcash.

## Submission package

The package contains base commit, patch, hypothesis, parent contribution, affected functions, change license/attribution, exploratory results, source/build/artifact hashes, and disclosed limitations. The platform adds a salted timestamped commitment, identity binding, independent measurements, and reviews.

Rewards require independent reproduction and human cryptographic/performance review. Benchmarks do not establish zero-knowledge preservation or side-channel safety. Upstream adoption is separately tracked and not implied by payment.

## Pilot success and failure

A successful pilot finds a new, reproducible end-to-end gain that qualified reviewers consider a plausible upstream contribution, within the predefined experimental budget. The pilot should also document cost, failed attempts, duplicate hypotheses, and measured evaluator noise.

No qualifying improvement is an acceptable research result. It is a reason to revise the target, model workflow, or budget before selling paid agents on an improvement claim. A microbenchmark win with a whole-prover regression does not qualify.
