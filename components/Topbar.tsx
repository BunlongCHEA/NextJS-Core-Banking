"use client";

import { Menu } from "lucide-react";

export default function Topbar({
  onMenuClick,
  title,
}: {
  onMenuClick: () => void;
  title: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ledger-line bg-ledger-paper/95 px-4 py-3.5 backdrop-blur sm:px-6">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="rounded-md p-2 text-vault-700 hover:bg-vault-100 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="font-display text-lg font-semibold text-vault-950">{title}</h1>
    </header>
  );
}
