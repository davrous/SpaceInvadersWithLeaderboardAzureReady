# GitHub Secrets Configuration

This document lists all the secrets you need to configure in your GitHub repository for automated deployment.

## Required GitHub Secrets

Go to: **Repository Settings → Secrets and variables → Actions → New repository secret**

### 1. Azure Authentication (OIDC)

| Secret Name | Value | Example |
|-------------|-------|---------|
| `AZURE_CLIENT_ID` | Application (Client) ID from Azure AD | `12345678-1234-1234-1234-123456789abc` |
| `AZURE_TENANT_ID` | Directory (Tenant) ID from Azure AD | `87654321-4321-4321-4321-cba987654321` |
| `AZURE_SUBSCRIPTION_ID` | Your Azure Subscription ID | `52f0b600-1e9b-4d67-b7b3-8cabb3468e88` |

### 2. Azure Environment Configuration

| Secret Name | Value | Your Value |
|-------------|-------|------------|
| `AZURE_ENV_NAME` | Azure Developer CLI environment name | `spaceinvadersdevdayprod` |
| `AZURE_LOCATION` | Azure region for deployment | `westeurope` |

### 3. Base64 Encoded Environment Config (Optional but Recommended)

**⚠️ IMPORTANT: Do NOT include sensitive secrets in this config!**

The `AZD_INITIAL_ENVIRONMENT_CONFIG` secret should contain a base64-encoded version of your azd environment values, **BUT WITHOUT SECRETS**.

#### Creating the Config (Recommended Method)

Create a file named `.env.deployment` with **only non-sensitive values**:

```env
AI_ENDPOINT=https://models.github.ai/inference
AI_MODEL=openai/gpt-4.1-mini
AZURE_ENV_NAME=spaceinvadersdevdayprod
AZURE_LOCATION=westeurope
AZURE_RESOURCE_GROUP=rg-spaceinvadersdevdayprod
AZURE_SUBSCRIPTION_ID=52f0b600-1e9b-4d67-b7b3-8cabb3468e88
CALLBACK_URL=https://appqpbignwvkotjs.azurewebsites.net
ENABLE_AI_LEVELS=true
NODE_ENV=production
PORT=8080
```

Then encode it:

**Linux/macOS/Git Bash:**
```bash
cat .env.deployment | base64 -w 0
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content .env.deployment -Raw)))
```

Copy the output and create a GitHub secret named `AZD_INITIAL_ENVIRONMENT_CONFIG` with that value.

## Secrets Already in Azure Key Vault

These secrets are already stored securely in Azure Key Vault and will be automatically retrieved during deployment. **Do NOT add them to GitHub secrets:**

- ✅ `SESSION_SECRET` - Already in Key Vault
- ✅ `GITHUB_CLIENT_ID` - Already in Key Vault
- ✅ `GITHUB_CLIENT_SECRET` - Already in Key Vault
- ✅ `GITHUB_TOKEN` - Already in Key Vault
- ✅ `GOOGLE_CLIENT_ID` - Already in Key Vault
- ✅ `GOOGLE_CLIENT_SECRET` - Already in Key Vault
- ✅ `MICROSOFT_CLIENT_ID` - Already in Key Vault
- ✅ `MICROSOFT_CLIENT_SECRET` - Already in Key Vault

## Current Configuration Summary

Based on your local environment, here are the values you should use:

```
AZURE_ENV_NAME: spaceinvadersdevdayprod
AZURE_LOCATION: westeurope
AZURE_SUBSCRIPTION_ID: 52f0b600-1e9b-4d67-b7b3-8cabb3468e88
```

## Quick Setup Checklist

- [ ] Create Azure AD App Registration with OIDC federation
- [ ] Assign Contributor role to the service principal
- [ ] Add `AZURE_CLIENT_ID` secret to GitHub
- [ ] Add `AZURE_TENANT_ID` secret to GitHub
- [ ] Add `AZURE_SUBSCRIPTION_ID` secret to GitHub (value: `52f0b600-1e9b-4d67-b7b3-8cabb3468e88`)
- [ ] Add `AZURE_ENV_NAME` secret to GitHub (value: `spaceinvadersdevdayprod`)
- [ ] Add `AZURE_LOCATION` secret to GitHub (value: `westeurope`)
- [ ] (Optional) Add `AZD_INITIAL_ENVIRONMENT_CONFIG` secret with base64 config (without secrets)
- [ ] Test the workflow with a manual trigger

## Verification

After setting up all secrets, you can verify by:

1. Going to **Actions** tab in GitHub
2. Select **Deploy to Azure** workflow
3. Click **Run workflow** → Select `main` branch → **Run workflow**
4. Monitor the workflow execution

## Troubleshooting

### "base64: invalid input" Error

This means the `AZD_INITIAL_ENVIRONMENT_CONFIG` secret is either:
- Not set (which is fine, the workflow will create a fresh environment)
- Contains invalid base64 data

**Solution:** Either remove this secret or recreate it following the instructions above.

### Authentication Failures

Verify:
- Service principal has Contributor role on the subscription
- OIDC federated credential is configured correctly
- All three Azure auth secrets (`CLIENT_ID`, `TENANT_ID`, `SUBSCRIPTION_ID`) are set

### Deployment Fails

Check:
- Ensure `azd up` works locally first
- Verify all Key Vault secrets are properly configured in Azure
- Check Azure Portal for resource quota or permissions issues

## Security Notes

🔒 **Best Practices:**
- Never commit secrets to git
- Use Azure Key Vault for application secrets
- Use GitHub OIDC for Azure authentication (no passwords)
- Regularly rotate OAuth client secrets
- Monitor GitHub Actions logs for any exposed secrets (GitHub will mask known secrets)

## Need Help?

Refer to `.github/DEPLOYMENT_SETUP.md` for the full setup guide including Azure AD configuration steps.
