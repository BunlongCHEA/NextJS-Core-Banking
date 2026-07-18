"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { transactionsApi, ApiError } from "@/lib/api";
import { StatusBadge, formatMoney } from "@/components/ui";
import type { Account, Transaction } from "@/types";

type Mode = "history" | "deposit" | "withdraw" | "transfer";

export default function TransactionDrawer({
  account, onClose, onChanged,
}: { account: Account | null; onClose: () => void; onChanged: () => void }) {
  const [mode, setMode] = useState<Mode>("history");
  const [history, setHistory] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setMode("history");
      setAmount(""); setCounterparty(""); setDescription(""); setError(null);
      loadHistory(account.accountId);
    }
  }, [account]);

  async function loadHistory(accountId: string) {
    setLoading(true);
    try {
      const res = await transactionsApi.history(accountId, 0, 20);
      setHistory(res.data.content);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load transaction history.");
    } finally {
      setLoading(false);
    }
  }

  if (!account) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;
    setSubmitting(true);
    setError(null);
    const idempotencyKey = crypto.randomUUID();
    try {
      if (mode === "deposit") {
        await transactionsApi.deposit({
          idempotencyKey, creditAccountNumber: account.accountNumber,
          amount: Number(amount), currencyCode: account.currencyCode, description,
        });
      } else if (mode === "withdraw") {
        await transactionsApi.withdrawal({
          idempotencyKey, debitAccountNumber: account.accountNumber,
          amount: Number(amount), currencyCode: account.currencyCode, description,
        });
      } else if (mode === "transfer") {
        await transactionsApi.transfer({
          idempotencyKey, debitAccountNumber: account.accountNumber,
          creditAccountNumber: counterparty, amount: Number(amount),
          currencyCode: account.currencyCode, description,
        });
      }
      setAmount(""); setCounterparty(""); setDescription("");
      await loadHistory(account.accountId);
      onChanged();
      setMode("history");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transaction failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-vault-950/40">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-display text-lg font-semibold text-vault-950">•••• {account.accountNumber.slice(-4)}</h3>
            <p className="text-xs text-vault-500">{formatMoney(account.availableBalance, account.currencyCode)} available</p>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-md bg-vault-50 p-1 text-xs font-medium">
          {(["history", "deposit", "withdraw", "transfer"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded px-2 py-1.5 capitalize ${mode === m ? "bg-white text-vault-950 shadow-sm" : "text-vault-500 hover:text-vault-700"}`}
            >
              {m}
            </button>
          ))}
        </div>

        {mode === "history" ? (
          loading ? (
            <div className="flex items-center gap-2 py-10 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-vault-500">No transactions yet.</p>
          ) : (
            <ul className="space-y-2">
              {history.map((t) => (
                <li key={t.transactionId} className="rounded-md border border-ledger-line p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-vault-950">{t.transactionType}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-vault-500">
                    <span>{new Date(t.initiatedAt).toLocaleString()}</span>
                    <span className="font-mono">{formatMoney(t.amount, t.currencyCode)}</span>
                  </div>
                  {t.description && <p className="mt-1 text-xs text-vault-400">{t.description}</p>}
                </li>
              ))}
            </ul>
          )
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Amount ({account.currencyCode})</label>
              <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
            </div>
            {mode === "transfer" && (
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">To account number</label>
                <input required value={counterparty} onChange={(e) => setCounterparty(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 font-mono text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Description (optional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
            </div>
            {error && <p className="text-sm text-signal-rose">{error}</p>}
            <button type="submit" disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Confirm {mode}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}