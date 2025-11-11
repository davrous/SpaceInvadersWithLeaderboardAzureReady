# Space Invaders HTML5 Game

A modern recreation of the classic Space Invaders arcade game built with HTML5 Canvas and a Node.js backend for level management.

DevDay Edition

## 🎮 Features

- **HTML5 Canvas Game Engine**: Smooth 60 FPS gameplay with retro pixel-perfect graphics
- **Progressive Difficulty**: 20+ levels with increasing enemy speed, count, and aggression
- **Node.js Backend**: RESTful API for level data and game configuration
- **OAuth2 Authentication**: Sign in with GitHub, Google, or Microsoft
- **Global Leaderboard**: Compete with players worldwide
- **Personal Statistics**: Track your progress and achievements
- **Offline Support**: Queue scores when offline, sync when back online
- **Responsive Design**: Works on desktop and mobile devices with touch controls
- **Retro Aesthetics**: Space Invaders-themed UI with neon green color scheme
- **Performance Optimized**: Adaptive performance monitoring and optimization
- **Sound Ready**: Placeholder audio system for future sound effects

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone or download the project:
```bash
git clone <repository-url>
cd SpaceInvaders
```

2. Install dependencies:
```bash
npm install
```

3. **Set up OAuth2 authentication** (required for leaderboard):
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Follow the **[OAuth2 Setup Guide](docs/OAUTH_SETUP.md)** to configure GitHub, Google, and Microsoft authentication
   - Add your OAuth credentials to the `.env` file

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

### Development Mode

For development with auto-restart:
```bash
npm run dev
```

## 🎯 How to Play

### Desktop Controls
- **Arrow Keys** or **A/D**: Move player ship left/right
- **Spacebar**: Shoot bullets
- **P**: Pause/Unpause game
- **R**: Restart game
- **D**: Toggle debug mode

### Mobile Controls
- **Touch Controls**: Use the on-screen buttons for movement and shooting
- **Responsive**: Game automatically adapts to mobile screen sizes

### Gameplay
- Destroy all enemies to advance to the next level
- Avoid enemy bullets and prevent enemies from reaching the bottom
- Each level increases difficulty with faster enemies and more bullets
- Score points for each enemy destroyed
- Game over when you lose all lives

## 🏗️ Project Structure

```
SpaceInvaders/
├── client/                 # Frontend HTML5 game
│   ├── css/
│   │   └── style.css      # Game styling and responsive design
│   ├── js/
│   │   ├── utils.js       # Utility functions and helpers
│   │   ├── entities.js    # Game entities (Player, Enemy, Bullet, etc.)
│   │   ├── game.js        # Main game engine and logic
│   │   └── main.js        # Game initialization and systems
│   └── index.html         # Main game HTML file
├── server/                # Backend Node.js server
│   └── server.js          # Express server with API endpoints
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## 🛠️ API Endpoints

The Node.js backend provides the following API endpoints:

### Level Management
- `GET /api/levels` - Get list of available levels
- `GET /api/levels/:levelNumber` - Get specific level configuration
- `GET /api/health` - Health check endpoint

### Authentication
- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/microsoft` - Initiate Microsoft OAuth flow
- `GET /auth/{provider}/callback` - OAuth callback handler
- `GET /api/v1/auth/session` - Check current session
- `POST /api/v1/auth/logout` - Log out user

### Leaderboard
- `GET /api/v1/leaderboard` - Get global leaderboard (public)
- `POST /api/v1/scores` - Submit score (requires authentication)
- `GET /api/v1/users/:userId/stats` - Get user statistics (public)
- `GET /api/v1/users/:userId/scores` - Get user score history (public)

### Level Configuration
Each level includes:
- Enemy count and formation
- Enemy movement speed
- Enemy bullet speed and frequency
- Point values
- Enemy types (basic, fast, aggressive, boss)

## 🤖 AI-Powered Level Generation

**NEW FEATURE**: This game now includes AI-powered level generation using GitHub Models!

### AI Features
- **Smart Level Design**: AI creates balanced, engaging levels using GPT-4.1-mini
- **Dynamic Difficulty**: AI considers player progression and creates appropriate challenges
- **Creative Formations**: Beyond basic grids - diamond, wave, scattered, and custom formations
- **Themed Levels**: Each level can have unique visual themes and atmospheres
- **Special Mechanics**: Boss levels, unique movement patterns, and special attacks
- **Fallback System**: Graceful degradation to procedural generation if AI is unavailable

### Setup AI Features

1. **Get a GitHub Personal Access Token**:
   - Go to https://github.com/settings/tokens
   - Create a new token (no specific scopes needed)

2. **Configure Environment**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env and add your token
   GITHUB_TOKEN=your_github_token_here
   ENABLE_AI_LEVELS=true
   ```

3. **Toggle AI Levels**:
   - Start the game and look for the "🤖 AI Levels" toggle
   - Click to enable AI-generated levels
   - Each level will be uniquely generated by AI!

### AI API Endpoints
- `GET /api/ai/status` - Check AI availability and configuration
- `GET /api/levels/generate/:levelNumber` - Generate AI-powered level
- `POST /api/ai/cache/clear` - Clear AI level cache (development)

### Model Options

**For POC/Development (FREE to start):**
- **GPT-4.1-mini**: $0.7/1M tokens, excellent quality
- **GPT-4.1-nano**: $0.175/1M tokens, faster, cost-effective

**For Production:**
- **GPT-4.1**: $3.5/1M tokens, highest quality
- **GPT-5-mini**: $0.6875/1M tokens, latest features

### How It Works
1. **Context Analysis**: AI considers current level, difficulty progression
2. **Creative Generation**: AI designs formations, mechanics, themes
3. **Balance Validation**: Generated levels are validated for playability
4. **Caching**: Levels cached to avoid redundant API calls

## 🎨 Game Features

### Enemy Types
- **Basic**: Standard white enemies (10 points)
- **Fast**: Yellow enemies with increased speed (20 points)
- **Aggressive**: Orange enemies with higher fire rate (30 points)
- **Boss**: Large red enemies with special abilities (50 points)

### Visual Effects
- Particle explosions
- Screen shake on impacts
- Flash effects for damage
- Animated sprites
- Smooth bullet trails
- Retro-styled UI elements

### Progressive Difficulty
- Enemy speed increases each level
- More enemies per level
- Higher bullet frequency
- New enemy types introduced
- Faster enemy descent speed

## 🔧 Configuration

### Server Configuration
The server runs on port 3000 by default. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm start
```

### Game Configuration
Level configurations are stored in the server and can be modified in `server/server.js`. Each level includes:

```javascript
{
    level: 1,
    enemyCount: 35,
    enemySpeed: 1,
    enemyDropSpeed: 20,
    enemyBulletSpeed: 2,
    enemyBulletFrequency: 0.003,
    enemyRows: 5,
    enemyCols: 7,
    pointsPerEnemy: 10,
    enemyType: 'basic'
}
```

## 📱 Mobile Support

The game includes comprehensive mobile support:
- Touch controls for movement and shooting
- Responsive canvas sizing
- Optimized touch event handling
- Mobile-friendly UI elements
- Performance optimization for mobile devices

## 🏆 Scoring & Leaderboard System

### Scoring
- **Basic Enemy**: 10 points
- **Fast Enemy**: 20 points
- **Aggressive Enemy**: 30 points
- **Boss Enemy**: 50 points
- **Level Completion Bonus**: Based on remaining lives

### Leaderboard Features
- **Global Rankings**: See top 100 players worldwide
- **Personal Stats**: Track total games, best score, average score, and rank
- **Personal Best Tracking**: Celebrate new high scores
- **Rate Limiting**: Fair play with 60-second submission cooldown
- **Offline Queue**: Scores saved locally when offline, synced when online
- **Real-Time Updates**: Leaderboard polls every 30 seconds
- **Session Tracking**: Unique session IDs prevent duplicate submissions
- **Multiple Auth Providers**: Sign in with GitHub, Google, or Microsoft

## 🚀 Future Enhancements

- ~~Sound effects and background music~~ ✅ Implemented
- ~~Leaderboards with backend storage~~ ✅ Implemented
- Power-ups and special weapons
- Multiplayer support
- Additional enemy types and boss battles
- Progressive Web App (PWA) support
- Achievement system
- Profile customization
- Friend challenges
- Tournament mode

## 🐛 Troubleshooting

### Common Issues

1. **Game won't load**: Check browser console for errors and ensure server is running
2. **Performance issues**: Try enabling debug mode (press 'D') to monitor FPS
3. **Mobile controls not working**: Ensure touch events are properly bound
4. **High score not saving**: Check browser local storage permissions

### Browser Compatibility

- Modern browsers with HTML5 Canvas support
- Chrome/Edge 70+
- Firefox 65+
- Safari 12+
- Mobile Safari and Chrome

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the original Space Invaders arcade game by Tomohiro Nishikado
- Built with modern web technologies
- Retro pixel art aesthetic
- Community feedback and contributions

## 🤝 Contributing

1. Fork the project
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For support, please open an issue on the GitHub repository or contact the development team.

---

**Enjoy defending Earth from the alien invasion! 🛸👾**