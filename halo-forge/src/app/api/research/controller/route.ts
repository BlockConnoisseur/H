import { after } from "next/server";
import { controllerOperation, serviceAuthorized } from "@/lib/lab-controller";
import { evaluateResearch } from "@/lib/lab-runtime";
import { DomainError } from "@/lib/domain";
export const runtime = "nodejs";
export const maxDuration = 800;
export async function POST(req: Request) {
  if (!serviceAuthorized(req.headers.get("authorization")))
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const text = await req.text();
  if (text.length > 50000)
    return Response.json({ error: "Too large" }, { status: 413 });
  try {
    const result = await controllerOperation(
      JSON.parse(text),
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
    return Response.json(
      {
        error:
          e instanceof DomainError ? e.message : "Invalid research operation.",
      },
      { status: e instanceof DomainError ? e.status : 400 },
    );
  }
}
