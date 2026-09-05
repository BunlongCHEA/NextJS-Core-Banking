"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, ShieldAlert } from "lucide-react";
import { auditApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, EmptyState } from "@/components/ui";
import { getRole } from "@/lib/auth";
import type { AuditLog } from "@/types";

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGIN_FAILED"];

export default function AuditPage() {
  const role = getRole();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (role !== "SUPER_ADMIN" && role !== "AUDITOR") {
    return (
      <Panel className="flex items-center gap-3 p-6 text-signal-rose">
        <ShieldAlert className="h-5 w-5" />
        <p className="text-sm">Your role does not have access to the audit trail.</p>
      </Panel>
    );
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await auditApi.search({ entityType: entityType || undefined, action: action || undefined, page: 0, size: 100 });
      setLogs(res.data.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [entityType, action]);

  function exportCSV() {
    const headers = ["Timestamp", "Entity", "Entity ID", "Action", "Changed By", "Role", "IP"];
    const rows = logs.map((l) => [l.changedAt, l.entityType, l.entityId, l.action, l.changedBy ?? "", l.changedByRole ?? "", l.ipAddress ?? ""]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Audit trail"
        description="Read-only record of who changed what, when."
        action={
          <button onClick={exportCSV} disabled={logs.length === 0}
            className="flex items-center gap-2 rounded-md border border-ledger-line bg-white px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        <input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="Entity type (e.g. User, Customer)"
          className="rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal">
          <option value="">All actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : logs.length === 0 ? (
        <Panel><EmptyState title="No matching audit entries" hint={error ?? undefined} /></Panel>
      ) : (
        <Panel>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ledger-line text-xs uppercase tracking-wide text-vault-500">
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Entity</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Changed by</th>
                <th className="px-5 py-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.auditId} className="border-b border-ledger-line last:border-0 hover:bg-vault-50/60">
                  <td className="px-5 py-3 text-xs text-vault-500">{new Date(l.changedAt).toLocaleString()}</td>
                  <td className="px-5 py-3 font-mono text-xs">{l.entityType}#{l.entityId?.slice(0, 8) ?? "—"}</td>
                  <td className="px-5 py-3"><span className="rounded-full bg-vault-100 px-2 py-0.5 text-xs font-medium">{l.action}</span></td>
                  <td className="px-5 py-3 text-xs text-vault-600">{l.changedByRole ?? "system"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-vault-400">{l.ipAddress ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}