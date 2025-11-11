// Game entities for Space Invaders

class Entity {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.active = true;
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

    checkCollision(other) {
        return Utils.checkCollision(this.getBounds(), other.getBounds());
    }
}

class Player extends Entity {
    constructor(x, y) {
        super(x, y, 40, 30);
        this.speed = 5;
        this.shootCooldown = 0;
        this.maxShootCooldown = 0.25; // seconds
        this.baseShootCooldown = 0.25;
        this.color = '#00ff00';
        this.invulnerable = false;
        this.invulnerabilityTime = 0;
        this.maxInvulnerabilityTime = 2; // seconds
        
        // Power-up states
        this.hasShield = false;
        this.shieldTime = 0;
        this.hasMultiShot = false;
        this.hasAutoAim = false;
        this.autoAimTime = 0;
        this.hasRapidFire = false;
        this.rapidFireTime = 0;
    }

    update(deltaTime, canvasWidth) {
        // Handle invulnerability
        if (this.invulnerable) {
            this.invulnerabilityTime -= deltaTime;
            if (this.invulnerabilityTime <= 0) {
                this.invulnerable = false;
            }
        }

        // Update shoot cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
        }

        // Update power-up timers
        if (this.hasShield) {
            this.shieldTime -= deltaTime;
            if (this.shieldTime <= 0) {
                this.hasShield = false;
            }
        }

        if (this.hasAutoAim) {
            this.autoAimTime -= deltaTime;
            if (this.autoAimTime <= 0) {
                this.hasAutoAim = false;
            }
        }

        if (this.hasRapidFire) {
            this.rapidFireTime -= deltaTime;
            if (this.rapidFireTime <= 0) {
                this.hasRapidFire = false;
                this.maxShootCooldown = this.baseShootCooldown;
            }
        }

        // Keep player within canvas bounds
        this.x = Utils.clamp(this.x, 0, canvasWidth - this.width);
    }

    moveLeft() {
        this.x -= this.speed;
    }

    moveRight() {
        this.x += this.speed;
    }

    canShoot() {
        return this.shootCooldown <= 0;
    }

    shoot(targetX = null, targetY = null) {
        if (this.canShoot()) {
            this.shootCooldown = this.maxShootCooldown;
            const bullets = [];
            
            if (this.hasMultiShot) {
                // Triple shot
                bullets.push(new Bullet(
                    this.x + this.width / 2 - 2,
                    this.y,
                    0, -8,
                    '#00ff00',
                    true
                ));
                bullets.push(new Bullet(
                    this.x + this.width / 2 - 2,
                    this.y,
                    -2, -8,
                    '#00ff00',
                    true
                ));
                bullets.push(new Bullet(
                    this.x + this.width / 2 - 2,
                    this.y,
                    2, -8,
                    '#00ff00',
                    true
                ));
            } else if (this.hasAutoAim && targetX !== null && targetY !== null) {
                // Auto-aim bullet
                const dx = targetX - (this.x + this.width / 2);
                const dy = targetY - this.y;
                const angle = Math.atan2(dy, dx);
                const speed = 8;
                bullets.push(new Bullet(
                    this.x + this.width / 2 - 2,
                    this.y,
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed,
                    '#ffaa00',
                    true
                ));
            } else {
                // Normal shot
                bullets.push(new Bullet(
                    this.x + this.width / 2 - 2,
                    this.y,
                    0, -8,
                    '#00ff00',
                    true
                ));
            }
            
            return bullets;
        }
        return null;
    }

    activatePowerUp(type, duration) {
        switch (type) {
            case 'shield':
                this.hasShield = true;
                this.shieldTime = duration;
                break;
            case 'multi-shot':
                this.hasMultiShot = true;
                break;
            case 'auto-aim':
                this.hasAutoAim = true;
                this.autoAimTime = duration;
                break;
            case 'rapid-fire':
                this.hasRapidFire = true;
                this.rapidFireTime = duration;
                this.maxShootCooldown = 0.1; // Faster shooting
                break;
        }
    }

    takeDamage() {
        // Shield absorbs damage
        if (this.hasShield) {
            this.hasShield = false;
            this.shieldTime = 0;
            return false; // No actual damage taken
        }
        
        // Multi-shot is lost when hit
        if (this.hasMultiShot) {
            this.hasMultiShot = false;
        }
        
        if (!this.invulnerable) {
            this.invulnerable = true;
            this.invulnerabilityTime = this.maxInvulnerabilityTime;
            return true;
        }
        return false;
    }

    draw(ctx) {
        ctx.save();
        
        // Draw shield if active
        if (this.hasShield) {
            const pulse = Math.sin(Date.now() / 100) * 0.3 + 0.7;
            ctx.strokeStyle = `rgba(0, 255, 255, ${pulse})`;
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        // Flash when invulnerable
        if (this.invulnerable && Math.floor(Date.now() / 100) % 2) {
            ctx.globalAlpha = 0.5;
        }

        // Color change based on power-ups
        let playerColor = this.color;
        if (this.hasMultiShot) {
            playerColor = '#ff00ff';
        } else if (this.hasAutoAim) {
            playerColor = '#ff9900';
        } else if (this.hasRapidFire) {
            playerColor = '#ffff00';
        }
        
        ctx.fillStyle = playerColor;
        
        // Draw simple spaceship shape
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        ctx.beginPath();
        // Main body
        ctx.fillRect(this.x + 8, this.y + 10, 24, 20);
        // Nose
        ctx.moveTo(centerX, this.y);
        ctx.lineTo(this.x + 12, this.y + 10);
        ctx.lineTo(this.x + 28, this.y + 10);
        ctx.closePath();
        ctx.fill();
        
        // Wings
        ctx.fillRect(this.x, this.y + 20, 8, 10);
        ctx.fillRect(this.x + 32, this.y + 20, 8, 10);
        
        ctx.restore();
    }
}

class Enemy extends Entity {
    constructor(x, y, type = 'basic') {
        super(x, y, 30, 25);
        this.type = type;
        this.speed = 1;
        this.dropSpeed = 20;
        this.direction = 1;
        this.points = 10;
        this.shootFrequency = 0.003;
        this.animFrame = 0;
        this.animSpeed = 0.1;
        
        this.setTypeProperties();
    }

    setTypeProperties() {
        switch (this.type) {
            case 'basic':
                this.color = '#ffffff';
                this.points = 10;
                this.shootFrequency = 0.00005; // Much slower for comfortable gameplay
                break;
            case 'fast':
                this.color = '#ffff00';
                this.points = 20;
                this.shootFrequency = 0.0001; // Reduced even further
                this.speed *= 1.2;
                break;
            case 'aggressive':
                this.color = '#ff6600';
                this.points = 30;
                this.shootFrequency = 0.00015; // Reduced even further
                this.speed *= 1.1;
                break;
            case 'boss':
                this.color = '#ff0000';
                this.points = 50;
                this.shootFrequency = 0.0003; // Reduced even further
                this.width = 40;
                this.height = 35;
                break;
        }
    }

    update(deltaTime) {
        this.animFrame += this.animSpeed * deltaTime;
    }

    moveDown() {
        this.y += this.dropSpeed;
    }

    shouldShoot() {
        return Math.random() < this.shootFrequency;
    }

    shoot() {
        return new Bullet(
            this.x + this.width / 2 - 2,
            this.y + this.height,
            0, 3, // velocity
            '#ff0000',
            false // isPlayerBullet
        );
    }

    draw(ctx) {
        ctx.save();
        ctx.fillStyle = this.color;
        
        const centerX = this.x + this.width / 2;
        const wiggle = Math.sin(this.animFrame * 10) * 1;
        
        // Draw different enemy types
        switch (this.type) {
            case 'basic':
                this.drawBasicEnemy(ctx, wiggle);
                break;
            case 'fast':
                this.drawFastEnemy(ctx, wiggle);
                break;
            case 'aggressive':
                this.drawAggressiveEnemy(ctx, wiggle);
                break;
            case 'boss':
                this.drawBossEnemy(ctx, wiggle);
                break;
        }
        
        ctx.restore();
    }

    drawBasicEnemy(ctx, wiggle) {
        const x = this.x + wiggle;
        const y = this.y;
        
        // Simple invader shape
        ctx.fillRect(x + 6, y + 5, 18, 15);
        ctx.fillRect(x + 3, y + 10, 24, 10);
        ctx.fillRect(x, y + 15, 30, 5);
        
        // Arms
        ctx.fillRect(x + 3, y + 20, 6, 5);
        ctx.fillRect(x + 21, y + 20, 6, 5);
    }

    drawFastEnemy(ctx, wiggle) {
        const x = this.x + wiggle;
        const y = this.y;
        
        // Angular fast enemy
        ctx.beginPath();
        ctx.moveTo(x + 15, y);
        ctx.lineTo(x + 5, y + 10);
        ctx.lineTo(x + 10, y + 15);
        ctx.lineTo(x + 0, y + 25);
        ctx.lineTo(x + 30, y + 25);
        ctx.lineTo(x + 20, y + 15);
        ctx.lineTo(x + 25, y + 10);
        ctx.closePath();
        ctx.fill();
    }

    drawAggressiveEnemy(ctx, wiggle) {
        const x = this.x + wiggle;
        const y = this.y;
        
        // Spiky aggressive enemy
        ctx.fillRect(x + 8, y, 14, 20);
        ctx.fillRect(x + 4, y + 8, 22, 8);
        
        // Spikes
        ctx.fillRect(x + 2, y + 5, 4, 4);
        ctx.fillRect(x + 24, y + 5, 4, 4);
        ctx.fillRect(x + 12, y + 20, 6, 5);
    }

    drawBossEnemy(ctx, wiggle) {
        const x = this.x + wiggle;
        const y = this.y;
        
        // Large boss enemy
        ctx.fillRect(x + 5, y, 30, 25);
        ctx.fillRect(x, y + 10, 40, 15);
        
        // Weapons
        ctx.fillRect(x + 2, y + 25, 8, 10);
        ctx.fillRect(x + 30, y + 25, 8, 10);
        
        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 12, y + 8, 4, 4);
        ctx.fillRect(x + 24, y + 8, 4, 4);
    }
}

class Bullet extends Entity {
    constructor(x, y, vx, vy, color, isPlayerBullet) {
        super(x, y, 4, 8);
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.isPlayerBullet = isPlayerBullet;
        this.trail = [];
        this.maxTrailLength = 5;
    }

    update(deltaTime, canvasWidth, canvasHeight) {
        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Check if bullet is off screen
        if (this.y < -this.height || 
            this.y > canvasHeight || 
            this.x < -this.width || 
            this.x > canvasWidth) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = (i + 1) / this.trail.length * 0.5;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = this.color;
            ctx.fillRect(this.trail[i].x, this.trail[i].y, this.width, this.height);
        }

        // Draw main bullet
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add glow effect
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        ctx.restore();
    }
}

class Particle extends Entity {
    constructor(x, y, vx, vy, color, size, life) {
        super(x, y, size, size);
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.life = life;
        this.maxLife = life;
        this.decay = 0.02;
        this.gravity = 0.1;
    }

    update(deltaTime) {
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        this.vy += this.gravity * deltaTime * 60;
        this.life -= this.decay * deltaTime * 60;
        
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(
            Math.floor(this.x - this.size / 2),
            Math.floor(this.y - this.size / 2),
            this.size,
            this.size
        );
        ctx.restore();
    }
}

class PowerUp extends Entity {
    constructor(x, y, type) {
        super(x, y, 25, 25);
        this.type = type;
        this.vy = 2;
        this.animFrame = 0;
        this.animSpeed = 0.05;
        this.lifetime = 10; // seconds
        
        this.setPowerUpProperties();
    }

    setPowerUpProperties() {
        switch (this.type) {
            case 'rapid-fire':
                this.color = '#ffff00';
                this.effect = 'Rapid Fire!';
                this.duration = 8; // seconds
                break;
            case 'shield':
                this.color = '#00ffff';
                this.effect = 'Shield Activated!';
                this.duration = 10; // seconds
                break;
            case 'multi-shot':
                this.color = '#ff00ff';
                this.effect = 'Multi Shot!';
                this.duration = 0; // until hit
                break;
            case 'auto-aim':
                this.color = '#ff9900';
                this.effect = 'Auto Aim!';
                this.duration = 12; // seconds
                break;
            case 'life-up':
                this.color = '#ff0066';
                this.effect = '1-UP!';
                this.duration = 0; // instant
                break;
            case 'points':
                this.color = '#ffffff';
                this.effect = 'Bonus Points!';
                this.duration = 0; // instant
                break;
        }
    }

    update(deltaTime, canvasHeight) {
        this.y += this.vy;
        this.animFrame += this.animSpeed * deltaTime;
        this.lifetime -= deltaTime;
        
        if (this.y > canvasHeight || this.lifetime <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        const pulse = Math.sin(this.animFrame * 20) * 0.2 + 0.8;
        const size = this.width * pulse;
        const x = this.x + (this.width - size) / 2;
        const y = this.y + (this.height - size) / 2;

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        
        // Draw different shapes based on type
        switch (this.type) {
            case 'shield':
                // Shield icon
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y);
                ctx.lineTo(x + size, y + size / 3);
                ctx.lineTo(x + size, y + size * 0.7);
                ctx.lineTo(x + size / 2, y + size);
                ctx.lineTo(x, y + size * 0.7);
                ctx.lineTo(x, y + size / 3);
                ctx.closePath();
                ctx.fill();
                break;
            case 'multi-shot':
                // Triple arrow
                ctx.fillRect(x + size / 2 - 2, y, 4, size);
                ctx.fillRect(x + size / 4 - 2, y + size / 4, 4, size * 0.6);
                ctx.fillRect(x + size * 0.75 - 2, y + size / 4, 4, size * 0.6);
                break;
            case 'auto-aim':
                // Crosshair
                ctx.beginPath();
                ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillRect(x, y + size / 2 - 2, size, 4);
                ctx.fillRect(x + size / 2 - 2, y, 4, size);
                break;
            case 'life-up':
                // Heart shape
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y + size * 0.3);
                ctx.bezierCurveTo(x, y, x, y + size * 0.4, x + size / 2, y + size * 0.8);
                ctx.bezierCurveTo(x + size, y + size * 0.4, x + size, y, x + size / 2, y + size * 0.3);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                // Diamond shape for other power-ups
                ctx.beginPath();
                ctx.moveTo(x + size / 2, y);
                ctx.lineTo(x + size, y + size / 2);
                ctx.lineTo(x + size / 2, y + size);
                ctx.lineTo(x, y + size / 2);
                ctx.closePath();
                ctx.fill();
                break;
        }
        
        ctx.restore();
    }
}

class Explosion {
    constructor(x, y, size = 30, duration = 0.5) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.maxSize = size;
        this.duration = duration;
        this.time = 0;
        this.active = true;
        this.particles = [];
        
        // Create explosion particles
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const speed = Utils.random(2, 5);
            this.particles.push(new Particle(
                x, y,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                Utils.random(0, 1) > 0.5 ? '#ff6600' : '#ffff00',
                Utils.randomInt(3, 6),
                1.0
            ));
        }
    }

    update(deltaTime) {
        this.time += deltaTime;
        
        if (this.time >= this.duration) {
            this.active = false;
            return;
        }

        // Update particles
        this.particles.forEach(particle => particle.update(deltaTime));
        this.particles = this.particles.filter(particle => particle.active);
        
        // Update explosion size
        const progress = this.time / this.duration;
        this.size = this.maxSize * (1 - progress);
    }

    draw(ctx) {
        if (!this.active) return;

        // Draw explosion flash
        const progress = this.time / this.duration;
        const alpha = 1 - progress;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Outer ring
        ctx.fillStyle = '#ff6600';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner ring
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
        
        // Core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();

        // Draw particles
        this.particles.forEach(particle => particle.draw(ctx));
    }
}

class Wall extends Entity {
    constructor(x, y, width, height, health = 5) {
        super(x, y, width, height);
        this.maxHealth = health;
        this.health = health;
        this.color = '#00ff88';
        this.damageColor = '#ff6600';
        this.blockSize = 4; // Size of each block in the wall
        this.blocks = this.createBlocks();
    }

    createBlocks() {
        // Create a grid of blocks to represent the wall
        const blocks = [];
        const cols = Math.floor(this.width / this.blockSize);
        const rows = Math.floor(this.height / this.blockSize);
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                blocks.push({
                    x: col * this.blockSize,
                    y: row * this.blockSize,
                    active: true
                });
            }
        }
        
        return blocks;
    }

    takeDamage(bulletX, bulletY, isPlayerBullet) {
        if (this.health <= 0) {
            this.active = false;
            return false;
        }

        // Find blocks near the bullet impact point
        const impactRadius = isPlayerBullet ? 6 : 8; // Enemy bullets do slightly more damage
        const localX = bulletX - this.x;
        const localY = bulletY - this.y;
        
        let blocksDestroyed = 0;
        
        this.blocks.forEach(block => {
            if (!block.active) return;
            
            const blockCenterX = block.x + this.blockSize / 2;
            const blockCenterY = block.y + this.blockSize / 2;
            const distance = Math.sqrt(
                Math.pow(blockCenterX - localX, 2) + 
                Math.pow(blockCenterY - localY, 2)
            );
            
            if (distance < impactRadius) {
                block.active = false;
                blocksDestroyed++;
            }
        });

        if (blocksDestroyed > 0) {
            this.health = Math.max(0, this.health - 1);
            
            // Check if wall should be destroyed
            const activeBlocks = this.blocks.filter(b => b.active).length;
            if (activeBlocks === 0 || this.health <= 0) {
                this.active = false;
            }
            
            return true;
        }
        
        return false;
    }

    draw(ctx) {
        if (!this.active || this.blocks.length === 0) return;

        ctx.save();
        
        // Calculate health percentage for color
        const healthPercent = this.health / this.maxHealth;
        
        // Interpolate between green and orange based on health
        let r, g, b;
        if (healthPercent > 0.5) {
            // Green to yellow
            const t = (1 - healthPercent) * 2;
            r = Math.floor(255 * t);
            g = 255;
            b = Math.floor(136 * (1 - t));
        } else {
            // Yellow to orange
            const t = healthPercent * 2;
            r = 255;
            g = Math.floor(255 * t);
            b = 0;
        }
        
        const wallColor = `rgb(${r}, ${g}, ${b})`;
        
        // Draw active blocks
        this.blocks.forEach(block => {
            if (block.active) {
                ctx.fillStyle = wallColor;
                ctx.fillRect(
                    this.x + block.x,
                    this.y + block.y,
                    this.blockSize,
                    this.blockSize
                );
                
                // Add slight border for visual effect
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    this.x + block.x,
                    this.y + block.y,
                    this.blockSize,
                    this.blockSize
                );
            }
        });
        
        ctx.restore();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Entity, Player, Enemy, Bullet, Particle, PowerUp, Explosion, Wall };
}