"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, RefreshCw, ChevronDown } from "lucide-react";
import { customersApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState } from "@/components/ui";
import type { Customer } from "@/types";
import NewCustomerDialog from "./NewCustomerDialog";
import SyncKycDialog from "./SyncKycDialog";
import ManualCreateCustomerDialog from "./ManualCreateCustomerDialog";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncTarget, setSyncTarget] = useState<Customer | null>(null);
  // state additions
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);

  const STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED", "BLOCKED"] as const;

  async function handleStatusChange(customerId: string, status: string) {
    setStatusBusyId(customerId);
    try {
      await customersApi.updateStatus(customerId, status);
      await load(search);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status.");
    } finally {
      setStatusBusyId(null);
    }
  }

  async function load(searchTerm = "") {
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.search({ search: searchTerm || undefined, page: 0, size: 25 });
      setCustomers(res.data.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Search existing profiles or onboard a new one via verified KYC."
        action={
          <div className="flex gap-2">
            <button onClick={() => setManualDialogOpen(true)}
              className="flex items-center gap-2 rounded-md border border-ledger-line bg-white px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">
              <Plus className="h-4 w-4" /> Add manually
            </button>
            <button onClick={() => setDialogOpen(true)}
              className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">
              <Plus className="h-4 w-4" /> New customer (KYC)
            </button>
          </div>
        }
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(search);
        }}
        className="mb-4 flex max-w-md items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, or phone"
            className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
          />
        </div>
        <button type="submit" className="rounded-md border border-ledger-line bg-white px-3 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">
          Search
        </button>
      </form>

      <Panel>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-vault-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <EmptyState title="Could not load customers" hint={error} />
        ) : customers.length === 0 ? (
          <EmptyState title="No customers found" hint="Try a different search, or onboard a new profile via KYC." />
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ledger-line text-xs uppercase tracking-wide text-vault-500">
                <th className="px-5 py-3 font-medium">Code</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Bank ID</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.customerId} className="border-b border-ledger-line last:border-0 hover:bg-vault-50/60">
                  <td className="px-5 py-3 font-mono text-xs text-vault-600">{c.customerCode}</td>
                  <td className="px-5 py-3 font-medium text-vault-950">{c.fullName}</td>
                  <td className="px-5 py-3 text-vault-600">{c.email}</td>
                  <td className="px-5 py-3 text-vault-600">{c.phone}</td>
                  <td className="px-5 py-3 text-vault-600">{c.customerType}</td>
                  <td className="px-5 py-3 font-mono text-xs text-vault-600">{c.bankId ?? "—"}</td>
                  {/* <td className="px-5 py-3"><StatusBadge status={c.status} /></td> */}
                  <td className="px-5 py-3">
                    <select
                      value={c.status}
                      disabled={statusBusyId === c.customerId}
                      onChange={(e) => handleStatusChange(c.customerId, e.target.value)}
                      className="rounded-md border border-ledger-line bg-white px-2 py-1 text-xs font-medium focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal disabled:opacity-50"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setSyncTarget(c)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-ledger-line px-2.5 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Sync KYC
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <NewCustomerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={() => {
          setDialogOpen(false);
          load(search);
        }}
      />

      <SyncKycDialog
        customer={syncTarget}
        onClose={() => setSyncTarget(null)}
        onSynced={() => {
          setSyncTarget(null);
          load(search);
        }}
      />

      <ManualCreateCustomerDialog
        open={manualDialogOpen}
        onClose={() => setManualDialogOpen(false)}
        onCreated={() => { setManualDialogOpen(false); load(search); }}
      />
    </div>
  );
}