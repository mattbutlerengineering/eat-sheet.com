import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { Google, generateState, generateCodeVerifier } from "arctic";
import type { AppEnv } from "../../types";
import { ok } from "../../response";
import { authMiddleware } from "./middleware";
import { findOrCreateUser, buildJwtPayload, signJwt } from "./service";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export const auth = new Hono<AppEnv>();

auth.get("/google", (c) => {
  const google = new Google(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    c.env.GOOGLE_REDIRECT_URI,
  );

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  setCookie(c, "google_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  setCookie(c, "google_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  return c.redirect(url.toString());
});

auth.get("/callback", async (c) => {
  const storedState = getCookie(c, "google_oauth_state");
  const storedVerifier = getCookie(c, "google_code_verifier");
  const { code, state } = c.req.query();

  if (!storedState || !storedVerifier || !code || !state) {
    return c.json({ ok: false as const, error: "Invalid OAuth state" }, 400);
  }

  if (state !== storedState) {
    return c.json({ ok: false as const, error: "State mismatch" }, 400);
  }

  const google = new Google(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    c.env.GOOGLE_REDIRECT_URI,
  );

  const tokens = await google.validateAuthorizationCode(code, storedVerifier);
  const accessToken = tokens.accessToken();

  const profileRes = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!profileRes.ok) {
    return c.json(
      { ok: false as const, error: "Failed to fetch Google profile" },
      500,
    );
  }

  const profile = (await profileRes.json()) as {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };

  const user = await findOrCreateUser(c.env.DB, {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture ?? null,
  });

  const payload = await buildJwtPayload(c.env.DB, user);
  const token = await signJwt(payload, c.env.JWT_SECRET);

  setCookie(c, "token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  const redirectTo = payload.tenantId ? "/" : "/onboarding";
  return c.redirect(redirectTo);
});

auth.get("/me", authMiddleware, (c) => {
  return c.json(ok(c.var.user));
});
