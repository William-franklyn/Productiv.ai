import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireAuthApi, ACTIVE_ORG_COOKIE } from "@/lib/auth/guard";

const bodySchema = z.object({ organizationId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const isMember = auth.memberships.some((m) => m.orgId === parsed.data.organizationId);
  if (!isMember) {
    return NextResponse.json({ error: "Not a member of that workspace" }, { status: 403 });
  }

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, parsed.data.organizationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });

  return NextResponse.json({ ok: true });
}
