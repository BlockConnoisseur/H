// Preserve financial and on-chain history while retiring the operator's
// explicitly identified launch rehearsal from the public product.
import { randomUUID } from "node:crypto";
import { transact, closeStore } from "../src/lib/store";
const ids = new Set([
  "59920bc2-47ce-43b8-9c25-0a15f3cfacfa",
  "392227b5-d60c-41ad-844f-17f84d57c1f3",
]);
async function main() {
  const result = await transact((s) => {
    const at = new Date().toISOString();
    const retired: string[] = [];
    for (const draft of s.pumpLaunches ?? []) {
      if (!ids.has(draft.id) || draft.archivedAt) continue;
      draft.archivedAt = at;
      const agent = s.agents.find((a) => a.id === draft.agentId);
      if (agent) {
        agent.archivedAt = at;
        agent.autoRun = false;
        agent.status = "paused";
      }
      retired.push(draft.id);
    }
    if (retired.length)
      s.audit.unshift({
        id: randomUUID(),
        actor: "operator",
        action: "Archive launch rehearsal",
        detail: `Retired ${retired.join(", ")}. Payment, allowance and chain records retained.`,
        createdAt: at,
      });
    return {
      archived: retired,
      platformAgents: s.agents
        .filter((a) => a.platform)
        .map((a) => ({ name: a.name, image: a.image, autoRun: a.autoRun })),
    };
  });
  console.log(JSON.stringify(result));
  await closeStore();
}
main().catch(async () => {
  console.error("Archive failed; provider details omitted.");
  await closeStore();
  process.exitCode = 1;
});
