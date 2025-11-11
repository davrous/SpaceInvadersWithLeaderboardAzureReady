# GitHub Actions Deployment Setup Guide

This guide walks you through setting up automated deployments to Azure when PRs are merged to the `main` branch.

## Overview

The workflow (`.github/workflows/azure-deploy.yml`) automatically deploys your Space Invaders application to Azure using Azure Developer CLI (azd) when:
- A pull request is merged to the `main` branch
- Manually triggered via GitHub Actions UI

## Prerequisites

1. **Azure Subscription** - You need an active Azure subscription
2. **Azure Developer CLI** - Install locally: https://aka.ms/azd-install
3. **GitHub Repository** - Your code must be in a GitHub repository
4. **Existing Azure Deployment** - Run `azd up` locally first to create the initial deployment

## Step 1: Configure Azure Service Principal with OIDC

### Option A: Using Azure CLI (Recommended)

```bash
# 1. Set your variables
SUBSCRIPTION_ID="your-subscription-id"
RESOURCE_GROUP="rg-space-invaders-prod"  # Your resource group name
GITHUB_ORG="your-github-username"
GITHUB_REPO="SpaceInvadersWithLeaderboardAzureReady"

# 2. Create Azure AD Application
APP_ID=$(az ad app create --display-name "github-spaceinvaders-deploy" --query appId -o tsv)
echo "Application (Client) ID: $APP_ID"

# 3. Create Service Principal
az ad sp create --id $APP_ID

# 4. Get Object ID
OBJECT_ID=$(az ad sp show --id $APP_ID --query id -o tsv)

# 5. Assign Contributor role to the subscription
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID

# 6. Configure OIDC federation
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-deploy",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':ref:refs/heads/main",
    "description": "GitHub Actions deployment",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# 7. Configure OIDC federation for pull requests (REQUIRED for PR deployments)
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-deploy-pr",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'$GITHUB_ORG'/'$GITHUB_REPO':pull_request",
    "description": "GitHub Actions deployment from pull requests",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# 8. Get your Tenant ID
TENANT_ID=$(az account show --query tenantId -o tsv)
echo "Tenant ID: $TENANT_ID"
```

Save these values - you'll need them for GitHub secrets:
- `Application (Client) ID`
- `Tenant ID`
- `Subscription ID`

### Option B: Using Azure Portal

1. **Create App Registration:**
   - Go to Azure Portal → Azure Active Directory → App registrations
   - Click "New registration"
   - Name: `github-spaceinvaders-deploy`
   - Click "Register"
   - Copy the **Application (client) ID** and **Directory (tenant) ID**

2. **Configure Federated Credentials:**
   - In your app registration, go to "Certificates & secrets"
   - Click "Federated credentials" tab
   - Click "Add credential"
   - Select "GitHub Actions deploying Azure resources"
   - Fill in:
     - Organization: `your-github-username`
     - Repository: `SpaceInvadersWithLeaderboardAzureReady`
     - Entity type: `Branch`
     - Branch name: `main`
     - Name: `github-deploy`
   - Click "Add"

3. **Assign Permissions:**
   - Go to your Subscription → Access control (IAM)
   - Click "Add role assignment"
   - Select "Contributor" role
   - Click "Next"
   - Click "Select members"
   - Search for `github-spaceinvaders-deploy`
   - Select it and click "Select"
   - Click "Review + assign"

## Step 2: Get Azure Developer CLI Environment Configuration

Run this command locally (after you've done `azd up` at least once):

```bash
# Get your environment configuration
azd env get-values
```

You'll see output like:
```
AZURE_ENV_NAME="space-invaders-prod"
AZURE_LOCATION="eastus"
AZURE_SUBSCRIPTION_ID="your-sub-id"
...
```

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → "New repository secret"

Add these secrets:

### Required Secrets:

| Secret Name | Value | How to Get It |
|-------------|-------|---------------|
| `AZURE_CLIENT_ID` | Application (Client) ID | From Step 1 |
| `AZURE_TENANT_ID` | Directory (Tenant) ID | From Step 1 |
| `AZURE_SUBSCRIPTION_ID` | Your Azure Subscription ID | From Azure Portal or `az account show --query id -o tsv` |
| `AZURE_ENV_NAME` | Your environment name | From `azd env get-values` (e.g., "space-invaders-prod") |
| `AZURE_LOCATION` | Azure region | From `azd env get-values` (e.g., "eastus") |
| `AZD_INITIAL_ENVIRONMENT_CONFIG` | Base64 encoded config | See below |

### Creating AZD_INITIAL_ENVIRONMENT_CONFIG:

```bash
# Linux/macOS
azd env get-values | base64 -w 0

# Windows PowerShell
azd env get-values | Out-String | [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content)))

# Or manually:
# 1. Run: azd env get-values
# 2. Copy all output
# 3. Base64 encode it using an online tool or command
# 4. Paste the base64 string as the secret value
```

## Step 4: Test the Workflow

### Option 1: Manual Trigger
1. Go to GitHub → Actions tab
2. Select "Deploy to Azure" workflow
3. Click "Run workflow"
4. Select the `main` branch
5. Click "Run workflow"

### Option 2: Create a Test PR
1. Create a new branch: `git checkout -b test-deployment`
2. Make a small change (e.g., update README)
3. Commit and push: `git push origin test-deployment`
4. Create a PR to `main` on GitHub
5. Merge the PR
6. The workflow will automatically trigger

## Step 5: Monitor Deployment

1. Go to GitHub → Actions tab
2. Click on the running workflow
3. Watch the deployment progress
4. Check the "Deployment Summary" step for the deployed URL

## Troubleshooting

### Authentication Failures
- Verify all secrets are correctly set
- Ensure the service principal has Contributor role
- Check that the federated credential subject matches your repo

### Deployment Failures
- Check that `azd up` works locally first
- Verify all Key Vault secrets are set in Azure
- Review Azure Portal for resource issues

### azd Command Not Found
- The workflow installs azd automatically
- If issues persist, check the "Install Azure Developer CLI" step logs

## Security Best Practices

1. **Never commit secrets to git**
2. **Use OIDC (OpenID Connect)** - No passwords/keys stored in GitHub
3. **Restrict branch access** - Protect the `main` branch
4. **Review PRs carefully** - Deployments happen automatically after merge
5. **Monitor deployments** - Set up alerts for failed deployments

## Additional Resources

- [Azure Developer CLI Documentation](https://learn.microsoft.com/azure/developer/azure-developer-cli/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [OIDC with GitHub Actions](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-azure)

## Workflow Features

- ✅ Automatic deployment on PR merge
- ✅ Manual deployment option
- ✅ Secure authentication with OIDC (no passwords)
- ✅ Runs only on merged PRs (not closed-only)
- ✅ Node.js dependency caching
- ✅ Deployment status summary

## Next Steps

After setup is complete:
1. Test with a small PR
2. Set up branch protection rules
3. Configure deployment approvals (optional)
4. Add deployment notifications (optional)
