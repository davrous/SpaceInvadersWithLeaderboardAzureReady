// Utility functions for the Space Invaders game

class Utils {
    // Check collision between two rectangles
    static checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // Check if a point is inside a rectangle
    static pointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    }

    // Calculate distance between two points
    static distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Clamp a value between min and max
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    // Linear interpolation
    static lerp(start, end, factor) {
        return start + (end - start) * factor;
    }

    // Random number between min and max
    static random(min, max) {
        return Math.random() * (max - min) + min;
    }

    // Random integer between min and max (inclusive)
    static randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Format score with leading zeros
    static formatScore(score, digits = 6) {
        return score.toString().padStart(digits, '0');
    }

    // Create particle effect at position
    static createParticles(x, y, count = 8, color = '#00ff00') {
        const particles = [];
        for (let i = 0; i < count; i++) {
            // Create proper Particle instances instead of plain objects
            const particle = new Particle(
                x + Utils.random(-5, 5),
                y + Utils.random(-5, 5),
                Utils.random(-3, 3),
                Utils.random(-3, 3),
                color,
                Utils.random(2, 5),
                1.0
            );
            particles.push(particle);
        }
        return particles;
    }

    // Screen shake effect
    static createScreenShake(intensity = 5, duration = 0.3) {
        return {
            intensity: intensity,
            duration: duration,
            time: 0,
            offsetX: 0,
            offsetY: 0
        };
    }

    static updateScreenShake(shake, deltaTime) {
        if (shake.time < shake.duration) {
            shake.time += deltaTime;
            const progress = shake.time / shake.duration;
            const currentIntensity = shake.intensity * (1 - progress);
            
            shake.offsetX = Utils.random(-currentIntensity, currentIntensity);
            shake.offsetY = Utils.random(-currentIntensity, currentIntensity);
            
            return true;
        } else {
            shake.offsetX = 0;
            shake.offsetY = 0;
            return false;
        }
    }

    // Local storage helpers
    static saveToStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }
    }

    static loadFromStorage(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.warn('Could not load from localStorage:', e);
            return defaultValue;
        }
    }

    // Canvas helpers
    static resizeCanvas(canvas, maxWidth = 800, maxHeight = 600) {
        const container = canvas.parentElement;
        const containerRect = container.getBoundingClientRect();
        
        // Calculate scale to fit container while maintaining aspect ratio
        const scaleX = (containerRect.width - 40) / maxWidth;
        const scaleY = (containerRect.height - 40) / maxHeight;
        const scale = Math.min(scaleX, scaleY, 1);
        
        canvas.style.width = `${maxWidth * scale}px`;
        canvas.style.height = `${maxHeight * scale}px`;
        
        return scale;
    }

    // Input handling helpers
    static normalizeInput(event) {
        if (event.type.startsWith('touch')) {
            return {
                x: event.touches[0]?.clientX || event.changedTouches[0]?.clientX || 0,
                y: event.touches[0]?.clientY || event.changedTouches[0]?.clientY || 0
            };
        } else {
            return {
                x: event.clientX,
                y: event.clientY
            };
        }
    }

    // Performance monitoring
    static createPerformanceMonitor() {
        return {
            frameCount: 0,
            lastTime: 0,
            fps: 0,
            avgFrameTime: 0,
            minFrameTime: Infinity,
            maxFrameTime: 0
        };
    }

    static updatePerformanceMonitor(monitor, currentTime) {
        if (monitor.lastTime === 0) {
            monitor.lastTime = currentTime;
            return;
        }

        const deltaTime = currentTime - monitor.lastTime;
        monitor.frameCount++;
        
        monitor.minFrameTime = Math.min(monitor.minFrameTime, deltaTime);
        monitor.maxFrameTime = Math.max(monitor.maxFrameTime, deltaTime);
        
        // Calculate FPS every 60 frames
        if (monitor.frameCount % 60 === 0) {
            monitor.fps = Math.round(1000 / deltaTime);
            monitor.avgFrameTime = deltaTime;
        }
        
        monitor.lastTime = currentTime;
    }

    // API helpers for backend communication
    static async fetchLevelData(levelNumber, useAI = false) {
        try {
            const endpoint = useAI ? `/api/levels/generate/${levelNumber}` : `/api/levels/${levelNumber}`;
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const levelData = await response.json();
            
            // Log AI generation info
            if (levelData.generatedBy) {
                console.log(`🎮 Level ${levelNumber} generated by: ${levelData.generatedBy}`);
                if (levelData.balanceNotes) {
                    console.log(`📝 Design notes: ${levelData.balanceNotes}`);
                }
            }
            
            return levelData;
        } catch (error) {
            console.error('Failed to fetch level data:', error);
            // Return default level data as fallback
            return {
                level: levelNumber,
                enemyCount: 35,
                enemySpeed: 1,
                enemyDropSpeed: 20,
                enemyBulletSpeed: 2,
                enemyBulletFrequency: 0.003,
                enemyMoveDirection: 1,
                enemyRows: 5,
                enemyCols: 7,
                pointsPerEnemy: 10,
                enemyType: 'basic',
                generatedBy: 'fallback'
            };
        }
    }

    // Fetch AI status and capabilities
    static async fetchAIStatus() {
        try {
            const response = await fetch('/api/ai/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch AI status:', error);
            return {
                enabled: false,
                model: 'none',
                endpoint: 'none',
                cacheStats: null,
                tokenConfigured: false
            };
        }
    }

    // Clear AI cache (for development)
    static async clearAICache() {
        try {
            const response = await fetch('/api/ai/cache/clear', {
                method: 'POST'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            console.log('✅ AI cache cleared:', result.message);
            return result;
        } catch (error) {
            console.error('Failed to clear AI cache:', error);
            return { error: error.message };
        }
    }

    static async fetchGameStats() {
        try {
            const response = await fetch('/api/stats');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to fetch game stats:', error);
            return {
                highScore: 0,
                gamesPlayed: 0,
                highestLevel: 1
            };
        }
    }

    // Audio helpers (for future sound implementation)
    static playSound(audioElement, volume = 1.0) {
        if (audioElement && audioElement.play) {
            audioElement.volume = volume;
            audioElement.currentTime = 0;
            audioElement.play().catch(e => {
                // Handle autoplay restrictions
                console.log('Audio play failed:', e.message);
            });
        }
    }

    // UUID v4 generator for session IDs
    static generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // User feedback message system
    static showMessage(text, type = 'info') {
        const messageContainer = document.getElementById('message-container') || Utils.createMessageContainer();
        
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        
        messageContainer.appendChild(message);
        
        // Fade in
        setTimeout(() => message.classList.add('show'), 10);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => message.remove(), 300);
        }, 5000);
    }

    // Create message container if it doesn't exist
    static createMessageContainer() {
        let container = document.getElementById('message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'message-container';
            container.className = 'message-container';
            document.body.appendChild(container);
        }
        return container;
    }

    // Debug helpers
    static drawDebugInfo(ctx, game) {
        if (!game.debug) return;

        ctx.save();
        ctx.font = '12px monospace';
        ctx.fillStyle = '#00ff00';
        ctx.textAlign = 'left';
        
        const debugInfo = [
            `FPS: ${game.performanceMonitor.fps}`,
            `Enemies: ${game.enemies.length}`,
            `Bullets: ${game.bullets.length + game.enemyBullets.length}`,
            `Particles: ${game.particles.length}`,
            `Level: ${game.currentLevel}`,
            `Score: ${game.score}`,
            `Lives: ${game.lives}`
        ];
        
        debugInfo.forEach((info, index) => {
            ctx.fillText(info, 10, 20 + index * 15);
        });
        
        ctx.restore();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}