"use client";

import { useRef, useState } from "react";
import {
  AuthState,
  ClientState,
  OtpType,
  TurnkeyProvider,
  WalletSource,
  useTurnkey,
  type TurnkeyProviderConfig,
  type WalletAccount,
} from "@turnkey/react-wallet-kit";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Fingerprint, LoaderCircle, LogOut, Mail, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Actor } from "@/lib/domain";
import {
  establishWalletSession,
  turnkeySignature,
  walletPost,
} from "@/lib/wallet-signin";
import { short } from "./shared";

type Props = {
  actor: Actor | null;
  previewAvailable: boolean;
  onChanged: (message: string) => Promise<void>;
};
type Kit = ReturnType<typeof useTurnkey>;
const organizationId = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID?.trim();
const authProxyConfigId =
  process.env.NEXT_PUBLIC_TURNKEY_AUTH_PROXY_CONFIG_ID?.trim();
const config: TurnkeyProviderConfig | null =
  organizationId && authProxyConfigId
    ? {
        organizationId,
        authProxyConfigId,
        ui: { renderModalInProvider: false, supressMissingStylesError: true },
        auth: {
          autoRefreshSession: false,
          createSuborgParams: {
            emailOtpAuth: { customWallet: solanaWallet() },
            passkeyAuth: {
              customWallet: solanaWallet(),
              passkeyName: "Halo Forge",
            },
          },
        },
      }
    : null;

function solanaWallet() {
  return {
    walletName: "Halo Forge",
    walletAccounts: [
      {
        curve: "CURVE_ED25519" as const,
        pathFormat: "PATH_FORMAT_BIP32" as const,
        path: "m/44'/501'/0'/0'",
        addressFormat: "ADDRESS_FORMAT_SOLANA" as const,
      },
    ],
  };
}

export default function WalletConnection(props: Props) {
  // Without public configuration, do not initialize the SDK with dummy IDs.
  if (!config) return <WalletChoices {...props} />;
  return (
    <TurnkeyProvider config={config}>
      <TurnkeyChoices {...props} />
    </TurnkeyProvider>
  );
}

function TurnkeyChoices(props: Props) {
  const kit = useTurnkey();
  return <WalletChoices {...props} kit={kit} />;
}

function WalletChoices({
  actor,
  previewAvailable,
  onChanged,
  kit,
}: Props & { kit?: Kit }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [otp, setOtp] = useState<{
    otpId: string;
    otpEncryptionTargetBundle: string;
    contact: string;
  } | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[] | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string>();
  const captcha = useRef<TurnstileInstance>(null);
  const ready = kit?.clientState === ClientState.Ready;
  const authenticated = kit?.authState === AuthState.Authenticated;
  const methods = kit?.config?.ui?.authModal?.methods;
  const emailEnabled = ready && methods?.emailOtpAuthEnabled === true;
  const passkeyEnabled = ready && methods?.passkeyAuthEnabled === true;
  const passkeyOrigin =
    typeof window !== "undefined" &&
    (window.location.protocol === "https:" ||
      window.location.hostname === "localhost");
  const siteKey = kit?.config?.turnstileSiteKey;
  const captchaReady = !siteKey || !!captchaToken;
  const restoredAccounts =
    kit?.wallets
      .filter((w) => w.source === WalletSource.Embedded)
      .flatMap((w) => w.accounts)
      .filter((a) => a.addressFormat === "ADDRESS_FORMAT_SOLANA") ?? [];
  const choices = accounts ?? restoredAccounts;

  async function run(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      setError(
        !message || message.toLowerCase() === "unexpected error"
          ? "Your wallet could not connect. Unlock it and try again."
          : message,
      );
    } finally {
      setBusy(false);
    }
  }
  function resetCaptcha() {
    setCaptchaToken(undefined);
    captcha.current?.reset();
  }
  async function refreshAccounts() {
    const wallets = await kit!.refreshWallets();
    const next = wallets
      .filter((w) => w.source === WalletSource.Embedded)
      .flatMap((w) => w.accounts)
      .filter((a) => a.addressFormat === "ADDRESS_FORMAT_SOLANA");
    setAccounts(next);
    if (!next.length)
      throw new Error(
        "This Turnkey account has no Solana wallet. Connect an existing wallet or use an account created for Halo Forge.",
      );
  }
  async function externalWallet() {
    const provider = (
      window as unknown as {
        solana?: {
          connect(): Promise<{ publicKey: { toString(): string } }>;
          signMessage(
            message: Uint8Array,
            encoding?: string,
          ): Promise<{ signature: Uint8Array }>;
        };
      }
    ).solana;
    if (!provider?.signMessage)
      throw new Error(
        "Open this site in your Solana wallet’s browser, or use email or a passkey to create a Turnkey wallet.",
      );
    const { publicKey } = await provider.connect();
    await establishWalletSession(publicKey.toString(), async ({ message }) => {
      const signed = await provider.signMessage(
        new TextEncoder().encode(message),
        "utf8",
      );
      return signed.signature;
    });
    await onChanged("Wallet connected.");
  }
  async function connectEmbedded(account: WalletAccount) {
    await establishWalletSession(account.address, async ({ message }) => {
      const signed = await kit!.signMessage({
        walletAccount: account,
        message,
        encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
        hashFunction: "HASH_FUNCTION_NOT_APPLICABLE",
      });
      return turnkeySignature(signed);
    });
    await onChanged("Turnkey wallet connected.");
  }
  async function signOut() {
    await walletPost("auth/logout", {});
    let message = "Signed out.";
    if (kit && authenticated) {
      try {
        await kit.logout();
      } catch {
        message =
          "App signed out. Turnkey could not clear its session; reconnect to retry signing out of Turnkey.";
      }
    }
    await onChanged(message);
  }

  return (
    <div className="wallet-connect-content" aria-busy={busy}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription role="alert">{error}</AlertDescription>
        </Alert>
      )}
      {actor ? (
        <>
          <div className="address-block">{actor.wallet}</div>
          <p className="muted">
            {actor.preview
              ? "Development identity. No on-chain wallet is associated with this account."
              : "Your Solana wallet is verified. Agents remain bound to their original deployer."}
          </p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(signOut)}
          >
            <LogOut size={16} />
            Sign out
          </Button>
        </>
      ) : (
        <>
          {kit && !ready && (
            <p className="muted" role="status">
              {kit.clientState === ClientState.Error
                ? "Turnkey is unavailable. Try again or connect an existing wallet."
                : "Preparing your secure wallet connection…"}
            </p>
          )}
          {!kit && (
            <p className="muted">
              Email and passkey wallets are awaiting Turnkey configuration. You
              can connect an existing Solana wallet below.
            </p>
          )}
          {authenticated ? (
            <div className="wallet-account-list">
              <p className="wallet-section-label">Choose your Solana wallet</p>
              {choices.map((account) => (
                <Button
                  key={account.address}
                  disabled={busy || !ready}
                  variant="outline"
                  onClick={() => run(() => connectEmbedded(account))}
                >
                  <Wallet size={16} /> Connect {short(account.address)}
                </Button>
              ))}
              {!choices.length && (
                <Button
                  variant="outline"
                  disabled={busy || !ready}
                  onClick={() => run(refreshAccounts)}
                >
                  Load Solana wallets
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await kit!.logout();
                    setAccounts(null);
                    setOtp(null);
                    setCode("");
                  })
                }
              >
                Use another Turnkey account
              </Button>
            </div>
          ) : (
            <>
              {emailEnabled && (
                <form
                  className="wallet-email-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run(async () => {
                      try {
                        if (otp) {
                          await kit!.completeOtp({
                            ...otp,
                            otpCode: code.trim(),
                            otpType: OtpType.Email,
                            captchaToken,
                          });
                          setCode("");
                          setOtp(null);
                          await refreshAccounts();
                        } else {
                          const contact = email.trim();
                          const result = await kit!.initOtp({
                            otpType: OtpType.Email,
                            contact,
                            captchaToken,
                          });
                          setOtp({ ...result, contact });
                        }
                      } finally {
                        resetCaptcha();
                      }
                    });
                  }}
                >
                  <Label htmlFor="wallet-email">Email address</Label>
                  <Input
                    id="wallet-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                    value={email}
                    disabled={busy || !!otp}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {otp && (
                    <>
                      <p className="field-hint" role="status">
                        Enter the code sent to {otp.contact}.
                      </p>
                      <Label htmlFor="wallet-code">Verification code</Label>
                      <Input
                        id="wallet-code"
                        autoComplete="one-time-code"
                        inputMode={
                          kit?.config?.auth?.otpAlphanumeric
                            ? "text"
                            : "numeric"
                        }
                        maxLength={12}
                        required
                        value={code}
                        disabled={busy}
                        onChange={(e) => setCode(e.target.value)}
                      />
                    </>
                  )}
                  <Button type="submit" disabled={busy || !captchaReady}>
                    <Mail size={16} />
                    {otp ? "Verify email" : "Continue with email"}
                  </Button>
                  {otp && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => {
                        setOtp(null);
                        setCode("");
                        resetCaptcha();
                      }}
                    >
                      Change email or request a new code
                    </Button>
                  )}
                </form>
              )}
              {passkeyEnabled && (
                <div className="wallet-passkey-actions">
                  <Button
                    variant="outline"
                    disabled={busy || !passkeyOrigin}
                    onClick={() =>
                      run(async () => {
                        await kit!.loginWithPasskey();
                        await refreshAccounts();
                      })
                    }
                  >
                    <Fingerprint size={16} />
                    Sign in with a passkey
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy || !passkeyOrigin || !captchaReady}
                    onClick={() =>
                      run(async () => {
                        try {
                          await kit!.signUpWithPasskey({
                            passkeyDisplayName: "Halo Forge",
                            captchaToken,
                          });
                          await refreshAccounts();
                        } finally {
                          resetCaptcha();
                        }
                      })
                    }
                  >
                    Create a wallet with a passkey
                  </Button>
                  {!passkeyOrigin && (
                    <p className="field-hint">
                      Passkeys require HTTPS or localhost. Use email on this
                      local IP address.
                    </p>
                  )}
                </div>
              )}
              {siteKey && (
                <Turnstile
                  ref={captcha}
                  siteKey={siteKey}
                  options={{ theme: "dark", size: "flexible" }}
                  onSuccess={setCaptchaToken}
                  onExpire={() => setCaptchaToken(undefined)}
                  onError={() => {
                    setCaptchaToken(undefined);
                    setError(
                      "Verification could not load. Check your connection and try again.",
                    );
                  }}
                />
              )}
            </>
          )}
          <div className="wallet-option-divider">
            <span>Existing wallet</span>
          </div>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => run(externalWallet)}
          >
            <Wallet size={16} />
            Connect a Solana wallet
          </Button>
          <p className="field-hint">
            Sign-in verifies ownership. It does not request a transaction or
            permission to spend.
          </p>
          {previewAvailable && (
            <details className="wallet-development">
              <summary>Development tools</summary>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    await walletPost("auth/preview", {});
                    await onChanged("Development account connected.");
                  })
                }
              >
                Use development account
              </Button>
            </details>
          )}
        </>
      )}
      {busy && (
        <p className="wallet-busy" role="status">
          <LoaderCircle size={15} className="animate-spin" />
          Waiting for your wallet…
        </p>
      )}
    </div>
  );
}
