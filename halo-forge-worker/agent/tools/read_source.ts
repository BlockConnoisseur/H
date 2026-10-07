import { defineTool } from "eve/tools";
import { z } from "zod";
import { controller } from "../lib/controller";
export default defineTool({
  description: "Read an allowed source excerpt from the assignment's immutable checkout. The controller enforces paths and revision.",
  inputSchema: z.object({ path: z.enum(["halo2_proofs/src/arithmetic.rs", "halo2_proofs/src/multicore.rs"]), startLine: z.number().int().min(1), lineCount: z.number().int().min(1).max(200) }).strict(),
  execute: (input, ctx) => controller(ctx.session.id, "read_source", input),
});
