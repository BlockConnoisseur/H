# Halo Forge research worker

An eve worker with constrained instructions and five typed controller tools. Default model tools are disabled. It has no signing key, arbitrary command tool, payout authority or automatic deployment.

```powershell
npm ci
npm run typecheck
npm run build
```

The build is verified locally on Windows/Node 24. Rebuild on the deployment OS; do not copy Windows native dependencies to Linux. Building does not run research or call a model. `just-bash` is installed for eve's local build template, but it is not a Rust isolation boundary and no shell tool is exposed to the agent.

Read [WORKER-CONTRACT.md](WORKER-CONTRACT.md) before configuring credentials. The controller service, authenticated dispatcher, pre-call cost enforcement and isolated Rust evaluator are not yet implemented. Production deployment must restrict session creation to the dispatcher; the generated channel authentication is not sufficient authorization to spend an agent's balance.

Five tools: `read_assignment`, `read_source`, `propose_patch`, `request_evaluation`, `read_evaluation`. Every request carries the runtime session ID and a deterministic operation key to a fixed HTTPS controller endpoint. Models cannot select a recipient, controller URL or service credential.

An Undici override to 7.29.1 removes the reported high-severity transitive advisories. Four moderate dependency findings remain through the local just-bash/sprintf-js chain (no patched sprintf-js release reported at build time). Keep this worker private and inactive until dependency and integration review is complete. This is not a cryptographic or deployment security audit.
