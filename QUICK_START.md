# Quick Start Guide - Testing the Leaderboard

This guide will help you quickly set up and test the leaderboard feature.

## Prerequisites Checklist

- [ ] Node.js 14+ installed
- [ ] npm installed
- [ ] GitHub account (for GitHub OAuth)
- [ ] Google account (optional, for Google OAuth)
- [ ] Microsoft account (optional, for Microsoft OAuth)

## 5-Minute Setup

### Step 1: Install Dependencies (1 min)

```bash
npm install
```

### Step 2: Create Environment File (1 min)

```bash
# Copy the example file
cp .env.example .env
```

### Step 3: Set Up GitHub OAuth (2 min)

**Quick Setup for Testing:**

1. Go to https://github.com/settings/developers
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in:
   - **Application name**: `Space Invaders Test`
   - **Homepage URL**: `http://localhost:3000`
   - **Callback URL**: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Copy **Client ID** and **Client Secret**
6. Open `.env` and paste:
   ```bash
   GITHUB_CLIENT_ID=your_client_id_here
   GITHUB_CLIENT_SECRET=your_client_secret_here
   ```

### Step 4: Generate Session Secret (30 sec)

**Windows PowerShell:**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

Copy the output and add to `.env`:
```bash
SESSION_SECRET=paste_generated_secret_here
```

### Step 5: Start the Server (30 sec)

```bash
npm start
```

You should see:
```
✅ Database initialized successfully
🚀 Server running on port 3000
```

### Step 6: Open the Game

Open your browser and go to:
```
http://localhost:3000
```

## Testing Checklist

### Basic Functionality

1. **Game Loads** ✓
   - [ ] Page loads without errors
   - [ ] Game canvas renders
   - [ ] Controls respond

2. **Leaderboard Displays** ✓
   - [ ] "🏆 Top Players" section visible
   - [ ] Empty state or seed data shows
   - [ ] No console errors

3. **Authentication Works** ✓
   - [ ] "Sign in with GitHub" button visible
   - [ ] Click button → redirects to GitHub
   - [ ] Authorize → redirects back to game
   - [ ] User name and avatar display
   - [ ] "Sign Out" button appears

### Score Submission Flow

4. **Play and Submit Score (Authenticated)** ✓
   - [ ] Play game until game over
   - [ ] Score submits automatically
   - [ ] Success message appears
   - [ ] Leaderboard updates with your score
   - [ ] Your entry is highlighted

5. **Sign-In Prompt (Anonymous)** ✓
   - [ ] Sign out if logged in
   - [ ] Play game until game over
   - [ ] Modal appears: "Sign in to save your score!"
   - [ ] Shows your score and level
   - [ ] Shows OAuth buttons
   - [ ] "Continue without signing in" works

### Advanced Features

6. **Rate Limiting** ✓
   - [ ] Submit a score
   - [ ] Immediately game over again
   - [ ] See "Please wait before submitting" message
   - [ ] Wait 60 seconds
   - [ ] Submit again successfully

7. **Personal Stats** ✓
   - [ ] Sign in
   - [ ] "Your Stats" section appears below leaderboard
   - [ ] Shows total games, best score, average
   - [ ] Updates after new score submission

8. **Offline Support** ✓
   - [ ] Sign in and play
   - [ ] Open DevTools (F12) → Network tab
   - [ ] Set to "Offline"
   - [ ] Game over → see "Score saved locally" message
   - [ ] Go back "Online"
   - [ ] Reload page
   - [ ] Score should auto-submit

## Common Issues

### "Cannot connect to server"
**Solution**: Ensure server is running (`npm start`)

### "Sign in failed"
**Solution**: 
1. Check GitHub OAuth app settings
2. Verify callback URL is exactly `http://localhost:3000/auth/github/callback`
3. Check `.env` file has correct CLIENT_ID and CLIENT_SECRET

### "Session not persisting"
**Solution**: 
1. Check `SESSION_SECRET` is set in `.env`
2. Clear browser cookies
3. Try incognito/private window

### "Database error"
**Solution**:
1. Delete `server/database/leaderboard.db`
2. Restart server (will recreate database)

### Leaderboard not loading
**Solution**:
1. Open browser console (F12)
2. Check for errors
3. Verify `/api/v1/leaderboard` endpoint works:
   - Open `http://localhost:3000/api/v1/leaderboard`
   - Should see JSON response

## Quick Test Scenarios

### Scenario 1: First-Time User (2 min)
1. Open game in incognito window
2. Click "Start Game"
3. Play briefly and game over
4. Modal appears: "Sign in to save your score!"
5. Click "Sign in with GitHub"
6. Authorize
7. Back to game, signed in
8. Play again and game over
9. Score submits automatically

### Scenario 2: Returning User (1 min)
1. Open game (already signed in)
2. Leaderboard shows your previous scores
3. Personal stats visible
4. Play and beat your high score
5. See "🎉 New Personal Best!" message
6. Stats update

### Scenario 3: Offline Play (2 min)
1. Sign in
2. Open DevTools → Network → Offline
3. Play and game over
4. See "Score saved locally" message
5. Go back online
6. Reload page
7. Score auto-submits

## Success Criteria

You're all set if:
- ✅ You can sign in with GitHub
- ✅ You can play the game
- ✅ Your score appears on the leaderboard
- ✅ Personal stats display correctly
- ✅ Sign-in prompt works for anonymous users
- ✅ No errors in browser console

## Next Steps

Once basic testing is complete:

1. **Set up additional OAuth providers** (optional):
   - Follow `docs/OAUTH_SETUP.md` for Google and Microsoft

2. **Add test data**:
   ```bash
   # In a SQLite client or terminal:
   sqlite3 server/database/leaderboard.db < server/database/migrations/seed-test-data.sql
   ```

3. **Explore the code**:
   - `server/services/` - Backend business logic
   - `client/js/auth.js` - Authentication client
   - `client/js/leaderboard.js` - Leaderboard client

4. **Read the docs**:
   - `IMPLEMENTATION_STATUS.md` - What's done and what's left
   - `docs/OAUTH_SETUP.md` - Detailed OAuth setup
   - `README.md` - Full project documentation

## Need Help?

Check these resources:
- Browser console (F12) for client-side errors
- Terminal where server is running for server-side errors
- Network tab (F12) to see API requests/responses
- `docs/OAUTH_SETUP.md` for OAuth troubleshooting

## Production Deployment

**IMPORTANT**: Before deploying to production:

1. Update OAuth callback URLs in each provider
2. Set `NODE_ENV=production` in environment
3. Use strong `SESSION_SECRET` (32+ random characters)
4. Enable HTTPS (required for secure cookies)
5. Set proper CORS headers
6. Add database backups
7. Monitor error logs

See `docs/OAUTH_SETUP.md` section "Production Deployment" for details.

---

**Happy Testing! 🎮🏆**
