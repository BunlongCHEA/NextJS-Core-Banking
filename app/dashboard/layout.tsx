"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getRole, getToken, getUsername, isTokenExpired } from "@/lib/auth";
import { NAV_ITEMS } from "@/lib/nav";
import type { UserRole } from "@/types";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      router.replace("/login");
      return;
    }
    setRole(getRole());
    setUsername(getUsername());
  }, [router]);

  useEffect(() => {
    setOpen(false); // close drawer on navigation
  }, [pathname]);

  const title = NAV_ITEMS.find((item) => item.href === pathname)?.label ?? "CBS Console";

  return (
    <div className="flex min-h-screen bg-ledger-paper">
      <Sidebar open={open} onClose={() => setOpen(false)} role={role} username={username} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setOpen(true)} title={title} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
