import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-semibold text-vault-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-vault-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-ledger-line bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-signal-teal/10 text-signal-tealDark ring-1 ring-signal-teal/25",
  COMPLETED: "bg-signal-teal/10 text-signal-tealDark ring-1 ring-signal-teal/25",
  VERIFIED: "bg-signal-teal/10 text-signal-tealDark ring-1 ring-signal-teal/25",
  DISBURSED: "bg-signal-teal/10 text-signal-tealDark ring-1 ring-signal-teal/25",
  PENDING: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/25",
  PROCESSING: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/25",
  FROZEN: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/25",
  SUSPENDED: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/25",
  BLOCKED: "bg-signal-rose/10 text-signal-rose ring-1 ring-signal-rose/25",
  CLOSED: "bg-vault-100 text-vault-600 ring-1 ring-vault-200",
  INACTIVE: "bg-vault-100 text-vault-600 ring-1 ring-vault-200",
  FAILED: "bg-signal-rose/10 text-signal-rose ring-1 ring-signal-rose/25",
  REJECTED: "bg-signal-rose/10 text-signal-rose ring-1 ring-signal-rose/25",
  REVERSED: "bg-vault-100 text-vault-600 ring-1 ring-vault-200",
  DEFAULTED: "bg-signal-rose/10 text-signal-rose ring-1 ring-signal-rose/25",
  WRITTEN_OFF: "bg-vault-100 text-vault-600 ring-1 ring-vault-200",
  EXPIRED: "bg-vault-100 text-vault-600 ring-1 ring-vault-200",
  DORMANT: "bg-vault-100 text-vault-600 ring-1 ring-vault-200",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-vault-100 text-vault-600 ring-1 ring-vault-200";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {status}
    </span>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-medium text-vault-700">{title}</p>
      {hint && <p className="mt-1 text-sm text-vault-400">{hint}</p>}
    </div>
  );
}

export function formatMoney(amount: number, currencyCode: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}
