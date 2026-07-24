"use client";

import { useState, type FormEvent } from "react";
import { Search, Loader2, Snowflake, Sun, Lock, Plus, History, ArrowLeftRight } from "lucide-react";
import { accountsApi, customersApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState, formatMoney } from "@/components/ui";
import type { Account, Customer } from "@/types";
import NewAccountDialog from "./NewAccountDialog";
import TransactionDrawer from "./TransactionDrawer";

export default function AccountsPage() {
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newAccountOpen, setNewAccountOpen] = useState(false);
  const [txAccount, setTxAccount] = useState<Account | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setCustomer(null);
    setAccounts(null);
    try {
      // UUID-looking input → treat as customerId directly; otherwise search by name/email/phone
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
      let matchedCustomer: Customer;
      if (isUuid) {
        matchedCustomer = (await customersApi.findById(term)).data;
      } else {
        const res = await customersApi.search({ search: term, page: 0, size: 1 });
        if (res.data.content.length === 0) throw new Error("No customer matched that search.");
        matchedCustomer = res.data.content[0];
      }
      setCustomer(matchedCustomer);
      const accts = await accountsApi.byCustomer(matchedCustomer.customerId);
      setAccounts(accts.data);
    } catch (err) {
      setAccounts([]);
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshAccounts() {
    if (!customer) return;
    const res = await accountsApi.byCustomer(customer.customerId);
    setAccounts(res.data);
  }

  async function handleStatusAction(accountId: string, action: "freeze" | "unfreeze" | "close") {
    setBusyId(accountId);
    setError(null);
    try {
      if (action === "freeze") await accountsApi.freeze(accountId);
      if (action === "unfreeze") await accountsApi.unfreeze(accountId);
      if (action === "close") await accountsApi.close(accountId);
      await refreshAccounts();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not ${action} account.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Search a customer to view, open, and manage their accounts."
        action={
          customer && (
            <button
              onClick={() => setNewAccountOpen(true)}
              className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800"
            >
              <Plus className="h-4 w-4" /> New account
            </button>
          )
        }
      />

      <form onSubmit={handleSearch} className="mb-5 flex max-w-lg items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Customer name, email, phone, or customer ID"
            className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
          />
        </div>
        <button type="submit" className="rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">
          Search
        </button>
      </form>

      {loading && (
        <div className="flex items-center gap-2 py-10 text-vault-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {!loading && accounts === null && (
        <Panel><EmptyState title="No customer loaded yet" hint="Search above to see a customer's accounts." /></Panel>
      )}

      {!loading && customer && (
        <p className="mb-4 text-sm text-vault-600">
          <span className="font-medium text-vault-950">{customer.fullName}</span>{" "}
          <span className="font-mono text-xs text-vault-400">({customer.customerCode})</span>
        </p>
      )}

      {!loading && accounts && accounts.length === 0 && (
        <Panel><EmptyState title="This customer has no accounts" hint={error ?? "Open a new account to get started."} /></Panel>
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
              <p className="text-xs text-vault-500">{a.accountType.name} · available balance</p>

              <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs text-vault-600">
                <dt>Ledger balance</dt>
                <dd className="text-right font-mono">{formatMoney(a.balance, a.currencyCode)}</dd>
                <dt>On hold</dt>
                <dd className="text-right font-mono">{formatMoney(a.holdBalance, a.currencyCode)}</dd>
                <dt>Daily limit</dt>
                <dd className="text-right font-mono">{formatMoney(a.dailyLimit, a.currencyCode)}</dd>
              </dl>

              <div className="mt-4 flex flex-wrap gap-2">
                {a.status === "ACTIVE" && (
                  <button
                    onClick={() => setTxAccount(a)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-vault-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-vault-800"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" /> Transact
                  </button>
                )}
                <button
                  onClick={() => setTxAccount(a)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ledger-line px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50"
                >
                  <History className="h-3.5 w-3.5" /> History
                </button>

                {a.status === "ACTIVE" && (
                  <>
                    <button
                      onClick={() => handleStatusAction(a.accountId, "freeze")}
                      disabled={busyId === a.accountId}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ledger-line px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50"
                    >
                      <Snowflake className="h-3.5 w-3.5" /> Freeze
                    </button>
                    <button
                      onClick={() => handleStatusAction(a.accountId, "close")}
                      disabled={busyId === a.accountId}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ledger-line px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50"
                    >
                      <Lock className="h-3.5 w-3.5" /> Close
                    </button>
                  </>
                )}
                {a.status === "FROZEN" && (
                  <button
                    onClick={() => handleStatusAction(a.accountId, "unfreeze")}
                    disabled={busyId === a.accountId}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-ledger-line px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50"
                  >
                    <Sun className="h-3.5 w-3.5" /> Unfreeze
                  </button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {customer && (
        <NewAccountDialog
          open={newAccountOpen}
          customerId={customer.customerId}
          onClose={() => setNewAccountOpen(false)}
          onCreated={() => {
            setNewAccountOpen(false);
            refreshAccounts();
          }}
        />
      )}

      <TransactionDrawer
        account={txAccount}
        onClose={() => setTxAccount(null)}
        onChanged={refreshAccounts}
      />
    </div>
  );
}