import { requireAuth } from "@/lib/auth/guard";
import { FinanceManager } from "@/components/finance/FinanceManager";

export const metadata = { title: "Finance" };

export default async function FinancePage() {
  const { role } = await requireAuth();
  return <FinanceManager canManage={role !== "member"} />;
}
