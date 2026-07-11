"use client";

import { jwtDecode } from "jwt-decode";
import type { JwtClaims, UserRole } from "@/types";

const TOKEN_COOKIE = "cbs_token";
const ROLE_COOKIE = "cbs_role";
const NAME_COOKIE = "cbs_username";

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function saveSession(token: string, role: UserRole, username: string, expiresInSeconds: number) {
  setCookie(TOKEN_COOKIE, token, expiresInSeconds);
  setCookie(ROLE_COOKIE, role, expiresInSeconds);
  setCookie(NAME_COOKIE, username, expiresInSeconds);
}

export function getToken(): string | null {
  if (typeof document === "undefined") return null;
  return getCookie(TOKEN_COOKIE);
}

export function getRole(): UserRole | null {
  if (typeof document === "undefined") return null;
  return (getCookie(ROLE_COOKIE) as UserRole) ?? null;
}

export function getUsername(): string | null {
  if (typeof document === "undefined") return null;
  return getCookie(NAME_COOKIE);
}

export function clearSession() {
  deleteCookie(TOKEN_COOKIE);
  deleteCookie(ROLE_COOKIE);
  deleteCookie(NAME_COOKIE);
}

export function decodeToken(token: string): JwtClaims | null {
  try {
    return jwtDecode<JwtClaims>(token);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const claims = decodeToken(token);
  if (!claims) return true;
  return claims.exp * 1000 < Date.now();
}
