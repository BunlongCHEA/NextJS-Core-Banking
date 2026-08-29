"use client";

import { useState, type FormEvent } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { customersApi, ApiError } from "@/lib/api";

export default function ManualCreateCustomerDialog({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [customerType, setCustomerType] = useState<"INDIVIDUAL" | "CORPORATE">("INDIVIDUAL");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await customersApi.create({
        fullName, email, phone,
        nationalId: nationalId || undefined,
        dateOfBirth: dateOfBirth || undefined,
        customerType,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create customer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vault-950/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-vault-950">Add customer manually</h3>
          <button onClick={onClose} className="rounded-sm p-1 text-vault-400 hover:bg-vault-100">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This skips Go-KYC identity verification. Prefer <strong>New customer (KYC)</strong> whenever the customer's documents can be verified.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full name" value={fullName} onChange={setFullName} />
          <Field label="Email" value={email} onChange={setEmail} type="email" />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="National ID (optional)" value={nationalId} onChange={setNationalId} required={false} />
            <Field label="Date of birth (optional)" value={dateOfBirth} onChange={setDateOfBirth} type="date" required={false} />
          </div>
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">Customer type</label>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as "INDIVIDUAL" | "CORPORATE")}
              className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal"
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="CORPORATE">Corporate</option>
            </select>
          </div>

          {error && <p className="text-sm text-signal-rose">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-md border border-ledger-line px-4 py-2 text-sm font-medium text-vault-700 hover:bg-vault-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-md bg-vault-950 px-4 py-2 text-sm font-medium text-white hover:bg-vault-800 disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = true }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wide text-vault-700">{label}</label>
      <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-md border border-ledger-line bg-white px-3 py-2 text-sm focus:border-signal-teal focus:outline-none focus:ring-1 focus:ring-signal-teal" />
    </div>
  );
}