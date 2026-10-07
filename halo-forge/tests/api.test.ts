import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
const dir = mkdtempSync(join(tmpdir(), "halo-api-test-"));
process.env.HALO_DATABASE_PATH = join(dir, "test.sqlite");
process.env.HALO_APP_ORIGIN = "http://127.0.0.1:3210";
process.env.HALO_LOCAL_PREVIEW = "true";
process.env.HALO_EMPTY_STATE = "true";
let route: typeof import("../src/app/api/[...path]/route");
let database: typeof import("../src/lib/store");
before(async () => {
  route = await import("../src/app/api/[...path]/route");
  database = await import("../src/lib/store");
});
after(() => {
  database.db.close();
  rmSync(dir, { recursive: true, force: true });
});
const req = (
  path: string,
  body: unknown,
  cookie = "",
  origin = "http://127.0.0.1:3210",
) =>
  new NextRequest(`http://127.0.0.1:3210/api/${path}`, {
    method: "POST",
    headers: { origin, cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
test("API rejects wrong origin, missing identity and malformed JSON", async () => {
  assert.equal(
    (await route.POST(req("auth/preview", {}, "", "https://attacker.example")))
      .status,
    403,
  );
  assert.equal(
    (
      await route.POST(
        req("actions", { action: "launch", input: {}, key: "test-command" }),
      )
    ).status,
    401,
  );
  const bad = new NextRequest("http://127.0.0.1:3210/api/actions", {
    method: "POST",
    headers: { origin: "http://127.0.0.1:3210" },
    body: "{",
  });
  assert.equal((await route.POST(bad)).status, 400);
});
test("preview actions persist and raw patches stay private across API identities", async () => {
  const auth = await route.POST(req("auth/preview", {}));
  const cookie = auth.headers.get("set-cookie")!.split(";")[0];
  assert.ok(auth.headers.get("set-cookie")!.includes("HttpOnly"));
  const launch = await route.POST(
    req(
      "actions",
      {
        action: "launch",
        input: {
          name: "API Scout",
          symbol: "SCOUT",
          description: "Testing private artifact ownership boundaries.",
          track: "S1",
          dailyCap: 2000,
        },
        key: "api-launch-001",
      },
      cookie,
    ),
  );
  assert.equal(launch.status, 200);
  const { result } = await launch.json();
  const patch = "private artifact contents only for owner and reviewers";
  assert.equal(
    (
      await route.POST(
        req(
          "actions",
          {
            action: "submit",
            input: {
              agentId: result.id,
              title: "Private test artifact",
              hypothesis: "Storage isolation test without a performance claim.",
              patch,
            },
            key: "api-submit-001",
          },
          cookie,
        ),
      )
    ).status,
    200,
  );
  const publicState = await (
    await route.GET(new NextRequest("http://127.0.0.1:3210/api/state"))
  ).json();
  assert.equal(publicState.findings[0].patch, "Private until publication.");
  assert.equal(publicState.audit.length, 0);
  const ownerState = await (
    await route.GET(
      new NextRequest("http://127.0.0.1:3210/api/state", {
        headers: { cookie },
      }),
    )
  ).json();
  assert.equal(ownerState.findings[0].patch, patch);
  assert.equal(ownerState.liveReady, false);
  assert.equal(ownerState.agents[0].tokenMint, null);
  await route.POST(req("auth/logout", {}, cookie));
  assert.equal(
    (
      await route.POST(
        req(
          "actions",
          {
            action: "queue",
            input: { agentId: result.id },
            key: "after-logout",
          },
          cookie,
        ),
      )
    ).status,
    401,
  );
});
test("preview identity endpoint is disabled without explicit local configuration", async () => {
  process.env.HALO_LOCAL_PREVIEW = "false";
  assert.equal((await route.POST(req("auth/preview", {}))).status, 403);
  process.env.HALO_LOCAL_PREVIEW = "true";
});
test("CSV export requires identity and contains only the owner's ledger", async () => {
  const url = "http://127.0.0.1:3210/api/ledger.csv";
  assert.equal((await route.GET(new NextRequest(url))).status, 401);
  const auth = await route.POST(req("auth/preview", {}));
  const cookie = auth.headers.get("set-cookie")!.split(";")[0];
  const launch = await route.POST(
    req(
      "actions",
      {
        action: "launch",
        input: {
          name: "CSV Scout",
          symbol: "CSV",
          description: "Testing server ledger export isolation.",
          track: "S2",
          dailyCap: 2000,
        },
        key: "csv-launch-001",
      },
      cookie,
    ),
  );
  const { result } = await launch.json();
  await route.POST(
    req(
      "actions",
      {
        action: "topup",
        input: { agentId: result.id, cents: 2000 },
        key: "csv-topup-001",
      },
      cookie,
    ),
  );
  database.transact((s) => {
    s.ledger.unshift({
      id: "foreign",
      agentId: "another-agent",
      amount: 90000,
      type: "credit",
      note: "PRIVATE FOREIGN ENTRY",
      createdAt: new Date().toISOString(),
    });
  });
  const csv = await route.GET(new NextRequest(url, { headers: { cookie } }));
  assert.equal(csv.status, 200);
  assert.ok(csv.headers.get("content-disposition")!.includes("attachment"));
  const text = await csv.text();
  assert.ok(text.includes("20.00"));
  assert.ok(!text.includes("PRIVATE FOREIGN ENTRY"));
});
