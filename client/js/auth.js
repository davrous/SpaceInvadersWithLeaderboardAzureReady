/**
 * Authentication Client
 * Manages user authentication state and OAuth2 flows
 */
class AuthClient {
    constructor() {
        this.currentUser = null;
        this.onAuthChange = null; // Callback for auth state changes
    }

    /**
     * Check current session with server
     * @returns {Promise<Object|null>} - User object if authenticated, null otherwise
     */
    async checkSession() {
        try {
            const response = await fetch('/api/v1/auth/session', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Session check failed:', response.status);
                return null;
            }
            
            const data = await response.json();
            
            this.currentUser = data.authenticated ? data.user : null;
            
            // Trigger callback if set
            if (this.onAuthChange) {
                this.onAuthChange(this.currentUser);
            }
            
            return this.currentUser;
        } catch (error) {
            console.error('Session check error:', error);
            return null;
        }
    }

    /**
     * Log out current user
     * @returns {Promise<boolean>} - True if logout successful
     */
    async logout() {
        try {
            const response = await fetch('/api/v1/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Logout failed:', response.status);
                return false;
            }
            
            this.currentUser = null;
            
            // Trigger callback if set
            if (this.onAuthChange) {
                this.onAuthChange(null);
            }
            
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} - True if authenticated
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Get current user
     * @returns {Object|null} - User object or null
     */
    getUser() {
        return this.currentUser;
    }
}
