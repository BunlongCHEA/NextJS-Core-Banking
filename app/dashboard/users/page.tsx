"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, ShieldAlert, Plus, RotateCcw, KeyRound, UserX, X, Trash2 } from "lucide-react";
import { usersApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState } from "@/components/ui";
import { useConfirmDialog } from "@/components/ConfirmDialogProvider";
import { getRole } from "@/lib/auth";
import type { CbsUser, UserRole } from "@/types";

const ROLES: UserRole[] = ["ADMIN", "CUSTOMER_SERVICE", "TELLER", "AUDITOR"];

export default function UsersPage() {
  const role = getRole();
  const [users, setUsers] = useState<CbsUser[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ username: string; password: string } | null>(null);
  const { confirm } = useConfirmDialog();

  if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
    return (
      <Panel className="flex items-center gap-3 p-6 text-signal-rose">
        <ShieldAlert className="h-5 w-5" />
        <p className="text-sm">Your role does not have access to employee account management.</p>
      </Panel>
    );
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await usersApi.search({ role: roleFilter || undefined, page: 0, size: 50 });
      setUsers(res.data.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [roleFilter]);

  async function handleDeactivate(u: CbsUser) {
    const ok = await confirm({
      title: "Deactivate employee",
      message: `Deactivate ${u.username}? They will be unable to log in until reactivated.`,
      confirmLabel: "Deactivate",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(u.userId);
    try {
      await usersApi.deactivate(u.userId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not deactivate user.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(u: CbsUser) {
    const ok = await confirm({
      title: "Remove from portal",
      message: `Remove ${u.username} from the CBS portal? Their record is retained in the database but hidden from this UI going forward.`,
      confirmLabel: "Remove",
      destructive: true,
    });
    if (!ok) return;
    setBusyId(u.userId);
    try {
      await usersApi.remove(u.userId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove user.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(u: CbsUser) {
    setBusyId(u.userId);
    try {
      await usersApi.reactivate(u.userId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reactivate user.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleResetPassword(u: CbsUser) {
    const ok = await confirm({
      title: "Reset password",
      message: `Reset ${u.username}'s password? They will be forced to set a new one on next login.`,
      confirmLabel: "Reset",
    });
    if (!ok) return;
    setBusyId(u.userId);
    try {
      const res = await usersApi.resetPassword(u.userId);
      setTempPassword({ username: u.username, password: res.data.tempPassword });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Employee accounts"
        description="Manage CBS staff accounts, roles, and access."
        action={
          role === "SUPER_ADMIN" || role === "ADMIN" ? (
            <button onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">
              <Plus className="h-4 w-4" /> Add employee
            </button>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-2">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal">
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : users.length === 0 ? (
        <Panel><EmptyState title="No employees found" hint={error ?? undefined} /></Panel>
      ) : (
        <Panel>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ledger-line text-xs uppercase tracking-wide text-vault-500">
                <th className="px-5 py-3 font-medium">Username</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Password expires</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.userId} className="border-b border-ledger-line last:border-0 hover:bg-vault-50/60">
                  <td className="px-5 py-3 font-medium text-vault-950">
                    {u.username}
                    {u.mustChangePassword && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">Must change password</span>}
                  </td>
                  <td className="px-5 py-3 text-vault-600">{u.email}</td>
                  <td className="px-5 py-3"><span className="rounded-full bg-vault-100 px-2 py-0.5 text-xs font-medium text-vault-700">{u.role}</span></td>
                  <td className="px-5 py-3"><StatusBadge status={u.isActive ? "ACTIVE" : "INACTIVE"} /></td>
                  <td className="px-5 py-3 text-xs text-vault-500">{u.passwordExpiresAt ? new Date(u.passwordExpiresAt).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleResetPassword(u)} disabled={busyId === u.userId}
                        className="flex items-center gap-1 rounded-md border border-ledger-line px-2.5 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50">
                        <KeyRound className="h-3.5 w-3.5" /> Reset password
                      </button>

                      {u.role !== "SUPER_ADMIN" && (
                        <>
                          {u.isActive ? (
                            <button onClick={() => handleDeactivate(u)} disabled={busyId === u.userId}
                              className="flex items-center gap-1 rounded-md border border-ledger-line px-2.5 py-1.5 text-xs font-medium text-signal-rose hover:bg-red-50 disabled:opacity-50">
                              <UserX className="h-3.5 w-3.5" /> Deactivate
                            </button>
                          ) : (
                            <button onClick={() => handleReactivate(u)} disabled={busyId === u.userId}
                              className="flex items-center gap-1 rounded-md border border-ledger-line px-2.5 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50">
                              <RotateCcw className="h-3.5 w-3.5" /> Reactivate
                            </button>
                          )}
                          <button onClick={() => handleRemove(u)} disabled={busyId === u.userId}
                            className="flex items-center gap-1 rounded-md border border-ledger-line px-2.5 py-1.5 text-xs font-medium text-signal-rose hover:bg-red-50 disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {createOpen && (
        <CreateUserDialog onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); load(); }} />
      )}

      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-vault-950">Password reset — {tempPassword.username}</h3>
              <button onClick={() => setTempPassword(null)} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100"><X className="h-4.5 w-4.5" /></button>
            </div>
            <p className="mb-3 text-xs text-vault-500">Share this securely — it will not be shown again.</p>
            <p className="rounded-md border border-ledger-line bg-vault-50 px-3 py-2 font-mono text-sm">{tempPassword.password}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateUserDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("TELLER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function generate() {
    setGenerating(true);
    try {
      const res = await usersApi.generatePassword();
      setPassword(res.password);
    } catch {
      // non-fatal — admin can still type one manually if generation fails
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { generate(); }, []);   // auto-fill as soon as the dialog opens

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await usersApi.create({ username, email, initialPassword: password, role: userRole });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create user.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-vault-950">Add employee</h3>
          <button onClick={onClose} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100"><X className="h-4.5 w-4.5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Username</label>
            <input required value={username} onChange={(e) => setUsername(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Email</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Temporary password</label>
              <button type="button" onClick={generate} disabled={generating}
                className="text-xs font-medium text-signal-teal hover:underline disabled:opacity-50">
                {generating ? "Generating…" : "Regenerate"}
              </button>
            </div>
            <input required value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 font-mono text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
            <p className="mt-1 text-xs text-vault-400">Auto-generated to meet policy — copy it now, or edit freely before creating. User must change it on first login.</p>
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Role</label>
            <select value={userRole} onChange={(e) => setUserRole(e.target.value as UserRole)}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-signal-rose">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}