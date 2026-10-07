import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  establishWalletSession,
  turnkeySignature,
} from "../src/lib/wallet-signin";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("Turnkey Ed25519 output preserves the exact Solana signature bytes", () => {
  const pair = nacl.sign.keyPair();
  const message = new TextEncoder().encode("Halo Forge sign-in: π");
  const bytes = nacl.sign.detached(message, pair.secretKey);
  const hex = Buffer.from(bytes).toString("hex");
  const decoded = turnkeySignature({
    r: hex.slice(0, 64),
    s: `0x${hex.slice(64)}`,
  });
  assert.deepEqual(decoded, bytes);
  assert.ok(nacl.sign.detached.verify(message, decoded, pair.publicKey));
  assert.throws(() =>
    turnkeySignature({ r: "a".repeat(62), s: "b".repeat(66) }),
  );
  assert.throws(() =>
    turnkeySignature({ r: "z".repeat(64), s: "b".repeat(64) }),
  );
});

test("wallet connection submits proof for the challenged address, not a client identity claim", async () => {
  const pair = nacl.sign.keyPair();
  const address = bs58.encode(pair.publicKey);
  const message =
    "Halo Forge wallet sign-in\nOrigin: https://halo.example\nNonce: unique-test";
  const calls: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(url);
    const body = JSON.parse(String(init?.body));
    if (url === "/api/auth/challenge") {
      assert.deepEqual(body, { wallet: address });
      return Response.json({ id: "nonce-id", message });
    }
    assert.equal(url, "/api/auth/verify");
    assert.deepEqual(Object.keys(body).sort(), ["id", "signature"]);
    assert.equal(body.id, "nonce-id");
    assert.ok(
      nacl.sign.detached.verify(
        new TextEncoder().encode(message),
        bs58.decode(body.signature),
        pair.publicKey,
      ),
    );
    return Response.json({ ok: true });
  };
  await establishWalletSession(address, async (c) => {
    assert.equal(c.message, message);
    return nacl.sign.detached(
      new TextEncoder().encode(c.message),
      pair.secretKey,
    );
  });
  assert.deepEqual(calls, ["/api/auth/challenge", "/api/auth/verify"]);
});

test("a changed message or failed server verification cannot establish a wallet session", async () => {
  const pair = nacl.sign.keyPair();
  let verifies = 0;
  globalThis.fetch = async (input) => {
    if (String(input) === "/api/auth/challenge")
      return Response.json({ id: "nonce", message: "expected" });
    verifies++;
    return Response.json({ error: "Expired nonce" }, { status: 401 });
  };
  await assert.rejects(
    establishWalletSession(bs58.encode(pair.publicKey), async () =>
      nacl.sign.detached(new TextEncoder().encode("changed"), pair.secretKey),
    ),
    /does not match/,
  );
  assert.equal(verifies, 0);
  await assert.rejects(
    establishWalletSession(bs58.encode(pair.publicKey), async (c) =>
      nacl.sign.detached(new TextEncoder().encode(c.message), pair.secretKey),
    ),
    /Expired nonce/,
  );
  assert.equal(verifies, 1);
});
