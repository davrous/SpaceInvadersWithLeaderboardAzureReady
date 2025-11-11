# Research Document: User Leaderboard with Authentication

**Feature**: User Leaderboard with Authentication  
**Branch**: `001-user-leaderboard`  
**Created**: 2025-11-11

## Overview

This document consolidates research findings for implementing a leaderboard feature with OAuth2 authentication, SQLite storage, and vanilla JavaScript. All technical decisions are documented with rationale and alternatives considered.

---

## 1. OAuth2 Authentication with Multiple Providers

### Decision

Use **Passport.js** with separate strategies for GitHub, Google, and Microsoft OAuth2 providers.

### Rationale

- **Industry standard**: Passport.js is the de facto authentication middleware for Node.js/Express
- **Strategy-based**: Clean separation of concerns - each provider gets its own strategy module
- **Minimal setup**: Well-documented, mature library with extensive community support
- **Session management**: Built-in session handling integrates with Express sessions
- **Token handling**: Abstracts OAuth2 token exchange and profile retrieval

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| **Custom OAuth2 implementation** | Full control, no dependencies | Complex to implement correctly, security risks | Too much complexity for minimal benefit; authentication is security-critical |
| **Auth0 or similar SaaS** | Managed service, very robust | Requires external service, monthly costs | Contradicts "minimal dependencies" and "local database" requirements |
| **Grant library** | Low-level OAuth2 control | More boilerplate, less Express integration | Passport.js provides better Express integration and simpler API |

### Implementation Notes

- **passport-github2**: For GitHub OAuth2
- **passport-google-oauth20**: For Google OAuth2
- **passport-microsoft**: For Microsoft OAuth2
- Session cookies stored with `express-session`
- Profile data (username, email, picture URL) extracted from OAuth2 provider response

---

## 2. SQLite Database with better-sqlite3

### Decision

Use **better-sqlite3** library for synchronous SQLite operations with the database stored as a local file.

### Rationale

- **Synchronous API**: Simpler code flow, no callback/promise complexity for database operations
- **Performance**: Faster than async SQLite libraries for small-to-medium scale operations
- **Zero configuration**: No database server to install or manage
- **File-based**: Single `.db` file, easy backup and portability
- **ACID compliance**: SQLite provides full ACID guarantees for data integrity
- **Native bindings**: C++ bindings provide excellent performance

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| **sqlite3 (async)** | Official Node.js binding | Async API adds complexity | Synchronous API is simpler and adequate for our scale |
| **PostgreSQL** | More features, better concurrency | Requires server installation, overkill for local app | Contradicts "local SQLite database" requirement |
| **JSON files** | Simplest possible storage | No ACID, no concurrent access handling | Poor data integrity, no validation, slow queries |
| **MongoDB** | Document model | Requires server, too heavy for this use case | Overkill and contradicts local storage requirement |

### Schema Design

```sql
-- users table: Store authenticated player data
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,              -- 'github', 'google', 'microsoft'
    provider_id TEXT NOT NULL,           -- Unique ID from OAuth2 provider
    username TEXT NOT NULL,
    email TEXT,
    profile_picture_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- scores table: Store all submitted scores
CREATE TABLE scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 0 AND score <= 999999),
    level_reached INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(session_id)                   -- Prevent duplicate submissions
);

-- leaderboard view: Top scores per user
CREATE VIEW leaderboard AS
SELECT 
    users.id as user_id,
    users.username,
    users.profile_picture_url,
    MAX(scores.score) as best_score,
    MAX(scores.level_reached) as best_level,
    MAX(scores.submitted_at) as last_played,
    ROW_NUMBER() OVER (ORDER BY MAX(scores.score) DESC) as rank
FROM users
JOIN scores ON users.id = scores.user_id
GROUP BY users.id
ORDER BY best_score DESC
LIMIT 100;

-- Indexes for performance
CREATE INDEX idx_scores_user_id ON scores(user_id);
CREATE INDEX idx_scores_score_desc ON scores(score DESC);
CREATE INDEX idx_users_provider ON users(provider, provider_id);
```

---

## 3. Client-Side Leaderboard Rendering (Vanilla JavaScript)

### Decision

Use vanilla JavaScript with template literals and DocumentFragment for efficient DOM manipulation.

### Rationale

- **No framework overhead**: Keeps bundle size minimal, aligns with "vanilla JS" requirement
- **Simple requirements**: Leaderboard is list-based UI, doesn't need reactive framework
- **Performance**: DocumentFragment minimizes reflows, template literals are readable
- **Educational value**: Clear, understandable code for Space Invaders game context

### Pattern

```javascript
// leaderboard.js
class Leaderboard {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.entries = [];
        this.currentUser = null;
    }

    async fetchLeaderboard() {
        try {
            const response = await fetch('/api/v1/leaderboard');
            if (!response.ok) throw new Error('Failed to fetch');
            this.entries = await response.json();
            this.render();
        } catch (error) {
            this.showError('Unable to load leaderboard');
            this.loadFromCache();
        }
    }

    render() {
        const fragment = document.createDocumentFragment();
        this.entries.forEach((entry, index) => {
            fragment.appendChild(this.createEntryElement(entry, index + 1));
        });
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
    }

    createEntryElement(entry, rank) {
        const div = document.createElement('div');
        div.className = 'leaderboard-entry';
        div.innerHTML = `
            <span class="rank">${rank}</span>
            <img src="${entry.profile_picture_url || '/assets/avatars/default-avatar.svg'}" 
                 alt="${entry.username}" 
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
}
```

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| **React** | Reactive updates, component model | Adds 40KB+ to bundle, overkill | Contradicts "minimal dependencies" requirement |
| **Vue.js** | Lighter than React, good DX | Still adds dependency, build complexity | Not needed for simple list rendering |
| **Lit (Web Components)** | Standards-based, small | Learning curve, less familiar | Vanilla JS is simpler for this use case |

---

## 4. Offline Support with localStorage

### Decision

Use **localStorage** for caching leaderboard data and queuing pending score submissions.

### Rationale

- **Native API**: No dependencies, available in all modern browsers
- **Synchronous**: Simple API, no async complexity for cache operations
- **Persistent**: Data survives browser restarts (unlike sessionStorage)
- **Adequate storage**: 5-10MB limit is sufficient for top 100 leaderboard entries

### Cache Strategy

```javascript
// Cache structure
const CACHE_KEYS = {
    LEADERBOARD: 'spaceinvaders_leaderboard',
    PENDING_SCORES: 'spaceinvaders_pending_scores',
    USER_PROFILE: 'spaceinvaders_user_profile',
    CACHE_TIMESTAMP: 'spaceinvaders_cache_time'
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheLeaderboard(data) {
    try {
        localStorage.setItem(CACHE_KEYS.LEADERBOARD, JSON.stringify(data));
        localStorage.setItem(CACHE_KEYS.CACHE_TIMESTAMP, Date.now().toString());
    } catch (error) {
        console.warn('Cache quota exceeded, clearing old data');
        clearOldCache();
    }
}

function getCachedLeaderboard() {
    const cached = localStorage.getItem(CACHE_KEYS.LEADERBOARD);
    const timestamp = localStorage.getItem(CACHE_KEYS.CACHE_TIMESTAMP);
    
    if (!cached || !timestamp) return null;
    
    const age = Date.now() - parseInt(timestamp);
    if (age > CACHE_TTL) return null; // Stale cache
    
    return JSON.parse(cached);
}

function queueScore(score) {
    const pending = JSON.parse(localStorage.getItem(CACHE_KEYS.PENDING_SCORES) || '[]');
    pending.push({ score, timestamp: Date.now() });
    localStorage.setItem(CACHE_KEYS.PENDING_SCORES, JSON.stringify(pending));
}
```

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| **IndexedDB** | More storage, complex queries | Async API, overkill for key-value cache | Too complex for simple caching needs |
| **Service Worker cache** | Full offline support | Complex setup, requires HTTPS | Overkill for caching leaderboard data |
| **sessionStorage** | Same API as localStorage | Clears on tab close | Need persistence across sessions |

---

## 5. Real-Time Leaderboard Updates

### Decision

Use **polling** with adjustable intervals (every 30 seconds when leaderboard visible, pause when hidden).

### Rationale

- **Simple implementation**: Standard fetch API, no additional libraries
- **Adequate freshness**: 30-second updates provide near-real-time feel for leaderboard
- **Battery friendly**: Polling stops when user switches tabs (Page Visibility API)
- **No infrastructure**: No WebSocket server needed

### Implementation Pattern

```javascript
class LeaderboardPoller {
    constructor(leaderboard, interval = 30000) {
        this.leaderboard = leaderboard;
        this.interval = interval;
        this.timerId = null;
        this.isVisible = !document.hidden;
        
        document.addEventListener('visibilitychange', () => {
            this.isVisible = !document.hidden;
            this.isVisible ? this.start() : this.stop();
        });
    }

    start() {
        if (this.timerId) return;
        this.timerId = setInterval(() => {
            if (this.isVisible) {
                this.leaderboard.fetchLeaderboard();
            }
        }, this.interval);
    }

    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
}
```

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| **WebSockets** | True real-time, bidirectional | Requires ws library, persistent connections | Overkill for infrequent updates, adds complexity |
| **Server-Sent Events (SSE)** | One-way real-time, simpler than WS | Browser compatibility issues, no IE support | Polling is simpler and adequate |
| **Long polling** | More efficient than regular polling | More complex server logic | Regular polling is simpler and sufficient |

---

## 6. Anti-Cheat and Score Validation

### Decision

Implement **multi-layer validation**: client-side bounds checking + server-side session validation + rate limiting.

### Rationale

- **Defense in depth**: Multiple validation layers catch different attack vectors
- **Practical balance**: Can't prevent all cheating (client-side game) but makes it harder
- **User experience**: Most validation is transparent to legitimate players

### Validation Strategy

**Client-Side (Deterrent)**:
- Bounds checking: Score must be 0-999999
- Session tracking: Generate unique session ID on game start
- Timestamp validation: Score submitted within reasonable time of game start

**Server-Side (Enforcement)**:
- Validate score bounds again
- Check session ID is unique (prevent replay attacks)
- Verify user is authenticated
- Rate limit submissions (max 1 score per 60 seconds per user)
- Check score progression is reasonable (optional: compare to typical score distributions)

**Rate Limiting**:
```javascript
const submitRateLimits = new Map(); // userId -> lastSubmitTime

function canSubmitScore(userId) {
    const lastSubmit = submitRateLimits.get(userId);
    const now = Date.now();
    
    if (lastSubmit && (now - lastSubmit) < 60000) {
        return false; // Too soon
    }
    
    submitRateLimits.set(userId, now);
    return true;
}
```

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| **Server-side game validation** | Most secure | Requires rewriting game logic on server | Too complex, game is client-rendered |
| **Cryptographic signatures** | Strong integrity | Complex implementation, key management | Overkill for casual game leaderboard |
| **No validation** | Simplest | Trivial to cheat | Destroys trust in leaderboard |

---

## 7. Responsive Leaderboard UI

### Decision

Use **CSS Flexbox** with media queries for responsive layout, showing compact view on mobile.

### Rationale

- **Native CSS**: No framework needed, excellent browser support
- **Flexible**: Easy to reorder/resize elements at different breakpoints
- **Performance**: Hardware-accelerated, no JavaScript layout calculations

### Layout Strategy

**Desktop (>768px)**:
- Sidebar layout: Leaderboard in right panel, game in main area
- Show top 10 entries with full details (rank, avatar, name, score)
- Larger avatars (64x64px)

**Tablet (481-768px)**:
- Stacked layout: Leaderboard above or below game
- Show top 10 entries with medium details
- Medium avatars (48x48px)

**Mobile (≤480px)**:
- Overlay toggle: Leaderboard in slide-out panel
- Show top 5 entries initially with "View More" button
- Small avatars (32x32px)
- Compact text

```css
/* Responsive breakpoints */
.leaderboard-container {
    display: flex;
    flex-direction: column;
}

@media (min-width: 769px) {
    .game-layout {
        display: flex;
    }
    
    .leaderboard-container {
        width: 300px;
        margin-left: 20px;
    }
}

@media (max-width: 480px) {
    .leaderboard-entry {
        padding: 8px;
        font-size: 14px;
    }
    
    .avatar {
        width: 32px;
        height: 32px;
    }
    
    .leaderboard-container {
        max-height: 50vh;
        overflow-y: auto;
    }
}
```

### Alternatives Considered

| Alternative | Pros | Cons | Rejected Because |
|-------------|------|------|------------------|
| **CSS Grid** | More layout control | Slightly less browser support | Flexbox is adequate and more familiar |
| **Bootstrap/Tailwind** | Pre-built responsive utilities | Adds dependency, bundle size | Contradicts minimal dependencies requirement |
| **JavaScript-based layout** | Full control | Performance overhead, complexity | CSS is faster and simpler |

---

## 8. OAuth2 Flow and Security

### Decision

Use **Authorization Code Flow** with Passport.js handling token exchange on the server.

### Rationale

- **Most secure**: Client never sees access tokens or secrets
- **Standard flow**: Recommended by OAuth2 spec for web applications
- **Server-side**: All sensitive operations happen on server
- **Session-based**: User session maintained via secure cookies

### Flow Diagram

```
1. User clicks "Sign in with GitHub"
   → Browser redirects to /auth/github

2. Server (Passport.js) redirects to GitHub OAuth2 endpoint
   → User sees GitHub authorization page

3. User authorizes app
   → GitHub redirects to /auth/github/callback?code=ABC123

4. Server exchanges code for access token (server-side)
   → Retrieves user profile from GitHub API
   → Creates or updates user in SQLite database
   → Establishes Express session with user ID

5. Server redirects to game page
   → Client receives session cookie
   → Leaderboard shows "Signed in as [username]"
```

### Security Measures

- **HTTPS required**: OAuth2 callback URLs must use HTTPS in production
- **CSRF protection**: Use state parameter to prevent cross-site request forgery
- **Secure cookies**: httpOnly, secure, sameSite flags on session cookies
- **Token storage**: Access tokens never stored client-side
- **Session expiry**: Sessions expire after 24 hours of inactivity

### Environment Variables

```bash
# .env file
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret

SESSION_SECRET=random_string_for_session_encryption
CALLBACK_URL=http://localhost:3000/auth/callback
```

---

## Summary of Technology Decisions

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **OAuth2 Authentication** | Passport.js (GitHub/Google/Microsoft strategies) | Industry standard, clean abstraction, multiple provider support |
| **Database** | SQLite with better-sqlite3 | Local file-based, synchronous API, ACID compliance |
| **Client Framework** | Vanilla JavaScript | Minimal dependencies, adequate for list-based UI |
| **Caching** | localStorage | Native API, persistent, synchronous |
| **Real-time Updates** | Polling (30s interval) | Simple, adequate freshness, no WebSocket complexity |
| **Validation** | Multi-layer (client + server + rate limiting) | Defense in depth, practical balance |
| **Responsive Design** | CSS Flexbox + Media Queries | Native CSS, performant, flexible |
| **OAuth2 Flow** | Authorization Code Flow | Most secure, server-side token handling |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "passport": "^0.7.0",
    "passport-github2": "^0.1.12",
    "passport-google-oauth20": "^2.0.0",
    "passport-microsoft": "^1.0.0",
    "express-session": "^1.17.3",
    "better-sqlite3": "^9.2.0"
  }
}
```

**Total added bundle size**: ~2-3MB (mostly better-sqlite3 native bindings, server-side only)

---

## Next Steps

1. **Phase 1**: Create data model, API contracts, and quickstart guide
2. **Phase 2**: Generate task list for implementation
3. Begin implementation following constitutional principles
