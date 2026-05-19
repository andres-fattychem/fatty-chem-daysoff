import { SignJWT, jwtVerify } from "jose";

function getSecret(): Uint8Array {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET is not set");
  return new TextEncoder().encode(s);
}

export type Action = "approve" | "reject";

export async function signActionToken(
  requestId: number,
  action: Action
): Promise<string> {
  return new SignJWT({ rid: requestId, act: action })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("90d")
    .sign(getSecret());
}

export async function verifyActionToken(
  token: string
): Promise<{ rid: number; act: Action } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.rid !== "number" || typeof payload.act !== "string")
      return null;
    if (payload.act !== "approve" && payload.act !== "reject") return null;
    return { rid: payload.rid as number, act: payload.act as Action };
  } catch {
    return null;
  }
}
