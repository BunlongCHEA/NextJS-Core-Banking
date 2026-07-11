import type { UserRole } from "@/types";
import {
  LayoutGrid,
  Users,
  Landmark,
  ArrowLeftRight,
  CreditCard,
  HandCoins,
  ShieldCheck,
  UserCog,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutGrid;
  roles: UserRole[]; // mirrors backend hasAnyAuthority(...) checks
}

// Order here is the order rendered in the drawer.
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Daily snapshot",
    icon: LayoutGrid,
    roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER_SERVICE", "TELLER", "AUDITOR"],
  },
  {
    href: "/dashboard/customers",
    label: "Customers",
    description: "Profiles & KYC status",
    icon: Users,
    roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER_SERVICE", "TELLER", "AUDITOR"],
  },
  {
    href: "/dashboard/accounts",
    label: "Accounts",
    description: "Balances, freeze, close",
    icon: Landmark,
    roles: ["SUPER_ADMIN", "ADMIN", "CUSTOMER_SERVICE", "TELLER"],
  },
  {
    href: "/dashboard/transactions",
    label: "Transactions",
    description: "Transfers, deposits, withdrawals",
    icon: ArrowLeftRight,
    roles: ["SUPER_ADMIN", "ADMIN", "TELLER"],
  },
  {
    href: "/dashboard/cards",
    label: "Cards",
    description: "Issue, block, activate",
    icon: CreditCard,
    roles: ["SUPER_ADMIN", "ADMIN", "TELLER"],
  },
  {
    href: "/dashboard/loans",
    label: "Loans",
    description: "Applications & disbursement",
    icon: HandCoins,
    roles: ["SUPER_ADMIN", "ADMIN", "TELLER"],
  },
  {
    href: "/dashboard/users",
    label: "Employee Accounts",
    description: "Internal users & roles",
    icon: UserCog,
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    href: "/dashboard/audit",
    label: "Audit Trail",
    description: "Read-only activity log",
    icon: ShieldCheck,
    roles: ["SUPER_ADMIN", "AUDITOR"],
  },
];

export function visibleNavItems(role: UserRole | null): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
