import { Hono } from "hono";
import type { Env, JwtPayload } from "../types";
import { authMiddleware } from "../middleware/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

const photos = new Hono<{
  Bindings: Env;
  Variables: { jwtPayload: JwtPayload };
}>();

// Upload — auth required
photos.post("/upload", authMiddleware, async (c) => {
  const payload = c.get("jwtPayload");
  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp" }, 400);
  }

  const ext = EXT_MAP[file.type] ?? "jpeg";
  const key = `${payload.family_id}/${crypto.randomUUID()}.${ext}`;

  await c.env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return c.json({ data: { photoUrl: `/api/photos/${key}` } }, 201);
});

// Serve — no auth (photos are semi-public, keys are unguessable UUIDs)
photos.get("/:familyId/:filename", async (c) => {
  const key = `${c.req.param("familyId")}/${c.req.param("filename")}`;
  const object = await c.env.PHOTOS.get(key);

  if (!object) {
    return c.json({ error: "Photo not found" }, 404);
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export { photos as photoRoutes };
