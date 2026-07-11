"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { usersApi, ApiError } from "@/lib/api";
import { decodeToken, getToken, clearSession } from "@/lib/auth";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 15) {
      setError("Password must be at least 15 characters long.");
      return;
    }

    const token = getToken();
    const claims = token ? decodeToken(token) : null;
    if (!claims) {
      router.push("/login");
      return;
    }

    setLoading(true);
    try {
      await usersApi.changePassword(claims.sub, { currentPassword, newPassword, confirmPassword });
      clearSession();
      router.push("/login?passwordChanged=1");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update your password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-ledger-paper px-6">
      <div className="w-full max-w-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-vault-950">
          <KeyRound className="h-5 w-5 text-signal-teal" strokeWidth={1.75} />
        </div>
        <h1 className="mt-5 font-display text-2xl font-semibold text-vault-950">
          Set a new password
        </h1>
        <p className="mt-1.5 text-sm text-vault-600">
          Required before you can continue — this is either your first sign-in or your
          password has expired under your assigned policy.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
          <Field label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
          <Field label="New password (min. 15 characters)" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
          <Field label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />

          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-signal-rose/30 bg-signal-rose/5 px-3.5 py-2.5 text-sm text-signal-rose">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-vault-950 px-4 py-2.75 text-[15px] font-medium text-white transition-colors hover:bg-vault-800 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Updating…" : "Update password & continue"}
          </button>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">{label}</label>
      <input
        type="password"
        required
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3.5 py-2.5 text-[15px] text-vault-950 focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
      />
    </div>
  );
}
