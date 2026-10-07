import { defineTool } from "eve/tools";
import { z } from "zod";
import { controller } from "../lib/controller";
export default defineTool({
  endsTurn: true,
  description: "Freeze a candidate and start isolated evaluation, then end the turn. Use exact oldText/newText replacements copied from read_source; every oldText must occur exactly once. The server generates and validates the diff. This does not qualify a discovery or authorize a payout.",
  inputSchema: z.object({ hypothesis: z.string().min(30).max(4000), replacements: z.array(z.object({oldText:z.string().min(1).max(12000),newText:z.string().max(12000)}).strict()).min(1).max(6), expectedTradeoff: z.string().min(15).max(2000) }).strict(),
  execute: (input, ctx) => controller(ctx.session.id, "propose_patch", input),
});
