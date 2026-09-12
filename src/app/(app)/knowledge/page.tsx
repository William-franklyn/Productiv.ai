import { ComingSoon } from "@/components/shell/ComingSoon";

export const metadata = { title: "Knowledge" };

export default function KnowledgePage() {
  return (
    <ComingSoon
      title="Knowledge"
      body="Upload documents here to make them askable in the assistant, with answers citing the exact source."
    />
  );
}
