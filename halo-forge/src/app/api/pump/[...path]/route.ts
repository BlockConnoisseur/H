import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { actorFor, COOKIE, rateLimit } from "@/lib/auth";
import { DomainError, hash } from "@/lib/domain";
import { readState } from "@/lib/store";
import {
  latestPumpLaunch,
  checkPumpSigning,
  preparePumpLaunch,
  preparePumpRoute,
  refreshPumpLaunch,
  submitPumpLaunch,
} from "@/lib/pump-launch";
import { researchTick } from "@/lib/lab-runtime";
import { prepareFeeClaim, submitFeeClaim, syncPumpFees } from "@/lib/pump-fees";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 800;
function failure(e: unknown) {
  return NextResponse.json(
    {
      error:
        e instanceof DomainError
          ? e.message
          : e instanceof z.ZodError
            ? "Invalid launch request."
            : "The chain request could not be completed. Refresh this launch before retrying.",
    },
    {
      status:
        e instanceof DomainError
          ? e.status
          : e instanceof z.ZodError
            ? 400
            : 503,
    },
  );
}
export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl.pathname.split("/").filter(Boolean).slice(2);
    if (["metadata", "image"].includes(path[0]) && path.length === 2) {
      const d = (await readState()).pumpLaunches?.find((d) => d.id === path[1]);
      if (!d) throw new DomainError("Not found.", 404);
      if (path[0] === "image") {
        if (!d.image) throw new DomainError("Not found.", 404);
        return new NextResponse(Buffer.from(d.image.split(",")[1], "base64"), {
          headers: {
            "Content-Type": "image/webp",
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      const origin = process.env.HALO_APP_ORIGIN || "https://halozec.tech";
      return NextResponse.json(
        {
          name: d.name,
          symbol: d.symbol,
          description: d.description,
          ...(d.image ? { image: `${origin}/api/pump/image/${d.id}` } : {}),
          external_url: `${origin}/agents/agent-${d.id}`,
          properties: { category: "image" },
        },
        { headers: { "Cache-Control": "public, max-age=31536000, immutable" } },
      );
    }
    if (path.join("/") !== "current") throw new DomainError("Not found.", 404);
    const actor = await actorFor(req.cookies.get(COOKIE)?.value);
    if (!actor || actor.preview)
      throw new DomainError("Connect your deployer wallet.", 401);
    return NextResponse.json(
      { launch: await latestPumpLaunch(actor) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    if (req.nextUrl.pathname !== "/api/pump/actions")
      throw new DomainError("Not found.", 404);
    if (
      req.headers.get("origin") !==
      (process.env.HALO_APP_ORIGIN || req.nextUrl.origin)
    )
      throw new DomainError("Request origin is not allowed.", 403);
    const token = req.cookies.get(COOKIE)?.value,
      actor = await actorFor(token);
    if (!actor || actor.preview)
      throw new DomainError(
        "Connect and sign with your deployer wallet first.",
        401,
      );
    await rateLimit(`pump:${hash(token!)}`, 20);
    const raw = await req.text();
    if (raw.length > 100000)
      throw new DomainError("Request is too large.", 413);
    const p = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("prepare"), input: z.unknown() }).strict(),
        z
          .object({ action: z.literal("refresh"), id: z.string().uuid() })
          .strict(),
        z
          .object({ action: z.literal("route"), id: z.string().uuid() })
          .strict(),
        z
          .object({
            action: z.literal("check_signing"),
            id: z.string().uuid(),
            stage: z.enum(["create", "route"]),
          })
          .strict(),
        z
          .object({
            action: z.literal("submit"),
            id: z.string().uuid(),
            stage: z.enum(["create", "route"]),
            signed: z.string().max(1800),
          })
          .strict(),
        z
          .object({ action: z.literal("collect_prepare"), agentId: z.string() })
          .strict(),
        z
          .object({
            action: z.literal("collect_submit"),
            id: z.string().uuid(),
            signed: z.string().max(1800),
          })
          .strict(),
      ])
      .parse(JSON.parse(raw));
    if (p.action === "collect_prepare")
      return NextResponse.json({
        claim: await prepareFeeClaim(actor, p.agentId),
      });
    if (p.action === "collect_submit") {
      const result = await submitFeeClaim(actor, p.id, p.signed);
      after(syncPumpFees);
      return NextResponse.json(result);
    }
    const launch =
      p.action === "prepare"
        ? await preparePumpLaunch(actor, p.input)
        : p.action === "check_signing"
          ? await checkPumpSigning(actor, p.id, p.stage)
          : p.action === "route"
            ? await preparePumpRoute(actor, p.id)
            : p.action === "submit"
              ? await submitPumpLaunch(actor, p.id, p.stage, p.signed)
              : await refreshPumpLaunch(actor, p.id);
    if (launch.agentId) after(researchTick);
    return NextResponse.json(
      { launch },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
