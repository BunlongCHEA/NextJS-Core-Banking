"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader, Panel } from "@/components/ui";
import { visibleNavItems } from "@/lib/nav";
import { getRole, getUsername } from "@/lib/auth";
import type { UserRole } from "@/types";

export default function DashboardHomePage() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setRole(getRole());
    setUsername(getUsername());
  }, []);

  const modules = visibleNavItems(role).filter((item) => item.href !== "/dashboard");

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${username ?? "—"}`}
        description="Pick a module from the menu, or jump in below."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Panel className="group flex h-full flex-col gap-3 p-5 transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-vault-950">
                  <Icon className="h-5 w-5 text-signal-teal" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="font-display text-[15px] font-semibold text-vault-950">{item.label}</p>
                  <p className="mt-0.5 text-sm text-vault-600">{item.description}</p>
                </div>
              </Panel>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
