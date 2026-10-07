# Production deployment

Public site: https://halozec.tech

Vercel project: halozec, under yeetrew1-1502s-projects. GitHub repository BlockConnoisseur/H is connected to the main production branch, using halo-forge as the Next.js root directory and Node.js 24.x.

Production uses the restricted Supabase halo_app role through the shared transaction pooler on port 6543. TLS certificate verification remains enabled; next.config.ts explicitly includes the public Supabase CA certificate in server function bundles. The runtime database credential was rotated during setup and restored to the local ignored environment file. No credentials are committed. Production secrets are scoped only to the production environment.

HALO_APP_ORIGIN is https://halozec.tech and HALO_LOCAL_PREVIEW is false. The database API returns the three platform agents, and the development sign-in endpoint returns HTTP 403. Paid research, token launches and automatic payouts are still not enabled.

Namecheap remains the registrar and authoritative DNS provider. The default parking records were replaced with Vercel's domain-specific recommendations:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 216.150.1.1 |
| A | @ | 216.150.16.1 |
| CNAME | www | 4f42c542fff73d9a.vercel-dns-016.com. |

Both domains are verified by Vercel. HTTPS works, and www redirects to the apex with HTTP 308. Existing mail settings were preserved.

Turnkey public IDs are configured in Vercel. The production origin has been prepared in the shared Auth Proxy configuration; saving it requires the account owner's passkey confirmation. Email and passkey signup remain absent from the application: users connect existing Solana wallets.

Local development remains at http://localhost:3210 with a redirect from 127.0.0.1. Keep .env.local private; Vercel link/env pull can replace it, so back it up before using those commands. Do not copy the production database secret to Preview deployments.
