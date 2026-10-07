import { randomBytes, randomUUID } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { query } from "./store";
import { DomainError, hash, type Actor } from "./domain";
export const COOKIE = "halo_session";
export async function actorFor(token?: string): Promise<Actor | null> {
  if (!token) return null;
  const [row] = await query<{ wallet: string; preview: number }>(
    "SELECT wallet,preview FROM halo_private.sessions WHERE token_hash=$1 AND expires>$2",
    [hash(token), Date.now()],
  );
  if (!row) return null;
  return {
    wallet: row.wallet,
    preview: !!row.preview,
    reviewer: (process.env.HALO_REVIEWER_WALLETS || "")
      .split(",")
      .includes(row.wallet),
  };
}
export async function createSession(wallet: string, preview: boolean) {
  const token = randomBytes(32).toString("hex");
  await query(
    "INSERT INTO halo_private.sessions(token_hash,wallet,preview,expires) VALUES($1,$2,$3,$4)",
    [hash(token), wallet, preview ? 1 : 0, Date.now() + 86400000],
  );
  return token;
}
export async function challenge(wallet: string, origin: string) {
  try {
    if (bs58.decode(wallet).length !== 32) throw new Error();
  } catch {
    throw new DomainError("Enter a valid Solana public key.");
  }
  const id = randomUUID();
  const expires = Date.now() + 300000;
  const message = `Halo Forge wallet sign-in\nOrigin: ${origin}\nWallet: ${wallet}\nNonce: ${id}\nExpires: ${new Date(expires).toISOString()}\nThis signature signs you in. It does not authorize a transaction.`;
  await query("DELETE FROM halo_private.nonces WHERE expires<$1", [Date.now()]);
  await query(
    "INSERT INTO halo_private.nonces(id,message,wallet,expires) VALUES($1,$2,$3,$4)",
    [id, message, wallet, expires],
  );
  return { id, message };
}
export async function verifyChallenge(id: string, signature: string) {
  const [row] = await query<{ wallet: string; message: string }>(
    "SELECT wallet,message FROM halo_private.nonces WHERE id=$1 AND expires>$2",
    [id, Date.now()],
  );
  if (!row)
    throw new DomainError(
      "This sign-in request expired or was already used.",
      401,
    );
  let valid = false;
  try {
    valid = nacl.sign.detached.verify(
      new TextEncoder().encode(row.message),
      bs58.decode(signature),
      bs58.decode(row.wallet),
    );
  } catch {}
  if (!valid)
    throw new DomainError("The wallet signature could not be verified.", 401);
  if (
    (
      await query(
        "DELETE FROM halo_private.nonces WHERE id=$1 AND expires>$2 RETURNING id",
        [id, Date.now()],
      )
    ).length !== 1
  )
    throw new DomainError("Sign-in request already used.", 409);
  return createSession(row.wallet, false);
}
export async function rateLimit(key: string, limit = 60) {
  const t = Date.now();
  const [row] = await query<{ count: number }>(
    "INSERT INTO halo_private.rate_limits(key,count,reset) VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset<$3 THEN 1 ELSE rate_limits.count+1 END, reset=CASE WHEN rate_limits.reset<$3 THEN $2 ELSE rate_limits.reset END RETURNING count",
    [key, t + 60000, t],
  );
  if (row.count > limit)
    throw new DomainError("Too many requests. Try again in a minute.", 429);
}

export async function deleteSession(token: string) {
  await query("DELETE FROM halo_private.sessions WHERE token_hash=$1", [
    hash(token),
  ]);
}
