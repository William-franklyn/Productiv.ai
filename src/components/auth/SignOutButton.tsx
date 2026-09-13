"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] text-[var(--muted)] hover:bg-[var(--surface-sunken)] hover:text-[var(--ink)]"
      aria-label="Sign out"
    >
      <LogOut size={16} />
    </button>
  );
}
