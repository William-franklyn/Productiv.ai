import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata = { title: "Sign up" };

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Create your workspace"
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)]">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthLayout>
  );
}
