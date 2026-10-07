import { createHash, timingSafeEqual } from "node:crypto";
import { defineChannel, POST } from "eve/channels";
import { controller } from "../lib/controller";

export default defineChannel({
  routes:[POST("/research/start",async(req,{from,resolveSession})=>{
    const secret=process.env.HALO_CONTROLLER_TOKEN;
    if(!secret || secret.length<32 || !timingSafeEqual(createHash("sha256").update(req.headers.get("authorization")??"").digest(),createHash("sha256").update(`Bearer ${secret}`).digest())) return Response.json({error:"Unauthorized"},{status:401});
    const body=await req.json() as {runId?:unknown};
    if(typeof body.runId!=="string" || !/^[a-f0-9-]{36}$/.test(body.runId)) return Response.json({error:"Invalid run"},{status:400});
    const existing=await resolveSession(body.runId);
    if(existing) return Response.json({sessionId:existing.id});
    const session=await from(body.runId).send("Read your assigned experiment and pinned source. Produce one new, small, exact unified diff for that method. Request the fixed development evaluation, then stop for the operator's manual review. Do not claim an improvement before measurement.",{auth:{authenticator:"halo-dispatcher",principalId:"halo-controller",principalType:"service",attributes:{runId:body.runId}}});
    return Response.json({sessionId:session.id},{status:202});
  })],
  events:{
    "step.completed":async(event,_channel,ctx)=>{
      if(!event.usage) return;
      await controller(ctx.session.id,"model_receipt",{stepKey:`${event.turnId}:${event.stepIndex}`,costUsd:event.usage.costUsd??0,inputTokens:event.usage.inputTokens??0,outputTokens:event.usage.outputTokens??0});
    },
    "turn.completed":async(_event,_channel,ctx)=>{await controller(ctx.session.id,"finish",{failed:false}).catch(()=>undefined);},
    "turn.failed":async(_event,_channel,ctx)=>{await controller(ctx.session.id,"finish",{failed:true}).catch(()=>undefined);},
  },
});
