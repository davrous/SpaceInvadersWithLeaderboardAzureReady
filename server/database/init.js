const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Use Azure App Service persistent storage path (/home) or fallback to local path
const getDbPath = () => {
    if (process.env.DATABASE_PATH) {
        return process.env.DATABASE_PATH;
    }
    
    // On Azure App Service, use /home directory which is persistent
    if (process.env.WEBSITE_INSTANCE_ID) {
        return '/home/data/leaderboard.db';
    }
    
    // Local development
    return path.join(__dirname, 'leaderboard.db');
};

const dbPath = getDbPath();
const schemaPath = path.join(__dirname, 'schema.sql');

/**
 * Initialize the database with schema
 * @returns {Database} - The SQLite database instance
 */
function initializeDatabase() {
    try {
        // Ensure the database directory exists
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            console.log(`📁 Creating database directory: ${dbDir}`);
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        // Create database connection
        const db = new Database(dbPath, { verbose: console.log });
        
        // Read and execute schema
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema);
        
        console.log('✅ Database initialized successfully at:', dbPath);
        console.log('   - Users table created');
        console.log('   - Scores table created');
        console.log('   - Leaderboard view created');
        console.log('   - User stats view created');
        console.log('   - Indexes created for performance');
        
        return db;
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        console.error('   Database path attempted:', dbPath);
        throw error;
    }
}

module.exports = { initializeDatabase };
