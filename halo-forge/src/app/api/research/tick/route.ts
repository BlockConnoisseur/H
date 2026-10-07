import { after } from "next/server";
import { serviceAuthorized } from "@/lib/lab-controller";
import { researchTick } from "@/lib/lab-runtime";
import { syncPumpFees } from "@/lib/pump-fees";
import { expirePumpDrafts } from "@/lib/pump-launch";
export const runtime = "nodejs";
export const maxDuration = 800;
export async function GET(req: Request) {
  if (
    !serviceAuthorized(
      req.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  after(researchTick);
  after(syncPumpFees);
  after(expirePumpDrafts);
  return Response.json({ accepted: true });
}
