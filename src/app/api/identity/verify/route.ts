import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { confirmInquiry } from "@/lib/persona/client";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("persona_verified_at, sensitive_access_approved")
    .eq("id", auth.userId)
    .single();

  return NextResponse.json({
    verifiedAt: data?.persona_verified_at ?? null,
    approved: data?.sensitive_access_approved ?? false,
  });
}

const bodySchema = z.object({ inquiryId: z.string().min(1) });

// Called after the embedded Persona widget's onComplete fires client-side.
// That callback is never trusted on its own (devtools can fake it) — this
// re-asks Persona directly for the inquiry's real status before writing
// anything. See docs/verified-access.md.
export async function POST(req: NextRequest) {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing inquiryId" }, { status: 400 });
  }

  const result = await confirmInquiry(parsed.data.inquiryId);
  if (!result) {
    return NextResponse.json({ error: "Could not reach Persona" }, { status: 502 });
  }
  if (!result.approved) {
    return NextResponse.json(
      { error: `Inquiry not approved (status: ${result.status})` },
      { status: 422 },
    );
  }

  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({
      persona_inquiry_id: parsed.data.inquiryId,
      persona_verified_at: new Date().toISOString(),
    })
    .eq("id", auth.userId);

  return NextResponse.json({ ok: true });
}
