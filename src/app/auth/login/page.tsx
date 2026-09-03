import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <Suspense
        fallback={
          <div className="text-sm text-zinc-400 animate-pulse">Loading…</div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}