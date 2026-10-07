import { test } from "node:test";
import assert from "node:assert/strict";
import { launchRequest, loadWorkspace } from "../src/lib/launch-request";
test("temporary server failure retries exact signed payload, then returns saved launch", async () => {
  const requests: string[] = [];
  const fetcher = (async (_url, options) => {
    requests.push(options!.body as string);
    return requests.length === 1
      ? new Response("busy", { status: 503 })
      : Response.json({ launch: { id: "saved" } });
  }) as typeof fetch;
  assert.deepEqual(
    await launchRequest(
      { action: "submit", id: "saved", signed: "identical" },
      fetcher,
      async () => {},
    ),
    { id: "saved" },
  );
  assert.equal(requests.length, 2);
  assert.equal(requests[0], requests[1]);
});
test("wallet validation failures are not retried and temporary failures are bounded", async () => {
  for (const status of [400, 503]) {
    let calls = 0;
    const fetcher = (async () => {
      calls++;
      return Response.json({ error: "request failed" }, { status });
    }) as typeof fetch;
    await assert.rejects(
      launchRequest({ action: "refresh" }, fetcher, async () => {}),
      /request failed/,
    );
    assert.equal(calls, status === 400 ? 1 : 3);
  }
});

test("workspace loading recovers from a temporary server failure", async () => {
  let calls = 0;
  const fetcher = (async () =>
    ++calls === 1
      ? new Response("unavailable", { status: 500 })
      : Response.json({ agents: [] })) as typeof fetch;
  assert.deepEqual(await loadWorkspace(fetcher, async () => {}), {
    agents: [],
  });
  assert.equal(calls, 2);
});
