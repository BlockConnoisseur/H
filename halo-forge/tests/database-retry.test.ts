import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

test("transient database reads retry but ambiguous writes never replay", async () => {
  process.env.HALO_DATABASE_DRIVER = "postgres";
  process.env.HALO_DATABASE_URL =
    "postgresql://fixture:fixture@localhost/fixture";
  let calls = 0;
  const query = mock.method(Pool.prototype, "query", async () => {
    if (++calls === 1) throw new Error("Connection terminated unexpectedly");
    return { rows: [{ ok: true }] };
  });
  const logs = mock.method(console, "error", () => {});
  const store = await import("../src/lib/store");
  try {
    assert.deepEqual(await store.query("SELECT 1"), [{ ok: true }]);
    assert.equal(calls, 2);
    calls = 0;
    await assert.rejects(
      store.query("UPDATE fixture SET value=1"),
      /Connection terminated/,
    );
    assert.equal(calls, 1);
  } finally {
    query.mock.restore();
    logs.mock.restore();
    await store.closeStore();
  }
});
