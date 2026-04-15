export interface Bindings {
  DB: D1Database;
  LOGOS: R2Bucket;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
  SENTRY_DSN: string;
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
