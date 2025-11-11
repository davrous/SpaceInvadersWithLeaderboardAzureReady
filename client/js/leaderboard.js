/**
 * Leaderboard Client
 * Manages leaderboard display, score submission, and client-side caching
 */
class Leaderboard {
    constructor(containerId, authClient) {
        this.container = document.getElementById(containerId);
        this.authClient = authClient;
        this.entries = [];
        this.poller = null;
    }

    /**
     * Fetch leaderboard from server
     * @returns {Promise<Array>} - Leaderboard entries
     */
    async fetchLeaderboard() {
        try {
            const response = await fetch('/api/v1/leaderboard');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            this.entries = data.leaderboard || [];
            this.render();
            this.cacheLeaderboard(this.entries);
            
            return this.entries;
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
            this.loadFromCache();
            return this.entries;
        }
    }

    /**
     * Render leaderboard to DOM
     */
    render() {
        if (!this.container) return;
        
        const fragment = document.createDocumentFragment();
        
        if (this.entries.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'leaderboard-empty';
            empty.textContent = '🎮 Be the first to set a high score!';
            fragment.appendChild(empty);
        } else {
            this.entries.forEach(entry => {
                fragment.appendChild(this.createEntryElement(entry));
            });
        }
        
        this.container.innerHTML = '';
        this.container.appendChild(fragment);
    }

    /**
     * Create a single leaderboard entry element
     * @param {Object} entry - Leaderboard entry data
     * @returns {HTMLElement} - Entry element
     */
    createEntryElement(entry) {
        const div = document.createElement('div');
        div.className = 'leaderboard-entry';
        
        // Highlight current user
        const currentUser = this.authClient.getUser();
        if (currentUser && currentUser.id === entry.user_id) {
            div.classList.add('current-user');
        }
        
        // Create elements
        const rank = document.createElement('span');
        rank.className = 'rank';
        rank.textContent = `#${entry.rank}`;
        rank.setAttribute('aria-label', `Rank ${entry.rank}`);
        
        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = entry.profile_picture_url || '/assets/avatars/default-avatar.svg';
        avatar.alt = this.escapeHtml(entry.username);
        avatar.loading = 'lazy';
        avatar.onerror = function() {
            this.src = '/assets/avatars/default-avatar.svg';
        };
        avatar.setAttribute('aria-label', `Profile picture of ${this.escapeHtml(entry.username)}`);
        
        const username = document.createElement('span');
        username.className = 'username';
        username.textContent = this.escapeHtml(entry.username);
        
        const score = document.createElement('span');
        score.className = 'score';
        score.textContent = entry.best_score.toLocaleString();
        
        div.appendChild(rank);
        div.appendChild(avatar);
        div.appendChild(username);
        div.appendChild(score);
        
        div.setAttribute('role', 'listitem');
        
        return div;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Cache leaderboard to localStorage
     * @param {Array} entries - Leaderboard entries
     */
    cacheLeaderboard(entries) {
        try {
            localStorage.setItem('spaceinvaders_leaderboard', JSON.stringify(entries));
            localStorage.setItem('spaceinvaders_cache_time', Date.now().toString());
        } catch (error) {
            console.warn('Failed to cache leaderboard:', error);
        }
    }

    /**
     * Load leaderboard from localStorage cache
     */
    loadFromCache() {
        try {
            const cached = localStorage.getItem('spaceinvaders_leaderboard');
            if (cached) {
                this.entries = JSON.parse(cached);
                this.render();
                
                // Check cache age (5 minutes)
                const cacheTime = parseInt(localStorage.getItem('spaceinvaders_cache_time')) || 0;
                const age = Date.now() - cacheTime;
                if (age > 5 * 60 * 1000) {
                    console.log('⚠️ Leaderboard data may be outdated');
                }
            }
        } catch (error) {
            console.warn('Failed to load cached leaderboard:', error);
        }
    }

    /**
     * Submit a score to the server
     * @param {number} score - Score value
     * @param {number} level - Level reached
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} - Result object
     */
    async submitScore(score, level, sessionId) {
        console.log('🎯 submitScore called with:', { score, level, sessionId });
        
        if (!this.authClient.isAuthenticated()) {
            console.warn('User not authenticated');
            return { error: 'auth_required' };
        }

        try {
            console.log('Sending POST request to /api/v1/scores');
            const response = await fetch('/api/v1/scores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    score: score,
                    level_reached: level,
                    session_id: sessionId
                })
            });

            console.log('Response status:', response.status);

            if (response.status === 401) {
                console.warn('Authentication required (401)');
                return { error: 'auth_required' };
            }
            
            if (response.status === 429) {
                console.warn('Rate limited (429)');
                return { error: 'rate_limited' };
            }
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Submission failed:', errorData);
                throw new Error(errorData.message || 'Submission failed');
            }

            const result = await response.json();
            console.log('✅ Score submitted successfully:', result);
            
            // Refresh leaderboard after successful submission
            await this.fetchLeaderboard();
            
            return result;
        } catch (error) {
            console.error('Score submission failed:', error);
            this.queueScore(score, level, sessionId);
            return { error: 'network_error', queued: true };
        }
    }

    /**
     * Queue score for later submission (offline mode)
     * @param {number} score - Score value
     * @param {number} level - Level reached
     * @param {string} sessionId - Session ID
     */
    queueScore(score, level, sessionId) {
        try {
            const pending = JSON.parse(localStorage.getItem('spaceinvaders_pending') || '[]');
            pending.push({ 
                score, 
                level_reached: level, 
                session_id: sessionId, 
                timestamp: Date.now() 
            });
            localStorage.setItem('spaceinvaders_pending', JSON.stringify(pending));
            console.log('Score queued for later submission');
        } catch (error) {
            console.warn('Failed to queue score:', error);
        }
    }

    /**
     * Retry pending score submissions
     * @returns {Promise<number>} - Number of successfully submitted scores
     */
    async retryPendingScores() {
        try {
            const pending = JSON.parse(localStorage.getItem('spaceinvaders_pending') || '[]');
            if (pending.length === 0) return 0;
            
            let successCount = 0;
            const remaining = [];
            
            for (const scoreData of pending) {
                const result = await this.submitScore(
                    scoreData.score,
                    scoreData.level_reached,
                    scoreData.session_id
                );
                
                if (result.success) {
                    successCount++;
                } else if (result.error !== 'network_error') {
                    // Don't retry on other errors (auth, validation, etc.)
                    console.warn('Skipping queued score due to error:', result.error);
                } else {
                    remaining.push(scoreData);
                }
            }
            
            localStorage.setItem('spaceinvaders_pending', JSON.stringify(remaining));
            
            if (successCount > 0) {
                console.log(`✅ Submitted ${successCount} pending scores`);
            }
            
            return successCount;
        } catch (error) {
            console.error('Failed to retry pending scores:', error);
            return 0;
        }
    }

    /**
     * Start polling for leaderboard updates
     * @param {number} interval - Polling interval in ms (default 30s)
     */
    startPolling(interval = 30000) {
        // Fetch immediately
        this.fetchLeaderboard();
        
        // Poll at interval (only when page is visible)
        this.poller = setInterval(() => {
            if (!document.hidden) {
                this.fetchLeaderboard();
            }
        }, interval);
    }

    /**
     * Stop polling for updates
     */
    stopPolling() {
        if (this.poller) {
            clearInterval(this.poller);
            this.poller = null;
        }
    }

    /**
     * Fetch user statistics
     * @param {string} userId - User ID or 'me'
     * @returns {Promise<Object|null>} - User stats or null
     */
    async fetchUserStats(userId = 'me') {
        try {
            const response = await fetch(`/api/v1/users/${userId}/stats`, {
                credentials: 'include'
            });
            
            if (response.status === 401 || response.status === 404) {
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const stats = await response.json();
            return stats;
        } catch (error) {
            console.error('Failed to fetch user stats:', error);
            return null;
        }
    }

    /**
     * Render user statistics to DOM
     * @param {Object|null} stats - User statistics
     */
    renderUserStats(stats) {
        const statsContainer = document.getElementById('personal-stats');
        if (!statsContainer) return;
        
        if (!stats) {
            statsContainer.style.display = 'none';
            return;
        }
        
        statsContainer.style.display = 'block';
        statsContainer.innerHTML = `
            <h3>Your Stats</h3>
            <div class="stats-grid">
                <div class="stat-item">
                    <span class="stat-label">Total Games</span>
                    <span class="stat-value">${stats.total_games || 0}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Best Score</span>
                    <span class="stat-value">${(stats.best_score || 0).toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Average Score</span>
                    <span class="stat-value">${Math.round(stats.average_score || 0).toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Leaderboard Rank</span>
                    <span class="stat-value">${stats.leaderboard_rank ? `#${stats.leaderboard_rank}` : 'Not ranked'}</span>
                </div>
            </div>
        `;
    }

    /**
     * Fetch user's recent scores
     * @param {string} userId - User ID or 'me'
     * @param {number} limit - Number of scores to fetch
     * @returns {Promise<Array>} - Array of score objects
     */
    async fetchUserScores(userId = 'me', limit = 5) {
        try {
            const response = await fetch(`/api/v1/users/${userId}/scores?limit=${limit}`, {
                credentials: 'include'
            });
            
            if (response.status === 401 || response.status === 404) {
                return [];
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data.scores || [];
        } catch (error) {
            console.error('Failed to fetch user scores:', error);
            return [];
        }
    }
}
