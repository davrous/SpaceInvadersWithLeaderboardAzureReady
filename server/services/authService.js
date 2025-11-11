const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MicrosoftStrategy = require('passport-microsoft').Strategy;

/**
 * Authentication Service
 * Manages OAuth2 authentication with GitHub, Google, and Microsoft
 */
class AuthService {
    constructor(db) {
        this.db = db;
        this.setupStrategies();
    }

    /**
     * Configure all OAuth2 strategies
     */
    setupStrategies() {
        // GitHub Strategy
        if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
            passport.use(new GitHubStrategy({
                clientID: process.env.GITHUB_CLIENT_ID,
                clientSecret: process.env.GITHUB_CLIENT_SECRET,
                callbackURL: `${process.env.CALLBACK_URL}/auth/github/callback`,
                scope: ['user:email']
            }, this.handleOAuthCallback.bind(this, 'github')));
            console.log('✅ GitHub OAuth strategy configured');
        } else {
            console.log('⚠️  GitHub OAuth not configured - set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
        }

        // Google Strategy
        if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
            passport.use(new GoogleStrategy({
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: `${process.env.CALLBACK_URL}/auth/google/callback`,
                scope: ['profile', 'email']
            }, this.handleOAuthCallback.bind(this, 'google')));
            console.log('✅ Google OAuth strategy configured');
        } else {
            console.log('⚠️  Google OAuth not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
        }

        // Microsoft Strategy
        if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
            passport.use(new MicrosoftStrategy({
                clientID: process.env.MICROSOFT_CLIENT_ID,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
                callbackURL: `${process.env.CALLBACK_URL}/auth/microsoft/callback`,
                scope: ['user.read']
            }, this.handleOAuthCallback.bind(this, 'microsoft')));
            console.log('✅ Microsoft OAuth strategy configured');
        } else {
            console.log('⚠️  Microsoft OAuth not configured - set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET');
        }

        // Serialize user to session
        passport.serializeUser((user, done) => {
            done(null, user.id);
        });

        // Deserialize user from session
        passport.deserializeUser((id, done) => {
            try {
                const user = this.getUserById(id);
                done(null, user);
            } catch (error) {
                done(error, null);
            }
        });
    }

    /**
     * Handle OAuth2 callback for all providers
     * @param {string} provider - OAuth2 provider name ('github', 'google', 'microsoft')
     * @param {string} accessToken - Access token from provider
     * @param {string} refreshToken - Refresh token from provider
     * @param {Object} profile - User profile from provider
     * @param {Function} done - Passport callback
     */
    handleOAuthCallback(provider, accessToken, refreshToken, profile, done) {
        try {
            // Extract user data from profile
            const user = this.upsertUser(provider, profile);
            done(null, user);
        } catch (error) {
            console.error(`OAuth2 callback error for ${provider}:`, error);
            done(error, null);
        }
    }

    /**
     * Create or update user in database
     * @param {string} provider - OAuth2 provider name
     * @param {Object} profile - User profile from OAuth2 provider
     * @returns {Object} - User object from database
     */
    upsertUser(provider, profile) {
        try {
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

            const username = profile.displayName || profile.username || profile.name?.givenName || 'Player';
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
            const profilePictureUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

            const user = stmt.get(
                provider,
                profile.id,
                username,
                email,
                profilePictureUrl
            );

            console.log(`✅ User authenticated: ${username} (${provider})`);
            return user;
        } catch (error) {
            console.error('User upsert error:', error);
            throw error;
        }
    }

    /**
     * Get user by ID
     * @param {number} id - User ID
     * @returns {Object|null} - User object or null if not found
     */
    getUserById(id) {
        try {
            const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
            const user = stmt.get(id);
            return user || null;
        } catch (error) {
            console.error('Get user by ID error:', error);
            throw error;
        }
    }
}

module.exports = AuthService;
