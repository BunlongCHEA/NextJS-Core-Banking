"use client";

import { useState, type FormEvent } from "react";
import { Loader2, ArrowRight, Search } from "lucide-react";
import { transactionsApi, accountsApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState, formatMoney } from "@/components/ui";
import type { Transaction } from "@/types";

type Mode = "transfer" | "deposit" | "withdrawal";

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export default function TransactionsPage() {
  const [mode, setMode] = useState<Mode>("transfer");
  const [debitAccountNumber, setDebitAccountNumber] = useState("");
  const [creditAccountNumber, setCreditAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [currencyCode, setCurrencyCode] = useState("USD");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // history lookup
  const [historyAccountId, setHistoryAccountId] = useState("");
  const [history, setHistory] = useState<Transaction[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const base = {
      idempotencyKey: newIdempotencyKey(),
      amount: parseFloat(amount),
      currencyCode,
      channel: "BRANCH" as const,
      description: description || undefined,
    };
    try {
      let res;
      if (mode === "transfer") {
        res = await transactionsApi.transfer({ ...base, debitAccountNumber, creditAccountNumber });
      } else if (mode === "deposit") {
        res = await transactionsApi.deposit({ ...base, creditAccountNumber });
      } else {
        res = await transactionsApi.withdrawal({ ...base, debitAccountNumber });
      }
      setResult(res.data);
      setAmount("");
      setDescription("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleHistorySearch(e: FormEvent) {
    e.preventDefault();
    if (!historyAccountId.trim()) return;
    setHistoryLoading(true);
    try {
      const res = await transactionsApi.history(historyAccountId.trim());
      setHistory(res.data.content);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <div>
        <PageHeader title="Move money" description="Transfers post immediately and are written to the ledger." />

        <Panel className="p-5">
          <div className="mb-5 flex gap-1 rounded-md bg-vault-100 p-1">
            {(["transfer", "deposit", "withdrawal"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-sm py-1.5 text-sm font-medium capitalize transition-colors ${
                  mode === m ? "bg-white text-vault-950 shadow-sm" : "text-vault-500 hover:text-vault-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === "transfer" || mode === "withdrawal") && (
              <Field label="Debit account number" value={debitAccountNumber} onChange={setDebitAccountNumber} mono />
            )}
            {(mode === "transfer" || mode === "deposit") && (
              <Field label="Credit account number" value={creditAccountNumber} onChange={setCreditAccountNumber} mono />
            )}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label="Amount" value={amount} onChange={setAmount} type="number" step="0.01" min="0.0001" />
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Currency</label>
                <input
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                  maxLength={3}
                  className="mt-1.5 w-20 rounded-md border border-ledger-line bg-white px-2 py-2 text-center font-mono text-sm uppercase focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
                />
              </div>
            </div>
            <Field label="Description (optional)" value={description} onChange={setDescription} required={false} />

            {error && <p className="text-sm text-signal-rose">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-vault-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit {mode}
            </button>
          </form>

          {result && (
            <div className="mt-5 rounded-md border border-signal-teal/30 bg-signal-teal/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-signal-tealDark">
                <StatusBadge status={result.status} /> {result.referenceNumber}
              </p>
              <p className="mt-1 font-mono text-lg text-vault-950">{formatMoney(result.amount, result.currencyCode)}</p>
            </div>
          )}
        </Panel>
      </div>

      <div>
        <PageHeader title="Account history" description="Paste an account ID to see its recent activity." />
        <form onSubmit={handleHistorySearch} className="mb-4 flex max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
            <input
              value={historyAccountId}
              onChange={(e) => setHistoryAccountId(e.target.value)}
              placeholder="Account ID (UUID)"
              className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 font-mono text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
            />
          </div>
          <button type="submit" className="rounded-md border border-ledger-line bg-white px-3 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">
            Search
          </button>
        </form>

        <Panel>
          {historyLoading ? (
            <div className="flex items-center gap-2 py-12 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : history === null ? (
            <EmptyState title="No account loaded yet" />
          ) : history.length === 0 ? (
            <EmptyState title="No transactions found for this account" />
          ) : (
            <ul className="divide-y divide-ledger-line">
              {history.map((t) => (
                <li key={t.transactionId} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-vault-400">{t.referenceNumber}</span>
                    <span className="flex items-center gap-1 text-vault-700">
                      {t.debitAccountNumber && <span className="font-mono text-xs">•••{t.debitAccountNumber.slice(-4)}</span>}
                      {t.transactionType === "TRANSFER" && <ArrowRight className="h-3 w-3 text-vault-400" />}
                      {t.creditAccountNumber && <span className="font-mono text-xs">•••{t.creditAccountNumber.slice(-4)}</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm text-vault-950">{formatMoney(t.amount, t.currencyCode)}</span>
                    <StatusBadge status={t.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  mono = false,
  required = true,
  step,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  mono?: boolean;
  required?: boolean;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">{label}</label>
      <input
        type={type}
        step={step}
        min={min}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
