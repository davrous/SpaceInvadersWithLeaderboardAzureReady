# Quickstart Guide: User Leaderboard with Authentication

**Feature**: User Leaderboard with Authentication  
**Branch**: `001-user-leaderboard`  
**Created**: 2025-11-11

## Overview

This guide walks through setting up and implementing the leaderboard feature from scratch. Follow these steps to add authentication and leaderboard functionality to the Space Invaders game.

**Estimated Time**: 4-6 hours for full implementation

---

## Prerequisites

Before starting, ensure you have:

- [x] Node.js 14+ installed
- [x] npm or yarn package manager
- [x] Git repository cloned
- [x] Existing Space Invaders game running (from `main` branch)
- [x] OAuth2 credentials from GitHub, Google, and Microsoft (see setup below)

---

## Phase 1: Environment Setup (30 minutes)

### Step 1.1: Create OAuth2 Applications

You need to create OAuth2 apps for each provider:

#### GitHub OAuth2 App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in:
   - **Application name**: "Space Invaders Leaderboard"
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Click "Register application"
5. Note down: **Client ID** and **Client Secret**

#### Google OAuth2 App

1. Go to https://console.cloud.google.com/
2. Create a new project: "Space Invaders"
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: "Web application"
6. Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
7. Note down: **Client ID** and **Client Secret**

#### Microsoft OAuth2 App

1. Go to https://portal.azure.com/
2. Navigate to "Azure Active Directory" → "App registrations"
3. Click "New registration"
4. Fill in:
   - **Name**: "Space Invaders Leaderboard"
   - **Redirect URI**: Web - `http://localhost:3000/auth/microsoft/callback`
5. Note down: **Application (client) ID**
6. Go to "Certificates & secrets" → "New client secret"
7. Note down: **Client secret value**

### Step 1.2: Configure Environment Variables

Create `.env` file in project root:

```bash
# .env
# OAuth2 Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

# Session Configuration
SESSION_SECRET=generate_a_random_string_here
CALLBACK_URL=http://localhost:3000

# Database Configuration
DATABASE_PATH=./server/database/leaderboard.db
```

**Generate SESSION_SECRET**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Update `.env.example` with template (don't include actual secrets):
```bash
GITHUB_CLIENT_ID=your_github_client_id_here
# ... etc
```

### Step 1.3: Install Dependencies

```bash
npm install passport passport-github2 passport-google-oauth20 passport-microsoft express-session better-sqlite3
```

Update `package.json`:
```json
{
  "dependencies": {
    "@azure-rest/ai-inference": "^1.0.0-beta.6",
    "@azure/core-auth": "^1.10.1",
    "cors": "^2.8.5",
    "dotenv": "^17.2.2",
    "express": "^4.18.2",
    "passport": "^0.7.0",
    "passport-github2": "^0.1.12",
    "passport-google-oauth20": "^2.0.0",
    "passport-microsoft": "^1.0.0",
    "express-session": "^1.17.3",
    "better-sqlite3": "^9.2.0"
  }
}
```

---

## Phase 2: Database Setup (30 minutes)

### Step 2.1: Create Database Directory Structure

```bash
mkdir -p server/database/migrations
touch server/database/schema.sql
```

### Step 2.2: Create Database Schema

Copy the schema from `data-model.md` into `server/database/schema.sql`:

```sql
-- See data-model.md for complete schema
CREATE TABLE IF NOT EXISTS users (...);
CREATE TABLE IF NOT EXISTS scores (...);
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(score DESC);
CREATE VIEW IF NOT EXISTS leaderboard AS SELECT ...;
```

### Step 2.3: Create Database Initialization Script

Create `server/database/init.js`:

```javascript
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || './server/database/leaderboard.db';
const schemaPath = path.join(__dirname, 'schema.sql');

function initializeDatabase() {
    const db = new Database(dbPath);
    
    // Read and execute schema
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);
    
    console.log('✅ Database initialized successfully');
    return db;
}

module.exports = { initializeDatabase };
```

### Step 2.4: Update .gitignore

```bash
# Database files
server/database/*.db
server/database/*.db-journal
server/database/backups/
```

---

## Phase 3: Server Implementation (2-3 hours)

### Step 3.1: Create Authentication Service

Create `server/services/authService.js`:

```javascript
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;

class AuthService {
    constructor(db) {
        this.db = db;
        this.setupStrategies();
    }

    setupStrategies() {
        // GitHub Strategy
        passport.use(new GitHubStrategy({
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: `${process.env.CALLBACK_URL}/auth/github/callback`
        }, this.handleOAuthCallback.bind(this, 'github')));

        // Google Strategy
        passport.use(new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `${process.env.CALLBACK_URL}/auth/google/callback`
        }, this.handleOAuthCallback.bind(this, 'google')));

        // Microsoft Strategy
        passport.use(new MicrosoftStrategy({
            clientID: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            callbackURL: `${process.env.CALLBACK_URL}/auth/microsoft/callback`
        }, this.handleOAuthCallback.bind(this, 'microsoft')));

        // Serialize/deserialize user
        passport.serializeUser((user, done) => done(null, user.id));
        passport.deserializeUser((id, done) => {
            const user = this.getUserById(id);
            done(null, user);
        });
    }

    handleOAuthCallback(provider, accessToken, refreshToken, profile, done) {
        try {
            const user = this.upsertUser(provider, profile);
            done(null, user);
        } catch (error) {
            done(error, null);
        }
    }

    upsertUser(provider, profile) {
        const stmt = this.db.prepare(`
            INSERT INTO users (provider, provider_id, username, email, profile_picture_url, last_login)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(provider, provider_id)
            DO UPDATE SET 
                username = excluded.username,
                email = excluded.email,
                profile_picture_url = excluded.profile_picture_url,
                last_login = CURRENT_TIMESTAMP
            RETURNING *
        `);

        return stmt.get(
            provider,
            profile.id,
            profile.displayName || profile.username,
            profile.emails?.[0]?.value || null,
            profile.photos?.[0]?.value || null
        );
    }

    getUserById(id) {
        const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id);
    }
}

module.exports = AuthService;
```

### Step 3.2: Create Leaderboard Service

Create `server/services/leaderboardService.js`:

```javascript
class LeaderboardService {
    constructor(db) {
        this.db = db;
        this.rateLimits = new Map(); // userId -> lastSubmitTime
    }

    getLeaderboard(limit = 100, offset = 0) {
        const stmt = this.db.prepare(`
            SELECT * FROM leaderboard
            LIMIT ? OFFSET ?
        `);
        const entries = stmt.all(limit, offset);
        
        const countStmt = this.db.prepare(`
            SELECT COUNT(DISTINCT user_id) as total 
            FROM scores
        `);
        const { total } = countStmt.get();

        return { leaderboard: entries, total, limit, offset };
    }

    submitScore(userId, score, levelReached, sessionId) {
        // Rate limiting check
        if (!this.canSubmitScore(userId)) {
            throw new Error('RATE_LIMIT');
        }

        // Validation
        if (score < 0 || score > 999999) {
            throw new Error('INVALID_SCORE');
        }
        if (levelReached < 1) {
            throw new Error('INVALID_LEVEL');
        }

        try {
            const stmt = this.db.prepare(`
                INSERT INTO scores (user_id, score, level_reached, session_id)
                VALUES (?, ?, ?, ?)
            `);
            const result = stmt.run(userId, score, levelReached, sessionId);
            
            this.rateLimits.set(userId, Date.now());

            // Get leaderboard position
            const position = this.getUserPosition(userId);
            const previousBest = this.getUserPreviousBest(userId, result.lastInsertRowid);

            return {
                id: result.lastInsertRowid,
                user_id: userId,
                score,
                level_reached: levelReached,
                submitted_at: new Date().toISOString(),
                leaderboard_position: {
                    rank: position,
                    is_new_personal_best: score > (previousBest || 0),
                    previous_best: previousBest
                }
            };
        } catch (error) {
            if (error.message.includes('UNIQUE constraint')) {
                throw new Error('DUPLICATE_SESSION');
            }
            throw error;
        }
    }

    canSubmitScore(userId) {
        const lastSubmit = this.rateLimits.get(userId);
        if (!lastSubmit) return true;
        
        const elapsed = Date.now() - lastSubmit;
        return elapsed >= 60000; // 1 minute
    }

    getUserPosition(userId) {
        const stmt = this.db.prepare(`
            SELECT rank FROM leaderboard WHERE user_id = ?
        `);
        const result = stmt.get(userId);
        return result?.rank || null;
    }

    getUserPreviousBest(userId, currentScoreId) {
        const stmt = this.db.prepare(`
            SELECT MAX(score) as best
            FROM scores
            WHERE user_id = ? AND id != ?
        `);
        const result = stmt.get(userId, currentScoreId);
        return result?.best || null;
    }

    getUserStats(userId) {
        const stmt = this.db.prepare(`
            SELECT * FROM user_stats WHERE user_id = ?
        `);
        return stmt.get(userId);
    }

    getUserScores(userId, limit = 10) {
        const stmt = this.db.prepare(`
            SELECT 
                id,
                score,
                level_reached,
                submitted_at,
                score = (SELECT MAX(score) FROM scores WHERE user_id = ?) as is_personal_best
            FROM scores
            WHERE user_id = ?
            ORDER BY submitted_at DESC
            LIMIT ?
        `);
        return stmt.all(userId, userId, limit);
    }
}

module.exports = LeaderboardService;
```

### Step 3.3: Update Server Main File

Modify `server/server.js` to add auth and leaderboard routes:

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const aiLevelGenerator = require('./services/aiLevelGenerator');
const { initializeDatabase } = require('./database/init');
const AuthService = require('./services/authService');
const LeaderboardService = require('./services/leaderboardService');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const db = initializeDatabase();
const authService = new AuthService(db);
const leaderboardService = new LeaderboardService(db);

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '../client')));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({
        error: 'Authentication required',
        message: 'You must be signed in to perform this action'
    });
}

// Auth routes
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/?auth_error=true' }),
    (req, res) => res.redirect('/')
);

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth_error=true' }),
    (req, res) => res.redirect('/')
);

app.get('/auth/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));
app.get('/auth/microsoft/callback',
    passport.authenticate('microsoft', { failureRedirect: '/?auth_error=true' }),
    (req, res) => res.redirect('/')
);

app.get('/api/v1/auth/session', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({
            authenticated: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                provider: req.user.provider,
                profile_picture_url: req.user.profile_picture_url
            }
        });
    } else {
        res.json({ authenticated: false, user: null });
    }
});

app.post('/api/v1/auth/logout', (req, res) => {
    req.logout(() => {
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Leaderboard routes
app.get('/api/v1/leaderboard', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 100);
        const offset = parseInt(req.query.offset) || 0;
        const data = leaderboardService.getLeaderboard(limit, offset);
        res.json(data);
    } catch (error) {
        console.error('Leaderboard fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch leaderboard',
            message: error.message
        });
    }
});

app.post('/api/v1/scores', requireAuth, (req, res) => {
    try {
        const { score, level_reached, session_id } = req.body;
        const result = leaderboardService.submitScore(
            req.user.id,
            score,
            level_reached,
            session_id
        );
        res.status(201).json({ success: true, score: result });
    } catch (error) {
        console.error('Score submission error:', error);
        
        if (error.message === 'RATE_LIMIT') {
            return res.status(429).json({
                error: 'Rate limit exceeded',
                message: 'Please wait before submitting another score',
                retry_after: 60
            });
        }
        if (error.message === 'DUPLICATE_SESSION') {
            return res.status(409).json({
                error: 'Duplicate submission',
                message: 'This score has already been submitted'
            });
        }
        if (error.message === 'INVALID_SCORE' || error.message === 'INVALID_LEVEL') {
            return res.status(400).json({
                error: 'Invalid score data',
                message: error.message
            });
        }
        
        res.status(500).json({
            error: 'Failed to submit score',
            message: 'An unexpected error occurred'
        });
    }
});

app.get('/api/v1/users/:userId/stats', (req, res) => {
    try {
        const userId = req.params.userId === 'me' ? req.user?.id : parseInt(req.params.userId);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const stats = leaderboardService.getUserStats(userId);
        if (!stats) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }
        
        res.json(stats);
    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch stats',
            message: error.message
        });
    }
});

// ... existing routes (levels, AI, etc.)

app.listen(PORT, () => {
    console.log(`🎮 Space Invaders server running on http://localhost:${PORT}`);
    console.log(`✅ Leaderboard feature enabled`);
});
```

---

## Phase 4: Client Implementation (2-3 hours)

### Step 4.1: Create Authentication Client Module

Create `client/js/auth.js`:

```javascript
class AuthClient {
    constructor() {
        this.currentUser = null;
        this.onAuthChange = null;
    }

    async checkSession() {
        try {
            const response = await fetch('/api/v1/auth/session', {
                credentials: 'include'
            });
            const data = await response.json();
            
            this.currentUser = data.authenticated ? data.user : null;
            if (this.onAuthChange) {
                this.onAuthChange(this.currentUser);
            }
            
            return this.currentUser;
        } catch (error) {
            console.error('Session check failed:', error);
            return null;
        }
    }

    async logout() {
        try {
            await fetch('/api/v1/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            this.currentUser = null;
            if (this.onAuthChange) {
                this.onAuthChange(null);
            }
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    getUser() {
        return this.currentUser;
    }
}
```

### Step 4.2: Create Leaderboard Client Module

Create `client/js/leaderboard.js`:

```javascript
class Leaderboard {
    constructor(containerId, authClient) {
        this.container = document.getElementById(containerId);
        this.authClient = authClient;
        this.entries = [];
        this.poller = null;
    }

    async fetchLeaderboard() {
        try {
            const response = await fetch('/api/v1/leaderboard');
            if (!response.ok) throw new Error('Failed to fetch');
            
            const data = await response.json();
            this.entries = data.leaderboard;
            this.render();
            this.cacheLeaderboard(this.entries);
        } catch (error) {
            console.error('Leaderboard fetch failed:', error);
            this.loadFromCache();
        }
    }

    render() {
        if (!this.container) return;
        
        const fragment = document.createDocumentFragment();
        
        if (this.entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'leaderboard-empty';
            empty.textContent = 'Be the first to set a high score!';
            fragment.appendChild(empty);
        } else {
            this.entries.forEach(entry => {
                fragment.appendChild(this.createEntryElement(entry));
            });
        }
        
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
    }

    createEntryElement(entry) {
        const div = document.createElement('div');
        div.className = 'leaderboard-entry';
        
        // Highlight current user
        const currentUser = this.authClient.getUser();
        if (currentUser && currentUser.id === entry.user_id) {
            div.classList.add('current-user');
        }
        
        div.innerHTML = `
            <span class="rank">#${entry.rank}</span>
            <img src="${entry.profile_picture_url || '/assets/avatars/default-avatar.svg'}" 
                 alt="${this.escapeHtml(entry.username)}" 
                 class="avatar"
                 onerror="this.src='/assets/avatars/default-avatar.svg'">
            <span class="username">${this.escapeHtml(entry.username)}</span>
            <span class="score">${entry.best_score.toLocaleString()}</span>
        `;
        
        return div;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async submitScore(score, level, sessionId) {
        if (!this.authClient.isAuthenticated()) {
            return { error: 'auth_required' };
        }

        try {
            const response = await fetch('/api/v1/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    score,
                    level_reached: level,
                    session_id: sessionId
                })
            });

            if (response.status === 401) {
                return { error: 'auth_required' };
            }
            if (response.status === 429) {
                return { error: 'rate_limited' };
            }
            if (!response.ok) {
                throw new Error('Submission failed');
            }

            const result = await response.json();
            await this.fetchLeaderboard(); // Refresh leaderboard
            return result;
        } catch (error) {
            console.error('Score submission failed:', error);
            this.queueScore(score, level, sessionId);
            return { error: 'network_error', queued: true };
        }
    }

    cacheLeaderboard(entries) {
        try {
            localStorage.setItem('spaceinvaders_leaderboard', JSON.stringify(entries));
            localStorage.setItem('spaceinvaders_cache_time', Date.now().toString());
        } catch (error) {
            console.warn('Failed to cache leaderboard:', error);
        }
    }

    loadFromCache() {
        try {
            const cached = localStorage.getItem('spaceinvaders_leaderboard');
            if (cached) {
                this.entries = JSON.parse(cached);
                this.render();
            }
        } catch (error) {
            console.warn('Failed to load cache:', error);
        }
    }

    queueScore(score, level, sessionId) {
        try {
            const pending = JSON.parse(localStorage.getItem('spaceinvaders_pending') || '[]');
            pending.push({ score, level, sessionId, timestamp: Date.now() });
            localStorage.setItem('spaceinvaders_pending', JSON.stringify(pending));
        } catch (error) {
            console.warn('Failed to queue score:', error);
        }
    }

    startPolling(interval = 30000) {
        this.fetchLeaderboard();
        this.poller = setInterval(() => {
            if (!document.hidden) {
                this.fetchLeaderboard();
            }
        }, interval);
    }

    stopPolling() {
        if (this.poller) {
            clearInterval(this.poller);
            this.poller = null;
        }
    }
}
```

### Step 4.3: Update Main Game File

Modify `client/js/main.js` to initialize auth and leaderboard:

```javascript
// Initialize auth and leaderboard
const authClient = new AuthClient();
const leaderboard = new Leaderboard('leaderboard-container', authClient);

// Check authentication on page load
authClient.checkSession().then(user => {
    updateAuthUI(user);
    leaderboard.startPolling();
});

// Auth change handler
authClient.onAuthChange = (user) => {
    updateAuthUI(user);
};

function updateAuthUI(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    
    if (user) {
        authButtons.style.display = 'none';
        userInfo.style.display = 'block';
        userInfo.innerHTML = `
            <img src="${user.profile_picture_url || '/assets/avatars/default-avatar.svg'}" 
                 alt="${user.username}" class="user-avatar">
            <span>${user.username}</span>
            <button id="logout-btn">Sign Out</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => {
            authClient.logout();
        });
    } else {
        authButtons.style.display = 'block';
        userInfo.style.display = 'none';
    }
}

// Modify game over handler to submit score
game.onGameOver = async (score, level) => {
    const sessionId = generateUUID();
    
    if (authClient.isAuthenticated()) {
        const result = await leaderboard.submitScore(score, level, sessionId);
        
        if (result.error === 'auth_required') {
            showMessage('Sign in to save your score!');
        } else if (result.error === 'rate_limited') {
            showMessage('Please wait before submitting another score');
        } else if (result.success) {
            if (result.score.leaderboard_position.is_new_personal_best) {
                showMessage(`New personal best! Rank #${result.score.leaderboard_position.rank}`);
            }
        }
    } else {
        showMessage('Sign in to save your score to the leaderboard!');
    }
};

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
```

---

## Phase 5: UI Styling (1 hour)

Create `client/css/leaderboard.css`:

```css
/* See full CSS in implementation */
.leaderboard-container {
    background: rgba(0, 20, 0, 0.9);
    border: 2px solid #00ff00;
    padding: 20px;
}

.leaderboard-entry {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid rgba(0, 255, 0, 0.2);
}

.current-user {
    background: rgba(0, 255, 0, 0.1);
    border: 1px solid #00ff00;
}
```

---

## Testing Checklist

- [ ] OAuth2 authentication works for all 3 providers
- [ ] Leaderboard displays without authentication
- [ ] Score submission requires authentication
- [ ] Scores appear in leaderboard after submission
- [ ] Current user is highlighted in leaderboard
- [ ] Profile pictures display (or fallback to default)
- [ ] Offline mode shows cached leaderboard
- [ ] Rate limiting prevents spam
- [ ] Responsive design works on mobile
- [ ] Game maintains 60 FPS with leaderboard visible

---

## Troubleshooting

**OAuth2 callback errors**: Verify callback URLs match exactly in OAuth2 app settings

**Database errors**: Ensure `schema.sql` has been executed: `node -e "require('./server/database/init').initializeDatabase()"`

**Session not persisting**: Check SESSION_SECRET is set in `.env`

**CORS errors**: Ensure `credentials: 'include'` in fetch calls

---

## Next Steps

After completing this quickstart:
1. Run `/speckit.tasks` to generate detailed task list
2. Implement tasks in priority order (P1 → P2 → P3 → P4)
3. Test each user story independently
4. Deploy to production with HTTPS and production OAuth2 URLs

Happy coding! 🎮🚀
