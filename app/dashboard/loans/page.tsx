"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search, Loader2, Plus, Send, Check, X as XIcon, Banknote } from "lucide-react";
import { loansApi, accountsApi, customersApi, currenciesApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState, formatMoney } from "@/components/ui";
import type { Loan, LoanPayment, Currency, Customer, Account } from "@/types";

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export default function LoansPage() {
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loans, setLoans] = useState<Loan[] | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [payDialogLoan, setPayDialogLoan] = useState<Loan | null>(null);
  const [historyLoan, setHistoryLoan] = useState<Loan | null>(null);

  useEffect(() => { currenciesApi.list().then((res) => setCurrencies(res.data)); }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    try {
      const res = await customersApi.search({ search: term, page: 0, size: 1 });
      if (res.data.content.length === 0) throw new Error("No customer matched that search.");
      const c = res.data.content[0];
      setCustomer(c);
      const [acctRes, loanRes] = await Promise.all([accountsApi.byCustomer(c.customerId), loansApi.byCustomer(c.customerId)]);
      setAccounts(acctRes.data);
      setLoans(loanRes.data);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not load loans.");
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    if (!customer) return;
    const res = await loansApi.byCustomer(customer.customerId);
    setLoans(res.data);
  }

  async function handleAction(loan: Loan, action: "approve" | "disburse") {
    setBusyId(loan.loanId);
    setError(null);
    try {
      if (action === "approve") await loansApi.approve(loan.loanId);
      if (action === "disburse") await loansApi.disburse(loan.loanId);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Could not ${action} loan.`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(loan: Loan) {
    const reason = window.prompt("Reason for rejection:");
    if (!reason) return;
    setBusyId(loan.loanId);
    try {
      await loansApi.reject(loan.loanId, reason);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reject loan.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Loans"
        description="Search a customer to review, approve, disburse, and collect repayment on their loans."
        action={customer && (
          <button onClick={() => setFormOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">
            <Plus className="h-4 w-4" /> New application
          </button>
        )}
      />

      <form onSubmit={handleSearch} className="mb-5 flex max-w-lg items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Customer name, email, or phone"
            className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
        </div>
        <button type="submit" className="rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800">Search</button>
      </form>

      {formOpen && customer && (
        <ApplyLoanForm
          customerId={customer.customerId}
          accounts={accounts}
          currencies={currencies}
          onClose={() => setFormOpen(false)}
          onApplied={() => { setFormOpen(false); refresh(); }}
        />
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-10 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : loans === null ? (
        <Panel><EmptyState title="No customer loaded yet" /></Panel>
      ) : loans.length === 0 ? (
        <Panel><EmptyState title="No loans for this customer" hint={error ?? "Submit a new application above."} /></Panel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loans.map((l) => (
            <Panel key={l.loanId} className="p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-vault-500">{l.loanNumber}</span>
                <div className="flex items-center gap-1.5">
                  {l.overdue && <span className="rounded-full bg-signal-rose/10 px-2 py-0.5 text-[10px] font-medium text-signal-rose">OVERDUE</span>}
                  <StatusBadge status={l.status} />
                </div>
              </div>
              <p className="mt-2 font-display text-xl font-semibold text-vault-950">{formatMoney(l.outstandingBalance, l.currencyCode)}</p>
              <p className="text-xs text-vault-500">of {formatMoney(l.principal, l.currencyCode)} · {l.interestRate}% · {l.termMonths}mo</p>
              <p className="mt-2 text-xs text-vault-600">
                Installment: <span className="font-mono">{formatMoney(l.monthlyInstallment, l.currencyCode)}</span>/mo
                {l.nextPaymentDate && <> · next due {l.nextPaymentDate}</>}
              </p>
              {l.status === "REJECTED" && l.rejectionReason && (
                <p className="mt-2 text-xs text-signal-rose">Rejected: {l.rejectionReason}</p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {l.status === "PENDING" && (
                  <>
                    <ActionButton label="Approve" icon={Check} primary busy={busyId === l.loanId} onClick={() => handleAction(l, "approve")} />
                    <ActionButton label="Reject" icon={XIcon} busy={busyId === l.loanId} onClick={() => handleReject(l)} />
                  </>
                )}
                {l.status === "APPROVED" && (
                  <ActionButton label="Disburse" icon={Send} primary fullWidth busy={busyId === l.loanId} onClick={() => handleAction(l, "disburse")} />
                )}
                {(l.status === "DISBURSED" || l.status === "ACTIVE") && (
                  <ActionButton label="Record payment" icon={Banknote} primary fullWidth busy={busyId === l.loanId} onClick={() => setPayDialogLoan(l)} />
                )}
                {(l.status === "DISBURSED" || l.status === "ACTIVE" || l.status === "CLOSED") && (
                  <button onClick={() => setHistoryLoan(l)} className="text-xs text-vault-500 underline hover:text-vault-700">
                    View payment history
                  </button>
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {payDialogLoan && (
        <RecordPaymentDialog loan={payDialogLoan} accounts={accounts} onClose={() => setPayDialogLoan(null)}
          onPaid={() => { setPayDialogLoan(null); refresh(); }} />
      )}
      {historyLoan && <PaymentHistoryDrawer loan={historyLoan} onClose={() => setHistoryLoan(null)} />}
    </div>
  );
}

function ActionButton({ label, icon: Icon, onClick, busy, primary = false, fullWidth = false }: {
  label: string; icon: typeof Check; onClick: () => void; busy: boolean; primary?: boolean; fullWidth?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={busy}
      className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${fullWidth ? "w-full" : "flex-1"} ${
        primary ? "bg-vault-950 text-white hover:bg-vault-800" : "border border-ledger-line text-vault-700 hover:bg-vault-50"
      }`}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function ApplyLoanForm({ customerId, accounts, currencies, onClose, onApplied }: {
  customerId: string; accounts: Account[]; currencies: Currency[]; onClose: () => void; onApplied: () => void;
}) {
  const [principal, setPrincipal] = useState("");
  const [interestRate, setInterestRate] = useState("12");
  const [termMonths, setTermMonths] = useState("12");
  const [currencyCode, setCurrencyCode] = useState(currencies[0]?.currencyCode ?? "");
  const [disbursementAccountNumber, setDisbursementAccountNumber] = useState(accounts[0]?.accountNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loansApi.apply(customerId, {
        principal: parseFloat(principal), interestRate: parseFloat(interestRate),
        termMonths: parseInt(termMonths, 10), currencyCode, disbursementAccountNumber,
      });
      onApplied();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel className="mb-5 max-w-2xl p-5">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <LabeledInput label="Principal" value={principal} onChange={setPrincipal} type="number" min="1" step="0.01" />
        <div>
          <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Currency</label>
          <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal">
            {currencies.map((c) => <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>)}
          </select>
        </div>
        <LabeledInput label="Interest rate (% APR)" value={interestRate} onChange={setInterestRate} type="number" min="0" step="0.01" />
        <LabeledInput label="Term (months)" value={termMonths} onChange={setTermMonths} type="number" min="1" max="360" />
        <div className="col-span-2">
          <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Disburse to account</label>
          <select value={disbursementAccountNumber} onChange={(e) => setDisbursementAccountNumber(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal">
            {accounts.map((a) => <option key={a.accountId} value={a.accountNumber}>•••• {a.accountNumber.slice(-4)} ({a.currencyCode})</option>)}
          </select>
        </div>
        {error && <p className="col-span-2 text-sm text-signal-rose">{error}</p>}
        <div className="col-span-2 flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">Cancel</button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Submit application
          </button>
        </div>
      </form>
    </Panel>
  );
}

function RecordPaymentDialog({ loan, accounts, onClose, onPaid }: {
  loan: Loan; accounts: Account[]; onClose: () => void; onPaid: () => void;
}) {
  const [payingAccountNumber, setPayingAccountNumber] = useState(accounts[0]?.accountNumber ?? "");
  const [amount, setAmount] = useState(loan.monthlyInstallment.toString());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loansApi.recordPayment(loan.loanId, { idempotencyKey: newIdempotencyKey(), payingAccountNumber, amount: Number(amount) });
      onPaid();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record payment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-vault-950">Record payment — {loan.loanNumber}</h3>
          <button onClick={onClose} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100"><XIcon className="h-4.5 w-4.5" /></button>
        </div>
        <p className="mb-4 text-xs text-vault-500">Outstanding: {formatMoney(loan.outstandingBalance, loan.currencyCode)}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Paying account</label>
            <select value={payingAccountNumber} onChange={(e) => setPayingAccountNumber(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal">
              {accounts.map((a) => <option key={a.accountId} value={a.accountNumber}>•••• {a.accountNumber.slice(-4)} — {formatMoney(a.availableBalance, a.currencyCode)}</option>)}
            </select>
          </div>
          <LabeledInput label={`Amount (${loan.currencyCode})`} value={amount} onChange={setAmount} type="number" min="0.01" step="0.01" />
          {error && <p className="text-sm text-signal-rose">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Pay
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PaymentHistoryDrawer({ loan, onClose }: { loan: Loan; onClose: () => void }) {
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loansApi.payments(loan.loanId).then((res) => setPayments(res.data)).finally(() => setLoading(false));
  }, [loan.loanId]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-vault-950/40">
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-vault-950">Payments — {loan.loanNumber}</h3>
          <button onClick={onClose} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100"><XIcon className="h-4.5 w-4.5" /></button>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-vault-500">No payments recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.loanPaymentId} className="rounded-md border border-ledger-line p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{formatMoney(p.amount, loan.currencyCode)}</span>
                  <span className="text-xs text-vault-400">{new Date(p.paidAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-xs text-vault-500">
                  Principal {formatMoney(p.principalPortion, loan.currencyCode)} · Interest {formatMoney(p.interestPortion, loan.currencyCode)}
                </p>
                <p className="mt-0.5 text-xs text-vault-400">Outstanding after: {formatMoney(p.outstandingAfter, loan.currencyCode)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LabeledInput({ label, value, onChange, type = "text", min, max, step }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; min?: string; max?: string; step?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">{label}</label>
      <input type={type} min={min} max={max} step={step} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
    </div>
  );
}