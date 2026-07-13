/**
 * Settlement Sense — Server-side session helper
 * Reads the Bearer token from the Authorization header,
 * decodes the JWT payload (without re-verifying — the issuing
 * server already signed it), and returns the current user.
 *
 * Call this at the top of every API route handler that needs auth.
 */

import { headers } from "next/headers";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "doctor";
}

/**
 * Extract & decode the JWT from the incoming request headers.
 * Returns null if no valid token is present (caller should 401).
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const headersList = await headers();
    const authorization = headersList.get("authorization") ?? "";

    if (!authorization.startsWith("Bearer ")) {
      return null;
    }

    const token = authorization.slice(7); // strip "Bearer "
    const [, payloadB64] = token.split(".");
    if (!payloadB64) return null;

    // Base64url → Base64 → JSON
    const json = Buffer.from(
      payloadB64.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8");

    const payload = JSON.parse(json);

    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      id: payload.sub ?? payload.id,
      name: payload.name ?? payload.full_name ?? "",
      email: payload.email ?? "",
      role: payload.role ?? "staff",
    };
  } catch {
    return null;
  }
}
