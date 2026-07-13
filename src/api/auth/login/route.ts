import { NextRequest, NextResponse } from "next/server";

const SERVER = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3099";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const resp = await fetch(`${SERVER}/api/auth/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const data = await resp.json();
    return NextResponse.json(data, { status: resp.status });
  } catch {
    return NextResponse.json({ error: "Auth server unreachable" }, { status: 503 });
  }
}
