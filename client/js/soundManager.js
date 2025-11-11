// Web Audio API Sound Manager for Space Invaders
// Generates retro-style sounds programmatically for authentic arcade feel

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.soundEnabled = true;
        this.masterVolume = 0.5;
        this.initialized = false;
        this.sounds = new Map();
        
        // Store active sound sources for cleanup
        this.activeSources = new Set();
        
        // Sound throttling to prevent audio spam
        this.lastEnemyMoveSound = 0;
        
        // Initialize when user first interacts
        this.pendingInit = false;
    }

    /**
     * Initialize Web Audio Context (must be called after user interaction)
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            // Create Audio Context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.connect(this.audioContext.destination);
            this.masterGain.gain.value = this.masterVolume;
            
            // Resume context if it's suspended (autoplay policy)
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            this.initialized = true;
            console.log('🔊 Sound Manager initialized successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize Sound Manager:', error);
            this.soundEnabled = false;
            return false;
        }
    }

    /**
     * Create a basic oscillator with envelope
     */
    createOscillator(frequency, waveform = 'square', duration = 0.1) {
        if (!this.initialized || !this.soundEnabled) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = waveform;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        return { oscillator, gainNode, duration };
    }

    /**
     * Apply ADSR envelope to a gain node
     */
    applyEnvelope(gainNode, attack = 0.01, decay = 0.1, sustain = 0.3, release = 0.1) {
        const now = this.audioContext.currentTime;
        const sustainLevel = sustain;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + attack);
        gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attack + decay);
        gainNode.gain.setValueAtTime(sustainLevel, now + attack + decay);
    }

    /**
     * Generate player laser shoot sound
     */
    playPlayerShoot() {
        if (!this.initialized || !this.soundEnabled) return;

        const sound = this.createOscillator(800, 'square', 0.1);
        if (!sound) return;

        const { oscillator, gainNode } = sound;
        const now = this.audioContext.currentTime;
        
        // Quick attack and linear frequency sweep down
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        
        // Frequency sweep for laser effect
        oscillator.frequency.setValueAtTime(800, now);
        oscillator.frequency.linearRampToValueAtTime(400, now + 0.1);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        
        this.trackSource(oscillator);
    }

    /**
     * Generate enemy death explosion sound
     */
    playEnemyDeath() {
        if (!this.initialized || !this.soundEnabled) return;

        const sound = this.createOscillator(150, 'sawtooth', 0.3);
        if (!sound) return;

        const { oscillator, gainNode } = sound;
        const now = this.audioContext.currentTime;
        
        // Explosion envelope - sharp attack, slow decay
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.6, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        // Frequency sweep down for explosion
        oscillator.frequency.setValueAtTime(150, now);
        oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.3);
        
        oscillator.start(now);
        oscillator.stop(now + 0.3);
        
        this.trackSource(oscillator);
        
        // Add noise burst for extra explosion texture
        this.playNoiseBurst(0.1, 0.4, 0.05);
    }

    /**
     * Generate player death explosion sound
     */
    playPlayerDeath() {
        if (!this.initialized || !this.soundEnabled) return;

        // Main explosion
        const sound1 = this.createOscillator(200, 'sawtooth', 0.8);
        if (sound1) {
            const { oscillator, gainNode } = sound1;
            const now = this.audioContext.currentTime;
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.8, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
            
            oscillator.frequency.setValueAtTime(200, now);
            oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.8);
            
            oscillator.start(now);
            oscillator.stop(now + 0.8);
            
            this.trackSource(oscillator);
        }

        // Secondary explosion harmonic
        const sound2 = this.createOscillator(400, 'square', 0.4);
        if (sound2) {
            const { oscillator, gainNode } = sound2;
            const now = this.audioContext.currentTime;
            
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(0.4, now + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            
            oscillator.frequency.setValueAtTime(400, now);
            oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.4);
            
            oscillator.start(now);
            oscillator.stop(now + 0.4);
            
            this.trackSource(oscillator);
        }

        // Noise burst
        this.playNoiseBurst(0.2, 0.6, 0.1);
    }

    /**
     * Generate enemy bullet shoot sound
     */
    playEnemyShoot() {
        if (!this.initialized || !this.soundEnabled) return;

        const sound = this.createOscillator(300, 'triangle', 0.15);
        if (!sound) return;

        const { oscillator, gainNode } = sound;
        const now = this.audioContext.currentTime;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
        
        // Slight frequency wobble for alien sound
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.linearRampToValueAtTime(250, now + 0.075);
        oscillator.frequency.linearRampToValueAtTime(200, now + 0.15);
        
        oscillator.start(now);
        oscillator.stop(now + 0.15);
        
        this.trackSource(oscillator);
    }

    /**
     * Generate enemy movement beep (classic space invaders sound)
     * Limit frequency to prevent audio spam
     */
    playEnemyMove(pitch = 1) {
        if (!this.initialized || !this.soundEnabled) return;

        // Throttle enemy move sounds to prevent audio spam
        const now = Date.now();
        if (this.lastEnemyMoveSound && (now - this.lastEnemyMoveSound) < 100) {
            return; // Don't play if less than 100ms since last sound
        }
        this.lastEnemyMoveSound = now;

        const baseFreq = 220 * pitch;
        const sound = this.createOscillator(baseFreq, 'square', 0.1);
        if (!sound) return;

        const { oscillator, gainNode } = sound;
        const audioNow = this.audioContext.currentTime;
        
        gainNode.gain.setValueAtTime(0, audioNow);
        gainNode.gain.linearRampToValueAtTime(0.3, audioNow + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioNow + 0.1);
        
        oscillator.start(audioNow);
        oscillator.stop(audioNow + 0.1);
        
        this.trackSource(oscillator);
    }

    /**
     * Generate level complete fanfare
     */
    playLevelComplete() {
        if (!this.initialized || !this.soundEnabled) return;

        const notes = [262, 330, 392, 523]; // C, E, G, C octave
        const duration = 0.3;
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const sound = this.createOscillator(freq, 'square', duration);
                if (sound) {
                    const { oscillator, gainNode } = sound;
                    const now = this.audioContext.currentTime;
                    
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.05);
                    gainNode.gain.linearRampToValueAtTime(0.3, now + duration * 0.7);
                    gainNode.gain.linearRampToValueAtTime(0, now + duration);
                    
                    oscillator.start(now);
                    oscillator.stop(now + duration);
                    
                    this.trackSource(oscillator);
                }
            }, index * 200);
        });
    }

    /**
     * Generate game over sound
     */
    playGameOver() {
        if (!this.initialized || !this.soundEnabled) return;

        const notes = [262, 247, 220, 196]; // Descending sad melody
        const duration = 0.5;
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const sound = this.createOscillator(freq, 'sine', duration);
                if (sound) {
                    const { oscillator, gainNode } = sound;
                    const now = this.audioContext.currentTime;
                    
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.1);
                    gainNode.gain.linearRampToValueAtTime(0.3, now + duration * 0.8);
                    gainNode.gain.linearRampToValueAtTime(0, now + duration);
                    
                    oscillator.start(now);
                    oscillator.stop(now + duration);
                    
                    this.trackSource(oscillator);
                }
            }, index * 400);
        });
    }

    /**
     * Generate power-up collect sound
     */
    playPowerUp() {
        if (!this.initialized || !this.soundEnabled) return;

        const notes = [523, 659, 784, 1047]; // C, E, G, C ascending
        
        notes.forEach((freq, index) => {
            setTimeout(() => {
                const sound = this.createOscillator(freq, 'sine', 0.15);
                if (sound) {
                    const { oscillator, gainNode } = sound;
                    const now = this.audioContext.currentTime;
                    
                    gainNode.gain.setValueAtTime(0, now);
                    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.15);
                    
                    oscillator.start(now);
                    oscillator.stop(now + 0.15);
                    
                    this.trackSource(oscillator);
                }
            }, index * 50);
        });
    }

    /**
     * Generate UI button click sound
     */
    playButtonClick() {
        if (!this.initialized || !this.soundEnabled) return;

        const sound = this.createOscillator(800, 'square', 0.05);
        if (!sound) return;

        const { oscillator, gainNode } = sound;
        const now = this.audioContext.currentTime;
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
        
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        
        this.trackSource(oscillator);
    }

    /**
     * Generate white noise burst for explosions - internal method
     */
    playNoiseBurst(volume = 0.3, duration = 0.1, delay = 0) {
        if (!this.initialized || !this.soundEnabled) return;

        // Create noise using a buffer source
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate white noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * volume;
        }
        
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        const now = this.audioContext.currentTime + delay;
        
        gainNode.gain.setValueAtTime(volume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        source.start(now);
        source.stop(now + duration);
        
        this.trackSource(source);
    }

    /**
     * Track active audio sources for cleanup
     */
    trackSource(source) {
        // Limit the number of active sources to prevent performance issues
        if (this.activeSources.size > 20) {
            // Stop the oldest source
            const firstSource = this.activeSources.values().next().value;
            try {
                firstSource.stop();
            } catch (e) {
                // Source might already be stopped
            }
            this.activeSources.delete(firstSource);
        }
        
        this.activeSources.add(source);
        source.addEventListener('ended', () => {
            this.activeSources.delete(source);
        });
    }

    /**
     * Set master volume (0.0 to 1.0)
     */
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
        }
    }

    /**
     * Mute/unmute all sounds
     */
    setMuted(muted) {
        this.soundEnabled = !muted;
        if (muted) {
            this.stopAllSounds();
        }
    }

    /**
     * Stop all currently playing sounds
     */
    stopAllSounds() {
        this.activeSources.forEach(source => {
            try {
                source.stop();
            } catch (e) {
                // Source already stopped
            }
        });
        this.activeSources.clear();
    }

    /**
     * Clean up resources
     */
    destroy() {
        this.stopAllSounds();
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.initialized = false;
    }

    /**
     * Get current audio context state for debugging
     */
    getStatus() {
        return {
            initialized: this.initialized,
            soundEnabled: this.soundEnabled,
            masterVolume: this.masterVolume,
            contextState: this.audioContext ? this.audioContext.state : 'none',
            activeSounds: this.activeSources.size
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}