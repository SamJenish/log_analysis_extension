import { jwtVerify } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not configured");
}

interface DecodedToken {
  sub: string;
  iat: number;
  exp: number;
  [key: string]: any;
}

/**
 * Validate Bearer token from Authorization header
 * Returns userId if valid, null if invalid
 */
export async function validateBearerToken(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const verified = await jwtVerify(token, secret);
    const decoded = verified.payload as DecodedToken;

    // NextAuth puts user ID in 'sub'
    if (decoded.sub) {
      return decoded.sub;
    }

    return null;
  } catch (error) {
    console.error("Token validation error:", error);
    return null;
  }
}
