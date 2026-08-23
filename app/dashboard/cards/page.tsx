"use client";

import { useState, type FormEvent } from "react";
import { Search, Loader2, Lock, Unlock, Play, Pause, Plus, X } from "lucide-react";
import { cardsApi, accountsApi, customersApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState, formatMoney } from "@/components/ui";
import type { Card, Customer, Account } from "@/types";

type CardAction = "block" | "unblock" | "activate" | "deactivate";
const CARD_TYPES = ["DEBIT", "CREDIT", "PREPAID"] as const;

export default function CardsPage() {
  const [query, setQuery] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    setCards(null);
    setAccountId(null);
    setAccounts([]);
    try {
      const res = await customersApi.search({ search: term, page: 0, size: 1 });
      if (res.data.content.length === 0) throw new Error("No customer matched that search.");
      const customer: Customer = res.data.content[0];
      const acctRes = await accountsApi.byCustomer(customer.customerId);
      setAccounts(acctRes.data);
      if (acctRes.data.length === 0) setError("This customer has no accounts yet.");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }

  async function pickAccount(id: string) {
    setAccountId(id);
    setLoading(true);
    setError(null);
    try {
      const res = await cardsApi.byAccount(id);
      setCards(res.data);
    } catch (err) {
      setCards([]);
      setError(err instanceof ApiError ? err.message : "Could not load cards.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!accountId) return;
    const res = await cardsApi.byAccount(accountId);
    setCards(res.data);
  }

  async function handleAction(card: Card, action: CardAction) {
    setBusyId(card.cardId);
    setError(null);
    try {
      if (action === "block") await cardsApi.block(card.cardId);
      if (action === "unblock") await cardsApi.unblock(card.cardId);
      if (action === "activate") await cardsApi.activate(card.cardId);
      if (action === "deactivate") await cardsApi.deactivate(card.cardId);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not ${action} card.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Cards"
        description="Search a customer to view, issue, block, or reactivate their cards."
        action={
          accountId && (
            <button
              onClick={() => setIssueOpen(true)}
              className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800"
            >
              <Plus className="h-4 w-4" /> Issue card
            </button>
          )
        }
      />

      <form onSubmit={handleSearch} className="mb-4 flex max-w-lg items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Customer name, email, or phone"
            className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
          />
        </div>
        <button type="submit" className="rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">
          Search
        </button>
      </form>

      {accounts.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {accounts.map((a) => (
            <button
              key={a.accountId}
              onClick={() => pickAccount(a.accountId)}
              className={`rounded-md border px-3 py-1.5 text-xs font-mono hover:bg-vault-50 ${
                accountId === a.accountId ? "border-vault-950 bg-vault-50" : "border-ledger-line bg-white"
              }`}
            >
              •••• {a.accountNumber.slice(-4)} — {formatMoney(a.availableBalance, a.currencyCode)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-vault-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : cards === null ? (
        <Panel>
          <EmptyState title="No account selected yet" hint="Search a customer, then pick an account above." />
        </Panel>
      ) : cards.length === 0 ? (
        <Panel>
          <EmptyState title="No cards on this account" hint={error ?? "Issue one above."} />
        </Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Panel key={c.cardId} className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm tracking-widest text-vault-950">•••• {c.cardLastFour}</span>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-2 text-xs text-vault-500">
                {c.cardType} · expires {c.expiryDate}
              </p>
              <p className="mt-3 text-sm text-vault-600">
                Daily limit: <span className="font-mono">{formatMoney(c.dailyLimit, c.currencyCode)}</span>
              </p>

              {c.status === "PENDING" && (
                <div className="mt-4 flex gap-2">
                  <ActionButton
                    label="Activate"
                    icon={Play}
                    primary
                    busy={busyId === c.cardId}
                    onClick={() => handleAction(c, "activate")}
                  />
                  <ActionButton
                    label="Block"
                    icon={Lock}
                    busy={busyId === c.cardId}
                    onClick={() => handleAction(c, "block")}
                  />
                </div>
              )}

              {c.status === "ACTIVE" && (
                <div className="mt-4 flex gap-2">
                  <ActionButton
                    label="Deactivate"
                    icon={Pause}
                    busy={busyId === c.cardId}
                    onClick={() => handleAction(c, "deactivate")}
                  />
                  <ActionButton
                    label="Block"
                    icon={Lock}
                    busy={busyId === c.cardId}
                    onClick={() => handleAction(c, "block")}
                  />
                </div>
              )}

              {c.status === "INACTIVE" && (
                <div className="mt-4 flex gap-2">
                  <ActionButton
                    label="Activate"
                    icon={Play}
                    primary
                    busy={busyId === c.cardId}
                    onClick={() => handleAction(c, "activate")}
                  />
                  <ActionButton
                    label="Block"
                    icon={Lock}
                    busy={busyId === c.cardId}
                    onClick={() => handleAction(c, "block")}
                  />
                </div>
              )}

              {c.status === "BLOCKED" && (
                <div className="mt-4">
                  <ActionButton
                    label="Unblock"
                    icon={Unlock}
                    fullWidth
                    busy={busyId === c.cardId}
                    onClick={() => handleAction(c, "unblock")}
                  />
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      {accountId && (
        <IssueCardDialog
          open={issueOpen}
          accountId={accountId}
          onClose={() => setIssueOpen(false)}
          onIssued={() => {
            setIssueOpen(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function ActionButton({
  label, icon: Icon, onClick, busy, primary = false, fullWidth = false,
}: {
  label: string;
  icon: typeof Lock;
  onClick: () => void;
  busy: boolean;
  primary?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
        fullWidth ? "w-full" : "flex-1"
      } ${
        primary
          ? "bg-vault-950 text-white hover:bg-vault-800"
          : "border border-ledger-line text-vault-700 hover:bg-vault-50"
      }`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function IssueCardDialog({
  open, accountId, onClose, onIssued,
}: {
  open: boolean;
  accountId: string;
  onClose: () => void;
  onIssued: () => void;
}) {
  const [cardType, setCardType] = useState<(typeof CARD_TYPES)[number]>("DEBIT");
  const [dailyLimit, setDailyLimit] = useState("5000");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await cardsApi.issue(accountId, {
        cardType,
        dailyLimit: dailyLimit ? Number(dailyLimit) : undefined,
      });
      onIssued();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not issue card.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-vault-950">Issue card</h3>
          <button onClick={onClose} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <p className="mb-4 text-xs text-vault-500">New cards start as <strong>PENDING</strong> and need activation before use.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Card type</label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value as (typeof CARD_TYPES)[number])}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
            >
              {CARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Daily limit</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
            />
          </div>

          {error && <p className="text-sm text-signal-rose">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Issue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}