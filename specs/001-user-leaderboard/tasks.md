# Implementation Tasks: User Leaderboard with Authentication

**Feature**: User Leaderboard with Authentication  
**Branch**: `001-user-leaderboard`  
**Created**: 2025-11-11  
**Status**: Ready for implementation

## Task Organization

Tasks are organized by phase and user story to enable independent, parallel implementation where possible. Each task includes:
- **Task ID**: Unique identifier (T###)
- **[P]**: Can be executed in parallel with other [P] tasks
- **[Story]**: Which user story this task contributes to (P1-P4)

---

## Phase 1: Setup and Foundation

### Environment Configuration

- [X] T001 **Create OAuth2 Applications**
  - Create GitHub OAuth2 app at https://github.com/settings/developers
  - Create Google OAuth2 app at https://console.cloud.google.com/
  - Create Microsoft OAuth2 app at https://portal.azure.com/
  - Save Client IDs and Client Secrets for all three providers
  - Configure callback URLs: `http://localhost:3000/auth/{provider}/callback`
  - **File**: `.env` (create new)
  - **Note**: User must create OAuth2 apps manually and add credentials to .env

- [X] T002 **Configure Environment Variables**
  - Create `.env` file in project root
  - Add OAuth2 credentials (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, etc.)
  - Generate random SESSION_SECRET using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Add CALLBACK_URL=http://localhost:3000
  - Add DATABASE_PATH=./server/database/leaderboard.db
  - **Files**: `.env`, `.env.example`
  - **Completed**: .env.example updated with all required variables

- [X] T003 **Update .gitignore**
  - Add `.env` to gitignore
  - Add `server/database/*.db` to gitignore
  - Add `server/database/*.db-journal` to gitignore
  - Add `server/database/backups/` to gitignore
  - **File**: `.gitignore`
  - **Completed**: Database patterns added to .gitignore

- [X] T004 **Install Dependencies**
  - Run: `npm install passport passport-github2 passport-google-oauth20 passport-microsoft express-session better-sqlite3`
  - Verify package.json includes all required dependencies
  - Run `npm install` to ensure clean install
  - **File**: `package.json`
  - **Completed**: All dependencies installed successfully (51 packages added)

---

## Phase 2: Database Layer

### Database Schema and Initialization

- [X] T005 **Create Database Directory Structure**
  - Create directory: `server/database/`
  - Create directory: `server/database/migrations/`
  - Create directory: `server/database/backups/` (for future use)
  - **Directories**: `server/database/`, `server/database/migrations/`, `server/database/backups/`
  - **Completed**: All directories created

- [X] T006 **Create Database Schema File**
  - Create SQL schema file with tables: `users`, `scores`
  - Add indexes: `idx_scores_user_id`, `idx_scores_score_desc`, `idx_users_provider`
  - Add views: `leaderboard` (top 100), `user_stats` (aggregated statistics)
  - Include constraints: CHECK, UNIQUE, FOREIGN KEY with CASCADE
  - Copy complete schema from `data-model.md`
  - **File**: `server/database/schema.sql`
  - **Completed**: Full schema created with all tables, views, and indexes

- [X] T007 **Create Database Initialization Module**
  - Create `initializeDatabase()` function
  - Load and execute schema.sql using better-sqlite3
  - Return database instance for service layer
  - Add console logging for successful initialization
  - Handle errors gracefully with try-catch
  - **File**: `server/database/init.js`
  - **Completed**: Database init module with comprehensive logging

- [X] T008 **Create Sample Data Script (Optional)**
  - Create SQL file with test users and scores
  - Only for development/testing purposes
  - Include INSERT statements for 2-3 test users
  - Include INSERT statements for 5-10 test scores
  - **File**: `server/database/migrations/seed-test-data.sql`
  - **Completed**: 3 test users and 10 test scores created

---

## Phase 3: Server - Authentication Infrastructure

### OAuth2 Authentication Service

- [X] T009 **Create Authentication Service Module**
  - Create `AuthService` class
  - Initialize Passport.js with session support
  - Set up `serializeUser` and `deserializeUser` methods
  - Create `getUserById(id)` database query method
  - **File**: `server/services/authService.js`

- [ ] T010 **Implement GitHub OAuth2 Strategy**
  - Configure `passport-github2` strategy
  - Set clientID, clientSecret, callbackURL from environment variables
  - Implement `handleOAuthCallback('github', ...)` method
  - Extract profile data: id, username, email, profile picture URL
  - **File**: `server/services/authService.js` (add to existing)

- [ ] T011 [P] **Implement Google OAuth2 Strategy**
  - Configure `passport-google-oauth20` strategy
  - Set clientID, clientSecret, callbackURL, scope: ['profile', 'email']
  - Implement `handleOAuthCallback('google', ...)` method
  - Extract profile data: id, displayName, email, photos
  - **File**: `server/services/authService.js` (add to existing)

- [ ] T012 [P] **Implement Microsoft OAuth2 Strategy**
  - Configure `passport-microsoft` strategy
  - Set clientID, clientSecret, callbackURL, scope: ['user.read']
  - Implement `handleOAuthCallback('microsoft', ...)` method
  - Extract profile data: id, displayName, email, photos
  - **File**: `server/services/authService.js` (add to existing)

- [ ] T013 **Implement User Upsert Logic**
  - Create `upsertUser(provider, profile)` method
  - Use SQL INSERT ... ON CONFLICT ... DO UPDATE pattern
  - Update `last_login` timestamp on every login
  - Return complete user object after insert/update
  - Handle database errors with try-catch
  - **File**: `server/services/authService.js` (add to existing)

### Authentication Routes

- [ ] T014 **Add Session Middleware to Server**
  - Configure express-session with secret from environment
  - Set cookie options: httpOnly=true, secure=production, maxAge=24h
  - Initialize passport.initialize() middleware
  - Initialize passport.session() middleware
  - **File**: `server/server.js`

- [ ] T015 **Create Authentication Helper Middleware**
  - Create `requireAuth(req, res, next)` middleware function
  - Check if `req.isAuthenticated()` is true
  - Return 401 with error message if not authenticated
  - Call next() if authenticated
  - **File**: `server/server.js` (add near top after imports)

- [ ] T016 **Add GitHub OAuth2 Routes**
  - Route: `GET /auth/github` → passport.authenticate('github', {scope: ['user:email']})
  - Route: `GET /auth/github/callback` → passport.authenticate with redirect on success/failure
  - On success: redirect to `/`
  - On failure: redirect to `/?auth_error=true`
  - **File**: `server/server.js`

- [ ] T017 [P] **Add Google OAuth2 Routes**
  - Route: `GET /auth/google` → passport.authenticate('google', {scope: ['profile', 'email']})
  - Route: `GET /auth/google/callback` → passport.authenticate with redirect
  - Same success/failure logic as GitHub
  - **File**: `server/server.js`

- [ ] T018 [P] **Add Microsoft OAuth2 Routes**
  - Route: `GET /auth/microsoft` → passport.authenticate('microsoft', {scope: ['user.read']})
  - Route: `GET /auth/microsoft/callback` → passport.authenticate with redirect
  - Same success/failure logic as GitHub
  - **File**: `server/server.js`

- [ ] T019 **Add Session Check Endpoint**
  - Route: `GET /api/v1/auth/session`
  - Return `{authenticated: true, user: {...}}` if logged in
  - Return `{authenticated: false, user: null}` if not logged in
  - User object includes: id, username, provider, profile_picture_url
  - **File**: `server/server.js`

- [ ] T020 **Add Logout Endpoint**
  - Route: `POST /api/v1/auth/logout`
  - Call `req.logout()` to destroy session
  - Return `{success: true, message: 'Logged out successfully'}`
  - Handle logout errors with 500 response
  - **File**: `server/server.js`

---

## Phase 4: Server - Leaderboard Service

### Leaderboard Business Logic

- [ ] T021 **Create Leaderboard Service Module**
  - Create `LeaderboardService` class
  - Initialize with database instance
  - Create rate limit tracking map: `userId -> lastSubmitTime`
  - **File**: `server/services/leaderboardService.js`

- [ ] T022 **Implement Get Leaderboard Method**
  - Create `getLeaderboard(limit, offset)` method
  - Query `leaderboard` view with LIMIT and OFFSET
  - Count total distinct users in scores table
  - Return `{leaderboard: [...], total, limit, offset}`
  - Handle database errors with try-catch
  - **File**: `server/services/leaderboardService.js`

- [ ] T023 **Implement Rate Limiting Check**
  - Create `canSubmitScore(userId)` method
  - Check if 60 seconds have elapsed since last submission
  - Use in-memory Map for tracking (simple implementation)
  - Return boolean: true if can submit, false otherwise
  - **File**: `server/services/leaderboardService.js`

- [ ] T024 **Implement Score Validation**
  - Add validation in `submitScore(userId, score, level, sessionId)` method
  - Check score range: 0 ≤ score ≤ 999,999
  - Check level range: level ≥ 1
  - Check session ID format (UUID v4 pattern)
  - Throw specific errors: 'INVALID_SCORE', 'INVALID_LEVEL', 'INVALID_SESSION_ID'
  - **File**: `server/services/leaderboardService.js`

- [ ] T025 **Implement Score Submission**
  - Create `submitScore(userId, score, level, sessionId)` method
  - Check rate limit first (call `canSubmitScore`)
  - Validate inputs (call validation methods)
  - INSERT score into database
  - Catch UNIQUE constraint violation → throw 'DUPLICATE_SESSION'
  - Update rate limit map with current timestamp
  - Return score object with ID and metadata
  - **File**: `server/services/leaderboardService.js`

- [ ] T026 **Implement User Position Lookup**
  - Create `getUserPosition(userId)` method
  - Query leaderboard view for user's rank
  - Return rank number or null if not in top 100
  - Used after score submission to show new position
  - **File**: `server/services/leaderboardService.js`

- [ ] T027 **Implement Previous Best Score Lookup**
  - Create `getUserPreviousBest(userId, currentScoreId)` method
  - Query scores table for MAX(score) excluding current submission
  - Return previous best score or null
  - Used to determine if new submission is personal best
  - **File**: `server/services/leaderboardService.js`

- [ ] T028 [P] **Implement Get User Stats Method**
  - Create `getUserStats(userId)` method
  - Query `user_stats` view
  - Return object with: total_games, best_score, average_score, first_game, last_game
  - Handle case where user has no stats (return null or empty object)
  - **File**: `server/services/leaderboardService.js`

- [ ] T029 [P] **Implement Get User Scores Method**
  - Create `getUserScores(userId, limit)` method
  - Query scores table for user's recent scores
  - Include `is_personal_best` flag (compare with MAX score)
  - Order by submitted_at DESC
  - Return array of score objects
  - **File**: `server/services/leaderboardService.js`

### Leaderboard API Routes

- [ ] T030 **Add Get Leaderboard Endpoint**
  - Route: `GET /api/v1/leaderboard` (public, no auth required)
  - Parse query params: limit (default 100, max 100), offset (default 0)
  - Call `leaderboardService.getLeaderboard(limit, offset)`
  - Return JSON with leaderboard array and metadata
  - Handle errors with 500 response
  - **File**: `server/server.js`

- [ ] T031 **Add Submit Score Endpoint**
  - Route: `POST /api/v1/scores` (requires authentication)
  - Apply `requireAuth` middleware
  - Parse request body: score, level_reached, session_id
  - Call `leaderboardService.submitScore(req.user.id, ...)`
  - Return 201 with score object and leaderboard position
  - Handle specific errors: RATE_LIMIT (429), DUPLICATE_SESSION (409), INVALID_* (400)
  - Handle generic errors with 500 response
  - **File**: `server/server.js`

- [ ] T032 [P] **Add Get User Stats Endpoint**
  - Route: `GET /api/v1/users/:userId/stats` (public)
  - Support `userId='me'` for current user (requires auth)
  - Call `leaderboardService.getUserStats(userId)`
  - Return 404 if user not found
  - Return JSON with user object and stats
  - **File**: `server/server.js`

- [ ] T033 [P] **Add Get User Scores Endpoint**
  - Route: `GET /api/v1/users/:userId/scores` (public)
  - Support `userId='me'` for current user (requires auth)
  - Parse query param: limit (default 10)
  - Call `leaderboardService.getUserScores(userId, limit)`
  - Return JSON with user info and scores array
  - **File**: `server/server.js`

---

## Phase 5: Client - Authentication UI

### Authentication Client Module

- [ ] T034 **Create Authentication Client Class**
  - Create `AuthClient` class
  - Initialize with `currentUser = null`
  - Create `onAuthChange` callback property (for UI updates)
  - **File**: `client/js/auth.js` (create new)

- [ ] T035 **Implement Session Check Method**
  - Create `checkSession()` async method
  - Fetch `/api/v1/auth/session` with credentials
  - Update `currentUser` based on response
  - Call `onAuthChange` callback if set
  - Handle fetch errors gracefully (return null)
  - **File**: `client/js/auth.js`

- [ ] T036 **Implement Logout Method**
  - Create `logout()` async method
  - POST to `/api/v1/auth/logout` with credentials
  - Set `currentUser = null`
  - Call `onAuthChange` callback
  - Handle errors (log to console)
  - **File**: `client/js/auth.js`

- [ ] T037 **Add Helper Methods**
  - Create `isAuthenticated()` method → returns boolean
  - Create `getUser()` method → returns currentUser object or null
  - These are convenience methods for checking auth state
  - **File**: `client/js/auth.js`

### Authentication UI Components

- [X] T038 **Add Authentication Buttons to HTML**
  - Add sign-in button section to `index.html`
  - Create buttons for: "Sign in with GitHub", "Sign in with Google", "Sign in with Microsoft"
  - Style buttons with provider branding colors
  - Link buttons to: `/auth/github`, `/auth/google`, `/auth/microsoft`
  - Add user info section (hidden by default): avatar, username, sign-out button
  - **File**: `client/index.html`
  - **Completed**: Auth section with 3 OAuth buttons and user-info div added

- [X] T039 **Implement Authentication UI Update Logic**
  - Create `updateAuthUI(user)` function in main.js
  - Show auth buttons if user is null
  - Show user info (avatar, username, sign-out) if user is present
  - Attach click handler to sign-out button → calls `authClient.logout()`
  - **File**: `client/js/main.js`
  - **Completed**: updateAuthUI() function implemented with full auth state handling

- [X] T040 **Initialize Authentication on Page Load**
  - Create global `authClient` instance
  - Call `authClient.checkSession()` on page load
  - Set `authClient.onAuthChange` callback → calls `updateAuthUI(user)`
  - Call `updateAuthUI` with initial user state
  - **File**: `client/js/main.js`
  - **Completed**: initializeAuthentication() function with authClient setup and session check

- [X] T041 **Handle OAuth2 Error Redirects**
  - Check URL for `?auth_error=true` query parameter
  - Display user-friendly error message: "Sign in failed. Please try again."
  - Clear error parameter from URL (optional)
  - **File**: `client/js/main.js`
  - **Completed**: checkAuthError() function with URL param check and history.replaceState()

---

## Phase 6: Client - Leaderboard UI (User Story P1)

### Leaderboard Client Module

- [ ] T042 [P1] **Create Leaderboard Client Class**
  - Create `Leaderboard` class
  - Initialize with `containerId` (DOM element), `authClient` (reference)
  - Create properties: `entries = []`, `poller = null`
  - **File**: `client/js/leaderboard.js` (create new)

- [ ] T043 [P1] **Implement Fetch Leaderboard Method**
  - Create `fetchLeaderboard()` async method
  - Fetch `/api/v1/leaderboard`
  - Parse JSON response, extract `leaderboard` array
  - Update `this.entries` with fetched data
  - Call `this.render()` to update UI
  - Call `this.cacheLeaderboard()` to store in localStorage
  - Handle fetch errors → call `this.loadFromCache()`
  - **File**: `client/js/leaderboard.js`

- [ ] T044 [P1] **Implement Leaderboard Rendering Method**
  - Create `render()` method
  - Clear container innerHTML
  - If entries array is empty, show "Be the first to set a high score!" message
  - Create DocumentFragment for efficient DOM updates
  - Loop through entries, call `createEntryElement(entry)` for each
  - Append all entries to fragment, then append fragment to container
  - **File**: `client/js/leaderboard.js`

- [ ] T045 [P1] **Implement Leaderboard Entry Element Creation**
  - Create `createEntryElement(entry)` method
  - Create div with class `leaderboard-entry`
  - Add rank number: `<span class="rank">#${entry.rank}</span>`
  - Add profile picture: `<img src="..." class="avatar" onerror="...default-avatar...">`
  - Add username: `<span class="username">${escapeHtml(entry.username)}</span>`
  - Add score: `<span class="score">${entry.best_score.toLocaleString()}</span>`
  - Highlight current user: add class `current-user` if `entry.user_id === authClient.getUser().id`
  - **File**: `client/js/leaderboard.js`

- [ ] T046 [P1] **Implement HTML Escaping Helper**
  - Create `escapeHtml(text)` method
  - Prevent XSS by escaping HTML characters in usernames
  - Use `document.createElement('div')` + `textContent` trick
  - Return escaped string
  - **File**: `client/js/leaderboard.js`

- [ ] T047 [P1] **Implement localStorage Caching**
  - Create `cacheLeaderboard(entries)` method
  - Store entries array in localStorage: key `spaceinvaders_leaderboard`
  - Store cache timestamp: key `spaceinvaders_cache_time`
  - Wrap in try-catch (localStorage may be unavailable)
  - **File**: `client/js/leaderboard.js`

- [ ] T048 [P1] **Implement Cache Loading**
  - Create `loadFromCache()` method
  - Retrieve entries from localStorage: key `spaceinvaders_leaderboard`
  - Parse JSON, update `this.entries`
  - Call `this.render()` to display cached data
  - Check cache age (5-minute TTL) → show "data may be outdated" if stale
  - Wrap in try-catch (handle JSON parse errors)
  - **File**: `client/js/leaderboard.js`

- [ ] T049 [P1] **Implement Polling for Real-Time Updates**
  - Create `startPolling(interval = 30000)` method
  - Call `fetchLeaderboard()` immediately
  - Set interval to call `fetchLeaderboard()` every 30 seconds
  - Use Page Visibility API: only poll when `!document.hidden`
  - Store interval ID in `this.poller`
  - Create `stopPolling()` method → clearInterval(this.poller)
  - **File**: `client/js/leaderboard.js`

### Leaderboard HTML Structure

- [X] T050 [P1] **Add Leaderboard Section to HTML**
  - Add leaderboard container to `index.html`
  - Structure: `<div id="leaderboard-container" class="leaderboard"></div>`
  - Position on main game screen (sidebar or overlay panel)
  - Include header: "🏆 Top Players"
  - Include empty state placeholder (will be replaced by JS)
  - **File**: `client/index.html`
  - **Completed**: Leaderboard section added with proper structure and ARIA attributes

- [ ] T051 [P1] **Create Default Avatar Asset**
  - Create or download SVG default avatar icon
  - Place in `client/assets/avatars/default-avatar.svg`
  - Use when profile_picture_url is null or image load fails
  - Themed to match game aesthetic (retro/pixel art style)
  - **File**: `client/assets/avatars/default-avatar.svg`

- [X] T052 [P1] **Initialize Leaderboard on Page Load**
  - Create global `leaderboard` instance in main.js
  - Pass container ID: `'leaderboard-container'`
  - Pass `authClient` reference
  - Call `leaderboard.startPolling()` after auth check completes
  - **File**: `client/js/main.js`
  - **Completed**: initializeLeaderboard() function with polling setup

---

## Phase 7: Client - Score Submission (User Story P2)

### Score Submission Logic

- [ ] T053 [P2] **Implement Submit Score Method**
  - Create `submitScore(score, level, sessionId)` async method in Leaderboard class
  - Check if authenticated → return `{error: 'auth_required'}` if not
  - POST to `/api/v1/scores` with JSON body
  - Include `credentials: 'include'` for session cookie
  - Handle 401 response → return `{error: 'auth_required'}`
  - Handle 429 response → return `{error: 'rate_limited'}`
  - Handle network errors → call `queueScore()`, return `{error: 'network_error', queued: true}`
  - On success → call `fetchLeaderboard()` to refresh, return result
  - **File**: `client/js/leaderboard.js`

- [ ] T054 [P2] **Implement Offline Score Queuing**
  - Create `queueScore(score, level, sessionId)` method
  - Store pending submission in localStorage: key `spaceinvaders_pending`
  - Append to array (support multiple pending scores)
  - Include timestamp for each queued score
  - Wrap in try-catch (handle storage quota errors)
  - **File**: `client/js/leaderboard.js`

- [ ] T055 [P2] **Implement Pending Score Retry**
  - Create `retryPendingScores()` async method
  - Retrieve pending scores from localStorage
  - Loop through each pending score, call `submitScore()`
  - On success → remove from pending array
  - On failure → keep in array for next retry
  - Update localStorage with remaining pending scores
  - Call this method on page load and after reconnecting online
  - **File**: `client/js/leaderboard.js`

- [ ] T056 [P2] **Generate Session ID for Game**
  - Create `generateUUID()` helper function in utils.js or main.js
  - Use UUID v4 format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
  - Generate new session ID at start of each game
  - Pass to submitScore() on game over
  - **File**: `client/js/utils.js`

- [X] T057 [P2] **Integrate Score Submission with Game Over Event**
  - Modify game.js to expose `onGameOver` callback
  - In main.js, set `game.onGameOver = async (score, level) => {...}`
  - Generate session ID: `const sessionId = generateUUID()`
  - Check if authenticated → call `leaderboard.submitScore(score, level, sessionId)`
  - Handle response:
    - `auth_required` → show "Sign in to save your score!"
    - `rate_limited` → show "Please wait before submitting another score"
  - **Completed**: handleGameOver() function integrated with game over event, includes auth check and modal
    - `success` + `is_new_personal_best` → show "New personal best! Rank #X"
    - `network_error` + `queued` → show "Score saved locally, will submit when online"
  - If not authenticated → show "Sign in to save your score to the leaderboard!"
  - **File**: `client/js/main.js`

- [X] T058 [P2] **Create User Feedback Message System**
  - Create `showMessage(text, type = 'info')` function
  - Display temporary toast/banner with message
  - Types: 'info', 'success', 'error', 'warning'
  - Auto-dismiss after 5 seconds
  - Style to match game aesthetic
  - **File**: `client/js/utils.js`
  - **Completed**: showMessage() and createMessageContainer() added to utils.js

### Sign-In Prompt UI

- [X] T059 [P2] **Add Sign-In Prompt for Anonymous Players**
  - Show modal/overlay when anonymous player completes game
  - Message: "Sign in to save your score!"
  - Display score achieved: "You scored X points!"
  - Show all 3 OAuth2 sign-in buttons
  - Add "Continue without signing in" option
  - **File**: `client/index.html` (add modal), `client/js/main.js` (show/hide logic)
  - **Completed**: Modal added to HTML, showSignInPrompt() function in main.js with full functionality

---

## Phase 8: Client - Personal Stats (User Story P3)

### Personal Statistics UI

- [X] T060 [P3] **Add Personal Stats Section to HTML**
  - Add stats container below leaderboard: `<div id="personal-stats" class="stats-panel"></div>`
  - Only visible when user is authenticated
  - Structure: header "Your Stats", placeholder for stats data
  - **File**: `client/index.html`
  - **Completed**: Personal stats section added to HTML structure

- [ ] T061 [P3] **Implement Fetch User Stats Method**
  - Create `fetchUserStats(userId = 'me')` async method
  - Fetch `/api/v1/users/${userId}/stats` with credentials
  - Return stats object: total_games, best_score, average_score, etc.
  - Handle 401 (not authenticated) → return null
  - Handle 404 (user not found) → return null
  - Handle errors → return null
  - **File**: `client/js/leaderboard.js`

- [ ] T062 [P3] **Implement Render User Stats Method**
  - Create `renderUserStats(stats)` method
  - Update `#personal-stats` container with stats data
  - Display: Total Games, Best Score, Average Score, Leaderboard Rank
  - Format numbers with `toLocaleString()`
  - Show "Not ranked" if rank is null
  - Clear container if stats is null (user not authenticated)
  - **File**: `client/js/leaderboard.js`

- [ ] T063 [P3] **Integrate Stats Display with Authentication**
  - In `authClient.onAuthChange` callback, check if user is authenticated
  - If authenticated → call `leaderboard.fetchUserStats()`, then `renderUserStats()`
  - If not authenticated → hide personal stats section
  - Refresh stats after score submission
  - **File**: `client/js/main.js`

- [ ] T064 [P3] **Highlight Current User in Leaderboard**
  - In `createEntryElement()` method, check if `entry.user_id === authClient.getUser()?.id`
  - If match → add class `current-user` to entry div
  - This visually highlights the user's position in the leaderboard
  - Already planned in T045, verify implementation
  - **File**: `client/js/leaderboard.js`

- [ ] T065 [P3] **Add Score Trend Indicator**
  - Fetch user's recent scores: `leaderboard.fetchUserScores('me', 5)`
  - Compare recent average to historical average
  - Display trend: "↑ Improving", "→ Stable", "↓ Declining"
  - Show in personal stats section
  - **File**: `client/js/leaderboard.js`

---

## Phase 9: Profile Pictures (User Story P4)

### Profile Picture Display

- [ ] T066 [P4] **Verify Profile Picture Fetching in OAuth2**
  - Confirm GitHub strategy returns `profile.photos[0].value`
  - Confirm Google strategy returns `profile.photos[0].value`
  - Confirm Microsoft strategy returns `profile.photos[0].value`
  - Verify `upsertUser()` stores `profile_picture_url` in database
  - **File**: `server/services/authService.js` (verify existing code)

- [ ] T067 [P4] **Add Image Lazy Loading**
  - In `createEntryElement()`, add `loading="lazy"` attribute to img tag
  - Improves performance when leaderboard has many entries
  - **File**: `client/js/leaderboard.js`

- [ ] T068 [P4] **Implement Image Error Fallback**
  - In `createEntryElement()`, add `onerror="this.src='/assets/avatars/default-avatar.svg'"`
  - Ensures broken profile picture URLs don't break layout
  - Already planned in T045, verify implementation
  - **File**: `client/js/leaderboard.js`

- [ ] T069 [P4] **Add Image Loading Placeholders**
  - Show animated placeholder while profile pictures load
  - Use CSS skeleton loader or spinner
  - Replace with actual image once loaded
  - Improves perceived performance
  - **File**: `client/css/leaderboard.css`, `client/js/leaderboard.js`

- [ ] T070 [P4] **Optimize Profile Picture Loading**
  - Add `srcset` attribute for responsive images (if providers support multiple sizes)
  - Use `picture` element for art direction (optional)
  - Cache images in browser with appropriate headers
  - **File**: `client/js/leaderboard.js`

---

## Phase 10: Styling and Responsive Design

### Leaderboard Styling

- [ ] T071 **Create Leaderboard CSS File**
  - Create `client/css/leaderboard.css`
  - Define styles for: `.leaderboard-container`, `.leaderboard-entry`, `.rank`, `.avatar`, `.username`, `.score`
  - Match game's retro/pixel aesthetic
  - Use game's color scheme (green terminals, dark backgrounds)
  - **File**: `client/css/leaderboard.css` (create new)

- [ ] T072 **Style Leaderboard Container**
  - Background: semi-transparent dark (`rgba(0, 20, 0, 0.9)`)
  - Border: 2px solid green (`#00ff00`)
  - Padding: 20px
  - Border-radius: 8px
  - Box-shadow for depth
  - **File**: `client/css/leaderboard.css`

- [ ] T073 **Style Leaderboard Entries**
  - Display: flex, align-items: center, gap: 12px
  - Padding: 12px
  - Border-bottom: 1px solid rgba(0, 255, 0, 0.2)
  - Hover effect: background change, border highlight
  - **File**: `client/css/leaderboard.css`

- [ ] T074 **Style Current User Highlight**
  - Class: `.current-user`
  - Background: rgba(0, 255, 0, 0.1)
  - Border: 1px solid #00ff00
  - Font-weight: bold
  - Pulsing animation (optional)
  - **File**: `client/css/leaderboard.css`

- [ ] T075 **Style Profile Pictures**
  - Width/height: 40px
  - Border-radius: 50% (circular)
  - Border: 2px solid #00ff00
  - Object-fit: cover
  - **File**: `client/css/leaderboard.css`

- [ ] T076 **Style Authentication UI**
  - Style sign-in buttons with provider brand colors
  - GitHub: #333
  - Google: #4285f4
  - Microsoft: #00a4ef
  - Add hover effects, active states
  - Style user info section: avatar (small circular), username, sign-out button
  - **File**: `client/css/style.css` or `client/css/auth.css`

### Responsive Design

- [ ] T077 **Add Mobile Breakpoints**
  - Media query: `@media (max-width: 768px)` for tablets
  - Media query: `@media (max-width: 480px)` for phones
  - Define responsive layout changes
  - **File**: `client/css/leaderboard.css`

- [ ] T078 **Implement Mobile Leaderboard Layout**
  - On small screens (< 480px):
    - Reduce padding
    - Smaller avatar size (32px)
    - Smaller font sizes
    - Stack elements if needed
    - Show top 5 entries, add "View More" button
  - **File**: `client/css/leaderboard.css`

- [ ] T079 **Make Authentication Buttons Responsive**
  - Stack buttons vertically on small screens
  - Full-width buttons on mobile
  - Larger touch targets (44px min height)
  - **File**: `client/css/style.css` or `client/css/auth.css`

- [ ] T080 **Test Responsive Design on Actual Devices**
  - Test on iPhone (iOS Safari)
  - Test on Android phone (Chrome)
  - Test on iPad (tablet)
  - Verify touch interactions work
  - Verify text is readable (font-size ≥ 14px)
  - **Manual testing**

---

## Phase 11: Polish and User Experience

### Performance Optimization

- [ ] T081 **Verify 60 FPS During Gameplay**
  - Use browser DevTools Performance tab
  - Record gameplay with leaderboard visible
  - Check frame rate stays at 60 FPS
  - Identify any layout thrashing or long tasks
  - Optimize if needed (debounce renders, use RAF)
  - **Manual testing**

- [ ] T082 **Optimize Leaderboard Rendering**
  - Use `DocumentFragment` for batch DOM updates (already in T044)
  - Minimize reflows: batch style changes
  - Use `will-change: transform` for animations
  - Virtualize long leaderboards if > 100 entries (future enhancement)
  - **File**: `client/js/leaderboard.js`

- [ ] T083 **Add Loading States**
  - Show spinner/skeleton loader while fetching leaderboard
  - Show "Submitting score..." during POST request
  - Disable submit button during submission (prevent double-submit)
  - **File**: `client/js/leaderboard.js`, `client/css/leaderboard.css`

- [ ] T084 **Implement Optimistic UI Updates**
  - When submitting score, immediately add to leaderboard UI
  - Mark as "pending" with visual indicator
  - On server response, update with final data
  - On error, remove optimistic entry and show error message
  - **File**: `client/js/leaderboard.js`

### Error Handling and Edge Cases

- [ ] T085 **Handle Empty Leaderboard State**
  - Show "Be the first to set a high score!" message
  - Include encouraging call-to-action
  - Already planned in T044, verify implementation
  - **File**: `client/js/leaderboard.js`

- [ ] T086 **Handle Network Disconnection**
  - Listen for `online` and `offline` events
  - Show "You're offline" banner when disconnected
  - Switch to cached data automatically
  - Retry pending scores when reconnected
  - **File**: `client/js/main.js`

- [ ] T087 **Handle Authentication Failures**
  - Display clear error messages: "Sign in failed. Please try again."
  - Log errors to console for debugging
  - Provide "Try again" button
  - Handle OAuth2 redirect errors (query param `?auth_error=true`)
  - Already planned in T041, verify implementation
  - **File**: `client/js/main.js`

- [ ] T088 **Handle Score Submission Errors**
  - Rate limit error (429): Show "Please wait X seconds before submitting again"
  - Duplicate session error (409): Show "This score has already been submitted"
  - Validation error (400): Show specific field error
  - Server error (500): Show "Something went wrong. Please try again later."
  - Already planned in T057, verify implementation
  - **File**: `client/js/main.js`

- [ ] T089 **Handle Tie Scores**
  - Verify server correctly tie-breaks by timestamp (earlier wins)
  - Display identical ranks for ties (optional: show both as "#3")
  - Already handled by SQL: `ORDER BY MAX(score) DESC, MAX(submitted_at) ASC`
  - **Verify in database query**

### Accessibility

- [ ] T090 **Add ARIA Labels to Leaderboard**
  - Add `role="list"` to leaderboard container
  - Add `role="listitem"` to each entry
  - Add `aria-label` to profile pictures: "Profile picture of {username}"
  - Add `aria-label` to rank: "Rank {rank}"
  - **File**: `client/js/leaderboard.js`

- [ ] T091 **Add Keyboard Navigation to Auth Buttons**
  - Ensure buttons are focusable with Tab key
  - Add visible focus styles (outline or border)
  - Support Enter key to activate buttons
  - **File**: `client/css/style.css`

- [ ] T092 **Add Screen Reader Announcements**
  - Use `aria-live="polite"` for leaderboard updates
  - Announce new high scores to screen readers
  - Announce authentication state changes
  - **File**: `client/index.html`, `client/js/leaderboard.js`

---

## Phase 12: Testing and Validation

### Manual Testing Checklist

- [ ] T093 **Test OAuth2 Authentication Flows**
  - Sign in with GitHub → verify success, profile data fetched
  - Sign in with Google → verify success
  - Sign in with Microsoft → verify success
  - Sign out → verify session destroyed
  - Test redirect after authentication (should return to game)
  - **Manual testing**

- [ ] T094 **Test Leaderboard Display**
  - View leaderboard without signing in → verify public access
  - Verify top 10 scores displayed
  - Verify scores sorted correctly (highest first)
  - Verify rank numbers correct
  - Verify profile pictures display (or fallback)
  - **Manual testing**

- [ ] T095 **Test Score Submission**
  - Play game while signed in → verify score auto-submits
  - Verify immediate confirmation message
  - Verify leaderboard updates with new score
  - Verify rank position shown
  - Verify "new personal best" message if applicable
  - **Manual testing**

- [ ] T096 **Test Rate Limiting**
  - Submit score, then immediately submit another
  - Verify second submission blocked with error message
  - Wait 60 seconds, submit again → verify success
  - **Manual testing**

- [ ] T097 **Test Personal Statistics**
  - Sign in and view personal stats
  - Verify correct values: total games, best score, average
  - Play multiple games, verify stats update
  - Verify current user highlighted in leaderboard
  - **Manual testing**

- [ ] T098 **Test Offline Functionality**
  - Disconnect network, view leaderboard → verify cached data shown
  - Disconnect network, submit score → verify queued locally
  - Reconnect network → verify queued score submitted automatically
  - **Manual testing**

- [ ] T099 **Test Responsive Design**
  - Test on desktop (1920x1080, 1366x768)
  - Test on tablet (iPad 768px width)
  - Test on mobile (iPhone 375px width, Android 360px width)
  - Verify layout adapts correctly
  - Verify text readable, buttons tappable
  - **Manual testing**

- [ ] T100 **Test Edge Cases**
  - Empty leaderboard (no scores yet) → verify message shown
  - Tie scores → verify tie-breaking works
  - Very long usernames → verify text truncation/wrapping
  - Missing profile pictures → verify fallback to default avatar
  - Invalid profile picture URLs → verify error handling
  - **Manual testing**

### Cross-Browser Testing

- [ ] T101 **Test in Chrome**
  - Verify all features work in latest Chrome
  - Check console for errors
  - Verify performance (60 FPS)
  - **Manual testing**

- [ ] T102 **Test in Firefox**
  - Verify all features work in latest Firefox
  - Check for CSS compatibility issues
  - Verify fetch API, localStorage work
  - **Manual testing**

- [ ] T103 **Test in Safari**
  - Verify all features work in Safari (macOS/iOS)
  - Check for webkit-specific issues
  - Verify OAuth2 redirects work
  - **Manual testing**

- [ ] T104 **Test in Edge**
  - Verify all features work in Microsoft Edge
  - Check for Chromium compatibility
  - **Manual testing**

---

## Phase 13: Constitution Compliance Validation

### Final Constitution Check

- [ ] T105 **Validate User-Centric Design (Principle I)**
  - ✅ UI is intuitive: leaderboard visible, buttons labeled
  - ✅ Interactive elements have clear hover/active states
  - ✅ Error messages are user-friendly with actionable guidance
  - ✅ Mobile layouts tested on actual devices
  - ✅ Performance maintained (60 FPS during gameplay)
  - **Manual review**

- [ ] T106 **Validate Data Integrity & Persistence (Principle II)**
  - ✅ Input validation on server: score range, level range, session ID format
  - ✅ Error handling with try-catch on all database operations
  - ✅ Data stored in SQLite (server) and localStorage (client cache)
  - ✅ Atomic operations: SQLite transactions, unique constraints
  - ✅ Anti-cheat: server-side validation, rate limiting, session tracking
  - **Manual review**

- [ ] T107 **Validate Client-Server Separation (Principle III)**
  - ✅ Client responsibilities: render UI, cache data, optimistic updates
  - ✅ Server responsibilities: validate, store, authenticate, aggregate
  - ✅ API contracts followed: RESTful, JSON, status codes
  - ✅ No business logic in client affecting server state
  - ✅ No presentation logic in server responses (JSON only)
  - **Manual review**

- [ ] T108 **Validate Progressive Enhancement (Principle IV)**
  - ✅ Core feature works without network (cached leaderboard)
  - ✅ Feature detection: localStorage, fetch API, online status checked
  - ✅ Fallback mechanisms: local-only mode, cached data, queued submissions
  - ✅ Non-blocking operations: all async, no game freezing
  - ✅ Incremental rollout: P1 → P2 → P3 → P4 implemented in order
  - **Manual review**

- [ ] T109 **Validate Performance & Responsiveness (Principle V)**
  - ✅ 60 FPS maintained during gameplay with leaderboard visible
  - ✅ Lazy loading: leaderboard fetched on-demand, not at init
  - ✅ Efficient DOM manipulation: DocumentFragment, batch updates
  - ✅ Memory management: event listener cleanup, cache limits
  - ✅ API response times: <200ms (verify with DevTools Network tab)
  - **Manual review + performance testing**

- [ ] T110 **Validate Code Quality Standards**
  - ✅ Code organized: dedicated files (`authService.js`, `leaderboardService.js`, `auth.js`, `leaderboard.js`)
  - ✅ Naming conventions: camelCase (functions/vars), PascalCase (classes), UPPER_CASE (constants)
  - ✅ Error handling: try-catch with contextual logging, user-friendly messages
  - ✅ Testing completed: manual testing checklist, edge cases, cross-browser
  - **Code review**

---

## Summary

**Total Tasks**: 110  
**Phases**: 13  
**User Stories**: P1 (View Leaderboard), P2 (Submit Score), P3 (Personal Stats), P4 (Profile Pictures)

**Dependency Notes**:
- **P1 (View Leaderboard)** can be implemented independently with mock data
- **P2 (Submit Score)** requires authentication infrastructure (Phase 3) to be complete
- **P3 (Personal Stats)** builds on P2 (requires score history)
- **P4 (Profile Pictures)** is independent enhancement, can be done in parallel with P3

**Parallel Execution Opportunities**:
- T011 [P], T012 [P], T013 can run parallel (OAuth2 strategies)
- T017 [P], T018 [P] can run parallel (OAuth2 routes)
- T028 [P], T029 [P], T032 [P], T033 [P] can run parallel (stats/scores methods and endpoints)
- P4 (Profile Pictures) tasks can run parallel with P3 (Personal Stats)

**Estimated Timeline**:
- Setup & Foundation (Phase 1-2): 1 hour
- Server Implementation (Phase 3-4): 3-4 hours
- Client Implementation (Phase 5-9): 4-5 hours
- Polish & Testing (Phase 10-12): 2-3 hours
- Validation (Phase 13): 1 hour

**Total**: ~11-14 hours for complete implementation with testing and validation
