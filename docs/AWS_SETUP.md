# AWS Account Setup Guide

This guide walks you through setting up your AWS account for the Eat-Sheet project.

## Prerequisites

- Gmail account: `mattbutlerengineering@gmail.com`
- AWS CLI installed (version 2.x)
- Credit card for AWS account verification

## Step 1: Create AWS Account

1. Go to https://aws.amazon.com
2. Click "Create an AWS Account"
3. Enter email: `mattbutlerengineering@gmail.com`
4. Choose account name: `eat-sheet-production` (or similar)
5. Complete the registration process:
   - Provide contact information
   - Enter payment information (credit card)
   - Verify phone number
   - Select "Basic support - Free" plan
6. Sign in to AWS Console: https://console.aws.amazon.com

## Step 2: Enable MFA (Multi-Factor Authentication)

**Highly recommended for security:**

1. Go to IAM Dashboard: https://console.aws.amazon.com/iam
2. Click on your account name (top right) → "Security credentials"
3. Find "Multi-factor authentication (MFA)" section
4. Click "Assign MFA device"
5. Choose "Virtual MFA device" (use Google Authenticator or Authy)
6. Follow the setup wizard to scan QR code
7. Enter two consecutive MFA codes to verify

## Step 3: Create IAM User for Programmatic Access

**Do NOT use your root account for daily operations. Create an IAM user instead.**

### 3.1: Create IAM User

1. Go to IAM Users: https://console.aws.amazon.com/iam/home#/users
2. Click "Create user"
3. User details:
   - **Username**: `eat-sheet-deploy`
   - Click "Next"
4. Set permissions:
   - Select "Attach policies directly"
   - Search and check: `AdministratorAccess`
   - Click "Next"
5. Review and click "Create user"

### 3.2: Create Access Keys

1. Click on the newly created user: `eat-sheet-deploy`
2. Go to "Security credentials" tab
3. Scroll to "Access keys" section
4. Click "Create access key"
5. Select use case: "Command Line Interface (CLI)"
6. Check the confirmation box: "I understand the above recommendation..."
7. Click "Next"
8. (Optional) Add description tag: "Local development and deployment"
9. Click "Create access key"
10. **IMPORTANT**: Save your credentials securely:
    - **Access key ID**: `AKIA...` (copy this)
    - **Secret access key**: `wJalrXUtn...` (copy this - shown only once!)
    - Download the CSV file as backup
11. Click "Done"

### 3.3: Enable MFA for IAM User (Recommended)

1. While on the `eat-sheet-deploy` user page
2. Go to "Security credentials" tab
3. Find "Multi-factor authentication (MFA)" section
4. Click "Assign MFA device"
5. Follow the same process as Step 2

## Step 4: Configure AWS CLI

### 4.1: Run AWS Configure

Open your terminal and run:

```bash
aws configure
```

Enter the following when prompted:

```
AWS Access Key ID [None]: <paste your Access key ID>
AWS Secret Access Key [None]: <paste your Secret access key>
Default region name [None]: us-east-1
Default output format [None]: json
```

### 4.2: Verify Configuration

Test that AWS CLI is working:

```bash
# Check current identity
aws sts get-caller-identity

# Expected output:
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/eat-sheet-deploy"
}
```

### 4.3: Configure Named Profile (Optional)

If you work with multiple AWS accounts, use named profiles:

```bash
# Configure a named profile
aws configure --profile eat-sheet

# Use the profile in commands
aws s3 ls --profile eat-sheet

# Or export as default
export AWS_PROFILE=eat-sheet
```

## Step 5: Set Up AWS Budget Alerts

**Prevent unexpected charges - set up billing alerts:**

1. Go to AWS Billing Console: https://console.aws.amazon.com/billing
2. Click "Budgets" in the left sidebar
3. Click "Create budget"
4. Select "Use a template"
5. Choose "Zero spend budget" template
6. Enter email: `mattbutlerengineering@gmail.com`
7. Click "Create budget"

**Also create a monthly budget:**

1. Create another budget
2. Select "Customize (advanced)"
3. Choose "Monthly budget"
4. Set amount: `$20` (adjust as needed)
5. Configure alerts:
   - Alert at 50% ($10)
   - Alert at 80% ($16)
   - Alert at 100% ($20)
6. Enter email: `mattbutlerengineering@gmail.com`
7. Click "Create budget"

## Step 6: Create S3 Buckets (Needed for Pulumi State)

Pulumi needs an S3 bucket to store infrastructure state:

```bash
# Create S3 bucket for Pulumi state (replace UNIQUE-NAME with something unique)
aws s3 mb s3://eat-sheet-pulumi-state-UNIQUE-NAME --region us-east-1

# Enable versioning (important for state recovery)
aws s3api put-bucket-versioning \
  --bucket eat-sheet-pulumi-state-UNIQUE-NAME \
  --versioning-configuration Status=Enabled

# Block public access
aws s3api put-public-access-block \
  --bucket eat-sheet-pulumi-state-UNIQUE-NAME \
  --public-access-block-configuration \
    BlockPublicAcls=true,\
    IgnorePublicAcls=true,\
    BlockPublicPolicy=true,\
    RestrictPublicBuckets=true
```

## Step 7: Install and Configure Pulumi

### 7.1: Install Pulumi

On macOS:
```bash
brew install pulumi
```

Or download from: https://www.pulumi.com/docs/get-started/install/

### 7.2: Configure Pulumi Backend

```bash
# Set Pulumi to use S3 backend
pulumi login s3://eat-sheet-pulumi-state-UNIQUE-NAME
```

### 7.3: Initialize Pulumi Stack

```bash
# Navigate to infrastructure directory
cd infrastructure

# Initialize stack
pulumi stack init dev

# Configure AWS region
pulumi config set aws:region us-east-1

# Configure domain (if you have one)
pulumi config set eat-sheet:domain eat-sheet.com

# Set secrets (will be encrypted by Pulumi)
pulumi config set --secret databaseUrl "postgresql://user:pass@host:5432/db"
pulumi config set --secret openaiApiKey "sk-..."
```

## Step 8: Verify Everything is Working

Run these commands to verify your setup:

```bash
# 1. AWS CLI is configured
aws sts get-caller-identity

# 2. Can list S3 buckets
aws s3 ls

# 3. Pulumi is logged in
pulumi whoami

# 4. Pulumi can access AWS
cd infrastructure
pulumi preview
```

## Security Best Practices

### Credentials Management

- ✅ **DO**: Use IAM users with limited permissions for specific tasks
- ✅ **DO**: Enable MFA on both root and IAM accounts
- ✅ **DO**: Rotate access keys every 90 days
- ✅ **DO**: Use AWS Secrets Manager for application secrets
- ❌ **DON'T**: Commit AWS credentials to Git
- ❌ **DON'T**: Share access keys via email or chat
- ❌ **DON'T**: Use root account for daily operations

### Where Credentials are Stored

AWS CLI stores credentials in:
- `~/.aws/credentials` (access keys - **never commit this**)
- `~/.aws/config` (region and output settings)

**Make sure these are in `.gitignore`** (they should be by default)

### Rotating Access Keys

Every 90 days:

1. Create a new access key for `eat-sheet-deploy` user
2. Update `~/.aws/credentials` with new keys
3. Test that everything works
4. Delete old access key in AWS Console

## Troubleshooting

### "Unable to locate credentials"

```bash
# Check if credentials are configured
cat ~/.aws/credentials

# Reconfigure if needed
aws configure
```

### "Access Denied" errors

- Verify IAM user has correct permissions
- Check that you're using the right AWS profile
- Ensure MFA isn't required for programmatic access

### Pulumi state conflicts

```bash
# Refresh state
pulumi refresh

# Cancel any pending operations
pulumi cancel
```

## Next Steps

After completing this setup:

1. Review the [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)
2. Set up database on Neon: https://console.neon.tech
3. Configure environment variables for backend
4. Run first Pulumi deployment: `pulumi up`

## Cost Monitoring

**Expected monthly costs with free tier:**
- AWS Lambda: $0 (1M free requests/month)
- API Gateway: $0 (first 12 months free tier)
- S3: ~$0.50 (minimal storage)
- CloudFront: $0 (free tier covers most usage)
- **Total: $0-5/month**

Monitor costs at: https://console.aws.amazon.com/billing

## Support

If you encounter issues:
- AWS Documentation: https://docs.aws.amazon.com
- Pulumi Documentation: https://www.pulumi.com/docs
- AWS Support: https://console.aws.amazon.com/support