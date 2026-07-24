"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { accountsApi, accountTypesApi, currenciesApi, ApiError } from "@/lib/api";
import type { AccountType, Currency } from "@/types";

export default function NewAccountDialog({
  open, customerId, onClose, onCreated,
}: { open: boolean; customerId: string; onClose: () => void; onCreated: () => void }) {
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [accountTypeId, setAccountTypeId] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingOptions(true);
    Promise.all([accountTypesApi.list(), currenciesApi.list()])
      .then(([typesRes, currenciesRes]) => {
        setAccountTypes(typesRes.data);
        setCurrencies(currenciesRes.data);
        setAccountTypeId(typesRes.data[0]?.accountTypeId ?? "");
        setCurrencyCode(currenciesRes.data[0]?.currencyCode ?? "");
      })
      .catch(() => setError("Could not load account type / currency options."))
      .finally(() => setLoadingOptions(false));
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await accountsApi.create(customerId, {
        accountTypeId,
        currencyCode,
        dailyLimit: dailyLimit ? Number(dailyLimit) : undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not open account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-vault-950">New account</h3>
          <button onClick={onClose} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {loadingOptions ? (
          <div className="flex items-center gap-2 py-8 text-vault-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading options…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Account type</label>
              <select
                required value={accountTypeId} onChange={(e) => setAccountTypeId(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
              >
                {/* backend already blocks non-credit-nature types (e.g. LOAN) from this endpoint —
                    filtering here too keeps the option from ever appearing in the first place */}
                {accountTypes.filter((t) => t.isCreditNature).map((t) => (
                  <option key={t.accountTypeId} value={t.accountTypeId}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Currency</label>
              <select
                required value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
              >
                {currencies.map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Daily limit (optional)</label>
              <input type="number" min="0" step="0.01" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)}
                placeholder="Defaults to 50,000"
                className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
            </div>
            {error && <p className="text-sm text-signal-rose">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Open account
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}