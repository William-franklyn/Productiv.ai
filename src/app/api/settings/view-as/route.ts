import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireAuthApi, VIEW_AS_COOKIE } from "@/lib/auth/guard";

const bodySchema = z.object({ role: z.enum(["owner", "admin", "member"]).nullable() });

export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.realRole === "member") {
    return NextResponse.json({ error: "Only owners and admins can preview a role" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const store = await cookies();
  if (parsed.data.role === null) {
    store.delete(VIEW_AS_COOKIE);
  } else {
    store.set(VIEW_AS_COOKIE, parsed.data.role, { path: "/", httpOnly: true, sameSite: "lax" });
  }

  return NextResponse.json({ ok: true });
}
