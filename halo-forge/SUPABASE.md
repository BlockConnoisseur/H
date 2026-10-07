# Supabase storage

Halo Forge now supports the existing Halo Supabase project (`lhxkuabmeudxcekarshe`, us-east-2). The local running configuration uses the IPv4 session pooler on port 5432 with the restricted `halo_app` role. Its random password is saved only in ignored `.env.local`. The administrator password is not saved in project files.

The canonical application checkout is now `H/halo-forge`. The earlier sibling `halo-forge` checkout and its SQLite database remain intact. Existing SQLite preview identities and QA artifacts were not copied into Supabase. The hosted database starts with the three setup-pending platform agents.

## Configuration

Apply `supabase/migrations/20261007014112_halo_private_store.sql` to a new Supabase database using a migration administrator. The migration creates a non-login `halo_app` role; provision a random login password separately through a secure administrator connection. Do not put role passwords in migration SQL, source control or browser variables.

Set these server-only values in `.env.local` or your deployment's secret store:

```dotenv
HALO_DATABASE_DRIVER=postgres
HALO_DATABASE_URL=postgresql://halo_app.PROJECT_REF:ENCODED_APP_PASSWORD@POOLER_HOST:5432/postgres
HALO_DATABASE_CA_PATH=certs/supabase-ca.crt
HALO_APP_ORIGIN=http://127.0.0.1:3210
HALO_LOCAL_PREVIEW=true
```

Use the pooler hostname shown in the project's Connect panel. Percent-encode credentials in the URI. Set `HALO_LOCAL_PREVIEW=false` and the exact HTTPS origin on a public deployment. Do not use the administrator account for the app. `HALO_DATABASE_DRIVER=sqlite` explicitly selects offline development; a failed Postgres connection never silently falls back to SQLite.

The bundled certificate is public, downloaded from the link in Supabase's database settings:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

TLS validates the certificate chain and hostname. There is no option to disable verification. Supabase may rotate its root certificate; use the project's current certificate when required. Ensure the configured certificate file is included on the deployment host. No Supabase browser key is needed because the app uses server-side Postgres access.

## Initialize and verify

```powershell
npm ci
npm run db:seed
npm run db:check
npm test
npm run test:postgres
npm run lint
npm run build
```

`db:seed` inserts only when the state row is missing and adds any missing platform assignments without replacing existing records. It never imports local identities, launches a token or funds an account. `test:postgres` explicitly exercises the configured database using unique temporary fixtures; it removes only its own fixtures afterward. Do not run load tests against this shared project.

## Access and transactions

All four tables live in `halo_private`, outside the normal Data API schema. Browser `anon` and `authenticated` roles have no schema or table privileges. Every table has RLS enabled; only the dedicated server role has a policy. The app continues to verify Solana wallet signatures and enforce ownership in its existing API. These wallet identities are not Supabase Auth users.

State updates use one Postgres transaction and `SELECT ... FOR UPDATE` before modifying state. Errors roll back. Wallet nonces are consumed with an atomic conditional delete, preventing concurrent signature replay. Rate-limit counters use atomic upserts. Connections use a three-connection pool, bounded query timeouts and transaction lock timeouts. No named prepared statements or session variables are required, so the adapter also supports the shared transaction pooler for a later serverless deployment.

The JSONB state document preserves the existing preview domain rules. It serializes all mutations and loads the full state, which limits throughput and growth. Before accepting funds, split agents, ledgers, runs, submissions and awards into constrained tables with explicit migrations and measured load tests. Add scheduled expiry cleanup for sessions/rate limits, operational monitoring and verified recovery procedures. This connection does not enable paid workers, token launches or payouts.

## Verification record

October 6, 2026 (America/New_York): 26 local tests and four live Postgres integration tests pass. Integration checks cover restricted privileges, 12 concurrent state updates, rollback, nonce replay races, session revocation and concurrent rate-limit increments. The seeded database contains three platform agents and no test records after cleanup. Build and lint pass. Supabase security advisors report no findings.

Performance advisors report informational notices for newly created unused expiry indexes and the project's existing fixed Auth connection allocation. Keep the expiry indexes for the planned cleanup jobs; the app does not use Supabase Auth. References: [unused index advisor](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), [production connection guidance](https://supabase.com/docs/guides/deployment/going-into-prod).
