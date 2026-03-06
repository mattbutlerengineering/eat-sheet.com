import * as arctic from "arctic";
import type { Env } from "../types";

export interface OAuthProfile {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

interface OAuthProvider {
  readonly createClient: (env: Env) => arctic.Google;
  readonly scopes: readonly string[];
  readonly usePKCE: boolean;
  readonly getProfile: (tokens: arctic.OAuth2Tokens) => OAuthProfile;
}

const providers: Record<string, OAuthProvider> = {
  google: {
    createClient: (env) =>
      new arctic.Google(
        env.GOOGLE_OAUTH_CLIENT_ID,
        env.GOOGLE_OAUTH_CLIENT_SECRET,
        `${env.OAUTH_REDIRECT_BASE}/api/auth/google/callback`
      ),
    scopes: ["openid", "profile", "email"],
    usePKCE: true,
    getProfile: (tokens) => {
      const claims = arctic.decodeIdToken(tokens.idToken()) as {
        sub: string;
        email: string;
        name: string;
      };
      return { id: claims.sub, email: claims.email, name: claims.name };
    },
  },
};

export function getProvider(name: string): OAuthProvider | undefined {
  return providers[name];
}

export function isValidProvider(name: string): boolean {
  return name in providers;
}
