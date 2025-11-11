// Main game class for Space Invaders

class SpaceInvadersGame {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gameState = 'menu'; // menu, playing, paused, gameOver, levelComplete
        
        // Game objects
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.explosions = [];
        this.powerUps = [];
        this.walls = [];
        
        // Game stats
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.levelData = null;
        this.enemiesKilled = 0;
        this.totalEnemies = 0;
        
        // Game settings
        this.debug = false;
        this.useAILevels = false; // Toggle for AI-generated levels
        this.aiStatus = null; // Cache AI status
        this.performanceMonitor = Utils.createPerformanceMonitor();
        
        // Sound system
        this.soundManager = new SoundManager();
        this.soundEnabled = true;
        
        // Screen effects
        this.screenShake = null;
        this.flashEffect = { active: false, color: '#ffffff', intensity: 0, duration: 0 };
        
        // Input handling
        this.keys = {};
        this.touchControls = {
            left: false,
            right: false,
            fire: false
        };
        
        // Timing
        this.lastTime = 0;
        this.enemyMoveTimer = 0;
        this.enemyMoveInterval = 1; // seconds
        this.enemyDirection = 1;
        
        // Initialize
        this.initializeGame();
        this.bindEvents();
        this.loadHighScore();
    }

    async initializeGame() {
        // Create player
        this.player = new Player(
            this.canvas.width / 2 - 20,
            this.canvas.height - 50
        );
        // Game settings
        this.useAIGeneration = false; // Default to procedural generation
        this.aiStatus = null; // Will be populated on first check
        
        // Load initial level
        await this.loadLevel(this.currentLevel);
        
        // Check AI availability
        await this.checkAIAvailability();
        
        // Start game loop
        this.gameLoop();
    }

    async loadLevel(levelNumber) {
        try {
            // Use AI generation if enabled and available
            this.levelData = await Utils.fetchLevelData(levelNumber, this.useAIGeneration);
            this.createEnemies();
            this.createWalls();
            this.updateUI();
            
            // Apply AI-specific enhancements if present
            this.applyAIEnhancements();
            
        } catch (error) {
            console.error('Failed to load level:', error);
            // Use default level data
            this.levelData = {
                level: levelNumber,
                enemyCount: 15,
                enemySpeed: 1,
                enemyDropSpeed: 20,
                enemyBulletSpeed: 2,
                enemyBulletFrequency: 0.00005,
                enemyMoveDirection: 1,
                enemyRows: 3,
                enemyCols: 5,
                pointsPerEnemy: 10,
                enemyType: 'basic',
                generatedBy: 'fallback'
            };
            this.createEnemies();
            this.createWalls();
            this.updateUI();
        }
    }

    // Check AI availability on game start
    async checkAIAvailability() {
        try {
            this.aiStatus = await Utils.fetchAIStatus();
            if (this.aiStatus.enabled) {
                console.log(`🤖 AI Level Generation Available - Model: ${this.aiStatus.model}`);
                this.addAIToggleButton();
            } else {
                console.log('🔧 AI Level Generation: Disabled (no token configured)');
            }
        } catch (error) {
            console.error('Failed to check AI availability:', error);
            this.aiStatus = { enabled: false };
        }
    }

    // Add AI toggle button to UI
    addAIToggleButton() {
        const gameControls = document.querySelector('.game-controls');
        if (gameControls && !document.getElementById('aiToggle')) {
            const aiToggleContainer = document.createElement('div');
            aiToggleContainer.className = 'ai-toggle-container';
            aiToggleContainer.innerHTML = `
                <label class="ai-toggle-label">
                    <input type="checkbox" id="aiToggle" ${this.useAIGeneration ? 'checked' : ''}>
                    <span class="ai-toggle-text">🤖 AI Levels</span>
                </label>
                <div class="ai-status" id="aiStatusDisplay">
                    Model: ${this.aiStatus.model}
                </div>
            `;
            
            const aiToggle = aiToggleContainer.querySelector('#aiToggle');
            aiToggle.addEventListener('change', (e) => {
                this.toggleAIGeneration(e.target.checked);
            });
            
            gameControls.appendChild(aiToggleContainer);
        }
    }

    // Toggle AI generation on/off
    async toggleAIGeneration(enabled) {
        this.useAIGeneration = enabled;
        console.log(`🤖 AI Level Generation: ${enabled ? 'ENABLED' : 'DISABLED'}`);
        
        // Update status display
        const statusDisplay = document.getElementById('aiStatusDisplay');
        if (statusDisplay) {
            statusDisplay.textContent = enabled ? 
                `Model: ${this.aiStatus.model}` : 
                'Using procedural generation';
        }
        
        // Optionally reload current level with new setting
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            console.log(`🔄 Reloading level ${this.currentLevel} with ${enabled ? 'AI' : 'procedural'} generation`);
            await this.loadLevel(this.currentLevel);
        }
    }

    // Apply AI-specific enhancements to the game
    applyAIEnhancements() {
        if (!this.levelData.specialMechanics) return;
        
        const mechanics = this.levelData.specialMechanics;
        
        // Apply theme
        if (this.levelData.theme) {
            this.applyTheme(this.levelData.theme);
        }
        
        // Apply formation
        if (mechanics.formation && mechanics.formation !== 'grid') {
            this.applyEnemyFormation(mechanics.formation);
        }
        
        // Set up boss properties
        if (mechanics.bossProperties && this.levelData.enemyType === 'boss') {
            this.setupBossLevel(mechanics.bossProperties);
        }
        
        // Log special mechanics
        console.log(`✨ AI Enhanced Level ${this.currentLevel}:`, mechanics);
    }

    // Apply visual theme
    applyTheme(theme) {
        const canvas = this.canvas;
        const ctx = this.ctx;
        
        // Store original styles
        if (!this.originalCanvasStyle) {
            this.originalCanvasStyle = {
                backgroundColor: canvas.style.backgroundColor || '#000000'
            };
        }
        
        // Apply theme-based styling
        switch (theme.atmosphere) {
            case 'nebula':
                canvas.style.backgroundColor = '#1a0d2e';
                break;
            case 'asteroid':
                canvas.style.backgroundColor = '#2c1810';
                break;
            case 'alien-world':
                canvas.style.backgroundColor = '#0d2818';
                break;
            default:
                canvas.style.backgroundColor = '#000000';
        }
    }

    // Apply different enemy formations
    applyEnemyFormation(formation) {
        if (!this.enemies.length) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = 150;
        
        switch (formation) {
            case 'diamond':
                this.arrangeEnemiesDiamond(centerX, centerY);
                break;
            case 'wave':
                this.arrangeEnemiesWave(centerX, centerY);
                break;
            case 'scattered':
                this.arrangeEnemiesScattered();
                break;
        }
    }

    // Diamond formation
    arrangeEnemiesDiamond(centerX, centerY) {
        const spacing = 45;
        const rows = Math.ceil(Math.sqrt(this.enemies.length));
        
        this.enemies.forEach((enemy, index) => {
            const row = Math.floor(index / rows);
            const col = index % rows;
            const rowWidth = Math.max(1, rows - Math.abs(row - rows/2));
            const x = centerX + (col - rowWidth/2) * spacing;
            const y = centerY + row * spacing;
            
            enemy.x = x;
            enemy.y = y;
        });
    }

    // Wave formation
    arrangeEnemiesWave(centerX, centerY) {
        const amplitude = 60;
        const frequency = 0.02;
        
        this.enemies.forEach((enemy, index) => {
            const progress = index / this.enemies.length;
            const x = 50 + progress * (this.canvas.width - 100);
            const y = centerY + Math.sin(x * frequency) * amplitude;
            
            enemy.x = x;
            enemy.y = y;
        });
    }

    // Scattered formation
    arrangeEnemiesScattered() {
        this.enemies.forEach(enemy => {
            enemy.x = 50 + Math.random() * (this.canvas.width - 100);
            enemy.y = 50 + Math.random() * 200;
        });
    }

    // Setup boss level enhancements
    setupBossLevel(bossProperties) {
        if (this.enemies.length > 0) {
            const boss = this.enemies[0]; // Make first enemy the boss
            boss.health = bossProperties.health || 3;
            boss.maxHealth = boss.health;
            boss.size = bossProperties.size || 1.5;
            boss.isBoss = true;
            boss.specialAttacks = bossProperties.specialAttacks || [];
            
            // Visual enhancements for boss
            boss.pulseTimer = 0;
            
            console.log(`👹 Boss spawned with ${boss.health} health and ${boss.specialAttacks.length} special attacks`);
        }
    }

    createEnemies() {
        this.enemies = [];
        const { enemyRows, enemyCols, enemyType } = this.levelData;
        const enemySpacing = 50;
        const startX = 50;
        const startY = 80;
        
        for (let row = 0; row < enemyRows; row++) {
            for (let col = 0; col < enemyCols; col++) {
                const x = startX + col * enemySpacing;
                const y = startY + row * enemySpacing;
                const enemy = new Enemy(x, y, enemyType);
                
                // Set enemy properties from level data
                enemy.speed = this.levelData.enemySpeed;
                enemy.dropSpeed = this.levelData.enemyDropSpeed;
                enemy.shootFrequency = this.levelData.enemyBulletFrequency;
                enemy.points = this.levelData.pointsPerEnemy;
                
                this.enemies.push(enemy);
            }
        }
        
        this.totalEnemies = this.enemies.length;
        this.enemiesKilled = 0;
        this.enemyDirection = this.levelData.enemyMoveDirection;
        this.enemyMoveInterval = Math.max(0.3, 1.5 - (this.currentLevel * 0.1));
    }

    createWalls() {
        this.walls = [];
        
        // Get wall configuration from level data, or use defaults
        const wallConfig = this.levelData.walls || {
            count: 4,
            width: 80,
            height: 60,
            health: 5,
            yPosition: this.canvas.height - 150
        };
        
        const totalWidth = wallConfig.count * wallConfig.width;
        const spacing = (this.canvas.width - totalWidth) / (wallConfig.count + 1);
        
        for (let i = 0; i < wallConfig.count; i++) {
            const x = spacing + (i * (wallConfig.width + spacing));
            const y = wallConfig.yPosition;
            
            this.walls.push(new Wall(x, y, wallConfig.width, wallConfig.height, wallConfig.health));
        }
    }

    bindEvents() {
        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Touch events for mobile
        this.bindTouchControls();
        
        // Button events
        this.bindButtonEvents();
        
        // Prevent context menu on canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        
        // Handle window focus
        window.addEventListener('blur', () => {
            if (this.gameState === 'playing') {
                this.pauseGame();
            }
        });
    }

    bindTouchControls() {
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const fireBtn = document.getElementById('fireBtn');
        
        if (leftBtn) {
            leftBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touchControls.left = true;
            });
            leftBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touchControls.left = false;
            });
        }
        
        if (rightBtn) {
            rightBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touchControls.right = true;
            });
            rightBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touchControls.right = false;
            });
        }
        
        if (fireBtn) {
            fireBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.touchControls.fire = true;
            });
            fireBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.touchControls.fire = false;
            });
        }
    }

    bindButtonEvents() {
        const startBtn = document.getElementById('startGameBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const restartBtn = document.getElementById('restartBtn');
        const overlayActionBtn = document.getElementById('overlayActionBtn');
        
        if (startBtn) {
            startBtn.addEventListener('click', () => this.startGame());
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }
        
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.restartGame());
        }
        
        if (overlayActionBtn) {
            overlayActionBtn.addEventListener('click', () => this.handleOverlayAction());
        }
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;
        
        // Handle specific key actions
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                if (this.gameState === 'playing') {
                    this.playerShoot();
                } else if (this.gameState === 'menu' || this.gameState === 'gameOver') {
                    this.startGame();
                }
                break;
            case 'KeyP':
                if (this.gameState === 'playing' || this.gameState === 'paused') {
                    this.togglePause();
                }
                break;
            case 'KeyR':
                this.restartGame();
                break;
            case 'KeyD':
                this.debug = !this.debug;
                break;
        }
    }

    handleKeyUp(e) {
        this.keys[e.code] = false;
    }

    startGame() {
        this.gameState = 'playing';
        this.hideOverlay();
        this.resetGame();
        // Play button click sound
        this.soundManager.playButtonClick();
    }

    pauseGame() {
        this.gameState = 'paused';
        this.showOverlay('Game Paused', 'Press P to continue', 'Resume');
        // Play button click sound
        this.soundManager.playButtonClick();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.pauseGame();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            this.hideOverlay();
        }
    }

    restartGame() {
        this.gameState = 'playing';
        this.hideOverlay();
        this.resetGame();
        // Play button click sound
        this.soundManager.playButtonClick();
    }

    resetGame() {
        this.score = 0;
        this.lives = 3;
        this.currentLevel = 1;
        this.bullets = [];
        this.enemyBullets = [];
        this.particles = [];
        this.explosions = [];
        this.powerUps = [];
        this.walls = [];
        
        // Reset player
        this.player = new Player(
            this.canvas.width / 2 - 20,
            this.canvas.height - 50
        );
        
        this.loadLevel(this.currentLevel);
    }

    gameLoop(currentTime = 0) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update performance monitor
        Utils.updatePerformanceMonitor(this.performanceMonitor, currentTime);
        
        // Update game
        if (this.gameState === 'playing') {
            this.update(deltaTime);
        }
        
        // Render game
        this.render();
        
        // Continue game loop
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    update(deltaTime) {
        // Handle input
        this.handleInput();
        
        // Update player
        this.player.update(deltaTime, this.canvas.width);
        
        // Update enemies
        this.updateEnemies(deltaTime);
        
        // Update bullets
        this.updateBullets(deltaTime);
        
        // Update particles and effects
        this.updateEffects(deltaTime);
        
        // Check collisions
        this.checkCollisions();
        
        // Check win/lose conditions
        this.checkGameConditions();
        
        // Update UI
        this.updateUI();
    }

    handleInput() {
        // Keyboard input
        if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchControls.left) {
            this.player.moveLeft();
        }
        if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchControls.right) {
            this.player.moveRight();
        }
        if (this.keys['Space'] || this.touchControls.fire) {
            this.playerShoot();
        }
    }

    playerShoot() {
        // Get closest enemy for auto-aim
        let targetX = null;
        let targetY = null;
        
        if (this.player.hasAutoAim && this.enemies.length > 0) {
            let closestEnemy = null;
            let minDist = Infinity;
            
            this.enemies.forEach(enemy => {
                const dist = Math.abs(enemy.x + enemy.width / 2 - (this.player.x + this.player.width / 2));
                if (dist < minDist) {
                    minDist = dist;
                    closestEnemy = enemy;
                }
            });
            
            if (closestEnemy) {
                targetX = closestEnemy.x + closestEnemy.width / 2;
                targetY = closestEnemy.y + closestEnemy.height / 2;
            }
        }
        
        const bullets = this.player.shoot(targetX, targetY);
        if (bullets) {
            if (Array.isArray(bullets)) {
                this.bullets.push(...bullets);
            } else {
                this.bullets.push(bullets);
            }
            // Play shoot sound
            this.soundManager.playPlayerShoot();
        }
    }

    updateEnemies(deltaTime) {
        // Update enemy movement timer
        this.enemyMoveTimer += deltaTime;
        
        if (this.enemyMoveTimer >= this.enemyMoveInterval) {
            this.moveEnemies();
            this.enemyMoveTimer = 0;
        }
        
        // Update individual enemies
        this.enemies.forEach(enemy => {
            enemy.update(deltaTime);
            
            // Enemy shooting
            if (enemy.shouldShoot()) {
                const bullet = enemy.shoot();
                bullet.vy = this.levelData.enemyBulletSpeed;
                this.enemyBullets.push(bullet);
                // Play enemy shoot sound
                this.soundManager.playEnemyShoot();
            }
        });
    }

    moveEnemies() {
        let hitEdge = false;
        
        // Check if any enemy hits the edge
        this.enemies.forEach(enemy => {
            if ((enemy.x <= 0 && this.enemyDirection === -1) ||
                (enemy.x + enemy.width >= this.canvas.width && this.enemyDirection === 1)) {
                hitEdge = true;
            }
        });
        
        // If hit edge, move down and reverse direction
        if (hitEdge) {
            this.enemyDirection *= -1;
            this.enemies.forEach(enemy => enemy.moveDown());
            // Play enemy move sound with higher pitch when they move down
            this.soundManager.playEnemyMove(1.5);
        } else {
            // Move horizontally
            this.enemies.forEach(enemy => {
                enemy.x += enemy.speed * this.enemyDirection;
            });
            // Play enemy move sound
            const pitch = 1 + (this.currentLevel - 1) * 0.1; // Increase pitch with level
            this.soundManager.playEnemyMove(pitch);
        }
    }

    updateBullets(deltaTime) {
        // Update player bullets
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime, this.canvas.width, this.canvas.height);
            return bullet.active;
        });
        
        // Update enemy bullets
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update(deltaTime, this.canvas.width, this.canvas.height);
            return bullet.active;
        });
    }

    updateEffects(deltaTime) {
        // Update particles
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.active;
        });
        
        // Update explosions
        this.explosions = this.explosions.filter(explosion => {
            explosion.update(deltaTime);
            return explosion.active;
        });
        
        // Update power-ups
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update(deltaTime, this.canvas.height);
            return powerUp.active;
        });
        
        // Update screen shake
        if (this.screenShake) {
            if (!Utils.updateScreenShake(this.screenShake, deltaTime)) {
                this.screenShake = null;
            }
        }
        
        // Update flash effect
        if (this.flashEffect.active) {
            this.flashEffect.intensity -= deltaTime * 3;
            if (this.flashEffect.intensity <= 0) {
                this.flashEffect.active = false;
            }
        }
    }

    checkCollisions() {
        // Player bullets vs walls
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            let bulletHitWall = false;
            
            for (let w = 0; w < this.walls.length; w++) {
                const wall = this.walls[w];
                
                if (wall.active && bullet.checkCollision(wall)) {
                    wall.takeDamage(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, true);
                    this.bullets.splice(i, 1);
                    bulletHitWall = true;
                    
                    // Create small particles
                    const particles = Utils.createParticles(
                        bullet.x + bullet.width / 2, 
                        bullet.y + bullet.height / 2, 
                        3, 
                        wall.color
                    );
                    this.particles.push(...particles);
                    break;
                }
            }
            
            if (bulletHitWall) continue;
        }
        
        // Clean up destroyed walls
        this.walls = this.walls.filter(wall => wall.active);
        
        // Player bullets vs enemies
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                
                if (bullet.checkCollision(enemy)) {
                    // Create explosion
                    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    
                    // Play enemy death sound
                    this.soundManager.playEnemyDeath();
                    
                    // Add score
                    this.score += enemy.points;
                    this.enemiesKilled++;
                    
                    // Chance to drop power-up (10% chance)
                    if (Math.random() < 0.1) {
                        this.spawnPowerUp(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                    }
                    
                    // Remove bullet and enemy
                    this.bullets.splice(i, 1);
                    this.enemies.splice(j, 1);
                    
                    // Screen shake
                    this.screenShake = Utils.createScreenShake(3, 0.1);
                    
                    break;
                }
            }
        }
        
        // Power-ups vs player
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            
            if (powerUp.checkCollision(this.player)) {
                this.applyPowerUp(powerUp);
                this.powerUps.splice(i, 1);
            }
        }
        
        // Enemy bullets vs walls
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            let bulletHitWall = false;
            
            for (let w = 0; w < this.walls.length; w++) {
                const wall = this.walls[w];
                
                if (wall.active && bullet.checkCollision(wall)) {
                    wall.takeDamage(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, false);
                    this.enemyBullets.splice(i, 1);
                    bulletHitWall = true;
                    
                    // Create small particles
                    const particles = Utils.createParticles(
                        bullet.x + bullet.width / 2, 
                        bullet.y + bullet.height / 2, 
                        3, 
                        wall.color
                    );
                    this.particles.push(...particles);
                    break;
                }
            }
            
            if (bulletHitWall) continue;
        }
        
        // Enemy bullets vs player
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            
            if (bullet.checkCollision(this.player)) {
                if (this.player.takeDamage()) {
                    this.lives--;
                    this.createExplosion(this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                    // Play player death sound
                    this.soundManager.playPlayerDeath();
                    this.screenShake = Utils.createScreenShake(8, 0.3);
                    this.flashEffect = { active: true, color: '#ff0000', intensity: 0.5, duration: 0.2 };
                }
                this.enemyBullets.splice(i, 1);
            }
        }
        
        // Check if enemies reached player
        this.enemies.forEach(enemy => {
            if (enemy.y + enemy.height >= this.player.y) {
                this.lives = 0; // Instant game over
            }
        });
    }

    checkGameConditions() {
        // Check game over
        if (this.lives <= 0 && this.gameState !== 'gameOver') {
            this.gameOver();
            return;
        }
        
        // Check level complete
        if (this.enemies.length === 0 && this.gameState === 'playing') {
            this.levelComplete();
            return;
        }
    }

    levelComplete() {
        this.gameState = 'levelComplete';
        this.currentLevel++;
        // Play level complete sound
        this.soundManager.playLevelComplete();
        this.showOverlay(
            `Level ${this.currentLevel - 1} Complete!`,
            `Score: ${Utils.formatScore(this.score)}`,
            'Next Level'
        );
    }

    gameOver() {
        this.gameState = 'gameOver';
        this.saveHighScore();
        // Play game over sound
        this.soundManager.playGameOver();
        this.showOverlay(
            'Game Over',
            `Final Score: ${Utils.formatScore(this.score)}<br>Level Reached: ${this.currentLevel}`,
            'Play Again'
        );
    }

    async handleOverlayAction() {
        switch (this.gameState) {
            case 'paused':
                this.togglePause();
                break;
            case 'levelComplete':
                await this.loadLevel(this.currentLevel);
                this.gameState = 'playing';
                this.hideOverlay();
                break;
            case 'gameOver':
                this.restartGame();
                break;
            default:
                this.startGame();
                break;
        }
    }

    createExplosion(x, y, size = 30) {
        this.explosions.push(new Explosion(x, y, size));
        
        // Create particles
        const particles = Utils.createParticles(x, y, 8, '#ff6600');
        this.particles.push(...particles);
    }

    spawnPowerUp(x, y) {
        // Random power-up type
        const types = ['shield', 'multi-shot', 'auto-aim', 'rapid-fire', 'life-up'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push(new PowerUp(x - 12, y, type));
    }

    applyPowerUp(powerUp) {
        // Show message
        this.showPowerUpMessage(powerUp.effect);
        
        // Play sound (use level complete sound as positive feedback)
        this.soundManager.playButtonClick();
        
        // Apply effect
        switch (powerUp.type) {
            case 'shield':
                this.player.activatePowerUp('shield', powerUp.duration);
                this.flashEffect = { active: true, color: '#00ffff', intensity: 0.3, duration: 0.2 };
                break;
            case 'multi-shot':
                this.player.activatePowerUp('multi-shot', powerUp.duration);
                this.flashEffect = { active: true, color: '#ff00ff', intensity: 0.3, duration: 0.2 };
                break;
            case 'auto-aim':
                this.player.activatePowerUp('auto-aim', powerUp.duration);
                this.flashEffect = { active: true, color: '#ff9900', intensity: 0.3, duration: 0.2 };
                break;
            case 'rapid-fire':
                this.player.activatePowerUp('rapid-fire', powerUp.duration);
                this.flashEffect = { active: true, color: '#ffff00', intensity: 0.3, duration: 0.2 };
                break;
            case 'life-up':
                this.lives = Math.min(this.lives + 1, 5); // Max 5 lives
                this.flashEffect = { active: true, color: '#ff0066', intensity: 0.3, duration: 0.2 };
                break;
            case 'points':
                this.score += 500;
                this.flashEffect = { active: true, color: '#ffffff', intensity: 0.3, duration: 0.2 };
                break;
        }
    }

    showPowerUpMessage(message) {
        // Create a temporary message element
        const messageEl = document.createElement('div');
        messageEl.className = 'power-up-message';
        messageEl.textContent = message;
        messageEl.style.position = 'fixed';
        messageEl.style.top = '50%';
        messageEl.style.left = '50%';
        messageEl.style.transform = 'translate(-50%, -50%)';
        messageEl.style.fontSize = '32px';
        messageEl.style.fontWeight = 'bold';
        messageEl.style.color = '#ffff00';
        messageEl.style.textShadow = '0 0 10px rgba(255, 255, 0, 0.8), 0 0 20px rgba(255, 255, 0, 0.5)';
        messageEl.style.zIndex = '1000';
        messageEl.style.pointerEvents = 'none';
        messageEl.style.animation = 'powerUpFade 2s ease-out forwards';
        
        document.body.appendChild(messageEl);
        
        setTimeout(() => {
            document.body.removeChild(messageEl);
        }, 2000);
    }

    showOverlay(title, subtitle, buttonText) {
        const overlay = document.getElementById('gameOverlay');
        const overlayTitle = document.getElementById('overlayTitle');
        const overlaySubtitle = document.getElementById('overlaySubtitle');
        const overlayActionBtn = document.getElementById('overlayActionBtn');
        
        if (overlay && overlayTitle && overlaySubtitle && overlayActionBtn) {
            overlayTitle.textContent = title;
            overlaySubtitle.innerHTML = subtitle;
            overlayActionBtn.textContent = buttonText;
            overlay.classList.add('active');
        }
    }

    hideOverlay() {
        const overlay = document.getElementById('gameOverlay');
        const instructionsOverlay = document.getElementById('instructionsOverlay');
        
        if (overlay) overlay.classList.remove('active');
        if (instructionsOverlay) instructionsOverlay.classList.remove('active');
    }

    updateUI() {
        // Update score
        const scoreValue = document.getElementById('scoreValue');
        if (scoreValue) scoreValue.textContent = Utils.formatScore(this.score);
        
        // Update high score
        const highScoreValue = document.getElementById('highScoreValue');
        if (highScoreValue) {
            const highScore = Utils.loadFromStorage('spaceInvadersHighScore', 0);
            highScoreValue.textContent = Utils.formatScore(highScore);
        }
        
        // Update lives
        const livesContainer = document.getElementById('livesContainer');
        if (livesContainer) {
            const lifeIcons = livesContainer.querySelectorAll('.life-icon');
            lifeIcons.forEach((icon, index) => {
                if (index < this.lives) {
                    icon.classList.remove('lost');
                } else {
                    icon.classList.add('lost');
                }
            });
        }
        
        // Update level
        const levelNumber = document.getElementById('levelNumber');
        if (levelNumber) levelNumber.textContent = this.currentLevel;
        
        // Update progress
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        if (progressFill && progressText && this.totalEnemies > 0) {
            const progress = (this.enemiesKilled / this.totalEnemies) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${this.enemiesKilled} / ${this.totalEnemies} enemies`;
        }
    }

    saveHighScore() {
        const currentHighScore = Utils.loadFromStorage('spaceInvadersHighScore', 0);
        if (this.score > currentHighScore) {
            Utils.saveToStorage('spaceInvadersHighScore', this.score);
        }
    }

    loadHighScore() {
        const highScore = Utils.loadFromStorage('spaceInvadersHighScore', 0);
        const highScoreValue = document.getElementById('highScoreValue');
        if (highScoreValue) {
            highScoreValue.textContent = Utils.formatScore(highScore);
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply screen shake
        if (this.screenShake) {
            this.ctx.save();
            this.ctx.translate(this.screenShake.offsetX, this.screenShake.offsetY);
        }
        
        // Draw game objects
        this.drawBackground();
        this.drawEntities();
        this.drawEffects();
        
        // Draw flash effect
        if (this.flashEffect.active) {
            this.ctx.save();
            this.ctx.globalAlpha = this.flashEffect.intensity;
            this.ctx.fillStyle = this.flashEffect.color;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.restore();
        }
        
        // Draw debug info
        if (this.debug) {
            Utils.drawDebugInfo(this.ctx, this);
        }
        
        // Restore screen shake
        if (this.screenShake) {
            this.ctx.restore();
        }
    }

    drawBackground() {
        // Draw starfield (already in CSS, but could add moving stars here)
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawEntities() {
        // Draw walls first (behind other entities)
        this.walls.forEach(wall => wall.draw(this.ctx));
        
        // Draw player
        if (this.player) {
            this.player.draw(this.ctx);
        }
        
        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        this.enemyBullets.forEach(bullet => bullet.draw(this.ctx));
        
        // Draw power-ups
        this.powerUps.forEach(powerUp => powerUp.draw(this.ctx));
    }

    drawEffects() {
        // Draw explosions
        this.explosions.forEach(explosion => explosion.draw(this.ctx));
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SpaceInvadersGame;
}