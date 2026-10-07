export const COMPUTE_WALLET = "2Hoh43HtpkSwf4eraE1wtU4PQLH3MHqkv4bxdhBeFfLu";
export const LAUNCH_LAMPORTS = 300_000_000;
export const PROTOCOL_BPS = 95;
export const CREATOR_BPS = 205;
export const SHARED_BPS = 100;
export const AGENT_BPS = 105;
export function formatZec(raw: string) {
  const amount = BigInt(raw);
  return `${amount / 100_000_000n}.${(amount % 100_000_000n).toString().padStart(8, "0")}`;
}
// Integer base units only. Assign rounding remainder to the agent, conserving receipts.
export function splitCreatorReceipt(raw: string) {
  if (!/^\d+$/.test(raw)) throw new Error("Invalid receipt amount.");
  const total = BigInt(raw),
    shared = (total * BigInt(SHARED_BPS)) / BigInt(CREATOR_BPS);
  return {
    sharedRaw: shared.toString(),
    agentRaw: (total - shared).toString(),
  };
}
