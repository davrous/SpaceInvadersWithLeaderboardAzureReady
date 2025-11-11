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

// Initialize Database and Services
const db = initializeDatabase();
const authService = new AuthService(db);
const leaderboardService = new LeaderboardService(db);

// Initialize AI Level Generator
let AI_ENABLED = false;
if (process.env.ENABLE_AI_LEVELS === 'true') {
    AI_ENABLED = aiLevelGenerator.initialize();
}
console.log(`🤖 AI Level Generation: ${AI_ENABLED ? 'ENABLED' : 'DISABLED'}`);
if (!AI_ENABLED && process.env.ENABLE_AI_LEVELS === 'true') {
    console.log('💡 To enable AI: Set GITHUB_TOKEN in your .env file');
    console.log('   Get token from: https://github.com/settings/tokens');
}

// Middleware
app.use(cors({ 
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.CALLBACK_URL 
        : 'http://localhost:3000',
    credentials: true 
}));
app.use(express.json());

// Trust first proxy (Azure App Service)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

app.use(session({
    secret: process.env.SESSION_SECRET || 'space-invaders-secret-key',
    resave: false,
    saveUninitialized: false,
    proxy: process.env.NODE_ENV === 'production', // Trust proxy for secure cookies
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax', // Critical for OAuth
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

// Level configurations with increasing difficulty
const levels = [
    {
        level: 1,
        enemyCount: 35,
        enemySpeed: 1,
        enemyDropSpeed: 20,
        enemyBulletSpeed: 2,
        enemyBulletFrequency: 0.001, // Reduced from 0.003
        enemyMoveDirection: 1,
        enemyRows: 5,
        enemyCols: 7,
        pointsPerEnemy: 10,
        enemyType: 'basic',
        walls: {
            count: 4,
            width: 80,
            height: 60,
            health: 5,
            yPosition: 450
        }
    },
    {
        level: 2,
        enemyCount: 40,
        enemySpeed: 1.2,
        enemyDropSpeed: 25,
        enemyBulletSpeed: 2.5,
        enemyBulletFrequency: 0.0015, // Reduced from 0.005
        enemyMoveDirection: 1,
        enemyRows: 5,
        enemyCols: 8,
        pointsPerEnemy: 15,
        enemyType: 'basic',
        walls: {
            count: 4,
            width: 80,
            height: 60,
            health: 5,
            yPosition: 450
        }
    },
    {
        level: 3,
        enemyCount: 45,
        enemySpeed: 1.5,
        enemyDropSpeed: 30,
        enemyBulletSpeed: 3,
        enemyBulletFrequency: 0.002, // Reduced from 0.007
        enemyMoveDirection: 1,
        enemyRows: 5,
        enemyCols: 9,
        pointsPerEnemy: 20,
        enemyType: 'fast',
        walls: {
            count: 4,
            width: 75,
            height: 55,
            health: 4,
            yPosition: 450
        }
    },
    {
        level: 4,
        enemyCount: 50,
        enemySpeed: 1.8,
        enemyDropSpeed: 35,
        enemyBulletSpeed: 3.5,
        enemyBulletFrequency: 0.0025, // Reduced from 0.009
        enemyMoveDirection: 1,
        enemyRows: 5,
        enemyCols: 10,
        pointsPerEnemy: 25,
        enemyType: 'fast',
        walls: {
            count: 3,
            width: 90,
            height: 50,
            health: 4,
            yPosition: 450
        }
    },
    {
        level: 5,
        enemyCount: 55,
        enemySpeed: 2,
        enemyDropSpeed: 40,
        enemyBulletSpeed: 4,
        enemyBulletFrequency: 0.003, // Reduced from 0.011
        enemyMoveDirection: 1,
        enemyRows: 5,
        enemyCols: 11,
        pointsPerEnemy: 30,
        enemyType: 'aggressive',
        walls: {
            count: 3,
            width: 85,
            height: 45,
            health: 3,
            yPosition: 450
        }
    }
];

// Generate additional levels with scaling difficulty
function generateLevel(levelNumber) {
    if (levelNumber <= levels.length) {
        return levels[levelNumber - 1];
    }
    
    // Generate procedural levels beyond level 5
    const baseLevel = levels[levels.length - 1];
    const scaleFactor = Math.pow(1.15, levelNumber - levels.length);
    
    // Calculate wall configuration for higher levels
    const wallCount = Math.max(2, 4 - Math.floor((levelNumber - 5) / 3));
    const wallHealth = Math.max(2, 5 - Math.floor((levelNumber - 5) / 2));
    
    return {
        level: levelNumber,
        enemyCount: Math.min(60, Math.floor(baseLevel.enemyCount + (levelNumber - levels.length) * 2)),
        enemySpeed: Math.min(4, baseLevel.enemySpeed * scaleFactor),
        enemyDropSpeed: Math.min(60, baseLevel.enemyDropSpeed * scaleFactor),
        enemyBulletSpeed: Math.min(6, baseLevel.enemyBulletSpeed * scaleFactor),
        enemyBulletFrequency: Math.min(0.005, baseLevel.enemyBulletFrequency * scaleFactor), // Reduced max from 0.02 to 0.005
        enemyMoveDirection: 1,
        enemyRows: Math.min(6, Math.floor(5 + (levelNumber - levels.length) / 3)),
        enemyCols: Math.min(12, Math.floor(11 + (levelNumber - levels.length) / 2)),
        pointsPerEnemy: baseLevel.pointsPerEnemy + (levelNumber - levels.length) * 5,
        enemyType: levelNumber > 8 ? 'boss' : 'aggressive',
        walls: {
            count: wallCount,
            width: 80,
            height: 45,
            health: wallHealth,
            yPosition: 450
        }
    };
}

// API Routes

// ============================================================================
// Authentication Routes
// ============================================================================

// GitHub OAuth2
app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
app.get('/auth/github/callback',
    passport.authenticate('github', { failureRedirect: '/?auth_error=true' }),
    (req, res) => res.redirect('/')
);

// Google OAuth2
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/?auth_error=true' }),
    (req, res) => res.redirect('/')
);

// Microsoft OAuth2
app.get('/auth/microsoft', passport.authenticate('microsoft', { scope: ['user.read'] }));
app.get('/auth/microsoft/callback',
    passport.authenticate('microsoft', { failureRedirect: '/?auth_error=true' }),
    (req, res) => res.redirect('/')
);

// Check current session
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

// Logout
app.post('/api/v1/auth/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({
                error: 'Failed to logout',
                message: 'Session destruction failed'
            });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// ============================================================================
// Leaderboard Routes
// ============================================================================

// Get global leaderboard (public)
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

// Submit score (authenticated)
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
        if (error.message === 'INVALID_SCORE') {
            return res.status(400).json({
                error: 'Invalid score data',
                message: 'Score must be between 0 and 999,999'
            });
        }
        if (error.message === 'INVALID_LEVEL') {
            return res.status(400).json({
                error: 'Invalid level data',
                message: 'Level must be at least 1'
            });
        }
        if (error.message === 'INVALID_SESSION_ID') {
            return res.status(400).json({
                error: 'Invalid session ID',
                message: 'Session ID must be a valid UUID v4'
            });
        }
        
        res.status(500).json({
            error: 'Failed to submit score',
            message: 'An unexpected error occurred'
        });
    }
});

// Get user statistics
app.get('/api/v1/users/:userId/stats', (req, res) => {
    try {
        let userId = req.params.userId;
        
        // Support 'me' for current user
        if (userId === 'me') {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            userId = req.user.id;
        } else {
            userId = parseInt(userId);
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

// Get user's score history
app.get('/api/v1/users/:userId/scores', (req, res) => {
    try {
        let userId = req.params.userId;
        
        // Support 'me' for current user
        if (userId === 'me') {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: 'Authentication required' });
            }
            userId = req.user.id;
        } else {
            userId = parseInt(userId);
        }
        
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        const scores = leaderboardService.getUserScores(userId, limit);
        
        // Get username
        const user = authService.getUserById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: `No user with ID ${userId}`
            });
        }
        
        res.json({
            user_id: userId,
            username: user.username,
            scores,
            total: scores.length
        });
    } catch (error) {
        console.error('User scores fetch error:', error);
        res.status(500).json({
            error: 'Failed to fetch user scores',
            message: error.message
        });
    }
});

// ============================================================================
// Game Level Routes
// ============================================================================

// Get all available level numbers
app.get('/api/levels', (req, res) => {
    res.json({
        availableLevels: Array.from({length: 20}, (_, i) => i + 1),
        maxLevel: 20
    });
});

// Get specific level configuration
app.get('/api/levels/:levelNumber', (req, res) => {
    const levelNumber = parseInt(req.params.levelNumber);
    
    if (isNaN(levelNumber) || levelNumber < 1) {
        return res.status(400).json({ error: 'Invalid level number' });
    }
    
    if (levelNumber > 20) {
        return res.status(404).json({ error: 'Level not found' });
    }
    
    const levelData = generateLevel(levelNumber);
    res.json(levelData);
});

// Generate AI-powered level configuration
app.get('/api/levels/generate/:levelNumber', async (req, res) => {
    const levelNumber = parseInt(req.params.levelNumber);
    
    if (isNaN(levelNumber) || levelNumber < 1) {
        return res.status(400).json({ error: 'Invalid level number' });
    }
    
    if (levelNumber > 50) {
        return res.status(404).json({ error: 'Level number too high (max: 50)' });
    }
    
    try {
        if (!AI_ENABLED) {
            // Fallback to procedural generation
            const levelData = generateLevel(levelNumber);
            levelData.generatedBy = 'procedural';
            return res.json(levelData);
        }
        
        // Get base level for reference
        const baseLevel = generateLevel(Math.max(1, levelNumber - 1));
        
        // Generate AI level
        const aiLevel = await aiLevelGenerator.generateLevel(levelNumber, baseLevel);
        aiLevel.generatedBy = 'ai';
        
        res.json(aiLevel);
        
    } catch (error) {
        console.error(`Failed to generate AI level ${levelNumber}:`, error.message);
        
        // Fallback to procedural generation
        const levelData = generateLevel(levelNumber);
        levelData.generatedBy = 'procedural-fallback';
        levelData.aiError = error.message;
        
        res.json(levelData);
    }
});

// Get AI generator status and cache info
app.get('/api/ai/status', (req, res) => {
    res.json({
        enabled: AI_ENABLED,
        model: process.env.AI_MODEL || 'openai/gpt-4.1-mini',
        endpoint: process.env.AI_ENDPOINT || 'https://models.github.ai/inference',
        cacheStats: AI_ENABLED ? aiLevelGenerator.getCacheStats() : null,
        tokenConfigured: !!process.env.GITHUB_TOKEN
    });
});

// Clear AI cache (for development/testing)
app.post('/api/ai/cache/clear', (req, res) => {
    if (AI_ENABLED) {
        aiLevelGenerator.clearCache();
        res.json({ message: 'AI cache cleared successfully' });
    } else {
        res.status(400).json({ error: 'AI level generation not enabled' });
    }
});

// Get player stats/leaderboard endpoint (for future expansion)
app.get('/api/stats', (req, res) => {
    res.json({
        highScore: 0,
        gamesPlayed: 0,
        highestLevel: 1
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve the game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Space Invaders Server running on port ${PORT}`);
    console.log(`🎮 Game available at http://localhost:${PORT}`);
    console.log(`📊 API endpoints available at http://localhost:${PORT}/api/`);
    console.log(`🏆 Leaderboard feature enabled`);
    console.log(`🔐 OAuth2 authentication configured`);
});

module.exports = app;