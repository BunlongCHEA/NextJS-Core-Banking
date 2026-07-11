"use client";

import { useState, type FormEvent } from "react";
import { Search, Loader2, Plus, Send } from "lucide-react";
import { loansApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState, formatMoney } from "@/components/ui";
import type { Loan } from "@/types";

export default function LoansPage() {
  const [accountId, setAccountId] = useState("");
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("12");
  const [termMonths, setTermMonths] = useState("12");
  const [submitting, setSubmitting] = useState(false);

  async function load(e?: FormEvent) {
    e?.preventDefault();
    if (!accountId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await loansApi.byAccount(accountId.trim());
      setLoans(res.data);
    } catch (err) {
      setLoans([]);
      setError(err instanceof ApiError ? err.message : "Could not load loans.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await loansApi.apply(accountId.trim(), {
        principal: parseFloat(principal),
        interestRate: parseFloat(interestRate),
        termMonths: parseInt(termMonths, 10),
        currencyCode: "USD",
      });
      setLoans((prev) => [...(prev ?? []), res.data]);
      setFormOpen(false);
      setPrincipal("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit loan application.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisburse(loanId: string) {
    setBusyId(loanId);
    try {
      const res = await loansApi.disburse(loanId);
      setLoans((prev) => prev?.map((l) => (l.loanId === loanId ? res.data : l)) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not disburse loan.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Loans"
        description="Look up an account's loans, submit applications, and disburse approved ones."
        action={
          loans !== null && (
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800"
            >
              <Plus className="h-4 w-4" /> New application
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
          Load loans
        </button>
      </form>

      {formOpen && (
        <Panel className="mb-5 max-w-lg p-5">
          <form onSubmit={handleApply} className="grid grid-cols-3 gap-3">
            <LabeledInput label="Principal (USD)" value={principal} onChange={setPrincipal} type="number" min="1" step="0.01" />
            <LabeledInput label="Interest rate (%)" value={interestRate} onChange={setInterestRate} type="number" min="0.01" step="0.01" />
            <LabeledInput label="Term (months)" value={termMonths} onChange={setTermMonths} type="number" min="1" max="360" />
            <button
              type="submit"
              disabled={submitting}
              className="col-span-3 mt-1 flex items-center justify-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit application
            </button>
          </form>
        </Panel>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : loans === null ? (
        <Panel><EmptyState title="No account loaded yet" /></Panel>
      ) : loans.length === 0 ? (
        <Panel><EmptyState title="No loans on this account" hint={error ?? undefined} /></Panel>
      ) : (
        <Panel>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ledger-line text-xs uppercase tracking-wide text-vault-500">
                <th className="px-5 py-3 font-medium">Loan #</th>
                <th className="px-5 py-3 font-medium">Principal</th>
                <th className="px-5 py-3 font-medium">Outstanding</th>
                <th className="px-5 py-3 font-medium">Rate</th>
                <th className="px-5 py-3 font-medium">Term</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.loanId} className="border-b border-ledger-line last:border-0">
                  <td className="px-5 py-3 font-mono text-xs text-vault-600">{l.loanNumber}</td>
                  <td className="px-5 py-3 font-mono">{formatMoney(l.principal, l.currencyCode)}</td>
                  <td className="px-5 py-3 font-mono">{formatMoney(l.outstandingBalance, l.currencyCode)}</td>
                  <td className="px-5 py-3">{l.interestRate}%</td>
                  <td className="px-5 py-3">{l.termMonths} mo</td>
                  <td className="px-5 py-3"><StatusBadge status={l.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {l.status === "PENDING" && (
                      <button
                        onClick={() => handleDisburse(l.loanId)}
                        disabled={busyId === l.loanId}
                        className="rounded-md border border-ledger-line px-3 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50"
                      >
                        Disburse
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  min?: string;
  max?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">{label}</label>
      <input
        type={type}
        min={min}
        max={max}
        step={step}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
      />
    </div>
  );
}
