import { defineAgent, defineDynamic } from "eve";
import { gateway, wrapLanguageModel } from "ai";
import { controller } from "./lib/controller";
import { z } from "zod";

export default defineAgent({
  model: defineDynamic({events:{
    "step.started": async (event,ctx) => {
      const runId=ctx.session.auth.current?.attributes.runId;
      if(typeof runId!=="string") throw new Error("Only a dispatched research run may use the model.");
      await controller(ctx.session.id,"bind_session",{runId});
      const step=z.object({turnId:z.string(),stepIndex:z.number()}).parse(event && typeof event==="object" && "data" in event ? event.data : event);
      await controller(ctx.session.id,"reserve_model",{stepKey:`${step.turnId}:${step.stepIndex}`});
      return wrapLanguageModel({model:gateway("openai/gpt-6-luna-fast"),middleware:{
        specificationVersion:"v4",
        transformParams:async({params})=>{
          if(Buffer.byteLength(JSON.stringify({prompt:params.prompt,tools:params.tools}),"utf8")>120000) throw new Error("Research context limit reached before model call.");
          return {...params,maxOutputTokens:3000};
        },
      }});
    },
  }}),
  reasoning: "high",
  defaultTools: false,
  limits: {
    maxInputTokensPerSession: 100_000,
    maxOutputTokensPerSession: 20_000,
    maxTokenCostUsdPerSession: 1.2,
    sessionTimeoutMs: 30 * 60 * 1000,
  },
});
