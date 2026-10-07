import { transact, closeStore } from "../src/lib/store";
import { labState, queueResearch } from "../src/lib/lab-domain";

async function main() {
  if (process.env.HALO_DATABASE_DRIVER !== "postgres")
    throw new Error("Use the configured Postgres store.");
  const result = await transact((s) => {
    const lab = labState(s);
    if (!lab.allocatedCents) lab.allocatedCents = 6000;
    lab.dailyCapCents = 1500;
    lab.enabled = true;
    for (const a of s.agents.filter((a) => a.platform)) {
      if (!a.deployer) throw new Error("Platform deployer is missing.");
      a.autoRun = false;
      if (!lab.jobs.some((j) => j.agentId === a.id)) queueResearch(s, a.id);
    }
    return {
      allocatedCents: lab.allocatedCents,
      dailyCapCents: lab.dailyCapCents,
      jobs: lab.jobs.map((j) => ({
        id: j.id,
        agentId: j.agentId,
        status: j.status,
      })),
    };
  });
  console.log(JSON.stringify(result));
}
main()
  .catch(() => {
    console.error("Research activation failed.");
    process.exitCode = 1;
  })
  .finally(closeStore);
