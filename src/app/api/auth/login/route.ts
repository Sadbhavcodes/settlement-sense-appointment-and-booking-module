/**
 * POST /api/auth/login
 * Authenticates a user against the Neon PostgreSQL database.
 * Returns a simple JWT-style token (base64 encoded payload).
 */
import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db/client";

function makeToken(user: { id: string; email: string; role: string }): string {
  const header  = btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = btoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  }));
  return `${header}.${payload}.sig`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const result = await query(
      `SELECT id, full_name, email, role, password_hash FROM users WHERE email = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const user = result.rows[0];

    // Simple password check (plain text stored as password_hash for demo)
    if (user.password_hash !== password) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const initials = user.full_name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const token = makeToken({ id: user.id, email: user.email, role: user.role });

    return NextResponse.json({
      token,
      user: {
        id:       user.id,
        name:     user.full_name,
        email:    user.email,
        role:     user.role,
        initials,
      },
    });
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
