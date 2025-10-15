#!/bin/bash

# Script to help set up GitHub secrets for deployment
# This script provides instructions and commands to configure deployment

set -e

echo "=================================================="
echo "Eat-Sheet Deployment Secrets Setup"
echo "=================================================="
echo ""
echo "This script will help you configure GitHub secrets for deployment."
echo "You'll need the GitHub CLI (gh) installed: brew install gh"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install it with: brew install gh"
    echo "Then run: gh auth login"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI"
    echo "Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Function to set secret
set_secret() {
    local secret_name=$1
    local secret_description=$2

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Setting: $secret_name"
    echo "Description: $secret_description"
    echo ""
    read -p "Enter value for $secret_name (input hidden): " -s secret_value
    echo ""

    if [ -z "$secret_value" ]; then
        echo "⚠️  Skipping $secret_name (no value provided)"
        echo ""
        return
    fi

    gh secret set "$secret_name" --body "$secret_value"
    echo "✅ $secret_name set successfully"
    echo ""
}

echo "Setting up AWS credentials..."
echo ""

set_secret "AWS_ACCESS_KEY_ID" "AWS Access Key ID for deployment"
set_secret "AWS_SECRET_ACCESS_KEY" "AWS Secret Access Key for deployment"

echo ""
echo "Setting up Pulumi access token..."
echo "Get this from: https://app.pulumi.com/account/tokens"
echo ""

set_secret "PULUMI_ACCESS_TOKEN" "Pulumi access token for infrastructure deployment"

echo ""
echo "Setting up staging environment secrets..."
echo ""

set_secret "STAGING_DATABASE_URL" "Staging database connection string (postgresql://...)"
set_secret "STAGING_CLOUDFRONT_DISTRIBUTION_ID" "CloudFront distribution ID for staging (optional)"

echo ""
echo "Setting up production environment secrets..."
echo ""

set_secret "PROD_DATABASE_URL" "Production database connection string (postgresql://...)"
set_secret "PROD_CLOUDFRONT_DISTRIBUTION_ID" "CloudFront distribution ID for production (optional)"

echo ""
echo "=================================================="
echo "✅ Deployment secrets setup complete!"
echo "=================================================="
echo ""
echo "Next steps:"
echo "1. Configure GitHub environments (staging, production)"
echo "2. Initialize Pulumi stacks (see docs/DEPLOYMENT.md)"
echo "3. Test staging deployment"
echo "4. Deploy to production when ready"
echo ""
echo "See docs/DEPLOYMENT.md for detailed instructions."
echo ""
