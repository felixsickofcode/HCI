const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");
const API_PREFIX = import.meta.env.VITE_API_PREFIX ?? "/api/v1";
const TOKEN_KEY = "token";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
}

export interface TokenResponse {
  access_token: string;
  token_type?: string;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const apiUrl = (path: string, prefix = true) =>
  `${API_URL}${prefix ? API_PREFIX : ""}${path.startsWith("/") ? path : "/" + path}`;

function errorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : null,
      )
      .filter((value): value is string => Boolean(value));
    if (messages.length) return messages.join(", ");
  }
  return fallback;
}

export async function apiFetch<T>(path: string, init?: RequestInit, prefix = true): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const token = tokenStore.get();
  if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(apiUrl(path, prefix), { ...init, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      message = errorMessage(body?.detail, message);
    } catch {
      // Keep the status-based fallback when the response is not JSON.
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const health = () => apiFetch<{ status: string }>("/health", undefined, false);
export const listUsers = () => apiFetch<unknown[]>("/users/");

export const login = (email: string, password: string) =>
  apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const register = (email: string, full_name: string | null, password: string) =>
  apiFetch<AuthUser>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, full_name: full_name?.trim() || null, password }),
  });

export const getMe = () => apiFetch<AuthUser>("/auth/me");

export type FontFamily = "lexend" | "arial" | "verdana" | "opendyslexic" | "merriweather";
export type ThemeName = "cream" | "mint" | "blue" | "dark" | "navy";

export interface FocusSettings {
  enabled: boolean;
  dimOpacity: number;
  followPointer: boolean;
}

export interface DisplaySettings {
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  theme: ThemeName;
  columnWidth: number;
  focus: FocusSettings;
}

export interface DisplaySettingsRead {
  version: number;
  updatedAt: string;
  display: DisplaySettings;
}

export const getDisplaySettings = () => apiFetch<DisplaySettingsRead>("/me/display-settings");

export const saveDisplaySettings = (display: DisplaySettings) =>
  apiFetch<DisplaySettingsRead>("/me/display-settings", {
    method: "PUT",
    body: JSON.stringify({ display }),
  });