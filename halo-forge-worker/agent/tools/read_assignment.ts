import { defineTool } from "eve/tools";
import { z } from "zod";
import { controller } from "../lib/controller";
export default defineTool({
  description: "Read the controller-bound assignment, pinned source revision, remaining reservation, and allowed paths for this session.",
  inputSchema: z.object({}).strict(),
  execute: (_, ctx) => controller(ctx.session.id, "read_assignment", {}),
});
