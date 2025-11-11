# OAuth2 Setup Guide

This guide will help you set up OAuth2 applications for GitHub, Google, and Microsoft to enable authentication in the Space Invaders leaderboard.

## Prerequisites

- A GitHub account
- A Google account
- A Microsoft account
- Node.js server running on `http://localhost:3000` (or your chosen domain)

## 1. GitHub OAuth Application Setup

### Step 1: Create OAuth App
1. Go to https://github.com/settings/developers
2. Click **"OAuth Apps"** in the left sidebar
3. Click **"New OAuth App"**

### Step 2: Configure Application
Fill in the following details:
- **Application name**: `Space Invaders Leaderboard` (or your preferred name)
- **Homepage URL**: `http://localhost:3000` (or your production URL)
- **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
- **Application description**: (optional) "Space Invaders game with leaderboard"

### Step 3: Get Credentials
1. Click **"Register application"**
2. Copy the **Client ID**
3. Click **"Generate a new client secret"**
4. Copy the **Client Secret** (you won't be able to see it again!)

### Step 4: Add to .env
```bash
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

---

## 2. Google OAuth Application Setup

### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `Space Invaders Leaderboard`
4. Click **"Create"**

### Step 2: Enable Google+ API
1. In the project dashboard, click **"APIs & Services"** → **"Library"**
2. Search for **"Google+ API"**
3. Click on it and press **"Enable"**

### Step 3: Create OAuth Consent Screen
1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace)
3. Click **"Create"**
4. Fill in required fields:
   - **App name**: `Space Invaders Leaderboard`
   - **User support email**: Your email
   - **Developer contact information**: Your email
5. Click **"Save and Continue"**
6. Skip **"Scopes"** (click "Save and Continue")
7. Add test users if needed (in development mode)
8. Click **"Save and Continue"**

### Step 4: Create OAuth Credentials
1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. Configure:
   - **Name**: `Space Invaders Web Client`
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/auth/google/callback`
5. Click **"Create"**

### Step 5: Get Credentials
1. Copy the **Client ID**
2. Copy the **Client Secret**

### Step 6: Add to .env
```bash
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

---

## 3. Microsoft OAuth Application Setup

### Step 1: Register Application
1. Go to https://portal.azure.com/
2. Search for **"Azure Active Directory"** (or **"Microsoft Entra ID"**)
3. Click **"App registrations"** in the left sidebar
4. Click **"New registration"**

### Step 2: Configure Application
Fill in the following:
- **Name**: `Space Invaders Leaderboard`
- **Supported account types**: **"Accounts in any organizational directory and personal Microsoft accounts"**
- **Redirect URI**: 
  - Platform: **Web**
  - URI: `http://localhost:3000/auth/microsoft/callback`
5. Click **"Register"**

### Step 3: Get Application (Client) ID
1. On the Overview page, copy the **Application (client) ID**

### Step 4: Create Client Secret
1. Click **"Certificates & secrets"** in the left sidebar
2. Click **"New client secret"**
3. Add description: `Space Invaders Secret`
4. Select expiration: **6 months** or **12 months** (recommended for development)
5. Click **"Add"**
6. Copy the **Value** immediately (it won't be shown again!)

### Step 5: Configure API Permissions
1. Click **"API permissions"** in the left sidebar
2. Verify **"User.Read"** is already added (default)
3. If not, click **"Add a permission"** → **"Microsoft Graph"** → **"Delegated permissions"** → **"User.Read"**
4. Click **"Add permissions"**

### Step 6: Add to .env
```bash
MICROSOFT_CLIENT_ID=your_microsoft_client_id_here
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret_here
```

---

## 4. Complete Environment Setup

### Step 1: Create .env File
Create a `.env` file in the root of your project (copy from `.env.example`):

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# OAuth2 - GitHub
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# OAuth2 - Google
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret

# OAuth2 - Microsoft
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Session Configuration
SESSION_SECRET=your_random_session_secret_here_at_least_32_characters_long

# Callback URL (change for production)
CALLBACK_URL=http://localhost:3000

# Database
DATABASE_PATH=./server/database/leaderboard.db
```

### Step 2: Generate Session Secret
Run this command in your terminal to generate a secure random secret:

**Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

**macOS/Linux:**
```bash
openssl rand -base64 32
```

Copy the output and use it for `SESSION_SECRET`.

---

## 5. Production Deployment

When deploying to production, update the following:

### Update OAuth Callback URLs
For each provider, add your production URL:

**GitHub:**
- Homepage URL: `https://yourdomain.com`
- Callback URL: `https://yourdomain.com/auth/github/callback`

**Google:**
- Authorized JavaScript origins: `https://yourdomain.com`
- Authorized redirect URIs: `https://yourdomain.com/auth/google/callback`

**Microsoft:**
- Add new Redirect URI: `https://yourdomain.com/auth/microsoft/callback`

### Update Environment Variables
```bash
NODE_ENV=production
CALLBACK_URL=https://yourdomain.com
```

### Security Considerations
- **NEVER** commit `.env` file to git
- Use environment variables in your hosting platform (Heroku, Vercel, Azure, etc.)
- Enable HTTPS in production (required for secure cookies)
- Set `SESSION_SECRET` to a strong random value
- Regularly rotate OAuth client secrets

---

## 6. Testing Authentication

### Local Testing
1. Start your server: `npm start`
2. Open browser: `http://localhost:3000`
3. Click **"Sign in with GitHub"** (or Google/Microsoft)
4. Authorize the application
5. You should be redirected back with your profile info displayed

### Troubleshooting

**"Redirect URI mismatch" error:**
- Check that callback URLs match exactly in OAuth app settings
- Ensure protocol (http/https) matches
- Check port number (3000)

**"Invalid client" error:**
- Verify CLIENT_ID is correct
- Verify CLIENT_SECRET is correct (no extra spaces)
- Check .env file is loaded properly

**Session not persisting:**
- Check SESSION_SECRET is set
- Verify cookies are enabled in browser
- Check browser console for cookie errors

**"Access denied" error:**
- User may have declined authorization
- Check OAuth app is not in restricted mode
- Verify scopes requested are approved

---

## 7. Additional Resources

- **GitHub OAuth**: https://docs.github.com/en/developers/apps/building-oauth-apps
- **Google OAuth**: https://developers.google.com/identity/protocols/oauth2
- **Microsoft OAuth**: https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow
- **Passport.js**: http://www.passportjs.org/docs/

---

## Support

If you encounter issues, check:
1. Console logs in browser (F12)
2. Server logs in terminal
3. Network tab for failed requests
4. OAuth provider dashboards for error messages

For common issues, refer to the troubleshooting section above.
