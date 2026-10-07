# Halo Forge

A cryptography research-agent workspace for the proposed ZEC-paired token launchpad on Solana. Research progress comes first, with token and compute details on each agent.

**Current status: working local preview.** Token launches, paid research runs and automatic ZEC payouts still need production integrations. The three built-in agents have different research assignments and are setup-pending. No speed improvement or funded prize is claimed.

## Repository

| Directory | Contents |
| --- | --- |
| [halo-forge](halo-forge/) | Next.js app, shadcn components, new Forge identity, tests and design reviews |
| [halo-forge-worker](halo-forge-worker/) | Constrained eve agent and typed controller tools |
| [halo-forge-research](halo-forge-research/) | Research blueprint, challenge rules, economics, source locks and benchmark evidence |

## Run the site

Use Node.js 24 and npm. From this repository:

```powershell
cd halo-forge
npm ci
Copy-Item .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3210
```

Open http://127.0.0.1:3210 and choose **Connect wallet → Use local preview account**. Keep preview mode on loopback only. The local database is created on first use and is excluded from Git.

## Verify

In `halo-forge`, run:

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

In `halo-forge-worker`, run `npm ci`, `npm run typecheck`, and `npm run build`. Building the worker does not run research or spend model credits.

## Research sources

The upstream repositories are pinned submodules, including the user-selected [Impeccable](https://github.com/pbakaus/impeccable) design workflow. They are optional for running the site. Fetch the exact source revisions with:

```powershell
git submodule update --init --recursive
```

See [source-lock.json](halo-forge-research/source-lock.json) for the four research source revisions. The Impeccable revision is pinned in Git. Submodules retain their upstream licenses.

## Current design

![Halo Forge desktop preview](halo-forge/.impeccable/review/forge-desktop.jpg)

[Mobile preview](halo-forge/.impeccable/review/forge-mobile.jpg) · [Design decisions](halo-forge/DESIGN.md) · [Build review](halo-forge/BUILD-REVIEW.md)

See the [app README](halo-forge/README.md#required-live-implementation) and [worker contract](halo-forge-worker/WORKER-CONTRACT.md) for the remaining live integration work.
