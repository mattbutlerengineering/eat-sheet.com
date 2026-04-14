# Eat Sheet Onboarding Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Google OAuth authentication and a 5-step onboarding wizard that creates a fully-themed venue, using Rialto design system on Cloudflare Workers.

**Architecture:** Hono API serves auth + onboarding endpoints, React 19 SPA handles the wizard UI. Feature-first module pattern (Route → Service → Repository). Per-venue theming via `--rialto-*` CSS custom property overrides. Zod schemas shared between client and server validation.

**Tech Stack:** Hono, React 19, React Router 7, Rialto (`@mattbutlerengineering/rialto`), Cloudflare D1 + R2 + Workers, Zod, Vitest, Arctic (Google OAuth), Framer Motion

**Spec:** `docs/superpowers/specs/2026-04-13-eat-sheet-onboarding-design.md`

---

## Dependency Graph

```
Task 1: Scaffolding
├── Task 2: D1 Schema + Migration
├── Task 3: Shared Layer (types, schemas, errors)
│   └── Task 4: Server Entry + Middleware
│       ├── Task 5: Auth Feature (OAuth + JWT)
│       ├── Task 6: Venues Feature (repository, service, routes)
│       └── Task 7: Color Extraction
│           └── Task 8: Onboarding Routes (logo upload, complete)
└── Task 9: React App Shell
    ├── Task 10: Login Page
    └── Task 11: Wizard Container + useOnboarding Hook
        ├── Task 12: Steps 1–2 (Venue Info + Location)
        ├── Task 13: Steps 3–4 (Logo Upload + Brand Colors)
        └── Task 14: Step 5 (Welcome + FlipDot) + Dashboard
```

**Critical path:** 1 → 3 → 4 → 5/6/7 → 8 → 13/14

**Parallel opportunities:** Tasks 2+3 | Tasks 5+6+7 | Tasks 10+11 | Tasks 12+13+14

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `.npmrc`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `wrangler.toml`
- Create: `index.html`
- Create: `src/client/main.tsx` (placeholder)
- Create: `src/server/index.ts` (placeholder)

- [ ] **Step 1: Create .npmrc for Rialto GitHub Packages access**

```
@mattbutlerengineering:registry=https://npm.pkg.github.com
```

Requires a `GITHUB_TOKEN` env var or a PAT with `read:packages` scope. Add `//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}` line if not using `npm login --registry`.

- [ ] **Step 2: Create package.json**

```json
{
  "name": "eat-sheet",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "dev:api": "wrangler dev",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "wrangler d1 execute eat-sheet-db --local --file=src/server/db/migrations/001_onboarding.sql",
    "db:seed": "wrangler d1 execute eat-sheet-db --local --file=src/server/db/seed.sql",
    "deploy": "npx wrangler deploy"
  },
  "dependencies": {
    "@mattbutlerengineering/rialto": "^0.1.0",
    "arctic": "^3.5.0",
    "framer-motion": "^12.0.0",
    "hono": "^4.7.0",
    "lucide-react": ">=0.400.0",
    "nanoid": "^5.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250410.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "typescript": "^5.8.0",
    "vite": "^6.3.0",
    "vitest": "^3.1.0",
    "wrangler": "^4.10.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "paths": {
      "@server/*": ["./src/server/*"],
      "@client/*": ["./src/client/*"],
      "@shared/*": ["./src/shared/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@server": resolve(__dirname, "src/server"),
      "@client": resolve(__dirname, "src/client"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 5: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@server": resolve(__dirname, "src/server"),
      "@client": resolve(__dirname, "src/client"),
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
});
```

- [ ] **Step 6: Create wrangler.toml**

```toml
name = "eat-sheet"
main = "src/server/index.ts"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "development"

[[d1_databases]]
binding = "DB"
database_name = "eat-sheet-db"
database_id = "local"

[[r2_buckets]]
binding = "LOGOS"
bucket_name = "eat-sheet-logos"
```

Note: `database_id = "local"` is a placeholder for local dev. Replace with the actual D1 database ID for production. Create the D1 database with `wrangler d1 create eat-sheet-db` and update the ID.

- [ ] **Step 7: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>eat sheet</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/client/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create placeholder entry files**

`src/server/index.ts`:
```ts
import { Hono } from "hono";

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));

export default app;
export type AppType = typeof app;
```

`src/client/main.tsx`:
```tsx
import { createRoot } from "react-dom/client";

function App() {
  return <div>eat sheet</div>;
}

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 9: Install dependencies and verify build**

```bash
npm install
npm run build
```

Expected: TypeScript compiles without errors, Vite produces `dist/` output.

- [ ] **Step 10: Commit**

```bash
git add package.json .npmrc tsconfig.json vite.config.ts vitest.config.ts wrangler.toml index.html src/server/index.ts src/client/main.tsx .superpowers/
git commit -m "chore: scaffold project with Hono + React 19 + Rialto + D1/R2"
```

Also add `.superpowers/` to `.gitignore`.

---

## Task 2: D1 Database Schema + Migration

**Files:**
- Create: `src/server/db/schema.sql`
- Create: `src/server/db/migrations/001_onboarding.sql`
- Create: `src/server/db/seed.sql`

- [ ] **Step 1: Create schema.sql (full DDL reference)**

```sql
-- eat-sheet D1 schema
-- This file is the source of truth. Migrations must match.

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('fine_dining', 'casual', 'bar', 'cafe')),
    cuisines TEXT NOT NULL DEFAULT '[]',
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT DEFAULT 'US',
    timezone TEXT NOT NULL,
    phone TEXT,
    website TEXT,
    logo_url TEXT,
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE venue_themes (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL UNIQUE REFERENCES tenants(id),
    accent TEXT NOT NULL,
    accent_hover TEXT NOT NULL,
    surface TEXT,
    surface_elevated TEXT,
    text_primary TEXT,
    source TEXT NOT NULL CHECK (source IN ('extracted', 'manual')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE roles (
    id TEXT PRIMARY KEY,
    tenant_id TEXT REFERENCES tenants(id),
    name TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE tenant_members (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    user_id TEXT NOT NULL REFERENCES users(id),
    role_id TEXT NOT NULL REFERENCES roles(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, user_id)
);
```

- [ ] **Step 2: Create migration 001_onboarding.sql**

Same DDL as schema.sql. Copy the contents exactly.

- [ ] **Step 3: Create seed.sql**

```sql
-- System roles (tenant_id = NULL, is_system = 1)
INSERT OR IGNORE INTO roles (id, tenant_id, name, permissions, is_system) VALUES
    ('role_owner',   NULL, 'Owner',   '["*"]', 1),
    ('role_manager', NULL, 'Manager', '["venues:read","venues:write","floor_plans:read","floor_plans:write","reservations:read","reservations:write","waitlist:read","waitlist:write","guests:read","guests:write","service_periods:read","service_periods:write","assignments:read","assignments:write","dashboard:read"]', 1),
    ('role_host',    NULL, 'Host',    '["venues:read","floor_plans:read","reservations:read","reservations:write","waitlist:read","waitlist:write","guests:read","guests:write","service_periods:read","assignments:read","dashboard:read"]', 1),
    ('role_server',  NULL, 'Server',  '["venues:read","floor_plans:read","reservations:read","waitlist:read","guests:read","service_periods:read","assignments:read","dashboard:read"]', 1),
    ('role_viewer',  NULL, 'Viewer',  '["venues:read","floor_plans:read","reservations:read","waitlist:read","guests:read","dashboard:read"]', 1);
```

- [ ] **Step 4: Run migration locally**

```bash
wrangler d1 execute eat-sheet-db --local --file=src/server/db/migrations/001_onboarding.sql
wrangler d1 execute eat-sheet-db --local --file=src/server/db/seed.sql
```

Expected: Both succeed without errors.

- [ ] **Step 5: Commit**

```bash
git add src/server/db/
git commit -m "feat: add D1 schema with users, tenants, themes, roles, members"
```

---

## Task 3: Shared Layer (Types, Schemas, Errors, Response Helpers)

**Files:**
- Create: `src/shared/types/venue.ts`
- Create: `src/shared/types/user.ts`
- Create: `src/shared/types/index.ts`
- Create: `src/shared/schemas/venue.ts`
- Create: `src/shared/schemas/index.ts`
- Create: `src/server/errors.ts`
- Create: `src/server/response.ts`
- Test: `src/server/__tests__/errors.test.ts`
- Test: `src/shared/__tests__/schemas.test.ts`

- [ ] **Step 1: Create shared types**

`src/shared/types/user.ts`:
```ts
export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly avatarUrl: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AuthUser {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly tenantId: string | null;
  readonly roleId: string | null;
  readonly permissions: readonly string[];
}
```

`src/shared/types/venue.ts`:
```ts
export type VenueType = "fine_dining" | "casual" | "bar" | "cafe";

export const VENUE_TYPES: readonly VenueType[] = [
  "fine_dining",
  "casual",
  "bar",
  "cafe",
] as const;

export const CUISINE_OPTIONS = [
  "Italian",
  "French",
  "Japanese",
  "Mexican",
  "American",
  "Chinese",
  "Indian",
  "Thai",
  "Mediterranean",
  "Seafood",
  "Steakhouse",
  "Korean",
  "Vietnamese",
  "Spanish",
  "Greek",
  "Brazilian",
  "Ethiopian",
  "Fusion",
] as const;

export type CuisineType = (typeof CUISINE_OPTIONS)[number];

export interface Venue {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly type: VenueType;
  readonly cuisines: readonly string[];
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly zip: string | null;
  readonly country: string;
  readonly timezone: string;
  readonly phone: string | null;
  readonly website: string | null;
  readonly logoUrl: string | null;
  readonly onboardingCompleted: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VenueTheme {
  readonly id: string;
  readonly tenantId: string;
  readonly accent: string;
  readonly accentHover: string;
  readonly surface: string | null;
  readonly surfaceElevated: string | null;
  readonly textPrimary: string | null;
  readonly source: "extracted" | "manual";
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VenueWithTheme {
  readonly venue: Venue;
  readonly theme: VenueTheme;
}
```

`src/shared/types/index.ts`:
```ts
export * from "./user";
export * from "./venue";
```

- [ ] **Step 2: Create Zod validation schemas**

`src/shared/schemas/venue.ts`:
```ts
import { z } from "zod";
import { VENUE_TYPES, CUISINE_OPTIONS } from "../types/venue";

export const venueInfoSchema = z.object({
  name: z.string().min(1, "Venue name is required").max(100),
  type: z.enum(VENUE_TYPES),
  cuisines: z.array(z.string()).min(1, "Select at least one cuisine"),
});

export type VenueInfoInput = z.infer<typeof venueInfoSchema>;

export const venueLocationSchema = z.object({
  addressLine1: z.string().max(200).optional().default(""),
  addressLine2: z.string().max(200).optional().default(""),
  city: z.string().max(100).optional().default(""),
  state: z.string().max(100).optional().default(""),
  zip: z.string().max(20).optional().default(""),
  country: z.string().max(2).default("US"),
  timezone: z.string().min(1, "Timezone is required"),
  phone: z.string().max(20).optional().default(""),
  website: z.string().url().or(z.literal("")).optional().default(""),
});

export type VenueLocationInput = z.infer<typeof venueLocationSchema>;

export const venueBrandSchema = z.object({
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  accentHover: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  surface: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .default(null),
  surfaceElevated: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .default(null),
  textPrimary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .default(null),
  source: z.enum(["extracted", "manual"]),
});

export type VenueBrandInput = z.infer<typeof venueBrandSchema>;

export const onboardingCompleteSchema = z.object({
  venueInfo: venueInfoSchema,
  location: venueLocationSchema,
  brand: venueBrandSchema,
  logoUrl: z.string().nullable().default(null),
});

export type OnboardingCompleteInput = z.infer<typeof onboardingCompleteSchema>;
```

`src/shared/schemas/index.ts`:
```ts
export * from "./venue";
```

- [ ] **Step 3: Write failing tests for schemas**

`src/shared/__tests__/schemas.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  venueInfoSchema,
  venueLocationSchema,
  venueBrandSchema,
} from "../schemas/venue";

describe("venueInfoSchema", () => {
  it("accepts valid venue info", () => {
    const result = venueInfoSchema.safeParse({
      name: "Verde Kitchen",
      type: "casual",
      cuisines: ["Italian", "Mediterranean"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = venueInfoSchema.safeParse({
      name: "",
      type: "casual",
      cuisines: ["Italian"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty cuisines", () => {
    const result = venueInfoSchema.safeParse({
      name: "Test",
      type: "casual",
      cuisines: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid venue type", () => {
    const result = venueInfoSchema.safeParse({
      name: "Test",
      type: "nightclub",
      cuisines: ["Italian"],
    });
    expect(result.success).toBe(false);
  });
});

describe("venueLocationSchema", () => {
  it("accepts valid location with timezone", () => {
    const result = venueLocationSchema.safeParse({
      timezone: "America/New_York",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing timezone", () => {
    const result = venueLocationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid website URL", () => {
    const result = venueLocationSchema.safeParse({
      timezone: "America/New_York",
      website: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty website", () => {
    const result = venueLocationSchema.safeParse({
      timezone: "America/New_York",
      website: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("venueBrandSchema", () => {
  it("accepts valid hex colors", () => {
    const result = venueBrandSchema.safeParse({
      accent: "#c49a2a",
      accentHover: "#a07d1f",
      source: "extracted",
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-hex accent", () => {
    const result = venueBrandSchema.safeParse({
      accent: "red",
      accentHover: "#a07d1f",
      source: "extracted",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: Run schema tests**

```bash
npx vitest run src/shared/__tests__/schemas.test.ts
```

Expected: All pass.

- [ ] **Step 5: Create domain error classes**

`src/server/errors.ts`:
```ts
export class DomainError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 500,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string) {
    super(message, 403);
  }
}
```

- [ ] **Step 6: Create response helpers**

`src/server/response.ts`:
```ts
export function ok<T>(data: T) {
  return { ok: true as const, data };
}

export function error(message: string) {
  return { ok: false as const, error: message };
}

export function paginated<T>(
  data: T[],
  meta: { total: number; page: number; limit: number },
) {
  return { ok: true as const, data, meta };
}
```

- [ ] **Step 7: Write failing tests for errors**

`src/server/__tests__/errors.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  DomainError,
  NotFoundError,
  ValidationError,
  ConflictError,
  ForbiddenError,
} from "../errors";

describe("DomainError hierarchy", () => {
  it("NotFoundError has status 404", () => {
    const err = new NotFoundError("not found");
    expect(err.statusCode).toBe(404);
    expect(err).toBeInstanceOf(DomainError);
    expect(err).toBeInstanceOf(NotFoundError);
  });

  it("ValidationError has status 400", () => {
    const err = new ValidationError("invalid");
    expect(err.statusCode).toBe(400);
    expect(err).toBeInstanceOf(DomainError);
  });

  it("ConflictError has status 409", () => {
    const err = new ConflictError("duplicate");
    expect(err.statusCode).toBe(409);
    expect(err).toBeInstanceOf(DomainError);
  });

  it("ForbiddenError has status 403", () => {
    const err = new ForbiddenError("forbidden");
    expect(err.statusCode).toBe(403);
    expect(err).toBeInstanceOf(DomainError);
  });
});
```

- [ ] **Step 8: Run error tests**

```bash
npx vitest run src/server/__tests__/errors.test.ts
```

Expected: All pass.

- [ ] **Step 9: Commit**

```bash
git add src/shared/ src/server/errors.ts src/server/response.ts src/server/__tests__/errors.test.ts src/shared/__tests__/schemas.test.ts
git commit -m "feat: add shared types, Zod schemas, domain errors, and response helpers"
```

---

## Task 4: Server Entry + Middleware

**Files:**
- Modify: `src/server/index.ts`
- Create: `src/server/types.ts`
- Create: `src/server/features/auth/middleware.ts`
- Create: `src/server/features/auth/types.ts`
- Test: `src/server/__tests__/middleware.test.ts`

- [ ] **Step 1: Create server environment types**

`src/server/types.ts`:
```ts
export interface Bindings {
  DB: D1Database;
  LOGOS: R2Bucket;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}

export interface Variables {
  user: {
    userId: string;
    email: string;
    name: string;
    tenantId: string | null;
    roleId: string | null;
    permissions: readonly string[];
  };
}

export type AppEnv = { Bindings: Bindings; Variables: Variables };
```

- [ ] **Step 2: Create auth types**

`src/server/features/auth/types.ts`:
```ts
export interface JwtPayload {
  readonly sub: string;
  readonly email: string;
  readonly name: string;
  readonly tenantId: string | null;
  readonly roleId: string | null;
  readonly permissions: readonly string[];
  readonly exp: number;
}
```

- [ ] **Step 3: Create auth middleware**

`src/server/features/auth/middleware.ts`:
```ts
import { createMiddleware } from "hono/factory";
import { verify } from "hono/jwt";
import type { AppEnv } from "../../types";
import type { JwtPayload } from "./types";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const cookieToken = getCookie(c, "token");

  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }

  try {
    const payload = (await verify(token, c.env.JWT_SECRET)) as JwtPayload;
    c.set("user", {
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      permissions: payload.permissions,
    });
    await next();
  } catch {
    return c.json({ ok: false, error: "Invalid token" }, 401);
  }
});

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  const cookieToken = getCookie(c, "token");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (token) {
    try {
      const payload = (await verify(token, c.env.JWT_SECRET)) as JwtPayload;
      c.set("user", {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        tenantId: payload.tenantId,
        roleId: payload.roleId,
        permissions: payload.permissions,
      });
    } catch {
      // Invalid token — continue without user
    }
  }
  await next();
});

function getCookie(c: { req: { header: (name: string) => string | undefined } }, name: string): string | undefined {
  const cookies = c.req.header("Cookie");
  if (!cookies) return undefined;
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
}
```

- [ ] **Step 4: Update server entry with global error handler**

`src/server/index.ts`:
```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { AppEnv } from "./types";
import { DomainError } from "./errors";
import { error } from "./response";

const app = new Hono<AppEnv>();

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "https://eat-sheet.com"],
    credentials: true,
  }),
);

app.get("/api/health", (c) => c.json({ ok: true }));

// Mount feature routes here (Tasks 5, 6, 8)

app.onError((err, c) => {
  if (err instanceof DomainError) {
    return c.json(error(err.message), err.statusCode as 400);
  }
  console.error("Unhandled error:", err);
  return c.json(error("Internal server error"), 500);
});

export default app;
export type AppType = typeof app;
```

- [ ] **Step 5: Write failing middleware test**

`src/server/__tests__/middleware.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { authMiddleware } from "../features/auth/middleware";
import type { AppEnv } from "../types";

const JWT_SECRET = "test-secret";

function createTestApp() {
  const app = new Hono<AppEnv>();
  app.use("/protected/*", authMiddleware);
  app.get("/protected/test", (c) => {
    const user = c.get("user");
    return c.json({ ok: true, data: user });
  });
  return app;
}

describe("authMiddleware", () => {
  it("rejects requests without token", async () => {
    const app = createTestApp();
    const res = await app.request("/protected/test", {}, { JWT_SECRET } as any);
    expect(res.status).toBe(401);
  });

  it("accepts valid Bearer token", async () => {
    const app = createTestApp();
    const token = await sign(
      {
        sub: "user-1",
        email: "test@test.com",
        name: "Test",
        tenantId: null,
        roleId: null,
        permissions: [],
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      JWT_SECRET,
    );
    const res = await app.request(
      "/protected/test",
      { headers: { Authorization: `Bearer ${token}` } },
      { JWT_SECRET } as any,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.userId).toBe("user-1");
  });

  it("rejects invalid token", async () => {
    const app = createTestApp();
    const res = await app.request(
      "/protected/test",
      { headers: { Authorization: "Bearer invalid" } },
      { JWT_SECRET } as any,
    );
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 6: Run middleware tests**

```bash
npx vitest run src/server/__tests__/middleware.test.ts
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/types.ts src/server/index.ts src/server/features/auth/ src/server/__tests__/middleware.test.ts
git commit -m "feat: add server entry with CORS, error handler, and JWT auth middleware"
```

---

## Task 5: Auth Feature (Google OAuth + JWT)

**Files:**
- Create: `src/server/features/auth/routes.ts`
- Create: `src/server/features/auth/service.ts`
- Create: `src/server/features/auth/repository.ts`
- Test: `src/server/features/auth/__tests__/service.test.ts`

- [ ] **Step 1: Create auth repository**

`src/server/features/auth/repository.ts`:
```ts
import { nanoid } from "nanoid";

interface UserRow {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
}

export async function findUserByEmail(
  db: D1Database,
  email: string,
): Promise<UserRow | null> {
  return db
    .prepare("SELECT id, email, name, avatar_url FROM users WHERE email = ?")
    .bind(email)
    .first<UserRow>();
}

export async function createUser(
  db: D1Database,
  user: { email: string; name: string; avatarUrl: string | null },
): Promise<UserRow> {
  const id = nanoid();
  await db
    .prepare(
      "INSERT INTO users (id, email, name, avatar_url) VALUES (?, ?, ?, ?)",
    )
    .bind(id, user.email, user.name, user.avatarUrl)
    .run();
  return { id, email: user.email, name: user.name, avatar_url: user.avatarUrl };
}

interface TenantMemberRow {
  tenant_id: string;
  role_id: string;
  permissions: string;
}

export async function findUserTenants(
  db: D1Database,
  userId: string,
): Promise<readonly TenantMemberRow[]> {
  const { results } = await db
    .prepare(
      `SELECT tm.tenant_id, tm.role_id, r.permissions
       FROM tenant_members tm
       JOIN roles r ON r.id = tm.role_id
       WHERE tm.user_id = ?`,
    )
    .bind(userId)
    .all<TenantMemberRow>();
  return results;
}
```

- [ ] **Step 2: Create auth service**

`src/server/features/auth/service.ts`:
```ts
import { sign } from "hono/jwt";
import { findUserByEmail, createUser, findUserTenants } from "./repository";
import type { JwtPayload } from "./types";

interface GoogleProfile {
  email: string;
  name: string;
  picture: string | null;
}

export async function findOrCreateUser(
  db: D1Database,
  profile: GoogleProfile,
) {
  const existing = await findUserByEmail(db, profile.email);
  if (existing) return existing;
  return createUser(db, {
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture,
  });
}

export async function buildJwtPayload(
  db: D1Database,
  user: { id: string; email: string; name: string },
): Promise<JwtPayload> {
  const tenants = await findUserTenants(db, user.id);
  const first = tenants[0];

  return {
    sub: user.id,
    email: user.email,
    name: user.name,
    tenantId: first?.tenant_id ?? null,
    roleId: first?.role_id ?? null,
    permissions: first ? JSON.parse(first.permissions) : [],
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };
}

export async function signJwt(
  payload: JwtPayload,
  secret: string,
): Promise<string> {
  return sign(payload, secret);
}
```

- [ ] **Step 3: Create auth routes**

`src/server/features/auth/routes.ts`:
```ts
import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { Google } from "arctic";
import type { AppEnv } from "../../types";
import { authMiddleware } from "./middleware";
import { findOrCreateUser, buildJwtPayload, signJwt } from "./service";
import { ok, error } from "../../response";

const auth = new Hono<AppEnv>();

auth.get("/google", async (c) => {
  const google = new Google(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    c.env.GOOGLE_REDIRECT_URI,
  );

  const state = crypto.randomUUID();
  const codeVerifier = crypto.randomUUID();
  const url = google.createAuthorizationURL(state, codeVerifier, [
    "openid",
    "email",
    "profile",
  ]);

  setCookie(c, "oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });
  setCookie(c, "oauth_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  return c.redirect(url.toString());
});

auth.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");
  const storedVerifier = getCookie(c, "oauth_verifier");

  if (!code || !state || state !== storedState || !storedVerifier) {
    return c.json(error("Invalid OAuth callback"), 400);
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
  const profile = (await profileRes.json()) as {
    email: string;
    name: string;
    picture: string;
  };

  const user = await findOrCreateUser(c.env.DB, {
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  });

  const payload = await buildJwtPayload(c.env.DB, user);
  const jwt = await signJwt(payload, c.env.JWT_SECRET);

  setCookie(c, "token", jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  // Clear OAuth cookies
  setCookie(c, "oauth_state", "", { maxAge: 0, path: "/" });
  setCookie(c, "oauth_verifier", "", { maxAge: 0, path: "/" });

  const redirectTo = payload.tenantId ? "/" : "/onboarding";
  return c.redirect(redirectTo);
});

auth.get("/me", authMiddleware, (c) => {
  const user = c.get("user");
  return c.json(ok(user));
});

export { auth };
```

- [ ] **Step 4: Mount auth routes in server index**

Add to `src/server/index.ts` after the health endpoint:

```ts
import { auth } from "./features/auth/routes";

// ... after health endpoint
app.route("/api/auth", auth);
```

- [ ] **Step 5: Write failing auth service tests**

`src/server/features/auth/__tests__/service.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { findOrCreateUser, buildJwtPayload } from "../service";

function mockDb(responses: Record<string, any>) {
  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn(() => ({
        first: vi.fn(async () => {
          if (sql.includes("SELECT") && sql.includes("users")) {
            return responses.findUser ?? null;
          }
          return null;
        }),
        run: vi.fn(async () => ({ success: true })),
        all: vi.fn(async () => ({
          results: responses.tenants ?? [],
        })),
      })),
    })),
  } as unknown as D1Database;
}

describe("findOrCreateUser", () => {
  it("returns existing user if found", async () => {
    const db = mockDb({
      findUser: { id: "u1", email: "a@b.com", name: "A", avatar_url: null },
    });
    const user = await findOrCreateUser(db, {
      email: "a@b.com",
      name: "A",
      picture: null,
    });
    expect(user.id).toBe("u1");
  });

  it("creates new user if not found", async () => {
    const db = mockDb({ findUser: null });
    const user = await findOrCreateUser(db, {
      email: "new@b.com",
      name: "New",
      picture: null,
    });
    expect(user.email).toBe("new@b.com");
    expect(user.id).toBeDefined();
  });
});

describe("buildJwtPayload", () => {
  it("returns null tenantId when user has no tenants", async () => {
    const db = mockDb({ findUser: null, tenants: [] });
    const payload = await buildJwtPayload(db, {
      id: "u1",
      email: "a@b.com",
      name: "A",
    });
    expect(payload.tenantId).toBeNull();
    expect(payload.permissions).toEqual([]);
  });

  it("includes first tenant when user has memberships", async () => {
    const db = mockDb({
      tenants: [
        { tenant_id: "t1", role_id: "r1", permissions: '["*"]' },
      ],
    });
    const payload = await buildJwtPayload(db, {
      id: "u1",
      email: "a@b.com",
      name: "A",
    });
    expect(payload.tenantId).toBe("t1");
    expect(payload.permissions).toEqual(["*"]);
  });
});
```

- [ ] **Step 6: Run auth service tests**

```bash
npx vitest run src/server/features/auth/__tests__/service.test.ts
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add src/server/features/auth/
git commit -m "feat: add Google OAuth auth routes with JWT issuance"
```

---

## Task 6: Venues Feature (Repository + Service + Routes)

**Files:**
- Create: `src/server/features/venues/repository.ts`
- Create: `src/server/features/venues/service.ts`
- Create: `src/server/features/venues/routes.ts`
- Create: `src/server/features/venues/types.ts`
- Test: `src/server/features/venues/__tests__/service.test.ts`

- [ ] **Step 1: Create venue types**

`src/server/features/venues/types.ts`:
```ts
export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  type: string;
  cuisines: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string;
  timezone: string;
  phone: string | null;
  website: string | null;
  logo_url: string | null;
  onboarding_completed: number;
  created_at: string;
  updated_at: string;
}

export interface VenueThemeRow {
  id: string;
  tenant_id: string;
  accent: string;
  accent_hover: string;
  surface: string | null;
  surface_elevated: string | null;
  text_primary: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Create venue repository**

`src/server/features/venues/repository.ts`:
```ts
import { nanoid } from "nanoid";
import type { TenantRow, VenueThemeRow } from "./types";

export async function findTenantBySlug(
  db: D1Database,
  slug: string,
): Promise<TenantRow | null> {
  return db
    .prepare("SELECT * FROM tenants WHERE slug = ?")
    .bind(slug)
    .first<TenantRow>();
}

export async function findTenantById(
  db: D1Database,
  id: string,
): Promise<TenantRow | null> {
  return db
    .prepare("SELECT * FROM tenants WHERE id = ?")
    .bind(id)
    .first<TenantRow>();
}

export async function findVenueTheme(
  db: D1Database,
  tenantId: string,
): Promise<VenueThemeRow | null> {
  return db
    .prepare("SELECT * FROM venue_themes WHERE tenant_id = ?")
    .bind(tenantId)
    .first<VenueThemeRow>();
}

export interface CreateVenueBatch {
  tenant: {
    id: string;
    name: string;
    slug: string;
    type: string;
    cuisines: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    timezone: string;
    phone: string;
    website: string;
    logoUrl: string | null;
  };
  theme: {
    accent: string;
    accentHover: string;
    surface: string | null;
    surfaceElevated: string | null;
    textPrimary: string | null;
    source: string;
  };
  userId: string;
  ownerRoleId: string;
}

export async function createVenueWithTheme(
  db: D1Database,
  data: CreateVenueBatch,
): Promise<void> {
  const tenantId = data.tenant.id;
  const themeId = nanoid();
  const memberId = nanoid();

  await db.batch([
    db
      .prepare(
        `INSERT INTO tenants (id, name, slug, type, cuisines, address_line1, address_line2, city, state, zip, country, timezone, phone, website, logo_url, onboarding_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind(
        tenantId,
        data.tenant.name,
        data.tenant.slug,
        data.tenant.type,
        data.tenant.cuisines,
        data.tenant.addressLine1,
        data.tenant.addressLine2,
        data.tenant.city,
        data.tenant.state,
        data.tenant.zip,
        data.tenant.country,
        data.tenant.timezone,
        data.tenant.phone,
        data.tenant.website,
        data.tenant.logoUrl,
      ),
    db
      .prepare(
        `INSERT INTO venue_themes (id, tenant_id, accent, accent_hover, surface, surface_elevated, text_primary, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        themeId,
        tenantId,
        data.theme.accent,
        data.theme.accentHover,
        data.theme.surface,
        data.theme.surfaceElevated,
        data.theme.textPrimary,
        data.theme.source,
      ),
    db
      .prepare(
        `INSERT INTO tenant_members (id, tenant_id, user_id, role_id)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(memberId, tenantId, data.userId, data.ownerRoleId),
  ]);
}

export async function updateTenant(
  db: D1Database,
  id: string,
  fields: Partial<TenantRow>,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  values.push(id);

  await db
    .prepare(`UPDATE tenants SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function updateVenueTheme(
  db: D1Database,
  tenantId: string,
  fields: Partial<VenueThemeRow>,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  values.push(tenantId);

  await db
    .prepare(`UPDATE venue_themes SET ${sets.join(", ")} WHERE tenant_id = ?`)
    .bind(...values)
    .run();
}
```

- [ ] **Step 3: Create venue service**

`src/server/features/venues/service.ts`:
```ts
import { nanoid } from "nanoid";
import { findTenantBySlug } from "./repository";
import { ConflictError } from "../../errors";

export async function generateSlug(
  db: D1Database,
  name: string,
): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = base;
  let attempt = 0;

  while (attempt < 10) {
    const existing = await findTenantBySlug(db, slug);
    if (!existing) return slug;
    attempt++;
    slug = `${base}-${attempt + 1}`;
  }

  throw new ConflictError(`Could not generate unique slug for "${name}"`);
}
```

- [ ] **Step 4: Write failing service test**

`src/server/features/venues/__tests__/service.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { generateSlug } from "../service";

function mockDb(existingSlugs: string[]) {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn((slug: string) => ({
        first: vi.fn(async () =>
          existingSlugs.includes(slug) ? { slug } : null,
        ),
      })),
    })),
  } as unknown as D1Database;
}

describe("generateSlug", () => {
  it("converts name to kebab-case", async () => {
    const db = mockDb([]);
    const slug = await generateSlug(db, "Mario's Trattoria");
    expect(slug).toBe("mario-s-trattoria");
  });

  it("appends number when slug exists", async () => {
    const db = mockDb(["verde-kitchen"]);
    const slug = await generateSlug(db, "Verde Kitchen");
    expect(slug).toBe("verde-kitchen-2");
  });

  it("increments until unique", async () => {
    const db = mockDb(["test", "test-2", "test-3"]);
    const slug = await generateSlug(db, "Test");
    expect(slug).toBe("test-4");
  });
});
```

- [ ] **Step 5: Run venue service tests**

```bash
npx vitest run src/server/features/venues/__tests__/service.test.ts
```

Expected: All pass.

- [ ] **Step 6: Create venue routes**

`src/server/features/venues/routes.ts`:
```ts
import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { authMiddleware } from "../auth/middleware";
import {
  findTenantById,
  findVenueTheme,
  updateTenant,
  updateVenueTheme,
} from "./repository";
import { ok, error } from "../../response";
import { NotFoundError } from "../../errors";
import type { Venue, VenueTheme, VenueWithTheme } from "@shared/types";

const venues = new Hono<AppEnv>();

venues.use("/*", authMiddleware);

venues.get("/:tenantId/venue", async (c) => {
  const tenantId = c.req.param("tenantId");
  const tenant = await findTenantById(c.env.DB, tenantId);
  if (!tenant) throw new NotFoundError("Venue not found");

  const themeRow = await findVenueTheme(c.env.DB, tenantId);

  const venue: Venue = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    type: tenant.type as Venue["type"],
    cuisines: JSON.parse(tenant.cuisines),
    addressLine1: tenant.address_line1,
    addressLine2: tenant.address_line2,
    city: tenant.city,
    state: tenant.state,
    zip: tenant.zip,
    country: tenant.country,
    timezone: tenant.timezone,
    phone: tenant.phone,
    website: tenant.website,
    logoUrl: tenant.logo_url,
    onboardingCompleted: tenant.onboarding_completed === 1,
    createdAt: tenant.created_at,
    updatedAt: tenant.updated_at,
  };

  const theme: VenueTheme | null = themeRow
    ? {
        id: themeRow.id,
        tenantId: themeRow.tenant_id,
        accent: themeRow.accent,
        accentHover: themeRow.accent_hover,
        surface: themeRow.surface,
        surfaceElevated: themeRow.surface_elevated,
        textPrimary: themeRow.text_primary,
        source: themeRow.source as VenueTheme["source"],
        createdAt: themeRow.created_at,
        updatedAt: themeRow.updated_at,
      }
    : null;

  return c.json(ok({ venue, theme }));
});

venues.patch("/:tenantId/venue", async (c) => {
  const tenantId = c.req.param("tenantId");
  const body = await c.req.json();
  await updateTenant(c.env.DB, tenantId, body);
  return c.json(ok({ updated: true }));
});

venues.patch("/:tenantId/venue/theme", async (c) => {
  const tenantId = c.req.param("tenantId");
  const body = await c.req.json();
  await updateVenueTheme(c.env.DB, tenantId, body);
  return c.json(ok({ updated: true }));
});

export { venues };
```

- [ ] **Step 7: Mount venue routes**

Add to `src/server/index.ts`:

```ts
import { venues } from "./features/venues/routes";

app.route("/api/t", venues);
```

- [ ] **Step 8: Commit**

```bash
git add src/server/features/venues/
git commit -m "feat: add venues feature with repository, slug generation, and CRUD routes"
```

---

## Task 7: Color Extraction Service

**Files:**
- Create: `src/server/features/venues/color-extraction.ts`
- Test: `src/server/features/venues/__tests__/color-extraction.test.ts`

**Note:** This is the highest-risk task. Cloudflare Workers have no Canvas API. We use pure-JS PNG decoding (`upng-js`) and JPEG decoding (`jpeg-js`). Install both: `npm install upng-js jpeg-js`.

- [ ] **Step 1: Install image decoding dependencies**

```bash
npm install upng-js jpeg-js
npm install -D @types/jpeg-js
```

If `@types/jpeg-js` does not exist, skip it — we'll add a declaration file.

- [ ] **Step 2: Write failing color extraction test**

`src/server/features/venues/__tests__/color-extraction.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { extractDominantColors } from "../color-extraction";

// 1x1 red PNG (smallest valid PNG)
const RED_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
  0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00,
  0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

describe("extractDominantColors", () => {
  it("returns hex color strings for a PNG", async () => {
    const colors = await extractDominantColors(RED_PNG, "image/png");
    expect(colors.length).toBeGreaterThanOrEqual(1);
    expect(colors[0]).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns empty array for SVG", async () => {
    const svgBytes = new TextEncoder().encode("<svg></svg>");
    const colors = await extractDominantColors(svgBytes, "image/svg+xml");
    expect(colors).toEqual([]);
  });

  it("returns empty array for empty input", async () => {
    const colors = await extractDominantColors(new Uint8Array(0), "image/png");
    expect(colors).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run src/server/features/venues/__tests__/color-extraction.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 4: Implement color extraction**

`src/server/features/venues/color-extraction.ts`:
```ts
import UPNG from "upng-js";

/**
 * Extract dominant colors from image bytes.
 * Works on Cloudflare Workers (no Canvas API).
 * Supports PNG and JPEG. Returns empty array for SVG or invalid input.
 */
export async function extractDominantColors(
  bytes: Uint8Array,
  mimeType: string,
  maxColors = 5,
): Promise<readonly string[]> {
  if (bytes.length === 0) return [];
  if (mimeType === "image/svg+xml") return [];

  try {
    const pixels = await decodeToRGBA(bytes, mimeType);
    if (!pixels || pixels.length < 4) return [];

    const samples = samplePixels(pixels, 10);
    if (samples.length === 0) return [];

    const clusters = kMeans(samples, Math.min(maxColors, samples.length), 10);
    return clusters.map(rgbToHex);
  } catch {
    return [];
  }
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

async function decodeToRGBA(
  bytes: Uint8Array,
  mimeType: string,
): Promise<Uint8Array | null> {
  if (mimeType === "image/png") {
    const img = UPNG.decode(bytes.buffer);
    const rgba = UPNG.toRGBA8(img);
    return rgba[0] ? new Uint8Array(rgba[0]) : null;
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    const jpeg = await import("jpeg-js");
    const decoded = jpeg.decode(bytes, { useTArray: true });
    return decoded.data;
  }

  return null;
}

function samplePixels(rgba: Uint8Array, stride: number): RGB[] {
  const samples: RGB[] = [];
  for (let i = 0; i < rgba.length; i += 4 * stride) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const a = rgba[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;
    // Skip near-white and near-black
    if (r > 240 && g > 240 && b > 240) continue;
    if (r < 15 && g < 15 && b < 15) continue;

    samples.push({ r, g, b });
  }
  return samples;
}

function kMeans(points: RGB[], k: number, iterations: number): RGB[] {
  // Initialize centroids from first k unique-ish points
  const centroids: RGB[] = points.slice(0, k).map((p) => ({ ...p }));

  for (let iter = 0; iter < iterations; iter++) {
    const buckets: RGB[][] = centroids.map(() => []);

    for (const point of points) {
      let minDist = Infinity;
      let closest = 0;
      for (let j = 0; j < centroids.length; j++) {
        const d = colorDistance(point, centroids[j]);
        if (d < minDist) {
          minDist = d;
          closest = j;
        }
      }
      buckets[closest].push(point);
    }

    for (let j = 0; j < centroids.length; j++) {
      const bucket = buckets[j];
      if (bucket.length === 0) continue;
      centroids[j] = {
        r: Math.round(bucket.reduce((s, p) => s + p.r, 0) / bucket.length),
        g: Math.round(bucket.reduce((s, p) => s + p.g, 0) / bucket.length),
        b: Math.round(bucket.reduce((s, p) => s + p.b, 0) / bucket.length),
      };
    }
  }

  // Sort by cluster size (most dominant first)
  return centroids;
}

function colorDistance(a: RGB, b: RGB): number {
  return (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
}

function rgbToHex(c: RGB): string {
  return `#${[c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
```

- [ ] **Step 5: Run color extraction tests**

```bash
npx vitest run src/server/features/venues/__tests__/color-extraction.test.ts
```

Expected: All pass. If `upng-js` or `jpeg-js` fail to import, add type declarations or adjust the import strategy.

- [ ] **Step 6: Commit**

```bash
git add src/server/features/venues/color-extraction.ts src/server/features/venues/__tests__/color-extraction.test.ts
git commit -m "feat: add pure-JS color extraction for Workers (PNG + JPEG)"
```

---

## Task 8: Onboarding Routes (Logo Upload + Complete)

**Files:**
- Create: `src/server/features/onboarding/routes.ts`
- Create: `src/server/features/onboarding/service.ts`
- Test: `src/server/features/onboarding/__tests__/routes.test.ts`

- [ ] **Step 1: Create onboarding service**

`src/server/features/onboarding/service.ts`:
```ts
import { nanoid } from "nanoid";
import { extractDominantColors } from "../venues/color-extraction";
import { generateSlug } from "../venues/service";
import { createVenueWithTheme } from "../venues/repository";
import { buildJwtPayload, signJwt } from "../auth/service";
import type { OnboardingCompleteInput } from "@shared/schemas";

export async function handleLogoUpload(
  r2: R2Bucket,
  file: File,
  userId: string,
): Promise<{ logoUrl: string; extractedColors: readonly string[] }> {
  const ext = file.name.split(".").pop() ?? "png";
  const key = `logos/${userId}/${nanoid()}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  await r2.put(key, bytes, {
    httpMetadata: { contentType: file.type },
  });

  const extractedColors = await extractDominantColors(bytes, file.type);

  return { logoUrl: key, extractedColors };
}

export async function completeOnboarding(
  db: D1Database,
  userId: string,
  userName: string,
  userEmail: string,
  input: OnboardingCompleteInput,
  jwtSecret: string,
): Promise<string> {
  const slug = await generateSlug(db, input.venueInfo.name);
  const tenantId = nanoid();

  // Find system Owner role
  const ownerRole = await db
    .prepare("SELECT id FROM roles WHERE name = 'Owner' AND is_system = 1")
    .first<{ id: string }>();

  if (!ownerRole) throw new Error("System Owner role not found. Run seed.sql.");

  await createVenueWithTheme(db, {
    tenant: {
      id: tenantId,
      name: input.venueInfo.name,
      slug,
      type: input.venueInfo.type,
      cuisines: JSON.stringify(input.venueInfo.cuisines),
      addressLine1: input.location.addressLine1 ?? "",
      addressLine2: input.location.addressLine2 ?? "",
      city: input.location.city ?? "",
      state: input.location.state ?? "",
      zip: input.location.zip ?? "",
      country: input.location.country,
      timezone: input.location.timezone,
      phone: input.location.phone ?? "",
      website: input.location.website ?? "",
      logoUrl: input.logoUrl,
    },
    theme: {
      accent: input.brand.accent,
      accentHover: input.brand.accentHover,
      surface: input.brand.surface,
      surfaceElevated: input.brand.surfaceElevated,
      textPrimary: input.brand.textPrimary,
      source: input.brand.source,
    },
    userId,
    ownerRoleId: ownerRole.id,
  });

  // Reissue JWT with tenantId
  const payload = await buildJwtPayload(db, {
    id: userId,
    email: userEmail,
    name: userName,
  });
  return signJwt(payload, jwtSecret);
}
```

- [ ] **Step 2: Create onboarding routes**

`src/server/features/onboarding/routes.ts`:
```ts
import { Hono } from "hono";
import { setCookie } from "hono/cookie";
import type { AppEnv } from "../../types";
import { authMiddleware } from "../auth/middleware";
import { ok, error } from "../../response";
import { handleLogoUpload, completeOnboarding } from "./service";
import { onboardingCompleteSchema } from "@shared/schemas";

const onboarding = new Hono<AppEnv>();

onboarding.use("/*", authMiddleware);

onboarding.post("/logo", async (c) => {
  const body = await c.req.parseBody();
  const file = body.file;

  if (!(file instanceof File)) {
    return c.json(error("No file uploaded"), 400);
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return c.json(error("File must be PNG, JPG, or SVG"), 400);
  }

  if (file.size > 2 * 1024 * 1024) {
    return c.json(error("File must be under 2MB"), 400);
  }

  const user = c.get("user");
  const result = await handleLogoUpload(c.env.LOGOS, file, user.userId);

  return c.json(ok(result));
});

onboarding.post("/complete", async (c) => {
  const body = await c.req.json();
  const parsed = onboardingCompleteSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(error(parsed.error.issues[0].message), 400);
  }

  const user = c.get("user");
  const jwt = await completeOnboarding(
    c.env.DB,
    user.userId,
    user.name,
    user.email,
    parsed.data,
    c.env.JWT_SECRET,
  );

  setCookie(c, "token", jwt, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return c.json(ok({ token: jwt }));
});

// Serve logo images from R2
onboarding.get("/logos/:key{.+}", async (c) => {
  const key = c.req.param("key");
  const object = await c.env.LOGOS.get(`logos/${key}`);
  if (!object) return c.notFound();

  const headers = new Headers();
  headers.set(
    "Content-Type",
    object.httpMetadata?.contentType ?? "image/png",
  );
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
});

export { onboarding };
```

- [ ] **Step 3: Mount onboarding routes**

Add to `src/server/index.ts`:

```ts
import { onboarding } from "./features/onboarding/routes";

app.route("/api/onboarding", onboarding);
```

- [ ] **Step 4: Commit**

```bash
git add src/server/features/onboarding/ src/server/index.ts
git commit -m "feat: add onboarding routes — logo upload with color extraction, venue creation"
```

---

## Task 9: React App Shell (Entry, Router, API Client, Theme Provider)

**Files:**
- Modify: `src/client/main.tsx`
- Create: `src/client/App.tsx`
- Create: `src/client/api/client.ts`
- Create: `src/client/providers/VenueTheme.tsx`
- Create: `src/client/hooks/useAuth.ts`

- [ ] **Step 1: Create API client**

`src/client/api/client.ts`:
```ts
import { hc } from "hono/client";
import type { AppType } from "@server/index";

export const api = hc<AppType>("/");
```

Note: If the Hono RPC type chain doesn't resolve cleanly (it can be fragile), fall back to a thin typed wrapper around `fetch`. The typed client is a convenience, not a hard requirement.

- [ ] **Step 2: Create useAuth hook**

`src/client/hooks/useAuth.ts`:
```ts
import { useState, useEffect } from "react";
import type { AuthUser } from "@shared/types";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (res) => {
        if (res.ok) {
          const body = await res.json();
          setState({ user: body.data, loading: false });
        } else {
          setState({ user: null, loading: false });
        }
      })
      .catch(() => setState({ user: null, loading: false }));
  }, []);

  return state;
}
```

- [ ] **Step 3: Create VenueTheme provider**

`src/client/providers/VenueTheme.tsx`:
```tsx
import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { VenueTheme } from "@shared/types";

const VenueThemeContext = createContext<VenueTheme | null>(null);

export function useVenueTheme() {
  return useContext(VenueThemeContext);
}

interface VenueThemeProviderProps {
  theme: VenueTheme | null;
  children: ReactNode;
}

const TOKEN_MAP: Record<string, string> = {
  accent: "--rialto-accent",
  accentHover: "--rialto-accent-hover",
  surface: "--rialto-surface",
  surfaceElevated: "--rialto-surface-elevated",
  textPrimary: "--rialto-text-primary",
};

export function VenueThemeProvider({
  theme,
  children,
}: VenueThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;

    if (!theme) return;

    const entries = Object.entries(TOKEN_MAP);
    for (const [key, token] of entries) {
      const value = theme[key as keyof VenueTheme];
      if (typeof value === "string" && value.startsWith("#")) {
        root.style.setProperty(token, value);
      }
    }

    return () => {
      for (const [, token] of entries) {
        root.style.removeProperty(token);
      }
    };
  }, [theme]);

  return (
    <VenueThemeContext.Provider value={theme}>
      {children}
    </VenueThemeContext.Provider>
  );
}
```

- [ ] **Step 4: Create App.tsx with routing**

`src/client/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { VenueThemeProvider } from "./providers/VenueTheme";
import { useAuth } from "./hooks/useAuth";
import "@mattbutlerengineering/rialto/styles";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return null; // TODO: replace with Rialto Skeleton

  return (
    <Routes>
      <Route path="/login" element={<div>Login</div>} />
      <Route
        path="/onboarding"
        element={user ? <div>Onboarding</div> : <Navigate to="/login" />}
      />
      <Route
        path="/"
        element={
          user?.tenantId ? (
            <div>Dashboard</div>
          ) : user ? (
            <Navigate to="/onboarding" />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <VenueThemeProvider theme={null}>
        <AppRoutes />
      </VenueThemeProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 5: Update main.tsx**

`src/client/main.tsx`:
```tsx
import { createRoot } from "react-dom/client";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

Expected: Vite build completes. TypeScript compiles without errors.

- [ ] **Step 7: Commit**

```bash
git add src/client/
git commit -m "feat: add React app shell with router, auth hook, venue theme provider"
```

---

## Task 10: Login Page

**Files:**
- Create: `src/client/pages/Login.tsx`
- Modify: `src/client/App.tsx` (import Login)

- [ ] **Step 1: Create Login page**

`src/client/pages/Login.tsx`:
```tsx
import { Button } from "@mattbutlerengineering/rialto";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";

export function Login() {
  const { user } = useAuth();

  if (user?.tenantId) return <Navigate to="/" />;
  if (user) return <Navigate to="/onboarding" />;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #1a1714 0%, #2a2520 50%, #1a1714 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient gold glow */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(196,154,42,0.08) 0%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          textAlign: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 64,
            height: 64,
            margin: "0 auto 24px",
            borderRadius: 14,
            background: "linear-gradient(135deg, #c49a2a, #a07d1f)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 24px rgba(196,154,42,0.3)",
          }}
        >
          <span
            style={{
              fontSize: 28,
              color: "#1a1714",
              fontWeight: 500,
              fontFamily: "var(--rialto-font-display, system-ui)",
            }}
          >
            E
          </span>
        </div>

        <h1
          style={{
            fontFamily: "var(--rialto-font-display, system-ui)",
            fontSize: 32,
            fontWeight: 300,
            color: "#e8e2d8",
            letterSpacing: "-0.02em",
            marginBottom: 8,
          }}
        >
          eat sheet
        </h1>

        <p
          style={{
            fontSize: 13,
            color: "rgba(232,226,216,0.5)",
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            marginBottom: 40,
          }}
        >
          hospitality, refined
        </p>

        <a href="/api/auth/google" style={{ textDecoration: "none" }}>
          <Button variant="secondary" size="lg">
            Continue with Google
          </Button>
        </a>

        <p
          style={{
            fontSize: 11,
            color: "rgba(232,226,216,0.3)",
            marginTop: 24,
          }}
        >
          No credit card required
        </p>
      </div>
    </div>
  );
}
```

Note: The Rialto `Button` component may need variant/size adjustments depending on the actual API. Check `@mattbutlerengineering/rialto` Button props. If the `variant="secondary"` doesn't give the right look (glass-like, translucent on dark), create a custom styled button or use `variant="ghost"` with custom styles.

- [ ] **Step 2: Update App.tsx to use Login**

In `src/client/App.tsx`, replace `<div>Login</div>` with:

```tsx
import { Login } from "./pages/Login";

// In Routes:
<Route path="/login" element={<Login />} />
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```

Open http://localhost:5173/login. Verify: dark background, gold glow, centered content, "Continue with Google" button.

- [ ] **Step 4: Commit**

```bash
git add src/client/pages/Login.tsx src/client/App.tsx
git commit -m "feat: add login page with dark premium aesthetic"
```

---

## Task 11: Onboarding Wizard Container + useOnboarding Hook

**Files:**
- Create: `src/client/features/onboarding/hooks/useOnboarding.ts`
- Create: `src/client/pages/Onboarding.tsx`
- Create: `src/client/features/onboarding/components/ProgressBar.tsx`
- Create: `src/client/features/onboarding/index.ts`
- Test: `src/client/features/onboarding/__tests__/useOnboarding.test.ts`

- [ ] **Step 1: Write failing test for useOnboarding**

`src/client/features/onboarding/__tests__/useOnboarding.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { onboardingReducer, initialState } from "../hooks/useOnboarding";

describe("onboardingReducer", () => {
  it("starts at step 1", () => {
    expect(initialState.currentStep).toBe(1);
  });

  it("advances to next step", () => {
    const state = onboardingReducer(initialState, { type: "NEXT" });
    expect(state.currentStep).toBe(2);
  });

  it("does not advance past step 5", () => {
    let state = initialState;
    for (let i = 0; i < 6; i++) {
      state = onboardingReducer(state, { type: "NEXT" });
    }
    expect(state.currentStep).toBe(5);
  });

  it("goes back to previous step", () => {
    const state2 = onboardingReducer(initialState, { type: "NEXT" });
    const state1 = onboardingReducer(state2, { type: "BACK" });
    expect(state1.currentStep).toBe(1);
  });

  it("does not go before step 1", () => {
    const state = onboardingReducer(initialState, { type: "BACK" });
    expect(state.currentStep).toBe(1);
  });

  it("sets venue info data", () => {
    const state = onboardingReducer(initialState, {
      type: "SET_VENUE_INFO",
      data: { name: "Test", type: "casual" as const, cuisines: ["Italian"] },
    });
    expect(state.venueInfo?.name).toBe("Test");
  });

  it("sets logo result", () => {
    const state = onboardingReducer(initialState, {
      type: "SET_LOGO_RESULT",
      data: { logoUrl: "logos/test.png", extractedColors: ["#ff0000"] },
    });
    expect(state.logoResult?.logoUrl).toBe("logos/test.png");
    expect(state.logoResult?.extractedColors).toEqual(["#ff0000"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/client/features/onboarding/__tests__/useOnboarding.test.ts
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement useOnboarding hook**

`src/client/features/onboarding/hooks/useOnboarding.ts`:
```ts
import { useReducer } from "react";
import type { VenueInfoInput, VenueLocationInput, VenueBrandInput } from "@shared/schemas";

export interface LogoResult {
  readonly logoUrl: string;
  readonly extractedColors: readonly string[];
}

export interface OnboardingState {
  readonly currentStep: number;
  readonly venueInfo: VenueInfoInput | null;
  readonly location: VenueLocationInput | null;
  readonly logoResult: LogoResult | null;
  readonly brand: VenueBrandInput | null;
  readonly isSubmitting: boolean;
  readonly error: string | null;
}

export const initialState: OnboardingState = {
  currentStep: 1,
  venueInfo: null,
  location: null,
  logoResult: null,
  brand: null,
  isSubmitting: false,
  error: null,
};

type Action =
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "SET_VENUE_INFO"; data: VenueInfoInput }
  | { type: "SET_LOCATION"; data: VenueLocationInput }
  | { type: "SET_LOGO_RESULT"; data: LogoResult }
  | { type: "SET_BRAND"; data: VenueBrandInput }
  | { type: "SUBMIT_START" }
  | { type: "SUBMIT_SUCCESS" }
  | { type: "SUBMIT_ERROR"; error: string };

export function onboardingReducer(
  state: OnboardingState,
  action: Action,
): OnboardingState {
  switch (action.type) {
    case "NEXT":
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, 5),
      };
    case "BACK":
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 1),
      };
    case "SET_VENUE_INFO":
      return { ...state, venueInfo: action.data };
    case "SET_LOCATION":
      return { ...state, location: action.data };
    case "SET_LOGO_RESULT":
      return { ...state, logoResult: action.data };
    case "SET_BRAND":
      return { ...state, brand: action.data };
    case "SUBMIT_START":
      return { ...state, isSubmitting: true, error: null };
    case "SUBMIT_SUCCESS":
      return { ...state, isSubmitting: false };
    case "SUBMIT_ERROR":
      return { ...state, isSubmitting: false, error: action.error };
  }
}

export function useOnboarding() {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);

  return {
    state,
    next: () => dispatch({ type: "NEXT" }),
    back: () => dispatch({ type: "BACK" }),
    setVenueInfo: (data: VenueInfoInput) =>
      dispatch({ type: "SET_VENUE_INFO", data }),
    setLocation: (data: VenueLocationInput) =>
      dispatch({ type: "SET_LOCATION", data }),
    setLogoResult: (data: LogoResult) =>
      dispatch({ type: "SET_LOGO_RESULT", data }),
    setBrand: (data: VenueBrandInput) =>
      dispatch({ type: "SET_BRAND", data }),
    submitStart: () => dispatch({ type: "SUBMIT_START" }),
    submitSuccess: () => dispatch({ type: "SUBMIT_SUCCESS" }),
    submitError: (error: string) =>
      dispatch({ type: "SUBMIT_ERROR", error }),
  };
}
```

- [ ] **Step 4: Run useOnboarding tests**

```bash
npx vitest run src/client/features/onboarding/__tests__/useOnboarding.test.ts
```

Expected: All pass.

- [ ] **Step 5: Create ProgressBar component**

`src/client/features/onboarding/components/ProgressBar.tsx`:
```tsx
import { motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
      {Array.from({ length: totalSteps }, (_, i) => (
        <motion.div
          key={i}
          style={{
            width: 32,
            height: 3,
            borderRadius: 2,
            background:
              i < currentStep
                ? "#c49a2a"
                : "rgba(232,226,216,0.15)",
          }}
          animate={{
            background:
              i < currentStep
                ? "#c49a2a"
                : "rgba(232,226,216,0.15)",
          }}
          transition={spring}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create Onboarding page container**

`src/client/pages/Onboarding.tsx`:
```tsx
import { AnimatePresence, motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";
import { useOnboarding } from "../features/onboarding/hooks/useOnboarding";
import { ProgressBar } from "../features/onboarding/components/ProgressBar";
import { Button } from "@mattbutlerengineering/rialto";

const STEP_TITLES = [
  "What's your venue called?",
  "Where are you located?",
  "Add your logo",
  "Your brand",
  "Welcome",
];

export function Onboarding() {
  const wizard = useOnboarding();
  const { currentStep } = wizard.state;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1a1714 0%, #2a2520 50%, #1a1714 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 640, position: "relative" }}>
        <ProgressBar currentStep={currentStep} totalSteps={5} />

        <div style={{ textAlign: "center", marginTop: 32, marginBottom: 32 }}>
          <p
            style={{
              fontSize: 13,
              color: "rgba(232,226,216,0.4)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginBottom: 12,
            }}
          >
            Step {currentStep} of 5
          </p>
          <h2
            style={{
              fontFamily: "var(--rialto-font-display, system-ui)",
              fontSize: 28,
              fontWeight: 300,
              color: "#e8e2d8",
              letterSpacing: "-0.02em",
            }}
          >
            {STEP_TITLES[currentStep - 1]}
          </h2>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={spring}
          >
            {/* Step components will be rendered here (Tasks 12-14) */}
            <div
              style={{
                background: "rgba(232,226,216,0.04)",
                borderRadius: 10,
                border: "1px solid rgba(232,226,216,0.08)",
                padding: 32,
                minHeight: 200,
              }}
            >
              <p style={{ color: "rgba(232,226,216,0.5)" }}>
                Step {currentStep} content (placeholder)
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 24,
          }}
        >
          {currentStep > 1 ? (
            <Button variant="ghost" onClick={wizard.back}>
              Back
            </Button>
          ) : (
            <div />
          )}
          {currentStep < 5 && (
            <Button variant="primary" onClick={wizard.next}>
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Update App.tsx to use Onboarding**

```tsx
import { Onboarding } from "./pages/Onboarding";

// In Routes:
<Route path="/onboarding" element={user ? <Onboarding /> : <Navigate to="/login" />} />
```

- [ ] **Step 8: Create barrel export**

`src/client/features/onboarding/index.ts`:
```ts
export { useOnboarding } from "./hooks/useOnboarding";
export { ProgressBar } from "./components/ProgressBar";
```

- [ ] **Step 9: Commit**

```bash
git add src/client/features/onboarding/ src/client/pages/Onboarding.tsx src/client/App.tsx
git commit -m "feat: add onboarding wizard container with step navigation and spring transitions"
```

---

## Task 12: Steps 1–2 (Venue Info + Location)

**Files:**
- Create: `src/client/features/onboarding/components/StepVenueInfo.tsx`
- Create: `src/client/features/onboarding/components/StepLocation.tsx`
- Modify: `src/client/pages/Onboarding.tsx` (wire steps)

- [ ] **Step 1: Create StepVenueInfo**

`src/client/features/onboarding/components/StepVenueInfo.tsx`:
```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input, Select, Tag } from "@mattbutlerengineering/rialto";
import { spring, staggerReveal } from "@mattbutlerengineering/rialto/motion";
import { CUISINE_OPTIONS, VENUE_TYPES, type VenueType } from "@shared/types";
import type { VenueInfoInput } from "@shared/schemas";

interface StepVenueInfoProps {
  data: VenueInfoInput | null;
  onComplete: (data: VenueInfoInput) => void;
}

export function StepVenueInfo({ data, onComplete }: StepVenueInfoProps) {
  const [name, setName] = useState(data?.name ?? "");
  const [type, setType] = useState<VenueType>(data?.type ?? "casual");
  const [cuisines, setCuisines] = useState<string[]>(
    data?.cuisines ? [...data.cuisines] : [],
  );

  const addCuisine = (cuisine: string) => {
    if (!cuisines.includes(cuisine)) {
      setCuisines([...cuisines, cuisine]);
    }
  };

  const removeCuisine = (cuisine: string) => {
    setCuisines(cuisines.filter((c) => c !== cuisine));
  };

  return (
    <div style={{ display: "flex", gap: 32 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
        <Input
          label="Venue name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Verde Kitchen"
        />

        <Select
          label="Venue type"
          value={type}
          onChange={(value) => setType(value as VenueType)}
          options={VENUE_TYPES.map((t) => ({
            label: t.replace("_", " "),
            value: t,
          }))}
        />

        <div>
          <Select
            label="Cuisines"
            placeholder="Add a cuisine..."
            onChange={(value) => addCuisine(value)}
            options={CUISINE_OPTIONS.filter((c) => !cuisines.includes(c)).map(
              (c) => ({ label: c, value: c }),
            )}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            <AnimatePresence>
              {cuisines.map((c, i) => (
                <motion.div
                  key={c}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ ...spring, delay: i * 0.05 }}
                >
                  <Tag onDismiss={() => removeCuisine(c)}>{c}</Tag>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Live preview: mock AppBar with venue name */}
      <div
        style={{
          flex: 1,
          background: "rgba(232,226,216,0.04)",
          borderRadius: 10,
          border: "1px solid rgba(232,226,216,0.08)",
          padding: 16,
        }}
      >
        <div
          style={{
            padding: "10px 16px",
            background: "rgba(232,226,216,0.06)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--rialto-accent, #c49a2a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 14,
                color: "#1a1714",
                fontWeight: 500,
              }}
            >
              {name ? name[0].toUpperCase() : "E"}
            </span>
          </div>
          <span
            style={{
              color: "#e8e2d8",
              fontSize: 14,
              fontFamily: "var(--rialto-font-display, system-ui)",
            }}
          >
            {name || "Your Venue"}
          </span>
        </div>
      </div>
    </div>
  );
}
```

Note: Rialto's `Select`, `Tag`, and `Input` props may differ from what's shown here. Check the actual component API via `llms-full.txt` or the registry. Adjust `onChange` signatures and prop names as needed.

- [ ] **Step 2: Create StepLocation**

`src/client/features/onboarding/components/StepLocation.tsx`:
```tsx
import { useState } from "react";
import { Input, Select } from "@mattbutlerengineering/rialto";
import type { VenueLocationInput } from "@shared/schemas";

interface StepLocationProps {
  data: VenueLocationInput | null;
  onComplete: (data: VenueLocationInput) => void;
}

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
];

export function StepLocation({ data, onComplete }: StepLocationProps) {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [form, setForm] = useState({
    addressLine1: data?.addressLine1 ?? "",
    addressLine2: data?.addressLine2 ?? "",
    city: data?.city ?? "",
    state: data?.state ?? "",
    zip: data?.zip ?? "",
    country: data?.country ?? "US",
    timezone: data?.timezone ?? browserTz,
    phone: data?.phone ?? "",
    website: data?.website ?? "",
  });

  const update = (field: string, value: string) =>
    setForm({ ...form, [field]: value });

  return (
    <div style={{ display: "flex", gap: 32 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
        <Input
          label="Street address"
          value={form.addressLine1}
          onChange={(e) => update("addressLine1", e.target.value)}
        />
        <Input
          label="Suite / Unit"
          value={form.addressLine2}
          onChange={(e) => update("addressLine2", e.target.value)}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Input
            label="City"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
          <Input
            label="State"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
          />
          <Input
            label="ZIP"
            value={form.zip}
            onChange={(e) => update("zip", e.target.value)}
          />
        </div>
        <Select
          label="Timezone"
          value={form.timezone}
          onChange={(value) => update("timezone", value)}
          options={COMMON_TIMEZONES.map((tz) => ({ label: tz, value: tz }))}
        />
        <Input
          label="Phone"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="(555) 123-4567"
        />
        <Input
          label="Website"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
          placeholder="https://example.com"
        />
      </div>

      {/* Live preview: address card */}
      <div
        style={{
          flex: 1,
          background: "rgba(232,226,216,0.04)",
          borderRadius: 10,
          border: "1px solid rgba(232,226,216,0.08)",
          padding: 24,
          color: "#e8e2d8",
        }}
      >
        <p style={{ fontSize: 13, color: "rgba(232,226,216,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
          Address preview
        </p>
        {form.addressLine1 && <p>{form.addressLine1}</p>}
        {form.addressLine2 && <p>{form.addressLine2}</p>}
        {(form.city || form.state || form.zip) && (
          <p>
            {[form.city, form.state].filter(Boolean).join(", ")}
            {form.zip ? ` ${form.zip}` : ""}
          </p>
        )}
        {form.phone && (
          <p style={{ marginTop: 12, color: "rgba(232,226,216,0.6)" }}>
            {form.phone}
          </p>
        )}
        {form.website && (
          <p style={{ color: "var(--rialto-accent, #c49a2a)" }}>
            {form.website}
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire steps into Onboarding container**

In `src/client/pages/Onboarding.tsx`, replace the placeholder div inside `AnimatePresence` with:

```tsx
import { StepVenueInfo } from "../features/onboarding/components/StepVenueInfo";
import { StepLocation } from "../features/onboarding/components/StepLocation";

// Inside the motion.div:
{currentStep === 1 && (
  <StepVenueInfo
    data={wizard.state.venueInfo}
    onComplete={(data) => {
      wizard.setVenueInfo(data);
      wizard.next();
    }}
  />
)}
{currentStep === 2 && (
  <StepLocation
    data={wizard.state.location}
    onComplete={(data) => {
      wizard.setLocation(data);
      wizard.next();
    }}
  />
)}
{currentStep >= 3 && (
  <div style={{ /* placeholder */ }}>
    <p style={{ color: "rgba(232,226,216,0.5)" }}>
      Step {currentStep} (next task)
    </p>
  </div>
)}
```

- [ ] **Step 4: Test in browser**

```bash
npm run dev
```

Navigate to `/onboarding` (bypass auth for now by temporarily removing the auth guard). Verify:
- Step 1: venue name updates the mock AppBar live. Cuisine tags bounce in. Select works.
- Step 2: address fields populate the preview card. Timezone defaults to browser TZ.

- [ ] **Step 5: Commit**

```bash
git add src/client/features/onboarding/components/StepVenueInfo.tsx src/client/features/onboarding/components/StepLocation.tsx src/client/pages/Onboarding.tsx
git commit -m "feat: add onboarding steps 1-2 — venue info with cuisine tags, location with address preview"
```

---

## Task 13: Steps 3–4 (Logo Upload + Brand Colors)

**Files:**
- Create: `src/client/features/onboarding/components/StepLogo.tsx`
- Create: `src/client/features/onboarding/components/StepBrand.tsx`
- Create: `src/client/features/onboarding/components/ColorSwatch.tsx`
- Create: `src/client/features/onboarding/components/ThemePreview.tsx`
- Modify: `src/client/pages/Onboarding.tsx` (wire steps)

- [ ] **Step 1: Create ColorSwatch component**

`src/client/features/onboarding/components/ColorSwatch.tsx`:
```tsx
import { motion } from "framer-motion";
import { spring } from "@mattbutlerengineering/rialto/motion";

interface ColorSwatchProps {
  color: string;
  selected: boolean;
  onClick: () => void;
}

export function ColorSwatch({ color, selected, onClick }: ColorSwatchProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: color,
        border: selected ? "2px solid #c49a2a" : "2px solid transparent",
        boxShadow: selected ? "0 0 12px rgba(196,154,42,0.3)" : "none",
        cursor: "pointer",
        padding: 0,
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      transition={spring}
      aria-label={`Select color ${color}`}
      aria-pressed={selected}
    />
  );
}
```

- [ ] **Step 2: Create ThemePreview component**

`src/client/features/onboarding/components/ThemePreview.tsx`:
```tsx
import { Card, Button, Input, Badge } from "@mattbutlerengineering/rialto";

interface ThemePreviewProps {
  accent: string;
  accentHover: string;
  venueName: string;
}

export function ThemePreview({ accent, accentHover, venueName }: ThemePreviewProps) {
  return (
    <div
      style={{
        // Scoped CSS custom properties — NOT applied to :root yet
        ["--rialto-accent" as string]: accent,
        ["--rialto-accent-hover" as string]: accentHover,
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "rgba(232,226,216,0.4)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 12,
        }}
      >
        Live preview
      </p>
      <div
        style={{
          background: "rgba(232,226,216,0.04)",
          borderRadius: 10,
          border: "1px solid rgba(232,226,216,0.08)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <Badge>{venueName || "Your Venue"}</Badge>
          <Badge variant="accent">Open</Badge>
        </div>
        <Input label="Guest name" placeholder="Search..." readOnly />
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="primary" size="sm">
            Confirm
          </Button>
          <Button variant="ghost" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
```

Note: Rialto's `Badge` may not have a `variant="accent"` prop. Check the actual API and adjust. The scoped CSS custom property approach (`style` object with `--rialto-accent`) should work for components that use `var(--rialto-accent)` internally.

- [ ] **Step 3: Create StepLogo**

`src/client/features/onboarding/components/StepLogo.tsx`:
```tsx
import { useState, useCallback, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { spring, staggerReveal } from "@mattbutlerengineering/rialto/motion";
import { Progress } from "@mattbutlerengineering/rialto";
import { ColorSwatch } from "./ColorSwatch";

interface StepLogoProps {
  logoResult: { logoUrl: string; extractedColors: readonly string[] } | null;
  onUpload: (file: File) => Promise<void>;
}

export function StepLogo({ logoResult, onUpload }: StepLogoProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      setError(null);

      const file = e.dataTransfer.files[0];
      if (!file) return;

      const allowed = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];
      if (!allowed.includes(file.type)) {
        setError("File must be PNG, JPG, or SVG");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("File must be under 2MB");
        return;
      }

      setUploading(true);
      try {
        await onUpload(file);
      } catch (err) {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onUpload],
  );

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      setUploading(true);
      try {
        await onUpload(file);
      } catch {
        setError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onUpload],
  );

  return (
    <div style={{ display: "flex", gap: 32 }}>
      <div style={{ flex: 1 }}>
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? "#c49a2a" : "rgba(232,226,216,0.2)"}`,
            borderRadius: 10,
            padding: 48,
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.2s",
            background: dragging ? "rgba(196,154,42,0.04)" : "transparent",
          }}
          onClick={() => document.getElementById("logo-input")?.click()}
        >
          <input
            id="logo-input"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            style={{ display: "none" }}
            onChange={handleFileInput}
          />
          <p style={{ color: "#e8e2d8", fontSize: 16, marginBottom: 8 }}>
            Drag your logo here
          </p>
          <p style={{ color: "rgba(232,226,216,0.4)", fontSize: 13 }}>
            PNG, JPG, or SVG &middot; Max 2MB
          </p>
        </div>

        {uploading && (
          <div style={{ marginTop: 16 }}>
            <Progress value={undefined} />
          </div>
        )}

        {error && (
          <p style={{ color: "var(--rialto-error)", marginTop: 12, fontSize: 13 }}>
            {error}
          </p>
        )}

        {/* Extracted colors */}
        {logoResult?.extractedColors && logoResult.extractedColors.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p
              style={{
                fontSize: 11,
                color: "rgba(232,226,216,0.4)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              Extracted colors
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <AnimatePresence>
                {logoResult.extractedColors.map((color, i) => (
                  <motion.div
                    key={color}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...spring, delay: i * 0.08 }}
                  >
                    <ColorSwatch
                      color={color}
                      selected={false}
                      onClick={() => {}}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Logo preview */}
      <div
        style={{
          flex: 1,
          background: "rgba(232,226,216,0.04)",
          borderRadius: 10,
          border: "1px solid rgba(232,226,216,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 200,
        }}
      >
        {logoResult ? (
          <motion.img
            src={`/api/onboarding/logos/${logoResult.logoUrl.replace("logos/", "")}`}
            alt="Venue logo"
            style={{ maxWidth: 200, maxHeight: 200, borderRadius: 12 }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={spring}
          />
        ) : (
          <p style={{ color: "rgba(232,226,216,0.3)" }}>
            Your logo will appear here
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create StepBrand**

`src/client/features/onboarding/components/StepBrand.tsx`:
```tsx
import { useState } from "react";
import { ColorSwatch } from "./ColorSwatch";
import { ThemePreview } from "./ThemePreview";
import type { VenueBrandInput } from "@shared/schemas";

const DEFAULT_ACCENT = "#c49a2a";
const DEFAULT_ACCENT_HOVER = "#a07d1f";

interface StepBrandProps {
  extractedColors: readonly string[];
  venueName: string;
  data: VenueBrandInput | null;
  onComplete: (data: VenueBrandInput) => void;
}

function darken(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function StepBrand({
  extractedColors,
  venueName,
  data,
  onComplete,
}: StepBrandProps) {
  const colors =
    extractedColors.length > 0
      ? extractedColors
      : [DEFAULT_ACCENT];

  const [accent, setAccent] = useState(data?.accent ?? colors[0]);
  const [accentHover, setAccentHover] = useState(
    data?.accentHover ?? darken(colors[0], 30),
  );

  const selectColor = (color: string) => {
    setAccent(color);
    setAccentHover(darken(color, 30));
  };

  return (
    <div style={{ display: "flex", gap: 32 }}>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 13,
            color: "rgba(232,226,216,0.4)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: 16,
          }}
        >
          Choose your accent color
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          {colors.map((c) => (
            <ColorSwatch
              key={c}
              color={c}
              selected={c === accent}
              onClick={() => selectColor(c)}
            />
          ))}
        </div>

        {/* Manual color input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label
            style={{
              fontSize: 13,
              color: "rgba(232,226,216,0.6)",
            }}
          >
            Custom:
          </label>
          <input
            type="color"
            value={accent}
            onChange={(e) => selectColor(e.target.value)}
            style={{
              width: 36,
              height: 36,
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              background: "transparent",
            }}
          />
          <span style={{ fontSize: 13, color: "rgba(232,226,216,0.5)", fontFamily: "monospace" }}>
            {accent}
          </span>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <ThemePreview
          accent={accent}
          accentHover={accentHover}
          venueName={venueName}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Wire steps 3-4 into Onboarding container**

In `src/client/pages/Onboarding.tsx`, import and add:

```tsx
import { StepLogo } from "../features/onboarding/components/StepLogo";
import { StepBrand } from "../features/onboarding/components/StepBrand";

// Inside AnimatePresence motion.div:
{currentStep === 3 && (
  <StepLogo
    logoResult={wizard.state.logoResult}
    onUpload={async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/onboarding/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const body = await res.json();
      if (body.ok) {
        wizard.setLogoResult(body.data);
      }
    }}
  />
)}
{currentStep === 4 && (
  <StepBrand
    extractedColors={wizard.state.logoResult?.extractedColors ?? []}
    venueName={wizard.state.venueInfo?.name ?? ""}
    data={wizard.state.brand}
    onComplete={(data) => {
      wizard.setBrand(data);
      wizard.next();
    }}
  />
)}
```

- [ ] **Step 6: Test in browser**

Verify:
- Step 3: drag-and-drop zone highlights. File selection works. After upload, logo appears with spring animation. Color swatches animate in with stagger.
- Step 4: swatches from extraction shown. Clicking updates the live preview. Manual color picker works. Preview components respond in real time.

- [ ] **Step 7: Commit**

```bash
git add src/client/features/onboarding/components/StepLogo.tsx src/client/features/onboarding/components/StepBrand.tsx src/client/features/onboarding/components/ColorSwatch.tsx src/client/features/onboarding/components/ThemePreview.tsx src/client/pages/Onboarding.tsx
git commit -m "feat: add onboarding steps 3-4 — logo upload with color extraction, brand customization with live preview"
```

---

## Task 14: Step 5 (Welcome + FlipDot) + Dashboard

**Files:**
- Create: `src/client/features/onboarding/components/StepWelcome.tsx`
- Create: `src/client/pages/Dashboard.tsx`
- Modify: `src/client/pages/Onboarding.tsx` (wire step 5 + submit)
- Modify: `src/client/App.tsx` (wire Dashboard)

- [ ] **Step 1: Create StepWelcome**

`src/client/features/onboarding/components/StepWelcome.tsx`:
```tsx
import { FlipDot, textToMatrix, Button } from "@mattbutlerengineering/rialto";

interface StepWelcomeProps {
  venueName: string;
  accent: string;
  logoUrl: string | null;
  cuisines: readonly string[];
  isSubmitting: boolean;
  onEnter: () => void;
}

export function StepWelcome({
  venueName,
  accent,
  logoUrl,
  cuisines,
  isSubmitting,
  onEnter,
}: StepWelcomeProps) {
  const matrix = textToMatrix(venueName.toUpperCase(), { letterSpacing: 1 });

  return (
    <div>
      {/* FlipDot venue name reveal */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: 32,
        }}
      >
        <FlipDot
          matrix={matrix}
          dotSize={6}
          dotGap={2}
          enableSound
          soundVolume={0.2}
          staggerDelay={12}
          staggerDirection="left-to-right"
        />
      </div>

      {/* Themed app shell preview */}
      <div
        style={{
          display: "flex",
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(232,226,216,0.08)",
          height: 300,
          ["--rialto-accent" as string]: accent,
        }}
      >
        {/* Sidebar */}
        <div
          style={{
            width: 200,
            background: "rgba(232,226,216,0.04)",
            padding: 16,
            borderRight: "1px solid rgba(232,226,216,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            {logoUrl ? (
              <img
                src={`/api/onboarding/logos/${logoUrl.replace("logos/", "")}`}
                alt="Logo"
                style={{ width: 32, height: 32, borderRadius: 8 }}
              />
            ) : (
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: 16, color: "#1a1714" }}>
                  {venueName[0]?.toUpperCase() ?? "E"}
                </span>
              </div>
            )}
            <div>
              <div style={{ color: "#e8e2d8", fontSize: 13 }}>{venueName}</div>
              <div style={{ color: "rgba(232,226,216,0.4)", fontSize: 10 }}>
                {cuisines.slice(0, 2).join(" \u00B7 ")}
              </div>
            </div>
          </div>

          {["Dashboard", "Reservations", "Waitlist", "Floor Plan", "Guests"].map(
            (item, i) => (
              <div
                key={item}
                style={{
                  padding: "8px 10px",
                  borderRadius: 6,
                  color:
                    i === 0 ? accent : "rgba(232,226,216,0.4)",
                  background:
                    i === 0
                      ? `${accent}1a`
                      : "transparent",
                  fontSize: 12,
                  marginBottom: 2,
                }}
              >
                {item}
              </div>
            ),
          )}
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <h2
              style={{
                fontFamily: "var(--rialto-font-display, system-ui)",
                fontSize: 24,
                fontWeight: 300,
                color: "#e8e2d8",
                marginBottom: 8,
              }}
            >
              Welcome to {venueName}
            </h2>
            <p
              style={{
                fontSize: 14,
                color: "rgba(232,226,216,0.5)",
                marginBottom: 32,
              }}
            >
              Your venue is ready.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={onEnter}
              loading={isSubmitting}
            >
              Enter {venueName}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

Note: Rialto's `FlipDot` component requires a `matrix` (2D boolean array). The `textToMatrix` function from Rialto converts text to a pixel font matrix. Check if `textToMatrix` is exported — if not, use the `useFlipDotAnimation` hook with `mode="typewriter"` instead.

- [ ] **Step 2: Create Dashboard page**

`src/client/pages/Dashboard.tsx`:
```tsx
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { VenueThemeProvider } from "../providers/VenueTheme";
import { Card, Stat, Sidebar } from "@mattbutlerengineering/rialto";
import type { VenueWithTheme } from "@shared/types";

export function Dashboard() {
  const { user } = useAuth();
  const [venue, setVenue] = useState<VenueWithTheme | null>(null);

  useEffect(() => {
    if (!user?.tenantId) return;
    fetch(`/api/t/${user.tenantId}/venue`, { credentials: "include" })
      .then((res) => res.json())
      .then((body) => {
        if (body.ok) setVenue(body.data);
      });
  }, [user?.tenantId]);

  if (!venue) return null;

  return (
    <VenueThemeProvider theme={venue.theme}>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <div
          style={{
            width: 240,
            background: "var(--rialto-surface, #1e1b17)",
            borderRight: "1px solid var(--rialto-border, rgba(232,226,216,0.08))",
            padding: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
            {venue.venue.logoUrl && (
              <img
                src={`/api/onboarding/logos/${venue.venue.logoUrl.replace("logos/", "")}`}
                alt="Logo"
                style={{ width: 32, height: 32, borderRadius: 8 }}
              />
            )}
            <span style={{ color: "var(--rialto-text-primary, #e8e2d8)", fontSize: 14 }}>
              {venue.venue.name}
            </span>
          </div>
        </div>

        <div style={{ flex: 1, padding: 32 }}>
          <h1
            style={{
              fontFamily: "var(--rialto-font-display, system-ui)",
              fontSize: 24,
              fontWeight: 300,
              color: "var(--rialto-text-primary, #e8e2d8)",
              marginBottom: 24,
            }}
          >
            Dashboard
          </h1>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <Stat label="Reservations" value="0" />
            <Stat label="Waitlist" value="0" />
            <Stat label="Tables" value="0" />
          </div>
        </div>
      </div>
    </VenueThemeProvider>
  );
}
```

- [ ] **Step 3: Wire Step 5 into Onboarding + submit logic**

In `src/client/pages/Onboarding.tsx`:

```tsx
import { StepWelcome } from "../features/onboarding/components/StepWelcome";
import { useNavigate } from "react-router";

// Inside component:
const navigate = useNavigate();

const handleSubmit = async () => {
  const { venueInfo, location, brand, logoResult } = wizard.state;
  if (!venueInfo || !location || !brand) return;

  wizard.submitStart();
  try {
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        venueInfo,
        location,
        brand,
        logoUrl: logoResult?.logoUrl ?? null,
      }),
    });
    const body = await res.json();
    if (body.ok) {
      wizard.submitSuccess();
      navigate("/");
    } else {
      wizard.submitError(body.error);
    }
  } catch {
    wizard.submitError("Something went wrong");
  }
};

// In AnimatePresence:
{currentStep === 5 && (
  <StepWelcome
    venueName={wizard.state.venueInfo?.name ?? ""}
    accent={wizard.state.brand?.accent ?? "#c49a2a"}
    logoUrl={wizard.state.logoResult?.logoUrl ?? null}
    cuisines={wizard.state.venueInfo?.cuisines ?? []}
    isSubmitting={wizard.state.isSubmitting}
    onEnter={handleSubmit}
  />
)}
```

Also remove the "Continue" button when `currentStep === 5` (the CTA is inside StepWelcome).

- [ ] **Step 4: Update App.tsx with Dashboard**

```tsx
import { Dashboard } from "./pages/Dashboard";

// In Routes:
<Route
  path="/"
  element={
    user?.tenantId ? <Dashboard /> : user ? <Navigate to="/onboarding" /> : <Navigate to="/login" />
  }
/>
```

- [ ] **Step 5: End-to-end browser test**

Start both dev servers:
```bash
npm run dev     # Vite on :5173
npm run dev:api # Wrangler on :8788
```

Full flow:
1. Visit `/login` — dark login page renders
2. Click "Continue with Google" — redirects to Google (requires OAuth credentials configured)
3. After auth callback, redirected to `/onboarding`
4. Complete all 5 steps — venue created, JWT reissued
5. Redirected to `/` — dashboard renders with venue theme applied

For local testing without Google OAuth configured, temporarily add a dev-only login route that creates a test JWT.

- [ ] **Step 6: Commit**

```bash
git add src/client/features/onboarding/components/StepWelcome.tsx src/client/pages/Dashboard.tsx src/client/pages/Onboarding.tsx src/client/App.tsx
git commit -m "feat: add onboarding step 5 with FlipDot reveal + themed dashboard landing"
```

---

## Post-Implementation Checklist

After all 14 tasks are complete, verify:

- [ ] `npm run build` succeeds (TypeScript + Vite)
- [ ] `npm test` passes all unit tests
- [ ] Login page renders correctly (dark, warm, gold accent)
- [ ] Onboarding wizard navigates all 5 steps with spring transitions
- [ ] Logo upload stores to R2 and returns extracted colors
- [ ] Brand step shows live-themed Rialto components
- [ ] FlipDot renders venue name with click sounds on Step 5
- [ ] POST /api/onboarding/complete creates tenant + theme + member in D1
- [ ] Dashboard loads with venue-specific theme applied
- [ ] Returning user (has tenant) bypasses onboarding, goes to dashboard
- [ ] Add `.superpowers/` to `.gitignore`
