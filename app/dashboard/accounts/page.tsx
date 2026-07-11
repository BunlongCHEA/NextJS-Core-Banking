"use client";

import { useState, type FormEvent } from "react";
import { Search, Loader2, Snowflake, Lock } from "lucide-react";
import { accountsApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState, formatMoney } from "@/components/ui";
import type { Account } from "@/types";

export default function AccountsPage() {
  const [customerId, setCustomerId] = useState("");
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!customerId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await accountsApi.byCustomer(customerId.trim());
      setAccounts(res.data);
    } catch (err) {
      setAccounts([]);
      setError(err instanceof ApiError ? err.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function handleFreeze(accountId: string) {
    setBusyId(accountId);
    try {
      await accountsApi.freeze(accountId);
      setAccounts((prev) => prev?.map((a) => (a.accountId === accountId ? { ...a, status: "FROZEN" } : a)) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not freeze account.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleClose(accountId: string) {
    setBusyId(accountId);
    try {
      await accountsApi.close(accountId);
      setAccounts((prev) => prev?.map((a) => (a.accountId === accountId ? { ...a, status: "CLOSED" } : a)) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not close account — balance may be non-zero.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Accounts" description="Look up a customer's accounts by their customer ID." />

      <form onSubmit={handleSearch} className="mb-5 flex max-w-lg items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Customer ID (UUID)"
            className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 font-mono text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
          />
        </div>
        <button type="submit" className="rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">
          Load accounts
        </button>
      </form>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-vault-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && accounts === null && (
        <Panel><EmptyState title="No customer loaded yet" hint="Paste a customer ID above to see their accounts." /></Panel>
      )}

      {!loading && accounts && accounts.length === 0 && (
        <Panel><EmptyState title="This customer has no accounts" hint={error ?? undefined} /></Panel>
      )}

      {!loading && accounts && accounts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Panel key={a.accountId} className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-vault-500">•••• {a.accountNumber.slice(-4)}</span>
                <StatusBadge status={a.status} />
              </div>
              <p className="mt-3 font-display text-2xl font-semibold text-vault-950">
                {formatMoney(a.availableBalance, a.currencyCode)}
              </p>
              <p className="text-xs text-vault-500">{a.accountType} · available balance</p>

              <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs text-vault-600">
                <dt>Ledger balance</dt>
                <dd className="text-right font-mono">{formatMoney(a.balance, a.currencyCode)}</dd>
                <dt>On hold</dt>
                <dd className="text-right font-mono">{formatMoney(a.holdBalance, a.currencyCode)}</dd>
                <dt>Daily limit</dt>
                <dd className="text-right font-mono">{formatMoney(a.dailyLimit, a.currencyCode)}</dd>
              </dl>

              {a.status === "ACTIVE" && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleFreeze(a.accountId)}
                    disabled={busyId === a.accountId}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ledger-line px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50"
                  >
                    <Snowflake className="h-3.5 w-3.5" /> Freeze
                  </button>
                  <button
                    onClick={() => handleClose(a.accountId)}
                    disabled={busyId === a.accountId}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ledger-line px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50"
                  >
                    <Lock className="h-3.5 w-3.5" /> Close
                  </button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
