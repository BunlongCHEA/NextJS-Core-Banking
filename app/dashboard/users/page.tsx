"use client";

import { useState, type FormEvent } from "react";
import { Search, Loader2, ShieldAlert } from "lucide-react";
import { usersApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState } from "@/components/ui";
import { getRole } from "@/lib/auth";
import type { CbsUser } from "@/types";

export default function UsersPage() {
  const role = getRole();
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState<CbsUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return (
      <Panel className="flex items-center gap-3 p-6 text-signal-rose">
        <ShieldAlert className="h-5 w-5" />
        <p className="text-sm">Your role does not have access to employee account management.</p>
      </Panel>
    );
  }

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!userId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.findById(userId.trim());
      setUser(res);
    } catch (err) {
      setUser(null);
      setError(err instanceof ApiError ? err.message : "User not found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Employee accounts"
        description="Look up a CBS employee account by ID. New employees are provisioned by SUPER_ADMIN via POST /users."
      />

      <form onSubmit={handleSearch} className="mb-5 flex max-w-lg items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID (UUID)"
            className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 font-mono text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
          />
        </div>
        <button type="submit" className="rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">
          Look up
        </button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : !user ? (
        <Panel><EmptyState title="No user loaded" hint={error ?? "Paste a user ID above."} /></Panel>
      ) : (
        <Panel className="max-w-md p-5">
          <p className="font-display text-lg font-semibold text-vault-950">{user.username}</p>
          <p className="text-sm text-vault-600">{user.email}</p>
          <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-vault-500">Role</dt>
            <dd className="text-right font-medium text-vault-950">{user.role}</dd>
            <dt className="text-vault-500">Active</dt>
            <dd className="text-right"><StatusBadge status={user.isActive ? "ACTIVE" : "INACTIVE"} /></dd>
            <dt className="text-vault-500">Must change password</dt>
            <dd className="text-right">{user.mustChangePassword ? "Yes" : "No"}</dd>
            <dt className="text-vault-500">Password policy</dt>
            <dd className="text-right">{user.passwordPolicy.replaceAll("_", " ").toLowerCase()}</dd>
          </dl>
        </Panel>
      )}
    </div>
  );
}
