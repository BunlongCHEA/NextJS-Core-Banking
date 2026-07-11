"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Landmark, Lock, ShieldAlert, Loader2 } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(username.trim(), password);
      const { accessToken, role, username: uname, mustChangePassword, expiresIn } = res.data;
      saveSession(accessToken, role, uname, expiresIn);

      if (mustChangePassword) {
        router.push("/change-password");
        return;
      }
      const redirectTo = searchParams.get("redirectTo");
      router.push(redirectTo && redirectTo.startsWith("/dashboard") ? redirectTo : "/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not reach the CBS server.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-ledger-paper">
      {/* ── Left: the vault ── signature element ── */}
      <section className="hidden lg:flex relative flex-col justify-between bg-vault-950 text-vault-100 px-14 py-12 overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 38px, #fff 38px, #fff 39px)",
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-signal-teal/15 ring-1 ring-signal-teal/40">
            <Landmark className="h-5 w-5 text-signal-teal" strokeWidth={1.75} />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">CBS Console</span>
        </div>

        <div className="relative z-10 max-w-md">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-vault-400 mb-4">
            Ledger № 0001 — Internal Access Only
          </p>
          <h1 className="font-display text-[2.6rem] leading-[1.08] font-semibold tracking-tight text-white">
            Every entry is
            <br />
            held to account.
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-vault-200">
            This console moves real customer funds. Sign in with your bank-issued
            credentials — actions taken here are written to the permanent audit
            trail under your name.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 font-mono text-xs text-vault-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Unauthorized access is a disciplinary and legal matter.</span>
        </div>
      </section>

      {/* ── Right: the form ── */}
      <section className="flex items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-vault-950">
              <Landmark className="h-4.5 w-4.5 text-signal-teal" strokeWidth={1.75} />
            </div>
            <span className="font-display text-lg font-semibold text-vault-950">CBS Console</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-vault-950">Employee sign-in</h2>
          <p className="mt-1.5 text-sm text-vault-600">
            Branch staff and back-office only. Use the username your administrator created.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="username" className="block text-xs font-medium uppercase tracking-wide text-vault-700">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. j.sokha"
                className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3.5 py-2.5 text-[15px] text-vault-950 placeholder:text-vault-400 focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wide text-vault-700">
                  Password
                </label>
              </div>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••"
                  className="w-full rounded-md border border-ledger-line bg-white px-3.5 py-2.5 pl-10 text-[15px] text-vault-950 placeholder:text-vault-400 focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
                />
              </div>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-md border border-signal-rose/30 bg-signal-rose/5 px-3.5 py-2.5 text-sm text-signal-rose">
                <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-vault-950 px-4 py-2.75 text-[15px] font-medium text-white transition-colors hover:bg-vault-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Verifying…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-xs text-vault-400">
            Forgot your credentials, or need an account? Contact your branch administrator —
            self-service registration is disabled for this console.
          </p>
        </div>
      </section>
    </main>
  );
}
