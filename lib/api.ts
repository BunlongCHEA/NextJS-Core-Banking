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
  changePassword: (userId: string, payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    request<void>(`/users/${userId}/change-password`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  findById: (userId: string) => request<CbsUser>(`/users/${userId}`),
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
  updateStatus: (customerId: string, status: string) =>
    request<ApiResponse<void>>(`/customers/${customerId}/status?status=${status}`, {
      method: "PATCH",
    }),
};

// ── Accounts ──────────────────────────────────────────────────
export const accountsApi = {
  byCustomer: (customerId: string) =>
    request<ApiResponse<Account[]>>(`/accounts/customers/${customerId}`),
  findById: (accountId: string) => request<ApiResponse<Account>>(`/accounts/${accountId}`),
  balance: (accountId: string) => request<ApiResponse<number>>(`/accounts/${accountId}/balance`),
  create: (
    customerId: string,
    payload: { accountType: string; currencyCode: string; dailyLimit?: number }
  ) =>
    request<ApiResponse<Account>>(`/accounts/customers/${customerId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  freeze: (accountId: string) =>
    request<ApiResponse<void>>(`/accounts/${accountId}/freeze`, { method: "PATCH" }),
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
    request<ApiResponse<Card>>(`/cards/accounts/${accountId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  block: (cardId: string) => request<ApiResponse<Card>>(`/cards/${cardId}/block`, { method: "PATCH" }),
  activate: (cardId: string) => request<ApiResponse<Card>>(`/cards/${cardId}/activate`, { method: "PATCH" }),
};

// ── Loans ─────────────────────────────────────────────────────
export const loansApi = {
  byAccount: (accountId: string) => request<ApiResponse<Loan[]>>(`/loans/accounts/${accountId}`),
  findById: (loanId: string) => request<ApiResponse<Loan>>(`/loans/${loanId}`),
  apply: (
    accountId: string,
    payload: { principal: number; interestRate: number; termMonths: number; currencyCode: string }
  ) =>
    request<ApiResponse<Loan>>(`/loans/accounts/${accountId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  disburse: (loanId: string) => request<ApiResponse<Loan>>(`/loans/${loanId}/disburse`, { method: "PATCH" }),
};
