import bs58 from "bs58";
import nacl from "tweetnacl";

export type WalletChallenge = { id: string; message: string };

// Turnkey returns Ed25519 signature halves as hexadecimal strings, whereas
// the app's existing authentication endpoint expects one base58 signature.
export function turnkeySignature(signature: {
  r: string;
  s: string;
}): Uint8Array {
  const halves = [signature.r, signature.s].map((part) =>
    part.replace(/^0x/, ""),
  );
  if (halves.some((part) => !/^[0-9a-fA-F]{64}$/.test(part)))
    throw new Error("The wallet returned an invalid Solana signature.");
  const hex = halves.join("");
  return Uint8Array.from(hex.match(/../g)!, (part) =>
    Number.parseInt(part, 16),
  );
}

export async function walletPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Wallet sign-in failed. Please retry.");
  return result as T;
}

export async function establishWalletSession(
  address: string,
  sign: (challenge: WalletChallenge) => Promise<Uint8Array>,
) {
  const key = bs58.decode(address);
  if (key.length !== 32) throw new Error("Choose a Solana wallet.");
  const challenge = await walletPost<WalletChallenge>("auth/challenge", {
    wallet: address,
  });
  const signature = await sign(challenge);
  // Verify the exact signed bytes before submitting, as well as on the server.
  if (
    signature.length !== 64 ||
    !nacl.sign.detached.verify(
      new TextEncoder().encode(challenge.message),
      signature,
      key,
    )
  )
    throw new Error(
      "The wallet signature does not match this sign-in request.",
    );
  await walletPost("auth/verify", {
    id: challenge.id,
    signature: bs58.encode(signature),
  });
}
