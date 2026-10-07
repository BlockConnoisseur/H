# Turnkey wallet connection

Connect wallet uses Turnkey React Wallet Kit 2.5.2 to discover and connect existing Solana wallets, with custom shadcn controls. The SDK is loaded only when the dialog opens. Email, OTP, social login and passkey signup are not exposed in Halo Forge, per the requested wallet-only flow.

## Local configuration

The two public identifiers are configured in ignored `.env.local`:

```dotenv
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=
NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID=
```

The app shares the existing Lotus organization and Sigil Auth Proxy. Both `http://localhost:3210` and `http://127.0.0.1:3210` were saved as allowed origins after the account owner approved with their passkey. Existing origins, email branding and authentication settings were preserved for Sigil. Halo Forge does not display or call those email/passkey flows.

The canonical local origin is `http://localhost:3210`. When `HALO_APP_ORIGIN` equals that exact origin, requests from `127.0.0.1` temporarily redirect to localhost. Production needs the public IDs in its build environment and the exact HTTPS origin in Turnkey and `HALO_APP_ORIGIN`. Rebuild after changing public environment variables. No parent-organization private API key is required or stored in browser configuration.

## Connection and ownership

The SDK enables native Solana wallet discovery and connecting. It lists detected providers by name. Connecting returns a Solana account; the wallet must sign the exact one-time challenge from `/api/auth/challenge`. Turnkey's signature halves are converted to a 64-byte Ed25519 signature, verified locally, then submitted to `/api/auth/verify`. The server independently verifies ownership, atomically consumes the nonce and creates an HTTP-only session. No Turnkey signup is required for this external-wallet connection.

A legacy injected Solana-wallet fallback is available if discovery or SDK configuration is unavailable. A missing wallet produces instructions to enable a wallet extension or open the site in a Solana wallet's in-app browser. Cross-device QR pairing is not configured; local URLs are accessible only on the computer running the app.

Sign-out clears the application session and attempts to disconnect the matching SDK wallet connection. Any pre-existing authenticated Turnkey session is also cleared. Original agent ownership remains unchanged. No transaction signing, transfer permissions or key export is requested by this flow.

Development identities remain under Development tools and only appear when the API explicitly permits preview mode. They do not count as real wallet verification.

## Validation

The live SDK configuration loaded successfully before the wallet-only refinement. Local cryptographic tests cover exact signature conversion, signer-address binding, changed-message rejection and failed-verification handling. Local Phantom sign-in completed successfully with the owner approval. The server verified the signature, the app displayed Wallet connected, and the authenticated wallet identity persisted after a full page reload. No development identity was used for this verification.

References: [Turnkey setup](https://docs.turnkey.com/solutions/embedded-wallets/integration-guide/react/getting-started), [wallet message signing](https://docs.turnkey.com/solutions/embedded-wallets/integration-guide/react/signing).

Production follow-up: https://halozec.tech is approved and saved in the shared Auth Proxy allowed origins. The live site loads Phantom and MetaMask provider buttons with no email/signup form and no initialization errors. A production-domain wallet signature has not been separately verified.
