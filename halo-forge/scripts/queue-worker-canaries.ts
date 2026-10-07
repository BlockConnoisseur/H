import { transact, closeStore } from "../src/lib/store";
import { labState, queueResearch } from "../src/lib/lab-domain";
async function main() {
  const ids = await transact((s) => {
    const lab = labState(s);
    // $15 includes the three original runs and two bounded retries, within the $60 research allocation.
    lab.dailyCapCents = 1500;
    const ids: string[] = [];
    for (const a of s.agents.filter((a) => a.platform)) {
      a.autoRun = true;
      const jobs = lab.jobs.filter((j) => j.agentId === a.id);
      if (
        jobs.length === 1 &&
        jobs[0].status === "failed" &&
        !jobs[0].patches.length
      )
        ids.push(queueResearch(s, a.id).id);
    }
    return ids;
  });
  console.log(JSON.stringify({ queued: ids }));
  await closeStore();
}
main().catch(() => {
  console.error("Canary scheduling failed.");
  process.exitCode = 1;
});
