# Eat-Sheet Infrastructure

Pulumi Infrastructure as Code for Eat-Sheet platform.

## Prerequisites

1. **AWS CLI configured** with credentials
2. **Pulumi CLI installed**: `brew install pulumi`
3. **Node.js and pnpm installed**

## Initial Setup

### 1. Install Dependencies

```bash
cd infrastructure
pnpm install
```

### 2. Login to Pulumi

```bash
# Use S3 backend (recommended)
pulumi login s3://your-pulumi-state-bucket

# Or use Pulumi Cloud (free for individuals)
pulumi login
```

### 3. Initialize Stack

```bash
# Create a new stack (dev, staging, or prod)
pulumi stack init dev

# Set AWS region
pulumi config set aws:region us-east-1
```

### 4. Set Configuration (Optional)

```bash
# Set custom domain (optional)
pulumi config set domain eat-sheet.com

# Set database URL as secret
pulumi config set --secret databaseUrl "postgresql://..."
```

## Deployment

### Preview Changes

```bash
pnpm preview
# or
pulumi preview
```

### Deploy Infrastructure

```bash
pnpm deploy
# or
pulumi up
```

This will create:
- AWS Cognito User Pool
- Cognito User Pool Client
- Cognito Domain (for hosted UI)

### View Outputs

```bash
pulumi stack output
```

Outputs:
- `cognitoUserPoolId` - User Pool ID for backend
- `cognitoClientId` - Client ID for frontend
- `cognitoRegion` - AWS region
- `backendEnvVars` - Ready-to-use env vars for backend

### Update Backend .env

After deployment, copy the output values to `backend/.env`:

```bash
# Get env vars
pulumi stack output backendEnvVars

# Copy to backend/.env
pulumi stack output backendEnvVars >> ../backend/.env
```

## Stack Management

### List Stacks

```bash
pulumi stack ls
```

### Switch Stack

```bash
pulumi stack select dev
pulumi stack select prod
```

### View Stack Outputs

```bash
pulumi stack output
pulumi stack output cognitoUserPoolId
```

### Stack Configuration

```bash
# View all config
pulumi config

# Set config value
pulumi config set key value

# Set secret (encrypted)
pulumi config set --secret apiKey "secret-value"
```

## Destroy Infrastructure

**⚠️ WARNING: This will delete all resources!**

```bash
pnpm destroy
# or
pulumi destroy
```

## Infrastructure Components

### Current (MVP)

- **AWS Cognito User Pool** - User authentication
- **Cognito User Pool Client** - Web app client
- **Cognito Domain** - Hosted UI domain

### Future Additions

- **AWS Lambda** - API backend
- **API Gateway** - REST API endpoint
- **S3 Buckets** - Frontend hosting + images
- **CloudFront** - CDN distribution
- **Route53** - DNS management (if using custom domain)

## Troubleshooting

### "No valid credential sources found"

Configure AWS CLI:
```bash
aws configure
```

### "Failed to get existing workspaces"

Login to Pulumi:
```bash
pulumi login
```

### "Stack already exists"

Select the existing stack:
```bash
pulumi stack select dev
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy Infrastructure
on:
  push:
    branches: [main]
    paths: [infrastructure/**]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g pnpm
      - run: pnpm install
        working-directory: infrastructure
      - uses: pulumi/actions@v3
        with:
          command: up
          stack-name: prod
          work-dir: infrastructure
        env:
          PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Resources

- [Pulumi AWS Documentation](https://www.pulumi.com/docs/clouds/aws/)
- [Pulumi Cognito Examples](https://www.pulumi.com/registry/packages/aws/api-docs/cognito/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)