import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bs58 from "bs58";
import { randomBytes } from "node:crypto";
import {
  actorFor,
  challenge,
  COOKIE,
  createSession,
  deleteSession,
  rateLimit,
  verifyChallenge,
} from "@/lib/auth";
import {
  DomainError,
  execute,
  hash,
  rankFindings,
  tracks,
  ZEC_MINT,
} from "@/lib/domain";
import { readState, transact, storageDriver } from "@/lib/store";
import { normalizeCoinImage } from "@/lib/coin-image";
import { after } from "next/server";
import { publicLab, labState, queueResearch, reviewResearch } from "@/lib/lab-domain";
import { dispatchResearch } from "@/lib/lab-runtime";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function fail(error: unknown) {
  return NextResponse.json(
    {
      error:
        error instanceof z.ZodError
          ? error.issues.map((i) => i.message).join(" ")
          : error instanceof DomainError
            ? error.message
            : "The request could not be completed. Please retry.",
    },
    {
      status:
        error instanceof z.ZodError
          ? 400
          : error instanceof DomainError
            ? error.status
            : 500,
    },
  );
}
function localPreview(req: NextRequest) {
  return (
    process.env.HALO_LOCAL_PREVIEW === "true" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(req.nextUrl.hostname)
  );
}
export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname
      .split("/")
      .filter(Boolean)
      .slice(1)
      .join("/");
    if (path !== "state" && path !== "ledger.csv" && path !== "lab")
      throw new DomainError("Not found.", 404);
    const actor = await actorFor(req.cookies.get(COOKIE)?.value);
    const s = await readState();
    if(path === "lab") return NextResponse.json(publicLab(s,actor),{headers:{"Cache-Control":"no-store"}});
    // Audit, billing and raw artifacts are visible only to their owners/reviewers.
    const owned = new Set(
      s.agents.filter((a) => a.deployer === actor?.wallet).map((a) => a.id),
    );
    if (path === "ledger.csv") {
      if (!actor) throw new DomainError("Sign in to export your ledger.", 401);
      const cell = (value: string) => {
        const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
        return `"${safe.replaceAll('"', '""')}"`;
      };
      const rows = s.ledger
        .filter((e) => e.agentId && owned.has(e.agentId))
        .map((e) =>
          [
            cell(e.createdAt),
            cell(e.agentId!),
            cell(e.type),
            (e.amount / 100).toFixed(2),
            cell(e.note),
          ].join(","),
        );
      return new NextResponse(
        "Date,Agent,Type,USD equivalent,Note\r\n" + rows.join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition":
              'attachment; filename="halo-preview-ledger.csv"',
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
    return NextResponse.json(
      {
        actor,
        agents: s.agents.filter((a) => !a.example),
        runs: s.runs.filter((r) => owned.has(r.agentId) || actor?.reviewer),
        findings: s.findings
          .filter((f) => !f.example)
          .map((f) => ({
            ...f,
            patch:
              owned.has(f.agentId) || actor?.reviewer || f.example
                ? f.patch
                : "Private until publication.",
          })),
        awards: s.awards,
        ledger: s.ledger.filter((e) => e.agentId && owned.has(e.agentId)),
        audit: s.audit
          .filter((e) => e.actor === actor?.wallet || actor?.reviewer)
          .slice(0, 50),
        ranking: rankFindings(s.findings).map((r) => ({
          ...r,
          finding: { ...r.finding, patch: "" },
        })),
        tracks,
        zecMint: ZEC_MINT,
        previewAvailable: localPreview(req),
        mode: "preview",
        storage: storageDriver,
        liveReady: false,
        prizeActual: "0",
        prizeExample: "10",
        version: s.version,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return fail(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    const expectedOrigin = process.env.HALO_APP_ORIGIN || req.nextUrl.origin;
    if (req.headers.get("origin") !== expectedOrigin)
      throw new DomainError("Request origin is not allowed.", 403);
    if (Number(req.headers.get("content-length") || 0) > 120000)
      throw new DomainError("Request is too large.", 413);
    const raw = await req.text();
    if (raw.length > 120000)
      throw new DomainError("Request is too large.", 413);
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      throw new DomainError("Invalid JSON request.");
    }
    const path = req.nextUrl.pathname
      .split("/")
      .filter(Boolean)
      .slice(1)
      .join("/");
    const token = req.cookies.get(COOKIE)?.value;
    await rateLimit(token ? hash(token) : "anonymous", 60);
    let newToken: string | undefined;
    if (path === "auth/challenge") {
      const p = z
        .object({ wallet: z.string().max(50) })
        .strict()
        .parse(body);
      return NextResponse.json(await challenge(p.wallet, expectedOrigin));
    }
    if (path === "auth/verify") {
      const p = z
        .object({ id: z.string().uuid(), signature: z.string().max(100) })
        .strict()
        .parse(body);
      newToken = await verifyChallenge(p.id, p.signature);
    } else if (path === "auth/preview") {
      if (!localPreview(req))
        throw new DomainError(
          "Preview sign-in is available only on the local development host.",
          403,
        );
      newToken = await createSession(bs58.encode(randomBytes(32)), true);
    } else if (path === "auth/logout") {
      if (token) await deleteSession(token);
      const res = NextResponse.json({ ok: true });
      res.cookies.delete(COOKIE);
      return res;
    } else if (path === "lab/actions") {
      const actor=await actorFor(token);
      if(!actor || actor.preview) throw new DomainError("Connect and sign with your wallet first.",401);
      const p=z.discriminatedUnion("action",[
        z.object({action:z.literal("queue"),agentId:z.string()}).strict(),
        z.object({action:z.literal("review"),jobId:z.string().uuid(),decision:z.enum(["accepted","rejected"]),note:z.string().min(15).max(2000)}).strict(),
        z.object({action:z.literal("pause"),paused:z.boolean()}).strict(),
      ]).parse(body);
      const result=await transact(s=>{
        if(p.action==="queue") return {id:queueResearch(s,p.agentId,actor).id};
        if(p.action==="review") {reviewResearch(s,actor,p.jobId,p.decision,p.note);return {id:p.jobId};}
        if(!actor.reviewer) throw new DomainError("Operator access required.",403);
        labState(s).enabled=!p.paused;return {enabled:!p.paused};
      });
      if(p.action==="queue") after(dispatchResearch);
      return NextResponse.json({result});
    } else if (path === "actions") {
      const actor = await actorFor(token);
      if (!actor)
        throw new DomainError(
          "Connect your wallet or start a local preview first.",
          401,
        );
      const p = z
        .object({
          action: z.string(),
          input: z.record(z.string(), z.unknown()),
          key: z.string(),
        })
        .strict()
        .parse(body);
      if (p.action === "launch" && p.input.image != null) {
        p.input.image = await normalizeCoinImage(p.input.image);
      }
      return NextResponse.json({
        result: await transact((s) =>
          execute(s, actor, p.action, p.input, p.key),
        ),
      });
    } else if (!newToken) throw new DomainError("Not found.", 404);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE, newToken!, {
      httpOnly: true,
      sameSite: "strict",
      secure: req.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 86400,
    });
    return res;
  } catch (error) {
    return fail(error);
  }
}
