/**
 * Leaderboard Service
 * Manages score submissions, leaderboard queries, and user statistics
 */
class LeaderboardService {
    constructor(db) {
        this.db = db;
        this.rateLimits = new Map(); // userId -> lastSubmitTime
    }

    /**
     * Get global leaderboard with pagination
     * @param {number} limit - Number of entries to return (max 100)
     * @param {number} offset - Pagination offset
     * @returns {Object} - Leaderboard data with metadata
     */
    getLeaderboard(limit = 100, offset = 0) {
        try {
            limit = Math.min(limit, 100); // Cap at 100
            
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

            return { 
                leaderboard: entries, 
                total: total || 0, 
                limit, 
                offset 
            };
        } catch (error) {
            console.error('Get leaderboard error:', error);
            throw error;
        }
    }

    /**
     * Check if user can submit a score (rate limiting)
     * @param {number} userId - User ID
     * @returns {boolean} - True if can submit, false otherwise
     */
    canSubmitScore(userId) {
        const lastSubmit = this.rateLimits.get(userId);
        if (!lastSubmit) return true;
        
        const elapsed = Date.now() - lastSubmit;
        return elapsed >= 5000; // 5 seconds
    }

    /**
     * Submit a new score
     * @param {number} userId - User ID
     * @param {number} score - Score value
     * @param {number} levelReached - Level reached
     * @param {string} sessionId - Unique session ID
     * @returns {Object} - Score object with leaderboard position
     */
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
        if (!sessionId || !this.isValidUUID(sessionId)) {
            throw new Error('INVALID_SESSION_ID');
        }

        try {
            const stmt = this.db.prepare(`
                INSERT INTO scores (user_id, score, level_reached, session_id)
                VALUES (?, ?, ?, ?)
            `);
            const result = stmt.run(userId, score, levelReached, sessionId);
            
            // Update rate limit
            this.rateLimits.set(userId, Date.now());

            // Get leaderboard position and previous best
            const position = this.getUserPosition(userId);
            const previousBest = this.getUserPreviousBest(userId, result.lastInsertRowid);

            console.log(`✅ Score submitted: User ${userId}, Score ${score}, Level ${levelReached}`);

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
            console.error('Submit score error:', error);
            throw error;
        }
    }

    /**
     * Validate UUID v4 format
     * @param {string} uuid - UUID string to validate
     * @returns {boolean} - True if valid UUID v4
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }

    /**
     * Get user's current leaderboard position
     * @param {number} userId - User ID
     * @returns {number|null} - Rank or null if not in top 100
     */
    getUserPosition(userId) {
        try {
            const stmt = this.db.prepare(`
                SELECT rank FROM leaderboard WHERE user_id = ?
            `);
            const result = stmt.get(userId);
            return result ? result.rank : null;
        } catch (error) {
            console.error('Get user position error:', error);
            return null;
        }
    }

    /**
     * Get user's previous best score (excluding current submission)
     * @param {number} userId - User ID
     * @param {number} currentScoreId - Current score ID to exclude
     * @returns {number|null} - Previous best score or null
     */
    getUserPreviousBest(userId, currentScoreId) {
        try {
            const stmt = this.db.prepare(`
                SELECT MAX(score) as best
                FROM scores
                WHERE user_id = ? AND id != ?
            `);
            const result = stmt.get(userId, currentScoreId);
            return result && result.best !== null ? result.best : null;
        } catch (error) {
            console.error('Get previous best error:', error);
            return null;
        }
    }

    /**
     * Get user statistics
     * @param {number} userId - User ID
     * @returns {Object|null} - User stats object or null
     */
    getUserStats(userId) {
        try {
            const stmt = this.db.prepare(`
                SELECT * FROM user_stats WHERE user_id = ?
            `);
            const stats = stmt.get(userId);
            
            if (!stats) return null;
            
            // Add leaderboard rank
            const position = this.getUserPosition(userId);
            return {
                ...stats,
                leaderboard_rank: position,
                percentile: position ? this.calculatePercentile(position) : null
            };
        } catch (error) {
            console.error('Get user stats error:', error);
            throw error;
        }
    }

    /**
     * Calculate percentile based on rank
     * @param {number} rank - User's rank
     * @returns {number} - Percentile (0-100)
     */
    calculatePercentile(rank) {
        try {
            const countStmt = this.db.prepare(`
                SELECT COUNT(DISTINCT user_id) as total FROM scores
            `);
            const { total } = countStmt.get();
            if (total === 0) return 0;
            return Math.round((1 - (rank - 1) / total) * 100);
        } catch (error) {
            return null;
        }
    }

    /**
     * Get user's score history
     * @param {number} userId - User ID
     * @param {number} limit - Number of scores to return
     * @returns {Array} - Array of score objects
     */
    getUserScores(userId, limit = 10) {
        try {
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
        } catch (error) {
            console.error('Get user scores error:', error);
            throw error;
        }
    }
}

module.exports = LeaderboardService;
