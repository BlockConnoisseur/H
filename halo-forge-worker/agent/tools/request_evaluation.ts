import { defineTool } from "eve/tools";
import { z } from "zod";
import { controller } from "../lib/controller";
export default defineTool({
  endsTurn: true,
  description: "Request fixed correctness and development benchmarks for a frozen patch. The controller checks ownership, budget, attempt cap and sandbox availability before starting anything.",
  inputSchema: z.object({ artifactDigest: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  execute: (input, ctx) => controller(ctx.session.id, "request_evaluation", input),
});
