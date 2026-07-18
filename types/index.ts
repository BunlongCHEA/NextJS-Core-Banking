// Mirrors com.bank.cbs.domain.enums.UserRole
export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CUSTOMER_SERVICE"
  | "TELLER"
  | "AUDITOR"
  | "CUSTOMER";

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errorCode?: string;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

// dto/response/LoginResponse.java
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  userId: string;
  username: string;
  role: UserRole;
  mustChangePassword: boolean;
}

// dto/response/CustomerResponse.java
export interface Customer {
  customerId: string;
  customerCode: string;
  fullName: string;
  email: string;
  phone: string;
  nationalId: string | null;
  dateOfBirth: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "BLOCKED";
  customerType: "INDIVIDUAL" | "CORPORATE";
  bankId: string | null;
  idType: string | null;
  createdAt: string;
}

// dto/response/AccountResponse.java
export interface Account {
  accountId: string;
  accountNumber: string;
  customerId: string;
  accountType: "SAVINGS" | "CHECKING" | "LOAN" | "FIXED_DEPOSIT" | "CURRENT";
  currencyCode: string;
  balance: number;
  availableBalance: number;
  holdBalance: number;
  status: "ACTIVE" | "DORMANT" | "FROZEN" | "CLOSED";
  dailyLimit: number;
  openedAt: string | null;
  createdAt: string;
}

// dto/response/TransactionResponse.java
export interface Transaction {
  transactionId: string;
  referenceNumber: string;
  debitAccountNumber: string | null;
  creditAccountNumber: string | null;
  transactionType: "TRANSFER" | "DEPOSIT" | "WITHDRAWAL" | "PAYMENT" | "REVERSAL" | "FEE";
  amount: number;
  currencyCode: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "REVERSED";
  channel: "ATM" | "MOBILE" | "WEB" | "BRANCH" | "API" | "POS" | null;
  description: string | null;
  initiatedAt: string;
  completedAt: string | null;
}

// dto/response/CardResponse.java
export interface Card {
  cardId: string;
  accountId: string;
  cardLastFour: string;
  cardType: "DEBIT" | "CREDIT" | "PREPAID";
  expiryDate: string;
  status: "ACTIVE" | "INACTIVE" | "BLOCKED" | "EXPIRED" | "PENDING";
  dailyLimit: number;
  contactlessEnabled: boolean;
  internationalEnabled: boolean;
  issuedAt: string | null;
}

// dto/response/LoanResponse.java
export interface Loan {
  loanId: string;
  loanNumber: string;
  accountId: string;
  principal: number;
  outstandingBalance: number;
  interestRate: number;
  termMonths: number;
  monthlyInstallment: number;
  currencyCode: string;
  status: "PENDING" | "DISBURSED" | "ACTIVE" | "CLOSED" | "DEFAULTED" | "WRITTEN_OFF";
  disbursedAt: string | null;
  maturityDate: string | null;
  nextPaymentDate: string | null;
}

// dto/response/UserResponse.java
export interface CbsUser {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  passwordChangedAt: string | null;
  passwordPolicy: "ONE_MONTH" | "THREE_MONTHS" | "SIX_MONTHS" | "TWELVE_MONTHS";
  passwordExpiresAt: string | null;
  createdAt: string;
}

export interface JwtClaims {
  sub: string;
  role: UserRole;
  iat: number;
  exp: number;
}
