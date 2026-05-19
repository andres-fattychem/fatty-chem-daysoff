import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

const COOKIE_NAME = "fc_admin";

function getSecret(): Uint8Array {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function checkAdminPassword(plain: string): Promise<boolean> {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export async function createAdminSession(): Promise<string> {
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
  return token;
}

export async function setAdminSessionCookie(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearAdminSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const tok = cookies().get(COOKIE_NAME)?.value;
  if (!tok) return false;
  try {
    const { payload } = await jwtVerify(tok, getSecret());
    return payload.role === "admin";
  } catch {
    return false;
  }
}
