# Research worker integration contract

The Eve worker is connected to the application controller and isolated evaluator. The public activity page is https://halozec.tech/lab. The operator reviews results and pays rewards manually.

Only the server-authenticated dispatcher can start a run. Its run ID is attached to the authenticated session, not accepted from model input. The dynamic model hook binds that session to the reserved job and authorizes each call before using AI Gateway. Generic chat endpoints deny access.

Tools read the frozen assignment and at most 200 source lines at once. `propose_patch` accepts bounded exact replacements, which the controller turns into a validated diff in the allowed MSM region. A successful proposal freezes its hash and queues evaluation without another model call. Invalid proposals return bounded, actionable errors. Source comments and outputs are untrusted data.

Limits: $3 reserved per experiment, at most 12 model calls, 3,000 output tokens per call, bounded context, no arbitrary tools. The agent configuration also enforces session token/cost limits. Missing usage receipts are not treated as a zero-dollar final bill. Reservations include CPU allowance and do not represent actual vendor charges.

The evaluator restores a pinned Rust snapshot in a disposable 4-vCPU sandbox, denies all networking, and passes no production credentials. It verifies the source revision and prepared dependency lock, runs baseline MSM `k=12` timing with four and one threads, applies the candidate, runs unchanged Halo2 library tests, and measures the candidate under the same settings. Logs, exit codes and timings are persisted for manual inspection. Infrastructure retries preserve earlier failure evidence and the same candidate digest.

These are single-host development measurements. Full Orchard proof timing, peak-memory qualification, cross-host reproduction and automatic discovery grading are not implemented. The model cannot review, rank or pay itself, alter recipients, enlarge budgets, edit test fixtures or choose shell commands.

The app owns `HALO_CONTROLLER_TOKEN`, `HALO_WORKER_URL`, `HALO_SANDBOX_SNAPSHOT_ID` and `CRON_SECRET`. The worker owns the matching controller token, fixed HTTPS controller URL and AI Gateway credentials. None are public browser configuration. Deploy worker changes with `eve deploy`; preserve ignored local secret storage when the CLI pulls configuration.
