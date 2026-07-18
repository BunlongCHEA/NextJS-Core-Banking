"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X, Loader2 } from "lucide-react";
import { customersApi, ApiError } from "@/lib/api";
import type { Customer } from "@/types";

const ID_TYPES = ["NATIONAL_ID", "PASSPORT", "DRIVING_LICENSE"] as const;

export default function SyncKycDialog({
  customer,
  onClose,
  onSynced,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSynced: () => void;
}) {
  const [idType, setIdType] = useState<(typeof ID_TYPES)[number]>(
    (customer?.idType as (typeof ID_TYPES)[number]) ?? "NATIONAL_ID"
  );
  const [idNumber, setIdNumber] = useState(customer?.nationalId ?? "");
  const [bankId, setBankId] = useState(customer?.bankId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // re-sync fields whenever the dialog is opened for a different customer
  useEffect(() => {
    if (customer) {
      setIdType((customer.idType as (typeof ID_TYPES)[number]) ?? "NATIONAL_ID");
      setIdNumber(customer.nationalId ?? "");
      setBankId(customer.bankId ?? "");
      setError(null);
    }
  }, [customer]);

  if (!customer) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!customer) return;
    setLoading(true);
    setError(null);
    try {
      await customersApi.syncAddressFromKyc(customer.customerId, { idType, idNumber, bankId });
      onSynced();
    } catch (err) {
      // e.g. "KYC record (customerId=...) does not belong to customer ..."
      // or "KYC record is not VERIFIED. Current status: ..."
      setError(err instanceof ApiError ? err.message : "Could not sync from KYC.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-vault-950">
            Sync address from KYC — {customer.fullName}
          </h3>
          <button onClick={onClose} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <p className="mb-4 text-xs text-vault-500">
          Re-verifies this customer against Go-KYC and updates their stored
          address if it has changed. Idempotent — safe to run repeatedly.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">
              Document type
            </label>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value as (typeof ID_TYPES)[number])}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
            >
              {ID_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Document number</label>
            <input
              required
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Bank ID (Go-KYC)</label>
            <input
              required
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
            />
          </div>

          {error && <p className="text-sm text-signal-rose">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Re-verify &amp; sync
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}