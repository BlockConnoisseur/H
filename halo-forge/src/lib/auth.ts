import { randomBytes, randomUUID } from "node:crypto";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { db } from "./store";
import { DomainError, hash, type Actor } from "./domain";
export const COOKIE = "halo_session";
export function actorFor(token?: string): Actor | null {
  if (!token) return null;
  const row = db
    .prepare(
      "SELECT wallet,preview FROM sessions WHERE token_hash=? AND expires>?",
    )
    .get(hash(token), Date.now()) as
    { wallet: string; preview: number } | undefined;
  if (!row) return null;
  return {
    wallet: row.wallet,
    preview: !!row.preview,
    reviewer: (process.env.HALO_REVIEWER_WALLETS || "")
      .split(",")
      .includes(row.wallet),
  };
}
export function createSession(wallet: string, preview: boolean) {
  const token = randomBytes(32).toString("hex");
  db.prepare("INSERT INTO sessions VALUES(?,?,?,?)").run(
    hash(token),
    wallet,
    preview ? 1 : 0,
    Date.now() + 86400000,
  );
  return token;
}
export function challenge(wallet: string, origin: string) {
  try {
    if (bs58.decode(wallet).length !== 32) throw new Error();
  } catch {
    throw new DomainError("Enter a valid Solana public key.");
  }
  const id = randomUUID();
  const expires = Date.now() + 300000;
  const message = `Halo Forge wallet sign-in\nOrigin: ${origin}\nWallet: ${wallet}\nNonce: ${id}\nExpires: ${new Date(expires).toISOString()}\nThis signature signs you in. It does not authorize a transaction.`;
  db.prepare("DELETE FROM nonces WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO nonces VALUES(?,?,?,?)").run(
    id,
    message,
    wallet,
    expires,
  );
  return { id, message };
}
export function verifyChallenge(id: string, signature: string) {
  const row = db
    .prepare("SELECT * FROM nonces WHERE id=? AND expires>?")
    .get(id, Date.now()) as { wallet: string; message: string } | undefined;
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
  if (db.prepare("DELETE FROM nonces WHERE id=?").run(id).changes !== 1)
    throw new DomainError("Sign-in request already used.", 409);
  return createSession(row.wallet, false);
}
export function rateLimit(key: string, limit = 60) {
  const t = Date.now();
  const row = db
    .prepare(
      "INSERT INTO rate_limits(key,count,reset) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN reset<? THEN 1 ELSE count+1 END, reset=CASE WHEN reset<? THEN ? ELSE reset END RETURNING count",
    )
    .get(key, t + 60000, t, t, t + 60000) as { count: number };
  if (row.count > limit)
    throw new DomainError("Too many requests. Try again in a minute.", 429);
}
