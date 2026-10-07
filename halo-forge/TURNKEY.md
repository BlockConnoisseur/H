# Turnkey wallet connection

The Connect wallet dialog uses Turnkey's React Wallet Kit 2.5.2 for embedded Solana wallets, with custom shadcn controls. The SDK is loaded when the dialog opens. Turnkey's styled auth modals are not used. Existing injected Solana wallets remain available.

## Required public configuration

In the Turnkey dashboard, open **Embedded Wallets → Configuration**, enable Auth Proxy, and enable email OTP and passkeys. Add the exact application origin to the allowed origins. Copy these two public identifiers into `.env.local` or the deployment environment:

```dotenv
NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID=
NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID=
```

Rebuild after changing public environment variables. No organization API private key or server signing key is needed for this flow. Never put private API keys in `NEXT_PUBLIC_` variables.

Use the actual HTTPS hostname for production. Email works at the current loopback IP address if it is an allowed origin. Passkeys require HTTPS or `localhost`, so the dialog disables passkey actions on the local IP address. To develop with passkeys, use `http://localhost:3210`, set `HALO_APP_ORIGIN` to that exact origin, add it to Turnkey's allowed origins and restart the site. Passkeys are scoped to their relying-party domain; create production credentials on the production domain.

## What the implementation does

Email users request an OTP and verify it through Turnkey. Existing passkey users can sign in; new users can explicitly create a passkey and wallet. The configured signup parameters create one Ed25519 Solana account at `m/44'/501'/0'/0'`. The UI follows the authentication methods enabled in the dashboard and renders Turnstile if the configuration requires it. No SMS or social-login option is advertised.

After authentication, users choose a Solana wallet and confirm connection. The wallet signs the exact nonce message issued by `/api/auth/challenge`. Turnkey's hexadecimal Ed25519 signature halves are converted into a 64-byte signature and verified locally before posting to `/api/auth/verify`. The existing server independently verifies the signature, consumes the nonce once and issues its HTTP-only session cookie. Only that verified address can become the original agent deployer. No client-provided organization ID or email is accepted as a substitute for wallet ownership.

Signing out removes the application session and clears the active Turnkey session when available. Existing agent ownership is never reassigned. The signing adapter does not expose transaction signing, transfer authority, key export or automatic fund movement.

Without both public configuration IDs, the SDK is not initialized with placeholders. The dialog explains that Turnkey setup is pending and offers the existing Solana-wallet connection. Development identities are kept inside an explicit development-tools section and only appear when the API permits local preview.

## Verification and remaining setup

29 local tests pass, including exact Ed25519 signature conversion, wallet-address binding, changed-message rejection, replay protection and failed-verification handling. TypeScript and production build pass. Real Turnkey OTP delivery, passkey enrollment and embedded wallet signing still require the user's Organization ID and Auth Proxy Configuration ID and must be checked against that configuration. No claim of a completed live Turnkey sign-in is made before that check.

References: [Turnkey setup](https://docs.turnkey.com/solutions/embedded-wallets/integration-guide/react/getting-started), [custom authentication](https://docs.turnkey.com/solutions/embedded-wallets/integration-guide/react/auth), [signing](https://docs.turnkey.com/solutions/embedded-wallets/integration-guide/react/signing), [Solana account configuration](https://docs.turnkey.com/solutions/embedded-wallets/integration-guide/react/sub-organization-customization).
