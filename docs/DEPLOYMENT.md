# Deployment Guide

This guide covers the deployment process for the Eat-Sheet platform to staging and production environments.

## Overview

The deployment pipeline consists of:
- **Staging Environment**: Automatically deploys when code is pushed to `main` branch
- **Production Environment**: Manual deployment via GitHub Actions workflow

## Environment Architecture

### Staging Environment
- **Purpose**: Pre-production testing and validation
- **Trigger**: Automatic on push to `main` branch
- **AWS Resources**: Separate Pulumi stack (`staging`)
- **Domain**: `staging.eat-sheet.com` (configure as needed)
- **Database**: Separate staging database instance

### Production Environment
- **Purpose**: Live customer-facing application
- **Trigger**: Manual deployment with confirmation
- **AWS Resources**: Separate Pulumi stack (`prod`)
- **Domain**: `eat-sheet.com`
- **Database**: Production database with backups

## Prerequisites

### 1. AWS Account Setup
- AWS account with appropriate permissions
- IAM user with programmatic access
- Required permissions:
  - S3 (create/manage buckets)
  - Lambda (create/deploy functions)
  - API Gateway (create/manage APIs)
  - Cognito (create/manage user pools)
  - CloudFront (create/manage distributions)
  - IAM (create roles for Lambda)

### 2. Pulumi Setup
1. Create a Pulumi account at https://app.pulumi.com
2. Create a new project or organization
3. Generate an access token from Pulumi console

### 3. GitHub Secrets Configuration

Configure the following secrets in your GitHub repository:
- Go to **Settings** → **Secrets and variables** → **Actions**
- Add the following repository secrets:

#### AWS Credentials
```
AWS_ACCESS_KEY_ID=<your-aws-access-key-id>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-access-key>
```

#### Pulumi Access Token
```
PULUMI_ACCESS_TOKEN=<your-pulumi-access-token>
```

#### Staging Environment Secrets
```
STAGING_DATABASE_URL=postgresql://user:password@staging-host:5432/staging_db
STAGING_CLOUDFRONT_DISTRIBUTION_ID=<cloudfront-id-if-applicable>
```

#### Production Environment Secrets
```
PROD_DATABASE_URL=postgresql://user:password@prod-host:5432/prod_db
PROD_CLOUDFRONT_DISTRIBUTION_ID=<cloudfront-id-if-applicable>
```

### 4. GitHub Environment Configuration

Set up GitHub Environments for additional protection:

#### Staging Environment
1. Go to **Settings** → **Environments** → **New environment**
2. Name: `staging`
3. No protection rules needed (auto-deploy)

#### Production Environment
1. Go to **Settings** → **Environments** → **New environment**
2. Name: `production`
3. **Protection rules**:
   - ✅ Required reviewers (add team members)
   - ✅ Wait timer: 5 minutes (optional)
   - ✅ Deployment branches: `main` only

## Pulumi Stack Configuration

### Initialize Staging Stack

```bash
cd apps/infrastructure

# Select or create staging stack
pulumi stack select staging --create

# Configure AWS region
pulumi config set aws:region us-east-1

# Set staging-specific configuration
pulumi config set --secret eat-sheet:databaseUrl "postgresql://..."
pulumi config set --secret eat-sheet:openaiApiKey "sk-..."

# Preview infrastructure changes
pulumi preview

# Deploy infrastructure
pulumi up
```

### Initialize Production Stack

```bash
cd apps/infrastructure

# Select or create production stack
pulumi stack select prod --create

# Configure AWS region
pulumi config set aws:region us-east-1

# Set production domain
pulumi config set eat-sheet:domain eat-sheet.com

# Set production-specific configuration
pulumi config set --secret eat-sheet:databaseUrl "postgresql://..."
pulumi config set --secret eat-sheet:openaiApiKey "sk-..."

# Preview infrastructure changes
pulumi preview

# Deploy infrastructure (with caution!)
pulumi up
```

## Deployment Process

### Deploying to Staging

Staging deploys **automatically** when code is pushed to the `main` branch.

```bash
# Make changes and commit
git add .
git commit -m "feat: add new feature"
git push origin main

# GitHub Actions will automatically:
# 1. Run CI tests
# 2. Build backend and frontend
# 3. Deploy infrastructure via Pulumi
# 4. Deploy Lambda function
# 5. Deploy frontend to S3
# 6. Run database migrations
# 7. Invalidate CloudFront cache
```

**Manual staging deployment:**
1. Go to **Actions** → **Deploy to Staging**
2. Click **Run workflow**
3. Select `main` branch
4. Click **Run workflow**

### Deploying to Production

Production requires **manual approval** and confirmation.

1. Go to **Actions** → **Deploy to Production**
2. Click **Run workflow**
3. Enter `deploy` in the confirmation field
4. Click **Run workflow**
5. Wait for reviewer approval (if configured)
6. Monitor deployment progress

**Production deployment steps:**
1. ✅ Run all tests (backend + frontend)
2. ✅ Type check all projects
3. ✅ Build backend and verify
4. ✅ Preview Pulumi infrastructure changes
5. ✅ Deploy infrastructure
6. ✅ Package and deploy Lambda
7. ✅ Build frontend and verify
8. ✅ Deploy frontend to S3
9. ✅ Invalidate CloudFront cache
10. ✅ Run database migrations
11. ✅ Verify deployment health

## Database Migrations

### Staging Migrations

Migrations run automatically during staging deployment.

**Manual migration:**
```bash
# Set staging database URL
export DATABASE_URL="postgresql://..."

cd apps/backend
pnpm db:migrate
```

### Production Migrations

Migrations run during production deployment **with extra caution**.

**Best practices:**
- Test migrations in staging first
- Review migration SQL before deploying
- Have rollback plan ready
- Take database backup before major migrations

**Manual migration:**
```bash
# Set production database URL
export DATABASE_URL="postgresql://..."

cd apps/backend

# Preview migration
pnpm db:generate  # Review generated SQL

# Apply migration
pnpm db:migrate
```

## Rollback Procedures

### Rollback Infrastructure Changes

```bash
cd apps/infrastructure

# View stack history
pulumi stack history

# Rollback to specific version
pulumi stack select staging  # or prod
pulumi up --target-replace <resource-name>

# Or destroy and recreate specific resources
pulumi destroy --target <resource-name>
pulumi up
```

### Rollback Frontend Deployment

```bash
# Restore previous version from S3 versioning
aws s3api list-object-versions --bucket eat-sheet-frontend-prod

# Restore specific version
aws s3api copy-object \
  --copy-source eat-sheet-frontend-prod/index.html?versionId=<version> \
  --bucket eat-sheet-frontend-prod \
  --key index.html

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

### Rollback Database Migration

```bash
# Connect to database
psql $DATABASE_URL

# Manually revert changes (no auto-rollback in Drizzle)
# Execute rollback SQL prepared beforehand

# Example:
DROP TABLE IF EXISTS new_table;
ALTER TABLE old_table DROP COLUMN new_column;
```

## Monitoring and Verification

### Post-Deployment Checks

**Staging:**
1. Check deployment logs in GitHub Actions
2. Visit staging URL and test critical flows
3. Check CloudWatch logs for errors
4. Verify database migrations applied

**Production:**
1. All staging checks +
2. Monitor error rates for 15 minutes
3. Test authentication flow
4. Check analytics/monitoring dashboards
5. Verify CloudFront cache behavior

### CloudWatch Logs

```bash
# View Lambda logs
aws logs tail /aws/lambda/eat-sheet-api-lambda-staging --follow
aws logs tail /aws/lambda/eat-sheet-api-lambda-prod --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/eat-sheet-api-lambda-prod \
  --filter-pattern "ERROR"
```

### Health Checks

Add health check endpoints to verify deployment:

```bash
# Check API health
curl https://api-staging.eat-sheet.com/health
curl https://api.eat-sheet.com/health

# Check frontend
curl -I https://staging.eat-sheet.com
curl -I https://eat-sheet.com
```

## Troubleshooting

### Deployment Fails

**Check GitHub Actions logs:**
1. Go to Actions → Failed workflow
2. Click on failed job
3. Review error messages

**Common issues:**
- Missing secrets → Check GitHub secrets configuration
- Pulumi state conflict → Check Pulumi console, may need to refresh state
- Build errors → Run `rush build` locally to reproduce
- AWS permissions → Verify IAM user has required permissions

### Lambda Not Updating

**Verify Lambda deployment:**
```bash
# Check Lambda function version
aws lambda get-function-configuration --function-name eat-sheet-api-lambda-staging

# Check last modified date
aws lambda list-versions-by-function --function-name eat-sheet-api-lambda-staging
```

**Force update:**
```bash
cd apps/infrastructure
pulumi up --refresh --stack staging
```

### Database Migration Fails

**Check migration status:**
```bash
# Connect to database
psql $DATABASE_URL

# Check migration table
SELECT * FROM drizzle_migrations ORDER BY created_at DESC LIMIT 5;
```

**Manually run migration:**
```bash
cd apps/backend
export DATABASE_URL="postgresql://..."
pnpm db:migrate
```

### Frontend Not Updating

**Check S3 deployment:**
```bash
# List recent files
aws s3 ls s3://eat-sheet-frontend-staging/ --recursive --human-readable

# Check if files uploaded
aws s3 ls s3://eat-sheet-frontend-staging/assets/
```

**Clear CloudFront cache:**
```bash
aws cloudfront create-invalidation \
  --distribution-id <DISTRIBUTION_ID> \
  --paths "/*"
```

## Cost Optimization

### Staging Environment
- Use smaller Lambda memory (512MB vs 1024MB)
- Shorter log retention (7 days vs 30 days)
- Single AZ database instance
- No CloudFront caching (use S3 directly for staging)

### Production Environment
- Optimize Lambda memory for cost/performance
- Use CloudFront for global CDN
- Enable S3 Intelligent Tiering
- Set up CloudWatch alarms for cost monitoring

## Security Best Practices

### Secrets Management
- ✅ Never commit secrets to git
- ✅ Use Pulumi secrets for sensitive config
- ✅ Use GitHub encrypted secrets
- ✅ Rotate credentials quarterly
- ✅ Use separate databases for staging/prod
- ✅ Restrict AWS IAM permissions (principle of least privilege)

### Environment Isolation
- ✅ Separate AWS resources per environment
- ✅ Separate Cognito user pools
- ✅ Separate S3 buckets
- ✅ Separate databases

### Access Control
- ✅ Require code review for production deployments
- ✅ Limit who can approve production deployments
- ✅ Enable MFA for AWS root account
- ✅ Use GitHub branch protection for `main`

## Continuous Improvement

### Monitoring Setup
- [ ] Set up CloudWatch alarms for errors
- [ ] Configure application performance monitoring (APM)
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor database performance metrics
- [ ] Track deployment frequency and success rate

### Future Enhancements
- [ ] Add smoke tests after deployment
- [ ] Implement blue-green deployment
- [ ] Add automatic rollback on error spike
- [ ] Set up deployment notifications (Slack/Discord)
- [ ] Add performance budgets and tracking
- [ ] Implement canary deployments

## Quick Reference

### Common Commands

```bash
# Deploy to staging manually
gh workflow run deploy-staging.yml

# Deploy to production manually
gh workflow run deploy-production.yml -f confirm=deploy

# View Pulumi stack outputs
pulumi stack output --stack staging
pulumi stack output --stack prod

# Check deployment status
gh run list --workflow=deploy-staging.yml
gh run list --workflow=deploy-production.yml
```

### Important URLs
- **Pulumi Console**: https://app.pulumi.com
- **GitHub Actions**: https://github.com/[org]/[repo]/actions
- **AWS Console**: https://console.aws.amazon.com
- **Staging**: https://staging.eat-sheet.com
- **Production**: https://eat-sheet.com

## Support

For deployment issues:
1. Check this documentation
2. Review GitHub Actions logs
3. Check CloudWatch logs
4. Review Pulumi console for infrastructure state
5. Contact DevOps team or create GitHub issue
