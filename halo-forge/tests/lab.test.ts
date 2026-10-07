import {test} from "node:test";
import assert from "node:assert/strict";
import {createTwoFilesPatch} from "diff";
import {initialState} from "../src/lib/domain";
import {labState,queueResearch,reviewResearch,publicLab} from "../src/lib/lab-domain";
import {validatePatch,serviceAuthorized} from "../src/lib/lab-controller";
import source from "../src/lib/research-source.json";

function ready(){const s=initialState();for(const a of s.agents){a.deployer="operator-wallet";a.status="ready";}Object.assign(labState(s),{enabled:true,allocatedCents:6000});return s;}
const actor={wallet:"operator-wallet",preview:false,reviewer:true};
test("lab enforces ownership, one active experiment and shared daily allowance",()=>{
  const s=ready();assert.throws(()=>queueResearch(s,"platform-1",{...actor,wallet:"outsider",reviewer:false}),/Only/);
  const j=queueResearch(s,"platform-1",actor);assert.equal(j.reservationCents,300);
  assert.throws(()=>queueResearch(s,"platform-1",actor),/already/);
  queueResearch(s,"platform-2",actor);queueResearch(s,"platform-3",actor);
  j.status="failed";assert.throws(()=>queueResearch(s,"platform-1",actor),/allowance/);
});
test("manual review is operator-only, immutable and never creates payouts",()=>{
  const s=ready(),j=queueResearch(s,"platform-1",actor);j.status="awaiting_review";
  assert.throws(()=>reviewResearch(s,{...actor,preview:true},j.id,"accepted","Checked source and test evidence."),/Operator/);
  reviewResearch(s,actor,j.id,"accepted","Checked source and test evidence.");
  assert.equal(j.review?.reviewer,actor.wallet);assert.equal(s.awards.length,0);
  assert.throws(()=>reviewResearch(s,actor,j.id,"rejected","Changing a previously frozen decision."),/already/);
});
test("public activity omits private patches, command logs and controller state",()=>{
  const s=ready(),j=queueResearch(s,"platform-1",actor);
  j.patches.push({digest:"a".repeat(64),diff:"PRIVATE PATCH",hypothesis:"Public hypothesis",expectedTradeoff:"Memory cost",createdAt:j.createdAt});
  const view=publicLab(s,null);assert.equal(view.jobs[0].patches[0].diff,undefined);assert.equal("commands" in view.jobs[0],false);
  assert.equal(publicLab(s,actor).jobs[0].patches[0].diff,"PRIVATE PATCH");
});
test("patch validator confines changes to MSM and rejects test changes and unsafe additions",()=>{
  const path="halo2_proofs/src/arithmetic.rs",original=source[path];
  const diff=(candidate:string)=>createTwoFilesPatch(`a/${path}`,`b/${path}`,original,candidate);
  assert.equal(validatePatch(diff(original.replace("// get segmentation and add coeff to buckets content","// Read scalar windows for this invocation."))).digest.length,64);
  assert.throws(()=>validatePatch(diff(original.replace("fn test_multiexp()","fn disabled_multiexp()"))),/MSM region/);
  assert.throws(()=>validatePatch(diff(original.replace("// get segmentation and add coeff to buckets content","unsafe { std::process::exit(0); }"))),/disallowed/);
  assert.throws(()=>validatePatch("--- a/../Cargo.toml\n+++ b/../Cargo.toml\n@@ -1 +1 @@\n-a\n+b\n"),/Only arithmetic/);
});
test("controller authentication rejects missing and wrong service credentials",()=>{
  assert.equal(serviceAuthorized(null,"s".repeat(64)),false);
  assert.equal(serviceAuthorized("Bearer wrong","s".repeat(64)),false);
  assert.equal(serviceAuthorized(`Bearer ${"s".repeat(64)}`,"s".repeat(64)),true);
});
