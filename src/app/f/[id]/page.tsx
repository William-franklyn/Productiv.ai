import { PublicFormFill } from "@/components/forms/PublicFormFill";

export const metadata = { title: "Form" };

export default async function PublicFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PublicFormFill formId={id} />;
}
