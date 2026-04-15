import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import type { AppEnv } from "@server/types";
import { ok, error } from "@server/response";
import { authMiddleware } from "@server/features/auth/middleware";
import { onboardingCompleteSchema } from "@shared/schemas/venue";
import { handleLogoUpload, completeOnboarding } from "./service";

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml"]);

export const onboarding = new Hono<AppEnv>();

onboarding.use("/*", authMiddleware);

// ---------------------------------------------------------------------------
// POST /api/onboarding/logo
// ---------------------------------------------------------------------------

onboarding.post("/logo", async (c) => {
  const user = c.var.user;
  const body = await c.req.parseBody();
  const file = body["file"];

  if (!(file instanceof File)) {
    return c.json(error("No file provided"), 400);
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return c.json(error("Invalid file type. Allowed: PNG, JPEG, SVG"), 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return c.json(error("File too large. Maximum size is 2 MB"), 400);
  }

  const result = await handleLogoUpload(c.env.LOGOS, file, user.userId);

  return c.json(ok(result));
});

// ---------------------------------------------------------------------------
// POST /api/onboarding/complete
// ---------------------------------------------------------------------------

onboarding.post("/complete", async (c) => {
  const user = c.var.user;
  const body = await c.req.json<unknown>();
  const parsed = onboardingCompleteSchema.safeParse(body);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return c.json(error(firstIssue?.message ?? "Invalid request"), 400);
  }

  const token = await completeOnboarding(
    c.env.DB,
    user.userId,
    user.email,
    parsed.data,
    c.env.JWT_SECRET,
  );

  setCookie(c, "token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });

  return c.json(ok({ token }));
});

// ---------------------------------------------------------------------------
// GET /api/onboarding/logos/:key{.+}
// ---------------------------------------------------------------------------

onboarding.get("/logos/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const object = await c.env.LOGOS.get(`logos/${key}`);

  if (!object) {
    return c.json(error("Logo not found"), 404);
  }

  const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});
