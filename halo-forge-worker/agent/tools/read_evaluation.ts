import { defineTool } from "eve/tools";
import { z } from "zod";
import { controller } from "../lib/controller";
export default defineTool({
  description: "Read development results for a job owned by this paid session. Held-out final evaluation data is never returned.",
  inputSchema: z.object({ jobId: z.string().regex(/^[a-zA-Z0-9_-]{8,100}$/) }).strict(),
  execute: (input, ctx) => controller(ctx.session.id, "read_evaluation", input),
});
