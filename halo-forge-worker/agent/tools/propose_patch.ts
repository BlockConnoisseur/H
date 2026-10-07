import { defineTool } from "eve/tools";
import { z } from "zod";
import { controller } from "../lib/controller";
export default defineTool({
  description: "Freeze a unified diff and hypothesis for isolated evaluation. This does not qualify a discovery or authorize a payout.",
  inputSchema: z.object({ hypothesis: z.string().min(30).max(4000), diff: z.string().min(20).max(100000), expectedTradeoff: z.string().min(15).max(2000) }).strict(),
  execute: (input, ctx) => controller(ctx.session.id, "propose_patch", input),
});
