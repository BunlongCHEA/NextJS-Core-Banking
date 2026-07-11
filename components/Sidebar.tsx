"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Landmark, LogOut, X } from "lucide-react";
import type { UserRole } from "@/types";
import { visibleNavItems } from "@/lib/nav";
import { clearSession } from "@/lib/auth";

const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CUSTOMER_SERVICE: "Customer Service",
  TELLER: "Teller",
  AUDITOR: "Auditor",
  CUSTOMER: "Customer",
};

export default function Sidebar({
  open,
  onClose,
  role,
  username,
}: {
  open: boolean;
  onClose: () => void;
  role: UserRole | null;
  username: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = visibleNavItems(role);

  function handleLogout() {
    clearSession();
    router.push("/login");
  }

  return (
    <>
      {/* Scrim */}
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-vault-950/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer — "the ledger": slides in like a pulled index tab */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-vault-950 text-vault-100 shadow-drawer transition-transform duration-300 ease-out
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-signal-teal/15 ring-1 ring-signal-teal/40">
              <Landmark className="h-4.5 w-4.5 text-signal-teal" strokeWidth={1.75} />
            </div>
            <span className="font-display text-base font-semibold tracking-tight">CBS Console</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-sm p-1.5 text-vault-300 hover:bg-vault-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-vault-400">Modules</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors ${
                      active
                        ? "bg-signal-teal/15 text-white ring-1 ring-signal-teal/30"
                        : "text-vault-200 hover:bg-vault-800 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`mt-0.5 h-4.5 w-4.5 flex-shrink-0 ${active ? "text-signal-teal" : "text-vault-400 group-hover:text-vault-200"}`}
                      strokeWidth={1.75}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight">{item.label}</span>
                      <span className="block text-xs leading-tight text-vault-400">{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-vault-800 px-5 py-4">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-vault-800 font-display text-xs font-semibold text-vault-100">
              {(username ?? "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{username ?? "Unknown"}</p>
              <p className="text-xs text-vault-400">{role ? ROLE_LABEL[role] : "—"}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-vault-300 transition-colors hover:bg-vault-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
