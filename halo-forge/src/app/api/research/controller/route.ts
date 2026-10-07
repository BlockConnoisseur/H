import { after } from "next/server";
import { controllerOperation, serviceAuthorized } from "@/lib/lab-controller";
import { evaluateResearch } from "@/lib/lab-runtime";
import { DomainError } from "@/lib/domain";
import { transact } from "@/lib/store";
import { event, labState } from "@/lib/lab-domain";
export const runtime = "nodejs";
export const maxDuration = 800;
export async function POST(req: Request) {
  if (!serviceAuthorized(req.headers.get("authorization")))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const text = await req.text();
  if (text.length > 50000)
    return Response.json({ error: "Too large" }, { status: 413 });
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
    const result = await controllerOperation(
      parsed,
      req.headers.get("idempotency-key") ?? "",
    );
    if (
      result &&
      typeof result === "object" &&
      "jobId" in result &&
      "status" in result &&
      result.status === "evaluating"
    ) {
      const id = String(result.jobId);
      after(() => evaluateResearch(id));
    }
    return Response.json(result);
  } catch (e) {
    const input = parsed as
      { sessionId?: unknown; operation?: unknown } | undefined;
    if (e instanceof DomainError && typeof input?.sessionId === "string")
      await transact((s) => {
        const job = labState(s).jobs.find(
          (j) => j.sessionId === input.sessionId,
        );
        if (job && job.events.length < 150)
          event(
            job,
            "tool_rejected",
            `${String(input.operation).slice(0, 40)}: ${e.message}`,
          );
      });
    return Response.json(
      {
        error:
          e instanceof DomainError ? e.message : "Invalid research operation.",
      },
      { status: e instanceof DomainError ? e.status : 400 },
    );
  }
}
