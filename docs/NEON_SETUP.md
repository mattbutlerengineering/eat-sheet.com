# Neon Database Setup Guide

This guide walks you through setting up a PostgreSQL database on Neon for the Eat-Sheet project.

## What is Neon?

Neon is a serverless PostgreSQL database platform that offers:
- **Free tier**: 0.5 GB storage, suitable for MVP and development
- **Serverless**: Automatically scales to zero when not in use (saves costs)
- **Branching**: Create database branches like Git (useful for testing)
- **Fast**: Built on a modern architecture optimized for cloud

## Step 1: Create Neon Account

1. Go to https://console.neon.tech
2. Click **"Sign up"**
3. Sign up with GitHub or use email: `mattbutlerengineering@gmail.com`
4. Complete email verification if needed
5. You'll be redirected to the Neon Console

## Step 2: Create Your First Project

1. After signing in, you'll see "Create your first project" page
2. Configure your project:
   - **Project name**: `eat-sheet-prod`
   - **Database name**: `eat_sheet` (or leave default `neondb`)
   - **Region**: Choose closest to your AWS region (us-east-1 → US East)
   - **Postgres version**: 16 (latest stable)
3. Click **"Create project"**

## Step 3: Get Connection String

After project creation, you'll see the connection details:

1. Look for the **"Connection string"** section
2. You'll see a connection string like:
   ```
   postgresql://[user]:[password]@[host]/[database]?sslmode=require
   ```
3. **IMPORTANT**: Copy this entire string - you'll need it for:
   - Local development (`.env` file)
   - Pulumi deployment (infrastructure secrets)

Example format:
```
postgresql://eat_sheet_owner:AbCd1234XyZ@ep-cool-name-123456.us-east-1.aws.neon.tech/eat_sheet?sslmode=require
```

4. Click **"Copy"** button to copy the connection string

## Step 4: Save Connection String Securely

**IMPORTANT: Never commit this connection string to Git!**

### For Local Development

Create a `.env` file in the `apps/backend/` directory:

```bash
# apps/backend/.env
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

The `.env` file is already in `.gitignore`, so it won't be committed.

### For Pulumi Deployment

You'll set this as a Pulumi secret later:

```bash
cd apps/infrastructure
pulumi config set --secret databaseUrl "postgresql://[user]:[password]@[host]/[database]?sslmode=require"
```

## Step 5: Verify Connection

Test the connection from your local machine:

```bash
# Install PostgreSQL client if not already installed (optional)
brew install postgresql@16

# Test connection (replace with your actual connection string)
psql "postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# If successful, you'll see:
# psql (16.x)
# SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, compression: off)
# Type "help" for help.
#
# eat_sheet=>

# Exit with \q
```

Or test with a simple query:

```bash
psql "postgresql://..." -c "SELECT version();"
```

## Step 6: Configure Backend Environment

1. Navigate to backend directory:
   ```bash
   cd apps/backend
   ```

2. Create `.env` file (if it doesn't exist):
   ```bash
   touch .env
   ```

3. Add your database URL:
   ```env
   DATABASE_URL=postgresql://[your-connection-string]
   NODE_ENV=development
   ```

4. Verify `.env` is in `.gitignore`:
   ```bash
   # Should show that .env is ignored
   git status
   ```

## Step 7: Run Database Migrations

Once you have the connection string configured:

```bash
# From backend directory
cd apps/backend

# Generate initial migration (creates migration files)
pnpm db:generate

# Apply migrations to Neon database
pnpm db:migrate

# Open Drizzle Studio to view your database (optional)
pnpm db:studio
```

This will create all the tables defined in `apps/backend/src/db/schema.ts`.

## Step 8: Monitor Database Usage

1. Go to Neon Console: https://console.neon.tech
2. Click on your project: `eat-sheet-prod`
3. View the **"Monitoring"** tab to see:
   - Storage usage
   - Active connections
   - Query performance

## Free Tier Limits

Neon's free tier includes:
- **Storage**: 0.5 GB
- **Compute**: Shared CPU (scales to zero when inactive)
- **Projects**: 1 project
- **Branches**: Up to 10 database branches
- **Active time**: No limits (auto-scales to zero)

**Upgrade when needed:**
- If you exceed 0.5 GB storage
- If you need dedicated compute
- If you need multiple projects

Paid plans start at $19/month for 10 GB storage.

## Neon-Specific Features

### Database Branching

Create database branches for testing (like Git branches):

```bash
# Create a branch from main
neonctl branches create --name staging

# Get connection string for branch
neonctl connection-string --branch staging
```

### Point-in-Time Recovery

Neon automatically backs up your database. You can restore to any point in the last 7 days (free tier).

### Connection Pooling

Neon provides built-in connection pooling. For serverless (Lambda), use:

```typescript
// apps/backend/src/db/index.ts
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL!, {
  max: 1, // Important for serverless: limit connections
  idle_timeout: 20,
  connect_timeout: 10,
});
```

## Troubleshooting

### "Connection timed out"
- Check that your IP isn't blocked by firewall
- Verify `sslmode=require` is in connection string
- Ensure you're using the correct region

### "Database does not exist"
- Double-check database name in connection string
- Verify you're connecting to the right project

### "Too many connections"
- For serverless, use `max: 1` in connection pool config
- Close unused connections
- Consider upgrading to paid plan for more connections

### "SSL connection required"
- Always include `?sslmode=require` in connection string
- Neon requires SSL for all connections

## Security Best Practices

- ✅ **DO**: Use `?sslmode=require` in all connection strings
- ✅ **DO**: Store connection string in `.env` (local) or Pulumi secrets (production)
- ✅ **DO**: Rotate passwords periodically
- ❌ **DON'T**: Commit connection strings to Git
- ❌ **DON'T**: Share connection strings via email/chat
- ❌ **DON'T**: Use production database for local development (use branches)

## Next Steps

After setting up Neon:

1. Configure backend `.env` file with `DATABASE_URL`
2. Run database migrations: `pnpm db:migrate`
3. Test local backend: `pnpm backend:dev`
4. Set Pulumi secret for production deployment

## Useful Links

- **Neon Console**: https://console.neon.tech
- **Neon Documentation**: https://neon.tech/docs
- **Neon CLI**: https://neon.tech/docs/reference/cli-install
- **Connection Guides**: https://neon.tech/docs/connect/connect-from-any-app