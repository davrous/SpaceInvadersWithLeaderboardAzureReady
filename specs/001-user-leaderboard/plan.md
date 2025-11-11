# Implementation Plan: User Leaderboard with Authentication

**Branch**: `001-user-leaderboard` | **Date**: 2025-11-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-user-leaderboard/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a competitive leaderboard to the Space Invaders game that displays top player scores with names and profile pictures. Players must authenticate via OAuth2 (GitHub, Google, or Microsoft) to submit scores. The leaderboard is visible on the main game screen and updates in real-time. Profile pictures are not uploaded but fetched from OAuth2 provider metadata. All leaderboard data is stored in a local SQLite database on the server. The feature uses vanilla HTML/CSS/JavaScript with minimal dependencies, maintaining the existing Vite-based architecture.

## Technical Context

**Language/Version**: JavaScript ES6+ (client), Node.js 14+ (server)  
**Primary Dependencies**: 
  - Client: Vanilla JavaScript (no framework), Vite (build tool)
  - Server: Express.js (existing), better-sqlite3 (SQLite), passport.js (OAuth2)
**Storage**: SQLite database (local file-based, server-side only)  
**Testing**: Manual testing (as per constitution - no formal test framework required)  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge); Node.js server on Windows/Linux  
**Project Type**: Web application (client + server)  
**Performance Goals**: 
  - Maintain 60 FPS gameplay with leaderboard visible
  - Leaderboard loads in <1 second
  - Score submission completes in <2 seconds
  - API endpoints respond in <200ms (p95)  
**Constraints**: 
  - Minimal external dependencies (vanilla JS preferred)
  - No image uploads (profile pictures via OAuth2 provider URLs only)
  - Local SQLite database (no cloud database)
  - Must work offline for viewing cached leaderboard
  - Must not block or slow down game rendering loop  
**Scale/Scope**: 
  - Support ~100-1000 concurrent players
  - Top 100 leaderboard entries displayed
  - 3 OAuth2 providers (GitHub, Google, Microsoft)
  - Single-page addition to existing game UI

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Review this feature against all five core principles from `.specify/memory/constitution.md`:

### I. User-Centric Design (UX First) ✅/❌
- [ ] UI mockups reviewed and approved
- [ ] All interactive elements have clear hover/active/disabled states
- [ ] Error messages are user-friendly with actionable guidance
- [ ] Mobile layouts designed and will be tested on actual devices
- [ ] Performance impact assessed (will not degrade UX)

### II. Data Integrity & Persistence ✅/❌
- [ ] Data validation strategy defined (input ranges, types, constraints)
- [ ] Error handling strategy for all data operations (try-catch, recovery)
- [ ] Storage mechanism chosen (localStorage, backend DB, both)
- [ ] Atomic operations ensured (all-or-nothing data changes)
- [ ] Anti-cheat/validation measures planned if handling scores

### III. Client-Server Separation ✅/❌
- [ ] Client responsibilities clearly defined (presentation, caching, optimistic updates)
- [ ] Server responsibilities clearly defined (source of truth, validation, aggregation)
- [ ] API contracts documented (endpoints, payloads, status codes)
- [ ] No business logic in client that affects server state
- [ ] No presentation logic in server responses

### IV. Progressive Enhancement ✅/❌
- [ ] Core feature works without network (graceful degradation plan)
- [ ] Feature detection implemented (localStorage, network, API availability)
- [ ] Fallback mechanisms defined (local-only mode, cached data)
- [ ] Non-blocking operations (async/await, no game freezing)
- [ ] Incremental rollout plan (MVP first, enhancements later)

### V. Performance & Responsiveness ✅/❌
- [ ] 60 FPS target maintained (feature doesn't block game loop)
- [ ] Lazy loading strategy (data loaded on-demand)
- [ ] Efficient DOM manipulation planned (batch updates, minimize reflows)
- [ ] Memory management considered (cleanup, limits)
- [ ] API response time targets defined (<200ms p95)

### Code Quality Standards ✅/❌
- [ ] Code organization plan follows project structure (dedicated files for feature)
- [ ] Naming conventions will be followed (camelCase, PascalCase, UPPER_CASE)
- [ ] Error handling strategy with try-catch and user-friendly messages
- [ ] Testing plan defined (manual testing checklist, edge cases, cross-browser)

### Constitution Check Results

✅ **I. User-Centric Design (UX First)** - PASS
- UI mockups will be created in Phase 1 (design wireframes)
- Interactive states planned (hover/active/disabled for buttons, highlighted ranks)
- Error messages designed to be user-friendly ("Connection lost - retrying...", "Sign in to save score")
- Mobile layout will use responsive CSS (flexbox/grid)
- Performance maintained via lazy loading and non-blocking async operations

✅ **II. Data Integrity & Persistence** - PASS
- Validation: Score bounds checking (0-999999), timestamp validation, session ID verification
- Error handling: Try-catch on all async operations, retry with exponential backoff
- Storage: SQLite for server (authoritative), localStorage for client (cache)
- Atomic operations: SQLite transactions, conflict resolution via REPLACE strategy
- Anti-cheat: Server-side validation, session tracking, rate limiting

✅ **III. Client-Server Separation** - PASS
- Client: Render UI, cache data, optimistic updates, input handling
- Server: Store scores, validate submissions, OAuth2 flows, aggregate rankings
- API: RESTful endpoints (`/api/v1/leaderboard`, `/api/v1/auth/*`)
- No business logic in client affecting server state
- Server returns JSON data only (no HTML rendering)

✅ **IV. Progressive Enhancement** - PASS
- Core game works without leaderboard if server down
- Feature detection: Check localStorage, fetch API, online status
- Fallbacks: Local-only leaderboard, cached data display, queued submissions
- Non-blocking: All API calls async with Promise-based flow
- Incremental: P1 (view) → P2 (submit) → P3 (stats) → P4 (pictures)

✅ **V. Performance & Responsiveness** - PASS
- 60 FPS maintained: Leaderboard renders in separate RAF cycle
- Lazy loading: Fetch leaderboard on-demand, not at game init
- Efficient DOM: Batch updates, use DocumentFragment, minimize reflows
- Memory: Event listener cleanup, limit cached entries to 100
- API targets: <200ms response with indexed queries, caching

✅ **Code Quality Standards** - PASS
- Organization: `client/js/leaderboard.js`, `server/services/leaderboardService.js`, `server/services/authService.js`
- Naming: camelCase (functions/variables), PascalCase (classes), UPPER_CASE (constants)
- Error handling: Try-catch with contextual logging, user-friendly messages
- Testing: Manual checklist, edge cases, cross-browser, mobile device testing

**Overall Assessment**: ✅ **PASS** - All constitutional principles satisfied, no violations

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
client/
├── index.html                    # (MODIFY) Add leaderboard section, auth UI
├── css/
│   ├── style.css                 # (MODIFY) Add leaderboard styles
│   └── leaderboard.css           # (NEW) Dedicated leaderboard styles
├── js/
│   ├── main.js                   # (MODIFY) Initialize leaderboard module
│   ├── game.js                   # (MODIFY) Trigger score submission on game over
│   ├── leaderboard.js            # (NEW) Leaderboard UI and client logic
│   ├── auth.js                   # (NEW) OAuth2 client-side flow handling
│   └── utils.js                  # (MODIFY) Add API client helpers
└── assets/
    └── avatars/
        └── default-avatar.svg    # (NEW) Placeholder for missing profile pics

server/
├── server.js                     # (MODIFY) Add auth & leaderboard routes
├── services/
│   ├── leaderboardService.js     # (NEW) Leaderboard business logic
│   ├── authService.js            # (NEW) OAuth2 authentication logic
│   └── aiLevelGenerator.js       # (EXISTING) No changes
└── database/
    ├── schema.sql                # (NEW) SQLite schema for users, scores
    ├── migrations/               # (NEW) Database migration scripts
    └── leaderboard.db            # (NEW) SQLite database file (gitignored)

package.json                      # (MODIFY) Add new dependencies
.env.example                      # (MODIFY) Add OAuth2 config examples
.gitignore                        # (MODIFY) Ignore database file
```

**Structure Decision**: Web application structure (client + server) matching existing project layout. Client code in `client/` (HTML/CSS/JS), server code in `server/` (Node.js/Express). New files for leaderboard and auth features, minimal modifications to existing game code. SQLite database stored in `server/database/` directory.

## Complexity Tracking

No constitutional violations - all principles satisfied without complexity justification needed.

---

## Phase 0: Research - COMPLETE ✅

**Output**: [research.md](research.md)

All technical unknowns have been resolved:
- OAuth2 authentication: Passport.js with GitHub/Google/Microsoft strategies
- Database: SQLite with better-sqlite3 (synchronous API)
- Client framework: Vanilla JavaScript with DocumentFragment
- Caching: localStorage with 5-minute TTL
- Real-time updates: Polling every 30 seconds
- Validation: Multi-layer (client + server + rate limiting)
- Responsive design: CSS Flexbox with media queries
- OAuth2 flow: Authorization Code Flow (most secure)

---

## Phase 1: Design & Contracts - COMPLETE ✅

**Outputs**:
- [data-model.md](data-model.md) - Complete entity definitions, SQL schema, validation rules
- [contracts/api-contracts.md](contracts/api-contracts.md) - 12 RESTful endpoints with examples
- [quickstart.md](quickstart.md) - Step-by-step implementation guide

### Data Model Summary

**Entities**:
- `users` table: OAuth2 user profiles (id, provider, username, email, profile_pic_url)
- `scores` table: Game scores with anti-duplication (session_id unique constraint)
- `leaderboard` view: Top 100 aggregated rankings with ROW_NUMBER()
- `user_stats` view: Personal statistics (total_games, best_score, average)

**Indexes**: `idx_scores_user_id`, `idx_scores_score_desc`, `idx_users_provider`

**Constraints**: Score 0-999999, level ≥ 1, unique session_id, foreign key cascade delete

### API Contracts Summary

**Authentication** (6 endpoints):
- OAuth2 flows: `/auth/github`, `/auth/google`, `/auth/microsoft` + callbacks
- Session management: `GET /api/v1/auth/session`, `POST /api/v1/auth/logout`

**Leaderboard** (6 endpoints):
- `GET /api/v1/leaderboard` - Top 100 public leaderboard
- `POST /api/v1/scores` - Submit score (authenticated)
- `GET /api/v1/users/:userId/stats` - User statistics
- `GET /api/v1/users/:userId/scores` - User score history

**Status Codes**: 200, 201, 302, 400, 401, 404, 409, 429, 500

**Rate Limiting**: 1 score submission per 60 seconds per user

### Re-evaluated Constitution Check

✅ **All principles still satisfied after design**:

1. **User-Centric Design**: API responses include user-friendly error messages, leaderboard updates immediately, profile pictures with fallbacks
2. **Data Integrity**: SQLite ACID guarantees, unique constraints prevent duplicates, validation at multiple layers
3. **Client-Server Separation**: Clear API contracts, JSON-only responses, session-based auth keeps tokens on server
4. **Progressive Enhancement**: localStorage caching, offline queue for scores, graceful degradation in quickstart
5. **Performance**: Indexed queries, view-based leaderboard, polling instead of WebSockets, DocumentFragment rendering

**No new violations introduced in design phase.**

---

## Phase 2: Task Generation - PENDING

Run `/speckit.tasks` to generate the detailed task list for implementation.

The tasks will be organized by user story:
- **Phase 1 (Setup)**: Project structure, dependencies
- **Phase 2 (Foundational)**: Database, auth infrastructure
- **Phase 3 (US1)**: View global leaderboard (P1)
- **Phase 4 (US2)**: Sign in and submit score (P2)
- **Phase 5 (US3)**: View personal stats (P3)
- **Phase 6 (US4)**: Profile picture display (P4)
- **Phase 7 (Polish)**: Constitution compliance validation, testing

---

## Summary

**Planning Status**: ✅ COMPLETE  
**Branch**: `001-user-leaderboard`  
**Next Command**: `/speckit.tasks`

**Artifacts Generated**:
1. ✅ plan.md (this file)
2. ✅ research.md (8 technical decisions documented)
3. ✅ data-model.md (4 entities, SQL schema, validation rules)
4. ✅ contracts/api-contracts.md (12 API endpoints with examples)
5. ✅ quickstart.md (5-phase implementation guide)

**Ready for Implementation**: All technical unknowns resolved, constitution verified, contracts defined.
