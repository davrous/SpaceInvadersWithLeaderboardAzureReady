// Main entry point for Space Invaders game

let game = null;
let authClient = null;
let leaderboard = null;

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create message container for notifications
    Utils.createMessageContainer();
    
    // Check for OAuth error in URL
    checkAuthError();
    
    initializeGame();
    initializeAuthentication();
    initializeLeaderboard();
});

// Check for OAuth authentication errors in URL
function checkAuthError() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('auth_error')) {
        Utils.showMessage('Sign in failed. Please try again.', 'error');
        
        // Clear error parameter from URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

function initializeGame() {
    const canvas = document.getElementById('gameCanvas');
    
    if (!canvas) {
        console.error('Game canvas not found!');
        return;
    }
    
    // Set up canvas
    setupCanvas(canvas);
    
    // Create game instance
    game = new SpaceInvadersGame(canvas);
    
    // Handle window resize
    window.addEventListener('resize', () => {
        resizeGame(canvas);
    });
    
    // Initial resize
    resizeGame(canvas);
    
    console.log('🎮 Space Invaders Game Initialized!');
}

// Initialize authentication system
function initializeAuthentication() {
    authClient = new AuthClient();
    
    // Set up auth state change handler
    authClient.onAuthChange = (user) => {
        updateAuthUI(user);
        
        // Refresh leaderboard when auth state changes
        if (leaderboard) {
            leaderboard.fetchLeaderboard();
            
            // Fetch user stats if authenticated
            if (user) {
                leaderboard.fetchUserStats().then(stats => {
                    leaderboard.renderUserStats(stats);
                });
            } else {
                // Hide stats when not authenticated
                leaderboard.renderUserStats(null);
            }
        }
    };
    
    // Check initial auth session
    authClient.checkSession();
    
    // Set up logout button handler
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await authClient.logout();
        });
    }
}

// Update authentication UI based on user state
function updateAuthUI(user) {
    const authButtons = document.getElementById('auth-buttons');
    const userInfo = document.getElementById('user-info');
    const userAvatar = document.getElementById('user-avatar');
    const userName = document.getElementById('user-name');
    const personalStats = document.getElementById('personal-stats');
    
    if (user) {
        // User is authenticated - show user info
        if (authButtons) authButtons.style.display = 'none';
        if (userInfo) userInfo.style.display = 'flex';
        if (personalStats) personalStats.style.display = 'block';
        
        // Update user info
        if (userAvatar && user.profile_picture_url) {
            userAvatar.src = user.profile_picture_url;
            userAvatar.alt = `${user.username}'s avatar`;
        }
        if (userName) {
            userName.textContent = user.username || 'Player';
        }
    } else {
        // User is not authenticated - show auth buttons
        if (authButtons) authButtons.style.display = 'flex';
        if (userInfo) userInfo.style.display = 'none';
        if (personalStats) personalStats.style.display = 'none';
    }
}

// Initialize leaderboard system
function initializeLeaderboard() {
    const container = document.getElementById('leaderboard-container');
    if (!container) {
        console.error('Leaderboard container not found');
        return;
    }
    
    // Create leaderboard instance with auth client
    leaderboard = new Leaderboard('leaderboard-container', authClient);
    
    // Load initial leaderboard data
    leaderboard.fetchLeaderboard();
    
    // Start automatic polling
    leaderboard.startPolling();
    
    console.log('📊 Leaderboard initialized!');
}

// Handle game over - submit score to leaderboard
async function handleGameOver(score, level) {
    if (!leaderboard || !authClient) {
        return;
    }
    
    const sessionId = Utils.generateUUID();
    const isAuthenticated = authClient.isAuthenticated();
    
    if (isAuthenticated) {
        // User is authenticated - submit score directly
        try {
            console.log('Submitting score:', { score, level, sessionId });
            const result = await leaderboard.submitScore(score, level, sessionId);
            console.log('Score submission result:', result);
            
            if (result.success) {
                const position = result.score.leaderboard_position;
                console.log('Leaderboard position:', position);
                if (position && position.is_new_personal_best) {
                    Utils.showMessage(`🎉 New Personal Best! Rank #${position.rank || 'N/A'}`, 'success');
                } else if (position && position.rank) {
                    Utils.showMessage(`Score submitted! Rank #${position.rank}`, 'success');
                } else {
                    Utils.showMessage('Score submitted successfully!', 'success');
                }
                
                // Refresh stats after successful submission
                setTimeout(() => {
                    leaderboard.fetchUserStats().then(stats => {
                        leaderboard.renderUserStats(stats);
                    });
                }, 500);
            } else if (result.error) {
                console.error('Score submission returned error:', result.error);
                Utils.showMessage(`Failed to submit score: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Score submission error:', error);
            Utils.showMessage('Failed to submit score. Please try again.', 'error');
        }
    } else {
        // User is not authenticated - show sign-in prompt
        showSignInPrompt(score, level, sessionId);
    }
}

// Show sign-in prompt for anonymous players
function showSignInPrompt(score, level, sessionId) {
    const modal = document.getElementById('signin-modal');
    const scoreDisplay = document.getElementById('modal-score-display');
    const closeBtn = document.getElementById('signin-modal-close');
    const continueBtn = document.getElementById('continue-without-signin');
    
    if (!modal) {
        console.warn('Sign-in modal not found');
        return;
    }
    
    // Display score achieved
    if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${score} | Level: ${level}`;
    }
    
    // Show modal
    modal.style.display = 'flex';
    
    // Close button handler
    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    // Continue without signing in handler
    if (continueBtn) {
        continueBtn.onclick = () => {
            modal.style.display = 'none';
            
            // Queue score for later submission if user signs in
            if (leaderboard) {
                leaderboard.queueScore(score, level, sessionId);
                Utils.showMessage('Score saved locally. Sign in later to submit!', 'info');
            }
        };
    }
    
    // Close modal when clicking outside
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    };
}

function setupCanvas(canvas) {
    // Set canvas resolution
    canvas.width = 800;
    canvas.height = 600;
    
    // Improve canvas rendering
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.msImageSmoothingEnabled = false;
    
    // Set initial canvas style
    canvas.style.background = 'transparent';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = '-moz-crisp-edges';
    canvas.style.imageRendering = 'crisp-edges';
}

function resizeGame(canvas) {
    // Calculate responsive size
    const scale = Utils.resizeCanvas(canvas, 800, 600);
    
    // Adjust touch controls for mobile
    adjustMobileControls(scale);
}

function adjustMobileControls(scale) {
    const isMobile = window.innerWidth <= 768;
    const mobileControls = document.querySelector('.mobile-controls');
    const gameControls = document.querySelector('.game-controls');
    
    if (mobileControls && gameControls) {
        if (isMobile) {
            mobileControls.style.display = 'flex';
            gameControls.style.display = 'none';
        } else {
            mobileControls.style.display = 'none';
            gameControls.style.display = 'flex';
        }
    }
}

// Game state management functions
function startNewGame() {
    if (game) {
        game.startGame();
    }
}

function pauseGame() {
    if (game) {
        game.pauseGame();
    }
}

function restartGame() {
    if (game) {
        game.restartGame();
    }
}

function toggleDebugMode() {
    if (game) {
        game.debug = !game.debug;
        console.log(`Debug mode: ${game.debug ? 'ON' : 'OFF'}`);
    }
}

// Level progression system
class LevelProgressionSystem {
    constructor(gameInstance) {
        this.game = gameInstance;
        this.levelTransitionActive = false;
        this.transitionDuration = 2.0; // seconds
        this.transitionTimer = 0;
    }

    async loadNextLevel() {
        if (this.levelTransitionActive) return;
        
        this.levelTransitionActive = true;
        this.transitionTimer = 0;
        
        try {
            // Show level transition effect
            this.showLevelTransition();
            
            // Wait for transition
            await this.waitForTransition();
            
            // Load new level data
            await this.game.loadLevel(this.game.currentLevel);
            
            // Reset game state for new level
            this.resetForNewLevel();
            
            // Hide transition
            this.hideLevelTransition();
            
        } catch (error) {
            console.error('Failed to load next level:', error);
            this.game.gameOver();
        } finally {
            this.levelTransitionActive = false;
        }
    }

    showLevelTransition() {
        const overlay = document.getElementById('gameOverlay');
        const title = document.getElementById('overlayTitle');
        const subtitle = document.getElementById('overlaySubtitle');
        const actionBtn = document.getElementById('overlayActionBtn');
        
        if (overlay && title && subtitle && actionBtn) {
            title.textContent = `Level ${this.game.currentLevel}`;
            subtitle.innerHTML = `
                <div style="margin-bottom: 15px;">Get ready for increased difficulty!</div>
                <div style="font-size: 0.8em; color: #00ddff;">
                    Enemy Speed: ${this.game.levelData.enemySpeed}x<br>
                    Enemy Count: ${this.game.levelData.enemyCount}<br>
                    Fire Rate: ${Math.round(this.game.levelData.enemyBulletFrequency * 1000)}%
                </div>
            `;
            actionBtn.style.display = 'none';
            overlay.classList.add('active');
        }
    }

    hideLevelTransition() {
        const overlay = document.getElementById('gameOverlay');
        const actionBtn = document.getElementById('overlayActionBtn');
        
        if (overlay && actionBtn) {
            overlay.classList.remove('active');
            actionBtn.style.display = 'block';
        }
    }

    async waitForTransition() {
        return new Promise(resolve => {
            setTimeout(resolve, this.transitionDuration * 1000);
        });
    }

    resetForNewLevel() {
        // Clear bullets and effects
        this.game.bullets = [];
        this.game.enemyBullets = [];
        this.game.particles = [];
        this.game.explosions = [];
        
        // Reset player position
        this.game.player.x = this.game.canvas.width / 2 - 20;
        this.game.player.y = this.game.canvas.height - 50;
        this.game.player.invulnerable = false;
        this.game.player.invulnerabilityTime = 0;
        
        // Reset enemy movement
        this.game.enemyMoveTimer = 0;
        this.game.enemyDirection = 1;
        
        // Update UI
        this.game.updateUI();
    }
}

// Performance optimization
class PerformanceOptimizer {
    constructor() {
        this.lastOptimizationCheck = 0;
        this.optimizationInterval = 5000; // 5 seconds
        this.lowPerformanceThreshold = 30; // FPS
        this.particleLimit = 100;
        this.bulletLimit = 50;
    }

    checkPerformance(game) {
        const now = Date.now();
        if (now - this.lastOptimizationCheck < this.optimizationInterval) {
            return;
        }
        
        this.lastOptimizationCheck = now;
        const fps = game.performanceMonitor.fps;
        
        if (fps < this.lowPerformanceThreshold) {
            this.optimizeForLowPerformance(game);
            console.log(`Performance optimization activated. FPS: ${fps}`);
        }
    }

    optimizeForLowPerformance(game) {
        // Limit particles
        if (game.particles.length > this.particleLimit) {
            game.particles.splice(0, game.particles.length - this.particleLimit);
        }
        
        // Limit bullets
        if (game.bullets.length > this.bulletLimit) {
            game.bullets.splice(0, game.bullets.length - this.bulletLimit);
        }
        
        if (game.enemyBullets.length > this.bulletLimit) {
            game.enemyBullets.splice(0, game.enemyBullets.length - this.bulletLimit);
        }
        
        // Reduce enemy bullet frequency
        game.enemies.forEach(enemy => {
            enemy.shootFrequency *= 0.8;
        });
    }
}

// Game analytics (basic tracking)
class GameAnalytics {
    constructor() {
        this.sessionData = {
            startTime: Date.now(),
            gameStarted: false,
            levelsCompleted: 0,
            totalScore: 0,
            highestLevel: 1,
            totalPlayTime: 0,
            enemiesKilled: 0,
            bulletsShot: 0,
            deaths: 0
        };
    }

    trackGameStart() {
        this.sessionData.gameStarted = true;
        this.sessionData.startTime = Date.now();
    }

    trackLevelComplete(level, score) {
        this.sessionData.levelsCompleted++;
        this.sessionData.totalScore = score;
        this.sessionData.highestLevel = Math.max(this.sessionData.highestLevel, level);
    }

    trackGameOver(finalScore, finalLevel, playTime) {
        this.sessionData.totalScore = finalScore;
        this.sessionData.highestLevel = Math.max(this.sessionData.highestLevel, finalLevel);
        this.sessionData.totalPlayTime = playTime;
        this.sessionData.deaths++;
        
        // Save session data
        this.saveSessionData();
        
        console.log('Game session ended:', this.sessionData);
    }

    saveSessionData() {
        const allTimeStats = Utils.loadFromStorage('spaceInvadersStats', {
            totalGames: 0,
            totalScore: 0,
            totalPlayTime: 0,
            highestLevel: 1,
            totalEnemiesKilled: 0,
            avgSessionTime: 0
        });
        
        // Update all-time stats
        allTimeStats.totalGames++;
        allTimeStats.totalScore += this.sessionData.totalScore;
        allTimeStats.totalPlayTime += this.sessionData.totalPlayTime;
        allTimeStats.highestLevel = Math.max(allTimeStats.highestLevel, this.sessionData.highestLevel);
        allTimeStats.totalEnemiesKilled += this.sessionData.enemiesKilled;
        allTimeStats.avgSessionTime = allTimeStats.totalPlayTime / allTimeStats.totalGames;
        
        Utils.saveToStorage('spaceInvadersStats', allTimeStats);
    }
}

// Initialize additional systems
let levelProgressionSystem = null;
let performanceOptimizer = null;
let gameAnalytics = null;

// Enhanced game initialization
function initializeEnhancedSystems() {
    if (!game) return;
    
    levelProgressionSystem = new LevelProgressionSystem(game);
    performanceOptimizer = new PerformanceOptimizer();
    gameAnalytics = new GameAnalytics();
    
    // Initialize sound system on first user interaction
    initializeSoundSystem();
    
    // Override game methods to integrate systems
    const originalLevelComplete = game.levelComplete.bind(game);
    game.levelComplete = function() {
        gameAnalytics.trackLevelComplete(this.currentLevel, this.score);
        originalLevelComplete();
    };
    
    const originalGameOver = game.gameOver.bind(game);
    game.gameOver = function() {
        const playTime = (Date.now() - gameAnalytics.sessionData.startTime) / 1000;
        gameAnalytics.trackGameOver(this.score, this.currentLevel, playTime);
        
        // Submit score to leaderboard
        handleGameOver(this.score, this.currentLevel);
        
        originalGameOver();
    };
    
    const originalStartGame = game.startGame.bind(game);
    game.startGame = function() {
        gameAnalytics.trackGameStart();
        originalStartGame();
    };
    
    // Add performance monitoring to game loop
    const originalUpdate = game.update.bind(game);
    game.update = function(deltaTime) {
        originalUpdate(deltaTime);
        performanceOptimizer.checkPerformance(this);
    };
}

// Sound system initialization
function initializeSoundSystem() {
    if (!game || !game.soundManager) return;
    
    let soundInitialized = false;
    
    const initSound = async () => {
        if (soundInitialized) return;
        
        try {
            await game.soundManager.initialize();
            soundInitialized = true;
            console.log('🔊 Sound system ready!');
            
            // Remove event listeners once initialized
            document.removeEventListener('click', initSound);
            document.removeEventListener('keydown', initSound);
            document.removeEventListener('touchstart', initSound);
        } catch (error) {
            console.warn('Sound initialization failed:', error);
        }
    };
    
    // Add listeners for user interaction to initialize audio context
    document.addEventListener('click', initSound);
    document.addEventListener('keydown', initSound);
    document.addEventListener('touchstart', initSound);
    
    // Add sound controls to UI
    addSoundControls();
}

// Add sound control buttons to the game interface
function addSoundControls() {
    const gameControls = document.querySelector('.game-controls');
    if (!gameControls || document.getElementById('soundToggle')) return;
    
    const soundToggle = document.createElement('button');
    soundToggle.id = 'soundToggle';
    soundToggle.className = 'control-btn';
    soundToggle.textContent = '🔊 Sound';
    soundToggle.title = 'Toggle Sound On/Off';
    
    soundToggle.addEventListener('click', () => {
        if (game && game.soundManager) {
            game.soundEnabled = !game.soundEnabled;
            game.soundManager.setMuted(!game.soundEnabled);
            soundToggle.textContent = game.soundEnabled ? '🔊 Sound' : '🔇 Muted';
            soundToggle.classList.toggle('danger', !game.soundEnabled);
            
            // Play a test sound if enabling
            if (game.soundEnabled) {
                game.soundManager.playButtonClick();
            }
        }
    });
    
    gameControls.appendChild(soundToggle);
    
    // Add volume control
    const volumeContainer = document.createElement('div');
    volumeContainer.style.display = 'flex';
    volumeContainer.style.alignItems = 'center';
    volumeContainer.style.gap = '5px';
    volumeContainer.style.marginLeft = '5px';
    volumeContainer.style.flexShrink = '0';
    
    const volumeLabel = document.createElement('span');
    volumeLabel.textContent = '🔊';
    volumeLabel.style.color = 'var(--accent-blue)';
    volumeLabel.style.fontSize = '0.7rem';
    
    const volumeSlider = document.createElement('input');
    volumeSlider.type = 'range';
    volumeSlider.min = '0';
    volumeSlider.max = '100';
    volumeSlider.value = '50';
    volumeSlider.style.width = '60px';
    volumeSlider.style.height = '18px';
    volumeSlider.title = 'Volume Control';
    
    volumeSlider.addEventListener('input', (e) => {
        if (game && game.soundManager) {
            const volume = parseInt(e.target.value) / 100;
            game.soundManager.setVolume(volume);
        }
    });
    
    volumeContainer.appendChild(volumeLabel);
    volumeContainer.appendChild(volumeSlider);
    gameControls.appendChild(volumeContainer);
}

// Initialize enhanced systems after a short delay
setTimeout(() => {
    initializeEnhancedSystems();
}, 1000);

// Utility functions for external access
window.SpaceInvadersGame = {
    start: startNewGame,
    pause: pauseGame,
    restart: restartGame,
    toggleDebug: toggleDebugMode,
    getGameInstance: () => game,
    getStats: () => {
        if (gameAnalytics) {
            return gameAnalytics.sessionData;
        }
        return null;
    }
};

// Service Worker registration for offline play (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Game error:', event.error);
    
    // Try to recover or show error message
    if (game && game.gameState === 'playing') {
        game.pauseGame();
        game.showOverlay(
            'Game Error',
            'An error occurred. The game has been paused.',
            'Continue'
        );
    }
});

// Prevent page refresh during gameplay
window.addEventListener('beforeunload', (event) => {
    if (game && game.gameState === 'playing') {
        event.preventDefault();
        event.returnValue = 'Game in progress. Are you sure you want to leave?';
        return event.returnValue;
    }
});

console.log('🚀 Space Invaders Game Systems Loaded!');