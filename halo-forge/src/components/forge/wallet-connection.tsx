"use client";

import { useState } from "react";
import {
  AuthState,
  Chain,
  ClientState,
  TurnkeyProvider,
  useTurnkey,
  type TurnkeyProviderConfig,
  type WalletProvider,
} from "@turnkey/react-wallet-kit";
import { LoaderCircle, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Actor } from "@/lib/domain";
import {
  establishWalletSession,
  turnkeySignature,
  walletPost,
} from "@/lib/wallet-signin";

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
        auth: { autoRefreshSession: false },
        walletConfig: {
          features: { connecting: true, auth: false },
          chains: { solana: { native: true } },
        },
      }
    : null;

export default function WalletConnection(props: Props) {
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
  const ready = kit?.clientState === ClientState.Ready;
  const providers =
    kit?.walletProviders.filter(
      (provider) => provider.chainInfo.namespace === Chain.Solana,
    ) ?? [];

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

  async function connectProvider(provider: WalletProvider) {
    const account = await kit!.connectWalletAccount(provider);
    if (account.addressFormat !== "ADDRESS_FORMAT_SOLANA")
      throw new Error(
        "Your wallet did not return a Solana account. Unlock it and try again.",
      );
    await establishWalletSession(account.address, async ({ message }) =>
      turnkeySignature(
        await kit!.signMessage({
          walletAccount: account,
          message,
          encoding: "PAYLOAD_ENCODING_HEXADECIMAL",
          hashFunction: "HASH_FUNCTION_NOT_APPLICABLE",
        }),
      ),
    );
    await onChanged("Wallet connected.");
  }

  async function connectInjected() {
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
        "No Solana wallet was found. Open Halo Forge in your wallet’s browser, or enable a Solana wallet extension and reload.",
      );
    const { publicKey } = await provider.connect();
    await establishWalletSession(
      publicKey.toString(),
      async ({ message }) =>
        (await provider.signMessage(new TextEncoder().encode(message), "utf8"))
          .signature,
    );
    await onChanged("Wallet connected.");
  }

  async function signOut() {
    await walletPost("auth/logout", {});
    const results = await Promise.allSettled([
      ...providers
        .filter((provider) =>
          provider.connectedAddresses.includes(actor!.wallet),
        )
        .map((provider) => kit!.disconnectWalletAccount(provider)),
      ...(kit?.authState === AuthState.Authenticated ? [kit.logout()] : []),
    ]);
    await onChanged(
      results.some((result) => result.status === "rejected")
        ? "Signed out of Halo Forge. Your wallet connection could not be cleared; disconnect it in your wallet if needed."
        : "Signed out.",
    );
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
          {kit && !ready && kit.clientState !== ClientState.Error && (
            <p className="muted" role="status">
              Finding your Solana wallets…
            </p>
          )}
          {kit?.clientState === ClientState.Error && (
            <p className="muted">
              Wallet discovery is unavailable. Try connecting your browser
              wallet below.
            </p>
          )}
          {ready && providers.length > 0 ? (
            <div className="wallet-account-list">
              {providers.map((provider) => (
                <Button
                  key={provider.info.uuid || provider.info.name}
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => connectProvider(provider))}
                >
                  <Wallet size={16} />
                  Connect {provider.info.name}
                </Button>
              ))}
            </div>
          ) : (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => run(connectInjected)}
            >
              <Wallet size={16} />
              Connect Solana wallet
            </Button>
          )}
          <p className="field-hint">
            Choose your wallet and approve the sign-in message. No email or
            account registration required.
          </p>
          <p className="field-hint">
            On mobile, open this site in your Solana wallet’s browser.
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
