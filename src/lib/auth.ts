/**
 * Settlement Sense — Auth utilities
 * Client-side auth helpers: token storage, user session management
 */

const TOKEN_KEY = "ss_auth_token";
const USER_KEY  = "ss_auth_user";

export interface AuthUser {
  id:       string;
  name:     string;
  email:    string;
  role:     "admin" | "staff" | "doctor";
  initials: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  const token = getToken();
  if (!token) return false;
  try {
    // Decode without verifying (server validates on API calls)
    const [, payload] = token.split(".");
    const decoded = JSON.parse(atob(payload));
    // Check expiry
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/** Build Authorization header for API calls */
export function authHeader(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
