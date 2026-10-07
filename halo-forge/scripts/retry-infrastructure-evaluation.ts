import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { transact, closeStore } from "../src/lib/store";
import { labState, event } from "../src/lib/lab-domain";
import { evaluateResearch } from "../src/lib/lab-runtime";
async function main() {
  const oidc = parseEnv(
    readFileSync(".vercel/sandbox.env", "utf8"),
  ).VERCEL_OIDC_TOKEN;
  if (!oidc) throw new Error("Missing local sandbox authentication.");
  process.env.VERCEL_OIDC_TOKEN = oidc;
  const id = await transact((s) => {
    const j = labState(s).jobs.find(
      (j) =>
        j.evaluation?.status === "failed" &&
        j.evaluation.commands.length === 2 &&
        j.evaluation.commands.every((c) => c.exitCode === 0) &&
        j.evaluation.commands[1].name === "Baseline MSM · 4 threads" &&
        (j.evaluationHistory?.length ?? 0) < 2 &&
        !j.review,
    );
    if (!j) return null;
    (j.evaluationHistory ??= []).push(j.evaluation!);
    delete j.evaluation;
    delete j.evaluationClaimedAt;
    j.status = "evaluating";
    event(
      j,
      "evaluating",
      "Retrying after correcting the Criterion artifact directory. Earlier infrastructure failures retained; candidate unchanged.",
    );
    return j.id;
  });
  if (id) {
    console.log(`Evaluating recorded candidate ${id}`);
    await evaluateResearch(id);
    console.log("Evaluation finished; see recorded results.");
  }
  await closeStore();
}
main().catch(() => {
  console.error("Evaluation retry failed; inspect the recorded run.");
  process.exitCode = 1;
});
