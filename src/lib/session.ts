import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "siksha_session";
const SESSION_DURATION = "7d";

export type SessionPayload = {
  sub: string;
  email: string;
  isAdmin: boolean;
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.email !== "string" || typeof payload.isAdmin !== "boolean") {
      return null;
    }
    return { sub: payload.sub, email: payload.email, isAdmin: payload.isAdmin };
  } catch {
    return null;
  }
}
