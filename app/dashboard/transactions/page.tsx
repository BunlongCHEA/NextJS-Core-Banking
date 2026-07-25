"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2, ArrowRight, Search } from "lucide-react";
import { transactionsApi, accountsApi, customersApi, currenciesApi, channelsApi, settingsApi, ApiError } from "@/lib/api";
import { PageHeader, Panel, StatusBadge, EmptyState, formatMoney } from "@/components/ui";
import type { Transaction, Currency, Channel, Customer, Account } from "@/types";

type Mode = "transfer" | "deposit" | "withdrawal";

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

// ── #2: live account lookup preview ──────────────────────────
function useAccountPreview(accountNumber: string) {
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const term = accountNumber.trim();
    if (term.length < 6) { setAccount(null); return; }
    setChecking(true);
    const handle = setTimeout(() => {
      accountsApi.findByNumber(term)
        .then((res) => setAccount(res.data))
        .catch(() => setAccount(null))
        .finally(() => setChecking(false));
    }, 400); // debounce
    return () => clearTimeout(handle);
  }, [accountNumber]);

  return { account, checking };
}

function AccountPreview({ accountNumber }: { accountNumber: string }) {
  const { account, checking } = useAccountPreview(accountNumber);
  if (!accountNumber.trim()) return null;
  if (checking) return <p className="mt-1 text-xs text-vault-400">Checking…</p>;
  if (!account) return accountNumber.trim().length >= 6 ? <p className="mt-1 text-xs text-signal-rose">No matching account</p> : null;
  return (
    <p className="mt-1 text-xs text-vault-500">
      {account.status} · available {formatMoney(account.availableBalance, account.currencyCode)}
    </p>
  );
}

export default function TransactionsPage() {
  const [mode, setMode] = useState<Mode>("transfer");
  const [debitAccountNumber, setDebitAccountNumber] = useState("");
  const [creditAccountNumber, setCreditAccountNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currencyCode, setCurrencyCode] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<Transaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // history lookup — now via customer search, not raw UUID (#3)
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [historyAccounts, setHistoryAccounts] = useState<Account[]>([]);
  const [historyAccountId, setHistoryAccountId] = useState<string | null>(null);
  const [history, setHistory] = useState<Transaction[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    currenciesApi.list().then((res) => {
      setCurrencies(res.data);
      setCurrencyCode(res.data[0]?.currencyCode ?? "");
    });
    channelsApi.list().then((res) => {
      setChannels(res.data);
      const branch = res.data.find((c) => c.code === "BRANCH");
      setChannelId((branch ?? res.data[0])?.channelId ?? "");
    });
  }, []);

  const selectedCurrency = currencies.find((c) => c.currencyCode === currencyCode);
  const amountStep = selectedCurrency ? (1 / 10 ** selectedCurrency.decimalPlaces).toString() : "0.01";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const base = {
      idempotencyKey: newIdempotencyKey(),
      amount: parseFloat(amount),
      currencyCode,
      channelId,
      description: description || undefined,
    };
    try {
      let res;
      if (mode === "transfer") res = await transactionsApi.transfer({ ...base, debitAccountNumber, creditAccountNumber });
      else if (mode === "deposit") res = await transactionsApi.deposit({ ...base, creditAccountNumber });
      else res = await transactionsApi.withdrawal({ ...base, debitAccountNumber });
      setResult(res.data);
      setAmount("");
      setDescription("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Transaction failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCustomerSearch(e: FormEvent) {
    e.preventDefault();
    const term = customerQuery.trim();
    if (!term) return;
    const res = await customersApi.search({ search: term, page: 0, size: 5 });
    setCustomerResults(res.data.content);
    setHistoryAccounts([]);
    setHistoryAccountId(null);
    setHistory([]);
  }

  async function pickCustomer(customerId: string) {
    const res = await accountsApi.byCustomer(customerId);
    setHistoryAccounts(res.data);
    setCustomerResults([]);
  }

  async function loadHistory(accountId: string, page: number) {
    setHistoryLoading(true);
    try {
      const res = await transactionsApi.history(accountId, page, 20);
      setHistory((prev) => (page === 0 ? res.data.content : [...prev, ...res.data.content]));
      setHistoryHasMore(!res.data.last);
      setHistoryPage(page);
      setHistoryAccountId(accountId);
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
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 rounded-sm py-1.5 text-sm font-medium capitalize transition-colors ${mode === m ? "bg-white text-vault-950 shadow-sm" : "text-vault-500 hover:text-vault-700"}`}>
                {m}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {(mode === "transfer" || mode === "withdrawal") && (
              <div>
                <Field label="Debit account number" value={debitAccountNumber} onChange={setDebitAccountNumber} mono />
                <AccountPreview accountNumber={debitAccountNumber} />
              </div>
            )}
            {(mode === "transfer" || mode === "deposit") && (
              <div>
                <Field label="Credit account number" value={creditAccountNumber} onChange={setCreditAccountNumber} mono />
                <AccountPreview accountNumber={creditAccountNumber} />
              </div>
            )}

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <Field label="Amount" value={amount} onChange={setAmount} type="number" step={amountStep} min="0" />
              <div>
                <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Currency</label>
                <select value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}
                  className="mt-1.5 w-24 rounded-md border border-ledger-line bg-white px-2 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal">
                  {currencies.map((c) => <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Channel</label>
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal">
                {channels.map((c) => <option key={c.channelId} value={c.channelId}>{c.name}</option>)}
              </select>
            </div>

            <Field label="Description (optional)" value={description} onChange={setDescription} required={false} />

            {error && <p className="text-sm text-signal-rose">{error}</p>}

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-vault-950 px-4 py-2.5 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Submit {mode}
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

        <HighValueThresholdSetting />
      </div>

      <div>
        <PageHeader title="Account history" description="Search a customer, then pick one of their accounts." />

        <form onSubmit={handleCustomerSearch} className="mb-4 flex max-w-md items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-vault-400" />
            <input value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)}
              placeholder="Customer name, email, or phone"
              className="w-full rounded-md border border-ledger-line bg-white py-2 pl-9 pr-3 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
          </div>
          <button type="submit" className="rounded-md border border-ledger-line bg-white px-3 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">Search</button>
        </form>

        {customerResults.length > 0 && (
          <ul className="mb-4 divide-y divide-ledger-line rounded-md border border-ledger-line bg-white">
            {customerResults.map((c) => (
              <li key={c.customerId}>
                <button onClick={() => pickCustomer(c.customerId)} className="w-full px-4 py-2 text-left text-sm hover:bg-vault-50">
                  {c.fullName} <span className="font-mono text-xs text-vault-400">({c.customerCode})</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {historyAccounts.length > 0 && !historyAccountId && (
          <div className="mb-4 flex flex-wrap gap-2">
            {historyAccounts.map((a) => (
              <button key={a.accountId} onClick={() => loadHistory(a.accountId, 0)}
                className="rounded-md border border-ledger-line bg-white px-3 py-1.5 text-xs font-mono hover:bg-vault-50">
                •••• {a.accountNumber.slice(-4)} — {formatMoney(a.availableBalance, a.currencyCode)}
              </button>
            ))}
          </div>
        )}

        <Panel>
          {historyAccountId === null ? (
            <EmptyState title="No account selected yet" hint="Search a customer above and pick an account." />
          ) : historyLoading && history.length === 0 ? (
            <div className="flex items-center gap-2 py-12 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : history.length === 0 ? (
            <EmptyState title="No transactions found for this account" />
          ) : (
            <>
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
              {historyHasMore && (
                <div className="p-3 text-center">
                  <button onClick={() => loadHistory(historyAccountId, historyPage + 1)} disabled={historyLoading}
                    className="rounded-md border border-ledger-line px-4 py-1.5 text-xs font-medium text-vault-700 hover:bg-vault-50 disabled:opacity-50">
                    {historyLoading ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

// ── admin-editable high-value fee threshold ──────────────────
function HighValueThresholdSetting() {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    settingsApi.get("high_value_txn_threshold_usd")
      .then((res) => setValue(res.data.value))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaved(false);
    await settingsApi.update("high_value_txn_threshold_usd", value);
    setSaved(true);
  }

  if (loading) return null;
  return (
    <Panel className="mt-4 p-4">
      <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">
        High-value fee threshold (USD equivalent)
      </label>
      <div className="mt-1.5 flex gap-2">
        <input value={value} onChange={(e) => { setValue(e.target.value); setSaved(false); }} type="number" min="0"
          className="w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
        <button onClick={save} className="rounded-md bg-vault-950 px-3 py-2 text-xs font-medium text-white hover:bg-vault-800">Save</button>
      </div>
      {saved && <p className="mt-1 text-xs text-signal-teal">Saved.</p>}
      <p className="mt-1 text-xs text-vault-400">Withdrawals/transfers-out above this (converted to USD) get an extra fee.</p>
    </Panel>
  );
}

function Field({ label, value, onChange, type = "text", mono = false, required = true, step, min }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; mono?: boolean; required?: boolean; step?: string; min?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">{label}</label>
      <input type={type} required={required} value={value} step={step} min={min}
        onChange={(e) => onChange(e.target.value)}
        className={`mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal ${mono ? "font-mono" : ""}`} />
    </div>
  );
}