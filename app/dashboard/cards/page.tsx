"use client";

import { useState, type FormEvent } from "react";
import { Search, Loader2, Lock, Unlock, Plus } from "lucide-react";
import { cardsApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState, formatMoney } from "@/components/ui";
import type { Card } from "@/types";

export default function CardsPage() {
  const [accountId, setAccountId] = useState("");
  const [cards, setCards] = useState<Card[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    if (!accountId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await cardsApi.byAccount(accountId.trim());
      setCards(res.data);
    } catch (err) {
      setCards([]);
      setError(err instanceof ApiError ? err.message : "Could not load cards.");
    } finally {
      setLoading(false);
    }
  }

  async function handleIssue() {
    setIssuing(true);
    try {
      const res = await cardsApi.issue(accountId.trim(), { cardType: "DEBIT", dailyLimit: 5000 });
      setCards((prev) => [...(prev ?? []), res.data]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not issue card.");
    } finally {
      setIssuing(false);
    }
  }

  async function toggle(card: Card) {
    setBusyId(card.cardId);
    try {
      const res = card.status === "BLOCKED" ? await cardsApi.activate(card.cardId) : await cardsApi.block(card.cardId);
      setCards((prev) => prev?.map((c) => (c.cardId === card.cardId ? res.data : c)) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update card.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Cards"
        description="Look up an account's cards, then issue, block, or reactivate."
        action={
          cards !== null && (
            <button
              onClick={handleIssue}
              disabled={issuing}
              className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60"
            >
              {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Issue debit card
            </button>
          )
        }
      />

      <form onSubmit={load} className="mb-5 flex max-w-lg items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
          <input
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Account ID (UUID)"
            className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 font-mono text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
          />
        </div>
        <button type="submit" className="rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">
          Load cards
        </button>
      </form>

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : cards === null ? (
        <Panel><EmptyState title="No account loaded yet" /></Panel>
      ) : cards.length === 0 ? (
        <Panel><EmptyState title="No cards on this account" hint={error ?? "Issue one above."} /></Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Panel key={c.cardId} className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm tracking-widest text-vault-950">•••• {c.cardLastFour}</span>
                <StatusBadge status={c.status} />
              </div>
              <p className="mt-2 text-xs text-vault-500">{c.cardType} · expires {c.expiryDate}</p>
              <p className="mt-3 text-sm text-vault-600">Daily limit: <span className="font-mono">{formatMoney(c.dailyLimit, "USD")}</span></p>
              <button
                onClick={() => toggle(c)}
                disabled={busyId === c.cardId || c.status === "PENDING" || c.status === "EXPIRED"}
                className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-md border border-ledger-line px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50"
              >
                {c.status === "BLOCKED" ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                {c.status === "BLOCKED" ? "Reactivate" : "Block"}
              </button>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
