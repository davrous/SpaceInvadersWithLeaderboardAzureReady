-- ============================================================================
-- Space Invaders Leaderboard Database Schema
-- Feature: User Leaderboard with Authentication
-- Created: 2025-11-11
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
