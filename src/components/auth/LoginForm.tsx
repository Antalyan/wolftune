"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Home, Loader2, Lock, Mail } from "lucide-react";
import { WolfMascot } from "@/components/WolfMascot";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error") === "callback_failed";
  const nextPath = searchParams.get("next") ?? "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setIsLoading(false);
          return;
        }

        if (data.session) {
          // Email confirmation disabled — the user is signed in immediately.
          router.push(nextPath);
          router.refresh();
          return; // keep the loading state while navigating
        }

        // Email confirmation enabled — the user must click the link first.
        setInfo(
          "Account created! Check your inbox and click the confirmation link to finish signing in."
        );
        setIsLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      router.push(nextPath);
      router.refresh();
      // keep the loading state while navigating
    } catch {
      setError(
        "Supabase is not configured yet. Add NEXT_PUBLIC_SUPABASE_URL and " +
          "NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart the dev server."
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="p-3 rounded-2xl bg-night-800 border border-blue-800/50 mb-4">
          <WolfMascot size={64} mood="happy" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">Welcome to WolfTune</h1>
        <p className="text-xs text-zinc-400 mt-1 text-center">
          Sign in to rate tracks, post reviews, and save your game progress.
        </p>
      </div>

      <div className="bg-night-800/80 border border-night-700 rounded-2xl p-6">
        {(callbackError || error) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 px-3.5 py-3 mb-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              {error ??
                "Sign-in failed. Please try again — if it keeps happening, check your " +
                  "Supabase URL configuration in the dashboard."}
            </p>
          </div>
        )}

        {info && (
          <div
            role="status"
            className="flex items-start gap-2.5 px-3.5 py-3 mb-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p>{info}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-night-900 border border-night-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-night-900 border border-night-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm text-white placeholder:text-zinc-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === "signup" ? "Creating account…" : "Signing in…"}
              </>
            ) : mode === "signup" ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-400 mt-4">
          {mode === "signin" ? (
            <>
              New to WolfTune?{" "}
              <button
                type="button"
                onClick={() => switchMode("signup")}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-blue-400 hover:text-blue-300 font-semibold"
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p className="text-center text-[11px] text-zinc-500 mt-4">
          By continuing you agree to our{" "}
          <Link href="/terms" className="text-blue-400 hover:text-blue-300">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
            Privacy Policy
          </Link>
          .
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 flex items-center justify-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Home className="w-3.5 h-3.5" /> Back to home
      </Link>
    </div>
  );
}