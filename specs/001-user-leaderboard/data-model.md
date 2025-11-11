# Data Model: User Leaderboard with Authentication

**Feature**: User Leaderboard with Authentication  
**Branch**: `001-user-leaderboard`  
**Created**: 2025-11-11

## Overview

This document defines the data entities, their attributes, relationships, and validation rules for the leaderboard feature. The data model is implemented in SQLite with better-sqlite3.

---

## Entity Relationship Diagram

```
┌─────────────────┐         ┌──────────────────┐
│     User        │         │      Score       │
├─────────────────┤         ├──────────────────┤
│ id (PK)         │────────<│ user_id (FK)     │
│ provider        │    1:N  │ score            │
│ provider_id     │         │ level_reached    │
│ username        │         │ session_id       │
│ email           │         │ submitted_at     │
│ profile_pic_url │         └──────────────────┘
│ created_at      │
│ last_login      │
└─────────────────┘
        │
        │ Aggregated in
        ▼
┌─────────────────┐
│  Leaderboard    │
│  (VIEW)         │
├─────────────────┤
│ user_id         │
│ username        │
│ profile_pic_url │
│ best_score      │
│ best_level      │
│ rank            │
└─────────────────┘
```

---

## Entity: User

**Description**: Represents an authenticated player who can submit scores to the leaderboard.

### Attributes

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique user identifier |
| `provider` | TEXT | NOT NULL | OAuth2 provider name ('github', 'google', 'microsoft') |
| `provider_id` | TEXT | NOT NULL | Unique user ID from the OAuth2 provider |
| `username` | TEXT | NOT NULL | Display name for leaderboard (from OAuth2 profile) |
| `email` | TEXT | NULL | Email address (optional, from OAuth2 profile) |
| `profile_picture_url` | TEXT | NULL | URL to user's profile picture from OAuth2 provider |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | When user first signed in |
| `last_login` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last successful authentication |

### Unique Constraints

- `UNIQUE(provider, provider_id)`: Same provider ID can't be registered twice for the same provider
- Allows same person to have multiple accounts if they use different providers

### Validation Rules

- `provider`: Must be one of: 'github', 'google', 'microsoft'
- `username`: Maximum 50 characters, cannot be empty
- `email`: Must be valid email format if provided (validated by OAuth2 provider)
- `profile_picture_url`: Must be valid HTTPS URL if provided

### Relationships

- **One-to-Many** with Score: One user can have multiple scores
- Used in **Leaderboard View**: Joined with scores to calculate best score

### Example Data

```json
{
  "id": 1,
  "provider": "github",
  "provider_id": "12345678",
  "username": "space_ace",
  "email": "space_ace@example.com",
  "profile_picture_url": "https://avatars.githubusercontent.com/u/12345678",
  "created_at": "2025-11-11T10:30:00Z",
  "last_login": "2025-11-11T14:45:00Z"
}
```

---

## Entity: Score

**Description**: Represents a single game score submission from an authenticated user.

### Attributes

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Unique score identifier |
| `user_id` | INTEGER | NOT NULL, FOREIGN KEY → users(id) | Which user achieved this score |
| `score` | INTEGER | NOT NULL, CHECK (0 ≤ score ≤ 999999) | The score value (0 to 999,999) |
| `level_reached` | INTEGER | NOT NULL, CHECK (level_reached > 0) | Highest level reached in this game |
| `session_id` | TEXT | NOT NULL, UNIQUE | Unique identifier for this game session |
| `submitted_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | When score was submitted |

### Unique Constraints

- `UNIQUE(session_id)`: Prevents duplicate score submissions for the same game session

### Validation Rules

- `score`: Must be between 0 and 999,999 (inclusive)
- `level_reached`: Must be positive integer (1+)
- `session_id`: Must be a UUID v4 format (validated on server)
- Cascade delete: If user is deleted, all their scores are deleted

### Relationships

- **Many-to-One** with User: Multiple scores belong to one user
- Used in **Leaderboard View**: Aggregated to find best score per user

### Business Rules

1. **Anti-Duplication**: Session ID must be unique to prevent submitting the same score multiple times
2. **Rate Limiting**: Server enforces max 1 submission per minute per user (not in database, enforced in application logic)
3. **Time Validation**: `submitted_at` should be within reasonable time of game session start (validated on server)

### Example Data

```json
{
  "id": 42,
  "user_id": 1,
  "score": 15750,
  "level_reached": 8,
  "session_id": "a3f5c8e2-9b4d-4a1c-8f6e-2d9c7b4a1e8f",
  "submitted_at": "2025-11-11T14:45:23Z"
}
```

---

## View: Leaderboard

**Description**: Materialized view (SQL VIEW) that aggregates user data with their best scores for efficient leaderboard queries.

### Attributes

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | INTEGER | User's unique identifier |
| `username` | TEXT | User's display name |
| `profile_picture_url` | TEXT | URL to user's profile picture (or NULL) |
| `best_score` | INTEGER | User's highest score across all games |
| `best_level` | INTEGER | Highest level reached in the game with best_score |
| `last_played` | DATETIME | Most recent score submission timestamp |
| `rank` | INTEGER | User's position in leaderboard (1 = highest score) |

### SQL Definition

```sql
CREATE VIEW leaderboard AS
SELECT 
    users.id as user_id,
    users.username,
    users.profile_picture_url,
    MAX(scores.score) as best_score,
    MAX(scores.level_reached) as best_level,
    MAX(scores.submitted_at) as last_played,
    ROW_NUMBER() OVER (ORDER BY MAX(scores.score) DESC, MAX(scores.submitted_at) ASC) as rank
FROM users
JOIN scores ON users.id = scores.user_id
GROUP BY users.id
ORDER BY best_score DESC, last_played ASC
LIMIT 100;
```

### Tie-Breaking Rules

When two users have the same `best_score`:
1. Earlier timestamp wins (first to achieve the score gets higher rank)
2. If timestamps are identical (unlikely), database order determines rank

### Performance Considerations

- **Indexes**: 
  - `idx_scores_user_id`: Fast user → scores lookup
  - `idx_scores_score_desc`: Fast sorting by score
- **View Materialization**: View is not materialized (computed on query), adequate for 100-1000 users
- **Limit 100**: Only top 100 entries returned to keep response size manageable

### Example Query Response

```json
[
  {
    "user_id": 1,
    "username": "space_ace",
    "profile_picture_url": "https://avatars.githubusercontent.com/u/12345678",
    "best_score": 89500,
    "best_level": 15,
    "last_played": "2025-11-11T14:45:23Z",
    "rank": 1
  },
  {
    "user_id": 2,
    "username": "alien_hunter",
    "profile_picture_url": null,
    "best_score": 72300,
    "best_level": 12,
    "last_played": "2025-11-10T09:20:15Z",
    "rank": 2
  }
]
```

---

## Entity: Session (Transient)

**Description**: Ephemeral session data stored in Express session middleware (not in SQLite). Used for OAuth2 flow and maintaining user authentication.

### Attributes

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | INTEGER | ID of authenticated user (NULL if not logged in) |
| `username` | TEXT | Cached username for quick access |
| `provider` | TEXT | Which OAuth2 provider was used |
| `session_start` | DATETIME | When session was created |

### Storage

- **Location**: In-memory or Redis (for production)
- **Library**: express-session
- **Cookie**: Secure, httpOnly, sameSite=strict
- **Expiration**: 24 hours of inactivity

### Not Persisted in SQLite

Session data is intentionally kept separate from the database for:
- **Performance**: Fast session lookups without database queries
- **Ephemerality**: Sessions expire and are garbage-collected automatically
- **Security**: Session data doesn't need long-term persistence

---

## Database Schema (SQL)

### Complete Schema Definition

```sql
-- ============================================================================
-- Space Invaders Leaderboard Database Schema
-- ============================================================================

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL CHECK(provider IN ('github', 'google', 'microsoft')),
    provider_id TEXT NOT NULL,
    username TEXT NOT NULL CHECK(LENGTH(username) > 0 AND LENGTH(username) <= 50),
    email TEXT,
    profile_picture_url TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_id)
);

-- Scores Table
CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK(score >= 0 AND score <= 999999),
    level_reached INTEGER NOT NULL CHECK(level_reached > 0),
    session_id TEXT NOT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(session_id)
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

-- Leaderboard View (Top 100)
CREATE VIEW IF NOT EXISTS leaderboard AS
SELECT 
    users.id as user_id,
    users.username,
    users.profile_picture_url,
    MAX(scores.score) as best_score,
    MAX(scores.level_reached) as best_level,
    MAX(scores.submitted_at) as last_played,
    ROW_NUMBER() OVER (ORDER BY MAX(scores.score) DESC, MAX(scores.submitted_at) ASC) as rank
FROM users
INNER JOIN scores ON users.id = scores.user_id
GROUP BY users.id
ORDER BY best_score DESC, last_played ASC
LIMIT 100;

-- User Stats View (Individual player statistics)
CREATE VIEW IF NOT EXISTS user_stats AS
SELECT 
    users.id as user_id,
    users.username,
    COUNT(scores.id) as total_games,
    MAX(scores.score) as best_score,
    AVG(scores.score) as average_score,
    MIN(scores.submitted_at) as first_game,
    MAX(scores.submitted_at) as last_game
FROM users
LEFT JOIN scores ON users.id = scores.user_id
GROUP BY users.id;
```

---

## Data Validation Rules Summary

### Score Submission Validation (Application Layer)

1. **Authentication**: User must be authenticated (session exists)
2. **Score Range**: 0 ≤ score ≤ 999,999
3. **Level Range**: level ≥ 1
4. **Session ID**: Must be valid UUID v4 format
5. **Rate Limit**: Max 1 submission per 60 seconds per user
6. **Duplicate Prevention**: Session ID must not already exist in database
7. **Time Validation**: Submission time should be within reasonable range of game start (optional)

### User Profile Validation (OAuth2 + Application Layer)

1. **Provider**: Must be 'github', 'google', or 'microsoft'
2. **Provider ID**: Must be unique within provider namespace
3. **Username**: 1-50 characters, non-empty
4. **Email**: Valid email format (if provided)
5. **Profile Picture URL**: Valid HTTPS URL (if provided)

---

## Data Migration Strategy

### Initial Migration (v1)

```sql
-- Run on first deployment
-- File: server/database/migrations/001_initial_schema.sql

-- Create tables, indexes, and views as defined above
-- Populate with sample data (optional for testing)
```

### Future Migrations

Migrations will be numbered sequentially (002, 003, etc.) and applied in order:
- Track applied migrations in a `migrations` table
- Use simple file-based migration runner
- Always include rollback scripts

### Sample Data (Development Only)

```sql
-- Insert test users
INSERT INTO users (provider, provider_id, username, email, profile_picture_url)
VALUES 
    ('github', 'test1', 'TestPlayer1', 'test1@example.com', 'https://via.placeholder.com/64'),
    ('google', 'test2', 'TestPlayer2', 'test2@example.com', 'https://via.placeholder.com/64');

-- Insert test scores
INSERT INTO scores (user_id, score, level_reached, session_id)
VALUES 
    (1, 50000, 10, '00000000-0000-0000-0000-000000000001'),
    (1, 75000, 15, '00000000-0000-0000-0000-000000000002'),
    (2, 60000, 12, '00000000-0000-0000-0000-000000000003');
```

---

## Backup and Recovery

### Backup Strategy

- **SQLite file**: `server/database/leaderboard.db`
- **Backup frequency**: Daily automated backup
- **Backup location**: `server/database/backups/leaderboard_YYYY-MM-DD.db`
- **Retention**: Keep last 30 days of backups

### Recovery Procedure

1. Stop the server
2. Replace `leaderboard.db` with backup file
3. Restart the server
4. Verify leaderboard data integrity

---

## Summary

This data model provides:
- ✅ **User authentication** via OAuth2 with multiple providers
- ✅ **Score tracking** with anti-cheat measures (unique session IDs)
- ✅ **Leaderboard ranking** via efficient SQL VIEW
- ✅ **Data integrity** via constraints and foreign keys
- ✅ **Performance** via strategic indexes
- ✅ **Scalability** to 100-1000 users with top 100 leaderboard

Next: Define API contracts for client-server communication.
