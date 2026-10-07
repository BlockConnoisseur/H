# Research worker integration contract

This worker is implemented as an eve agent with five typed tools. It is **not connected to a running evaluator or the application queue**. Type checking does not verify paid model execution. No model or sandbox has been purchased or started.

The application's `cpu-001-methods-v1` planner assigns nine specific methods across S1/S2/S3. Each run carries a frozen `assignment` with version, sourceRevision, track, methodId, actions, threads and unique experiment key. `read_assignment` must resolve that stored snapshot into the catalog's hypothesis, measurements and guardrail; never reconstruct a different method from free-text user descriptions. The three platform agents use S1-representation, S2-scratch and S3-chunks, respectively. They currently await setup with no funded runs. A platform label must never bypass session ownership, budget or setup checks.

Only the internal dispatcher may start sessions. Production channel authentication must be restricted to that dispatcher before deployment. Never expose a funded worker through a public chat endpoint. The default local-development channel is for operator testing only.

`HALO_CONTROLLER_URL` is one fixed HTTPS endpoint, and `HALO_CONTROLLER_TOKEN` is a server-only service credential. The controller must pre-bind `sessionId` to an existing, fully reserved run. A model cannot register that binding, choose its wallet, increase its allowance, or choose a URL. Reject unknown, expired, cancelled, cross-agent, or exhausted sessions. Check an idempotency key against the entire payload; return the original result on retry.

Operations:

- `read_assignment`: return challenge version, pinned revision, signed edit allowlist, assignment, public baseline profile, past experiment summaries, and remaining budget. Never return hidden fixtures.
- `read_source`: validate path against the signed assignment and resolve beneath the immutable checkout, rejecting symlinks and traversal. Return at most 200 lines.
- `propose_patch`: store original UTF-8 bytes, SHA-256, parent attribution, hypothesis and tradeoff. Validate unified-diff paths, file modes and changed regions with a real parser. Reject dependencies, unsafe code, circuit changes, networking, build scripts, test changes and benchmark detection. Static checks do not replace cryptographic review.
- `request_evaluation`: atomically reserve remaining model/CPU capacity, cap attempts, and create a durable job. Run only fixed commands in an isolated, disposable, network-disabled worker. Candidate code never runs in the web server. Return a job ID, not a fabricated result.
- `read_evaluation`: return only a job belonging to this session, including command exit status, resource usage and signed development measurements. Final hidden evaluation remains separate.

Platform limits must enforce the proposed $20 reservation, 60 minutes, 40 model calls, six hypotheses and ten patches, stopping at the first limit. The eve configuration additionally caps model tokens and token cost and stops after 30 minutes; these are conservative worker limits. Eve token limits are checked after a call and exclude sandbox expense, so they are **not a hard total-spend guarantee**. A production gateway must pre-authorize each model call with maximum output tokens and a worst-case cost reservation, then reconcile actual usage. No continuation request can enlarge a paid reservation.

The UI currently reserves preview credit and waits. The controller, dispatcher, isolated evaluator, usage reconciler and signed final evidence ingestion remain integration work. Do not enable automatic sessions merely by adding a model key.
