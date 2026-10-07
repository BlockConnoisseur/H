import { createHash } from "node:crypto";

// A model never chooses a URL, recipient, command, or billing identity.
// The controller must bind the authenticated session to one paid run.
export async function controller(sessionId: string, operation: string, input: unknown) {
  const endpoint = process.env.HALO_CONTROLLER_URL;
  const secret = process.env.HALO_CONTROLLER_TOKEN;
  if (!endpoint || !secret) throw new Error("Research controller is not configured. No job was started.");
  const url = new URL(endpoint);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("Controller requires a fixed HTTPS endpoint without credentials or query parameters.");
  }
  const body = JSON.stringify({ sessionId, operation, input });
  const response = await fetch(url, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}`,
      "Idempotency-Key": createHash("sha256").update(body).digest("hex") },
    body,
  });
  if (!response.ok) throw new Error(`Controller rejected ${operation} (${response.status}).`);
  const text = await response.text();
  if (text.length > 128_000) throw new Error("Controller response exceeds tool output limit.");
  return JSON.parse(text) as unknown;
}
