import { NextResponse } from "next/server";
import {
  checkAdminPassword,
  createAdminSession,
  setAdminSessionCookie,
} from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const password = (body?.password ?? "") as string;
  const ok = await checkAdminPassword(password);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "Invalid password" },
      { status: 401 }
    );
  }
  const token = await createAdminSession();
  await setAdminSessionCookie(token);
  return NextResponse.json({ ok: true });
}
