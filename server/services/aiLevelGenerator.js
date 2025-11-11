const ModelClient = require("@azure-rest/ai-inference").default;
const { AzureKeyCredential } = require("@azure/core-auth");
const { isUnexpected } = require("@azure-rest/ai-inference");

class AILevelGenerator {
    constructor() {
        this.endpoint = "https://models.github.ai/inference";
        this.model = "openai/gpt-4.1-mini"; // Cost-effective model for POC
        this.client = null;
        this.initialized = false;
        this.levelCache = new Map(); // In-memory cache for generated levels
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Initialize the AI client with GitHub token
     */
    initialize() {
        try {
            const token = process.env.GITHUB_TOKEN;
            if (!token || token === 'your_github_token_here' || token.trim() === '') {
                console.warn('⚠️ GITHUB_TOKEN not found or not configured. AI level generation will be disabled.');
                return false;
            }

            this.client = ModelClient(
                this.endpoint,
                new AzureKeyCredential(token)
            );
            this.initialized = true;
            console.log('✅ AI Level Generator initialized with GitHub Models');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize AI Level Generator:', error.message);
            return false;
        }
    }

    /**
     * Generate a creative and balanced level configuration using AI
     * @param {number} levelNumber - The level number to generate
     * @param {object} baseLevel - Base level configuration for reference
     * @returns {Promise<object>} Generated level configuration
     */
    async generateLevel(levelNumber, baseLevel) {
        if (!this.initialized) {
            throw new Error('AI Level Generator not initialized');
        }

        // Check cache first
        const cacheKey = `level_${levelNumber}`;
        if (this.levelCache.has(cacheKey)) {
            console.log(`📦 Using cached AI level ${levelNumber}`);
            return this.levelCache.get(cacheKey);
        }

        const prompt = this.createLevelPrompt(levelNumber, baseLevel);
        
        let lastError;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🤖 Generating AI level ${levelNumber} (attempt ${attempt}/${this.maxRetries})`);
                
                const response = await this.client.path("/chat/completions").post({
                    body: {
                        messages: [
                            { 
                                role: "system", 
                                content: "You are a game design AI that creates balanced and engaging Space Invaders level configurations. Always respond with valid JSON only, no additional text." 
                            },
                            { 
                                role: "user", 
                                content: prompt 
                            }
                        ],
                        temperature: 0.7, // Balanced creativity and consistency
                        max_tokens: 1000,
                        model: this.model
                    }
                });

                if (isUnexpected(response)) {
                    throw new Error(`API Error: ${response.body.error?.message || 'Unknown error'}`);
                }

                const content = response.body.choices[0].message.content.trim();
                const levelConfig = this.parseAndValidateLevel(content, levelNumber, baseLevel);
                
                // Cache the generated level
                this.levelCache.set(cacheKey, levelConfig);
                
                console.log(`✅ Successfully generated AI level ${levelNumber}`);
                return levelConfig;

            } catch (error) {
                lastError = error;
                console.warn(`⚠️ Attempt ${attempt} failed for level ${levelNumber}:`, error.message);
                
                if (attempt < this.maxRetries) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }

        console.error(`❌ Failed to generate AI level ${levelNumber} after ${this.maxRetries} attempts:`, lastError.message);
        throw lastError;
    }

    /**
     * Create a detailed prompt for level generation
     */
    createLevelPrompt(levelNumber, baseLevel) {
        const difficulty = this.calculateDifficultyContext(levelNumber);
        
        return `Generate a Space Invaders level ${levelNumber} configuration with these requirements:

DIFFICULTY CONTEXT: ${difficulty.description}
PREVIOUS LEVEL REFERENCE: ${JSON.stringify(baseLevel, null, 2)}

Create a JSON configuration that:
1. Progressively increases difficulty from the base level
2. Introduces creative enemy formations and behaviors
3. Maintains game balance and playability
4. Adds variety through different enemy types and mechanics

REQUIRED JSON STRUCTURE:
{
  "level": ${levelNumber},
  "enemyCount": <integer 20-80>,
  "enemySpeed": <float 0.5-5.0>,
  "enemyDropSpeed": <integer 10-80>,
  "enemyBulletSpeed": <float 1.0-8.0>,
  "enemyBulletFrequency": <float 0.001-0.01>,
  "enemyMoveDirection": 1,
  "enemyRows": <integer 3-8>,
  "enemyCols": <integer 5-15>,
  "pointsPerEnemy": <integer based on difficulty>,
  "enemyType": "<basic|fast|aggressive|boss>",
  "walls": {
    "count": <integer 2-4>,
    "width": <integer 70-90>,
    "height": <integer 40-60>,
    "health": <integer 2-6>,
    "yPosition": 450
  },
  "specialMechanics": {
    "formation": "<grid|diamond|wave|scattered|custom>",
    "movementPattern": "<standard|zigzag|spiral|random>",
    "powerUps": ["<shield|rapid-fire|multi-shot|score-boost>"],
    "bossProperties": {
      "health": <integer if boss level>,
      "size": <float multiplier if boss>,
      "specialAttacks": ["<spread-shot|laser|missile>"]
    }
  },
  "theme": {
    "color": "<hex color for enemy tint>",
    "atmosphere": "<space|nebula|asteroid|alien-world>"
  },
  "balanceNotes": "<brief explanation of design choices>"
}

CONSTRAINTS:
- Enemy count should increase gradually but not exceed 80
- Speed increases should be moderate (max +0.3 per level)
- Bullet frequency should remain reasonable for playability
- Boss levels every 5 levels (5, 10, 15, etc.)
- Wall count should decrease on harder levels (more walls = easier)
- Wall health should decrease on harder levels for balance
- Ensure the level is challenging but fair

Generate ONLY the JSON, no additional text:`;
    }

    /**
     * Calculate difficulty context for the prompt
     */
    calculateDifficultyContext(levelNumber) {
        if (levelNumber <= 3) {
            return { description: "Early game - introduce basic mechanics gradually" };
        } else if (levelNumber <= 7) {
            return { description: "Mid-early game - establish core challenge patterns" };
        } else if (levelNumber <= 15) {
            return { description: "Mid game - introduce complex formations and mechanics" };
        } else if (levelNumber <= 25) {
            return { description: "Late game - high difficulty with creative challenges" };
        } else {
            return { description: "Endgame - extreme difficulty with unique mechanics" };
        }
    }

    /**
     * Parse and validate the AI-generated level configuration
     */
    parseAndValidateLevel(content, levelNumber, baseLevel) {
        try {
            // Extract JSON from response (handle potential markdown formatting)
            let jsonStr = content;
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1];
            }

            const levelConfig = JSON.parse(jsonStr);
            
            // Validate and sanitize the configuration
            return this.validateAndSanitizeLevel(levelConfig, levelNumber, baseLevel);
            
        } catch (error) {
            console.error('Failed to parse AI response:', error.message);
            console.log('Raw response:', content);
            throw new Error(`Invalid JSON response from AI: ${error.message}`);
        }
    }

    /**
     * Validate and sanitize the AI-generated level configuration
     */
    validateAndSanitizeLevel(config, levelNumber, baseLevel) {
        const sanitized = {
            level: levelNumber,
            enemyCount: this.clamp(config.enemyCount || baseLevel.enemyCount, 20, 80),
            enemySpeed: this.clamp(config.enemySpeed || baseLevel.enemySpeed, 0.5, 5.0),
            enemyDropSpeed: this.clamp(config.enemyDropSpeed || baseLevel.enemyDropSpeed, 10, 80),
            enemyBulletSpeed: this.clamp(config.enemyBulletSpeed || baseLevel.enemyBulletSpeed, 1.0, 8.0),
            enemyBulletFrequency: this.clamp(config.enemyBulletFrequency || baseLevel.enemyBulletFrequency, 0.001, 0.01),
            enemyMoveDirection: 1,
            enemyRows: this.clamp(config.enemyRows || baseLevel.enemyRows, 3, 8),
            enemyCols: this.clamp(config.enemyCols || baseLevel.enemyCols, 5, 15),
            pointsPerEnemy: Math.max(config.pointsPerEnemy || baseLevel.pointsPerEnemy, 10),
            enemyType: this.validateEnemyType(config.enemyType) || baseLevel.enemyType
        };

        // Add wall configuration
        if (config.walls) {
            sanitized.walls = this.sanitizeWalls(config.walls);
        } else if (baseLevel.walls) {
            sanitized.walls = baseLevel.walls;
        } else {
            // Default walls configuration
            sanitized.walls = {
                count: 4,
                width: 80,
                height: 60,
                health: 5,
                yPosition: 450
            };
        }

        // Add AI-specific enhancements if present
        if (config.specialMechanics) {
            sanitized.specialMechanics = this.sanitizeSpecialMechanics(config.specialMechanics);
        }

        if (config.theme) {
            sanitized.theme = this.sanitizeTheme(config.theme);
        }

        if (config.balanceNotes) {
            sanitized.balanceNotes = config.balanceNotes.substring(0, 200); // Limit length
        }

        return sanitized;
    }

    /**
     * Sanitize wall configuration
     */
    sanitizeWalls(walls) {
        return {
            count: this.clamp(walls.count || 4, 2, 4),
            width: this.clamp(walls.width || 80, 70, 90),
            height: this.clamp(walls.height || 60, 40, 60),
            health: this.clamp(walls.health || 5, 2, 6),
            yPosition: walls.yPosition || 450
        };
    }

    /**
     * Validate enemy type
     */
    validateEnemyType(enemyType) {
        const validTypes = ['basic', 'fast', 'aggressive', 'boss'];
        return validTypes.includes(enemyType) ? enemyType : 'basic';
    }

    /**
     * Sanitize special mechanics
     */
    sanitizeSpecialMechanics(mechanics) {
        const validFormations = ['grid', 'diamond', 'wave', 'scattered', 'custom'];
        const validMovements = ['standard', 'zigzag', 'spiral', 'random'];
        const validPowerUps = ['shield', 'rapid-fire', 'multi-shot', 'score-boost'];
        
        return {
            formation: validFormations.includes(mechanics.formation) ? mechanics.formation : 'grid',
            movementPattern: validMovements.includes(mechanics.movementPattern) ? mechanics.movementPattern : 'standard',
            powerUps: Array.isArray(mechanics.powerUps) ? 
                mechanics.powerUps.filter(p => validPowerUps.includes(p)) : [],
            bossProperties: mechanics.bossProperties ? {
                health: this.clamp(mechanics.bossProperties.health || 3, 1, 10),
                size: this.clamp(mechanics.bossProperties.size || 1.5, 1.0, 3.0),
                specialAttacks: Array.isArray(mechanics.bossProperties.specialAttacks) ? 
                    mechanics.bossProperties.specialAttacks.slice(0, 3) : []
            } : null
        };
    }

    /**
     * Sanitize theme properties
     */
    sanitizeTheme(theme) {
        const validAtmospheres = ['space', 'nebula', 'asteroid', 'alien-world'];
        
        return {
            color: this.validateHexColor(theme.color) || '#ffffff',
            atmosphere: validAtmospheres.includes(theme.atmosphere) ? theme.atmosphere : 'space'
        };
    }

    /**
     * Validate hex color
     */
    validateHexColor(color) {
        return /^#[0-9A-F]{6}$/i.test(color) ? color : null;
    }

    /**
     * Clamp a number between min and max values
     */
    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    /**
     * Delay utility for retries
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear the level cache
     */
    clearCache() {
        this.levelCache.clear();
        console.log('🧹 AI level cache cleared');
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.levelCache.size,
            keys: Array.from(this.levelCache.keys())
        };
    }
}

module.exports = new AILevelGenerator();