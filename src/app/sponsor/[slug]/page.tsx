import { SponsorPage } from "@/components/sponsor/SponsorPage";

export const metadata = { title: "Sponsor this workspace" };

export default async function PublicSponsorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SponsorPage slug={slug} />;
}
