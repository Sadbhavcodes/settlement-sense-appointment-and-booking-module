/**
 * POST /api/auth/register
 * Registers a new user in the Neon PostgreSQL database.
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
    const { name, email, password, role = "staff" } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const validRoles = ["admin", "staff", "doctor", "receptionist"];
    const safeRole = validRoles.includes(role) ? role : "staff";

    // Check if email already exists
    const existing = await query(`SELECT id FROM users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, full_name, email, role`,
      [name.trim(), email.toLowerCase().trim(), password, safeRole]
    );

    const user = result.rows[0];
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
    }, { status: 201 });
  } catch (err) {
    console.error("[auth/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
