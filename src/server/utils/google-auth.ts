const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleTokenPayload {
  readonly sub: string;
  readonly email: string;
  readonly email_verified: boolean;
  readonly name: string;
  readonly picture: string;
  readonly aud: string;
  readonly iss: string;
  readonly exp: number;
}

interface JwksKey {
  readonly kid: string;
  readonly kty: string;
  readonly n: string;
  readonly e: string;
  readonly alg: string;
  readonly use: string;
}

interface JwksResponse {
  readonly keys: readonly JwksKey[];
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeJwtHeader(token: string): { kid: string; alg: string } {
  const [headerB64] = token.split(".");
  if (!headerB64) throw new Error("Invalid token format");
  const headerJson = new TextDecoder().decode(base64UrlDecode(headerB64));
  return JSON.parse(headerJson);
}

function decodeJwtPayload(token: string): GoogleTokenPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const payloadJson = new TextDecoder().decode(base64UrlDecode(parts[1]!));
  return JSON.parse(payloadJson);
}

async function fetchGooglePublicKey(kid: string): Promise<CryptoKey> {
  const res = await fetch(GOOGLE_JWKS_URL);
  if (!res.ok) throw new Error("Failed to fetch Google JWKS");

  const jwks: JwksResponse = await res.json();
  const key = jwks.keys.find((k) => k.kid === kid);
  if (!key) throw new Error("Key not found in Google JWKS");

  return crypto.subtle.importKey(
    "jwk",
    { kty: key.kty, n: key.n, e: key.e, alg: key.alg, ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

export async function verifyGoogleToken(
  idToken: string,
  clientId: string
): Promise<GoogleTokenPayload> {
  const header = decodeJwtHeader(idToken);
  if (header.alg !== "RS256") throw new Error("Unsupported algorithm");

  const publicKey = await fetchGooglePublicKey(header.kid);

  const parts = idToken.split(".");
  const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = base64UrlDecode(parts[2]!);

  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    signature.buffer as ArrayBuffer,
    signedContent
  );
  if (!valid) throw new Error("Invalid token signature");

  const payload = decodeJwtPayload(idToken);

  if (!GOOGLE_ISSUERS.includes(payload.iss)) {
    throw new Error("Invalid token issuer");
  }
  if (payload.aud !== clientId) {
    throw new Error("Invalid token audience");
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return payload;
}
