# Azure OAuth Authentication Fix

## Problem
OAuth authentication works on localhost but fails in Azure production. Users click "Sign in with GitHub/Google/Microsoft" but after redirect, they're not logged in and cannot submit high scores.

## Root Cause
1. **Session cookies not configured for Azure App Service proxy**
2. **OAuth callback URLs not registered for production domain**
3. **Missing `sameSite` cookie attribute for OAuth redirects**

## Fixes Applied

### 1. Server Configuration (COMPLETED ✅)
Updated `server/server.js` with:
- `sameSite: 'lax'` cookie setting (critical for OAuth)
- `trust proxy` setting for Azure App Service
- `proxy: true` in session config
- Proper CORS origin configuration

### 2. OAuth Provider Updates (REQUIRED ⚠️)

You **MUST** update the callback URLs in each OAuth provider console:

#### GitHub OAuth App
1. Go to: https://github.com/settings/developers
2. Select your **"Space Invaders Leaderboard"** app
3. Update:
   - **Homepage URL**: `https://appqpbignwvkotjs.azurewebsites.net`
   - **Authorization callback URL**: `https://appqpbignwvkotjs.azurewebsites.net/auth/github/callback`
4. Click **"Update application"**

#### Google OAuth App
1. Go to: https://console.cloud.google.com/
2. Navigate to: **APIs & Services** → **Credentials**
3. Select your **"Space Invaders Web Client"** OAuth 2.0 Client ID
4. Add to **Authorized redirect URIs**:
   - `https://appqpbignwvkotjs.azurewebsites.net/auth/google/callback`
5. Add to **Authorized JavaScript origins**:
   - `https://appqpbignwvkotjs.azurewebsites.net`
6. Click **"Save"**

#### Microsoft OAuth App
1. Go to: https://portal.azure.com/
2. Search for **"Azure Active Directory"** (or **"Microsoft Entra ID"**)
3. Click **"App registrations"** → Select your **"Space Invaders Leaderboard"** app
4. Click **"Authentication"** in left sidebar
5. Under **"Web"** → **"Redirect URIs"**, add:
   - `https://appqpbignwvkotjs.azurewebsites.net/auth/microsoft/callback`
6. Click **"Save"**

## Deployment Steps

### 1. Deploy Updated Code
```powershell
azd deploy
```

### 2. Verify Environment Variables
Confirm these are set in Azure:
```powershell
azd env get-values | Select-String "CALLBACK_URL|SESSION_SECRET|NODE_ENV"
```

Expected output:
- `CALLBACK_URL="https://appqpbignwvkotjs.azurewebsites.net"`
- `SESSION_SECRET="CvtBWRhjH6IfOXd894apFiq0zVMQ7ZSc"`
- `NODE_ENV="production"`

### 3. Test Authentication Flow
1. Open: https://appqpbignwvkotjs.azurewebsites.net
2. Click **"Sign in with GitHub"** (or Google/Microsoft)
3. Authorize the application
4. Verify you're redirected back AND logged in (profile shows in UI)
5. Play a game and achieve a high score
6. Verify score submission works

## Expected Behavior After Fix

### Before Fix ❌
- User clicks "Sign in with GitHub"
- Redirects to GitHub, user authorizes
- Redirects back to game
- **User is NOT logged in**
- Score submission fails silently

### After Fix ✅
- User clicks "Sign in with GitHub"
- Redirects to GitHub, user authorizes
- Redirects back to game
- **User IS logged in** (profile visible)
- Score submission works correctly

## Technical Details

### Session Cookie Configuration
```javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true, // NEW: Trust Azure proxy
    cookie: {
        httpOnly: true,
        secure: true, // HTTPS only in production
        sameSite: 'lax', // NEW: Critical for OAuth redirects
        maxAge: 24 * 60 * 60 * 1000
    }
}));
```

### Trust Proxy Setting
```javascript
// Azure App Service runs behind a proxy
app.set('trust proxy', 1);
```

### CORS Configuration
```javascript
app.use(cors({ 
    origin: process.env.CALLBACK_URL, // Specific origin, not wildcard
    credentials: true 
}));
```

## Troubleshooting

### If authentication still fails:

1. **Check browser console** for errors:
   ```
   F12 → Console tab
   ```

2. **Verify session cookie is set**:
   ```
   F12 → Application tab → Cookies
   Look for "connect.sid" cookie with:
   - Domain: .azurewebsites.net
   - Secure: ✓
   - HttpOnly: ✓
   - SameSite: Lax
   ```

3. **Check server logs** in Azure:
   ```powershell
   az webapp log tail --name appqpbignwvkotjs --resource-group rg-spaceinvadersdevdayprod
   ```

4. **Test session endpoint**:
   ```
   https://appqpbignwvkotjs.azurewebsites.net/api/v1/auth/session
   ```
   Should return:
   ```json
   {"authenticated": true, "user": {...}}
   ```

### Common Issues

**"Redirect URI mismatch"**
- Callback URL not added to OAuth provider
- Check protocol (must be `https://`)
- Check domain matches exactly

**Session not persisting**
- Clear browser cookies and try again
- Verify `SESSION_SECRET` is set in Azure
- Check `trust proxy` setting is enabled

**CORS errors**
- Verify `CALLBACK_URL` env var matches your Azure URL
- Check CORS origin in server.js matches

## Rollback Plan

If issues persist, you can rollback:

```powershell
# View deployment history
azd deploy --show-history

# Or redeploy previous version manually
git checkout <previous-commit>
azd deploy
```

## Next Steps After Verification

Once authentication works in production:
1. ✅ Test all OAuth providers (GitHub, Google, Microsoft)
2. ✅ Test score submission
3. ✅ Test leaderboard display
4. ✅ Test logout functionality
5. 📝 Update documentation with production URLs
6. 🔒 Consider enabling HSTS headers for additional security

## Questions?

If you encounter issues:
1. Check the troubleshooting section above
2. Review Azure App Service logs
3. Verify OAuth provider console settings
4. Test the `/api/v1/auth/session` endpoint directly
