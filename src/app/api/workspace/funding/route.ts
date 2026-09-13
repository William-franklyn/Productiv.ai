import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAuthApi } from "@/lib/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { lamportsPerAnswer } from "@/lib/solana/rates";

const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("credit_balance, sponsor_slug")
    .eq("id", auth.orgId)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const answersLeft = Math.max(0, Math.floor(data.credit_balance / lamportsPerAnswer()));

  return NextResponse.json({
    creditBalance: data.credit_balance,
    answersLeft,
    sponsorSlug: data.sponsor_slug,
    sponsorUrl: data.sponsor_slug ? `${appUrl()}/sponsor/${data.sponsor_slug}` : null,
  });
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

export async function POST() {
  const auth = await requireAuthApi();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (auth.role === "member") {
    return NextResponse.json({ error: "Only owners and admins can get a funding link" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("organizations")
    .select("sponsor_slug")
    .eq("id", auth.orgId)
    .single();

  if (existing?.sponsor_slug) {
    return NextResponse.json({ sponsorUrl: `${appUrl()}/sponsor/${existing.sponsor_slug}` });
  }

  const slug = `${slugify(auth.orgName)}-${randomBytes(3).toString("hex")}`;
  const { error } = await supabase
    .from("organizations")
    .update({ sponsor_slug: slug })
    .eq("id", auth.orgId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sponsorUrl: `${appUrl()}/sponsor/${slug}` }, { status: 201 });
}
