import { Context, Next } from 'hono';
import { verify } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// JWKS client to fetch Cognito public keys
const client = jwksClient({
  jwksUri: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true,
});

// Get signing key from JWKS
function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Verify JWT token
function verifyToken(token: string): Promise<any> {
  return new Promise((resolve, reject) => {
    verify(
      token,
      getKey,
      {
        issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

// Auth middleware
export async function requireAuth(c: Context, next: Next) {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = await verifyToken(token);

    // Get or create user in database
    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.cognitoSub, decoded.sub))
      .limit(1);

    if (!user) {
      // Create user if doesn't exist
      [user] = await db
        .insert(users)
        .values({
          cognitoSub: decoded.sub,
          email: decoded.email,
          name: decoded.name || decoded.email,
        })
        .returning();
    }

    // Attach user to context
    c.set('user', user);
    c.set('cognitoUser', decoded);

    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

// Optional auth middleware (doesn't fail if no token)
export async function optionalAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = await verifyToken(token);

      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.cognitoSub, decoded.sub))
        .limit(1);

      if (!user) {
        [user] = await db
          .insert(users)
          .values({
            cognitoSub: decoded.sub,
            email: decoded.email,
            name: decoded.name || decoded.email,
          })
          .returning();
      }

      c.set('user', user);
      c.set('cognitoUser', decoded);
    }
  } catch (error) {
    // Ignore auth errors for optional auth
    console.error('Optional auth error:', error);
  }

  await next();
}

// Extend Hono context type to include user
declare module 'hono' {
  interface ContextVariableMap {
    user: typeof users.$inferSelect;
    cognitoUser: any;
  }
}