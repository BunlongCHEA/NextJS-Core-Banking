"use client";

import { getToken, clearSession } from "@/lib/auth";
import type {
  Account,
  ApiResponse,
  Card,
  Customer,
  Loan,
  LoginResponse,
  PageResponse,
  Transaction,
  CbsUser,
  Currency,
  AccountType,
  Channel,
  LoanPayment,
  AuditLog,
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api/v1";

export class ApiError extends Error {
  status: number;
  errorCode?: string;
  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const message = body?.message ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body?.errorCode);
  }

  return body as T;
}

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    request<ApiResponse<LoginResponse>>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ username, password }) },
      false
    ),
};

// ── Users (employee accounts) ────────────────────────────────
export const usersApi = {
  search: (params: { role?: string; isActive?: boolean; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params.role) qs.set("role", params.role);
    if (params.isActive !== undefined) qs.set("isActive", String(params.isActive));
    qs.set("page", String(params.page ?? 0));
    qs.set("size", String(params.size ?? 20));
    return request<ApiResponse<PageResponse<CbsUser>>>(`/users?${qs.toString()}`);
  },
  findById: (userId: string) => request<CbsUser>(`/users/${userId}`),
  create: (payload: { username: string; email: string; initialPassword: string; role: string; branchId?: string }) =>
    request<CbsUser>("/users", { method: "POST", body: JSON.stringify(payload) }),
  changePassword: (userId: string, payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    request<void>(`/users/${userId}/change-password`, { method: "POST", body: JSON.stringify(payload) }),
  // deactivate: (userId: string) => request<void>(`/users/${userId}`, { method: "DELETE" }),
  deactivate: (userId: string) => request<ApiResponse<void>>(`/users/${userId}/deactivate`, { method: "PATCH" }),
  reactivate: (userId: string) => request<ApiResponse<void>>(`/users/${userId}/reactivate`, { method: "PATCH" }),
  remove: (userId: string) => request<ApiResponse<void>>(`/users/${userId}`, { method: "DELETE" }),
  resetPassword: (userId: string) => request<ApiResponse<{ tempPassword: string }>>(`/users/${userId}/reset-password`, { method: "POST" }),
  generatePassword: () => request<{ password: string }>("/users/generate-password"),
};

// ── Customers ─────────────────────────────────────────────────
export const customersApi = {
  search: (params: { status?: string; search?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.search) qs.set("search", params.search);
    qs.set("page", String(params.page ?? 0));
    qs.set("size", String(params.size ?? 20));
    return request<ApiResponse<PageResponse<Customer>>>(`/customers?${qs.toString()}`);
  },
  findById: (customerId: string) => request<ApiResponse<Customer>>(`/customers/${customerId}`),

  // Manual creation — bypasses Go-KYC verification. Restricted server-side
  // to SUPER_ADMIN/ADMIN; prefer createFromKyc whenever possible.
  create: (payload: {
    fullName: string;
    email: string;
    phone: string;
    nationalId?: string;
    dateOfBirth?: string;
    customerType: "INDIVIDUAL" | "CORPORATE";
  }) =>
    request<ApiResponse<Customer>>("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Flow B — create only after Go-KYC verification
  createFromKyc: (payload: {
    idType: string;
    idNumber: string;
    bankId: string;
    branchId?: string;
  }) =>
    request<CustomerResponseRaw>("/customers/kyc-verified", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Flow C — re-verify + sync address for an existing customer
  syncAddressFromKyc: (
    customerId: string,
    payload: { idType: string; idNumber: string; bankId: string }
  ) =>
    request<ApiResponse<Customer>>(`/customers/${customerId}/address/kyc`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  updateStatus: (customerId: string, status: string) =>
    request<ApiResponse<void>>(`/customers/${customerId}/status?status=${status}`, {
      method: "PATCH",
    }),
};

// createFromKyc returns the CustomerResponse record directly (no ApiResponse wrapper) —
// see CustomerController.createFromKyc, which returns ResponseEntity<CustomerResponse>.
type CustomerResponseRaw = Customer;

// ── Accounts ──────────────────────────────────────────────────
export const accountsApi = {
  byCustomer: (customerId: string) => request<ApiResponse<Account[]>>(`/accounts/customers/${customerId}`),
  findById: (accountId: string) => request<ApiResponse<Account>>(`/accounts/${accountId}`),
  findByNumber: (accountNumber: string) => request<ApiResponse<Account>>(`/accounts/number/${accountNumber}`),
  balance: (accountId: string) => request<ApiResponse<number>>(`/accounts/${accountId}/balance`),
  create: (
    customerId: string,
    payload: { accountTypeId: string; currencyCode: string; dailyLimit?: number }
  ) =>
    request<ApiResponse<Account>>(`/accounts/customers/${customerId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  freeze: (accountId: string) =>
    request<ApiResponse<void>>(`/accounts/${accountId}/freeze`, { method: "PATCH" }),
  unfreeze: (accountId: string) =>                                            // ← new
    request<ApiResponse<void>>(`/accounts/${accountId}/unfreeze`, { method: "PATCH" }),
  close: (accountId: string) =>
    request<ApiResponse<void>>(`/accounts/${accountId}/close`, { method: "PATCH" }),
};

// ── Transactions ──────────────────────────────────────────────
export const transactionsApi = {
  history: (accountId: string, page = 0, size = 20) =>
    request<ApiResponse<PageResponse<Transaction>>>(
      `/transactions/accounts/${accountId}?page=${page}&size=${size}`
    ),
  transfer: (payload: {
    idempotencyKey: string;
    debitAccountNumber: string;
    creditAccountNumber: string;
    amount: number;
    currencyCode: string;
    channel?: string;
    description?: string;
  }) =>
    request<ApiResponse<Transaction>>("/transactions/transfer", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deposit: (payload: {
    idempotencyKey: string;
    creditAccountNumber: string;
    amount: number;
    currencyCode: string;
    channel?: string;
    description?: string;
  }) =>
    request<ApiResponse<Transaction>>("/transactions/deposit", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  withdrawal: (payload: {
    idempotencyKey: string;
    debitAccountNumber: string;
    amount: number;
    currencyCode: string;
    channel?: string;
    description?: string;
  }) =>
    request<ApiResponse<Transaction>>("/transactions/withdrawal", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ── Cards ─────────────────────────────────────────────────────
export const cardsApi = {
  byAccount: (accountId: string) => request<ApiResponse<Card[]>>(`/cards/accounts/${accountId}`),
  issue: (accountId: string, payload: { cardType: string; dailyLimit?: number }) =>
    request<ApiResponse<Card>>(`/cards/accounts/${accountId}`, { method: "POST", body: JSON.stringify(payload) }),
  block: (cardId: string) => request<ApiResponse<Card>>(`/cards/${cardId}/block`, { method: "PATCH" }),
  unblock: (cardId: string) => request<ApiResponse<Card>>(`/cards/${cardId}/unblock`, { method: "PATCH" }),
  activate: (cardId: string) => request<ApiResponse<Card>>(`/cards/${cardId}/activate`, { method: "PATCH" }),
  deactivate: (cardId: string) => request<ApiResponse<Card>>(`/cards/${cardId}/deactivate`, { method: "PATCH" }),
};

// ── Loans ─────────────────────────────────────────────────────
export const loansApi = {
  byCustomer: (customerId: string) => request<ApiResponse<Loan[]>>(`/loans/customers/${customerId}`),
  findById: (loanId: string) => request<ApiResponse<Loan>>(`/loans/${loanId}`),
  apply: (customerId: string, payload: { principal: number; interestRate: number; termMonths: number; currencyCode: string; disbursementAccountNumber: string }) =>
    request<ApiResponse<Loan>>(`/loans/customers/${customerId}`, { method: "POST", body: JSON.stringify(payload) }),
  approve: (loanId: string) => request<ApiResponse<Loan>>(`/loans/${loanId}/approve`, { method: "PATCH" }),
  reject: (loanId: string, reason: string) => request<ApiResponse<Loan>>(`/loans/${loanId}/reject`, { method: "PATCH", body: JSON.stringify({ reason }) }),
  disburse: (loanId: string) => request<ApiResponse<Loan>>(`/loans/${loanId}/disburse`, { method: "PATCH" }),
  recordPayment: (loanId: string, payload: { idempotencyKey: string; payingAccountNumber: string; amount: number }) =>
    request<ApiResponse<Loan>>(`/loans/${loanId}/payments`, { method: "POST", body: JSON.stringify(payload) }),
  payments: (loanId: string) => request<ApiResponse<LoanPayment[]>>(`/loans/${loanId}/payments`),
};

// ── Currencies ─────────────────────────────────────────────────
export const currenciesApi = {
  list: () => request<ApiResponse<Currency[]>>("/currencies"),
};

// ── Account Types ───────────────────────────────────────────────
export const accountTypesApi = {
  list: () => request<ApiResponse<AccountType[]>>("/account-types"),
};

// ── Channels ───────────────────────────────────────────────────
export const channelsApi = {
  list: () => request<ApiResponse<Channel[]>>("/channels"),
};

// ── Settings ───────────────────────────────────────────────────
export const settingsApi = {
  get: (key: string) => request<ApiResponse<{ settingKey: string; value: string; description: string }>>(`/settings/${key}`),
  update: (key: string, value: string) =>
    request<ApiResponse<void>>(`/settings/${key}`, { method: "PATCH", body: JSON.stringify({ value }) }),
};

// ── Audits ───────────────────────────────────────────────────
export const auditApi = {
  search: (params: { entityType?: string; entityId?: string; action?: string; page?: number; size?: number }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) qs.set(k, String(v)); });
    return request<ApiResponse<PageResponse<AuditLog>>>(`/audit?${qs.toString()}`);
  },
};