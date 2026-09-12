import { FormEditor } from "@/components/forms/FormEditor";

export const metadata = { title: "Edit form" };

export default async function FormEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FormEditor formId={id} />;
}
