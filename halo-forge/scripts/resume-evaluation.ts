import { transact, closeStore } from "../src/lib/store";
import { labState, event } from "../src/lib/lab-domain";
async function main() {
  const ids = await transact((s) =>
    labState(s)
      .jobs.filter(
        (j) =>
          j.status === "awaiting_review" &&
          j.patches.length &&
          !j.evaluation &&
          !j.evaluationClaimedAt &&
          !j.review,
      )
      .map((j) => {
        j.status = "evaluating";
        event(
          j,
          "evaluating",
          "Resuming the recorded candidate's isolated evaluation within its existing reservation. No additional model call.",
        );
        return j.id;
      }),
  );
  console.log(JSON.stringify({ resumed: ids }));
  await closeStore();
}
main().catch(() => {
  console.error("Could not resume evaluation.");
  process.exitCode = 1;
});
