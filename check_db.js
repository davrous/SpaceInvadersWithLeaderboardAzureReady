const Database = require('better-sqlite3');
const db = new Database('./server/database/leaderboard.db');

console.log('=== USERS ===');
const users = db.prepare('SELECT * FROM users').all();
console.log(users);

console.log('\n=== SCORES ===');
const scores = db.prepare('SELECT * FROM scores ORDER BY id DESC LIMIT 10').all();
console.log(scores);

console.log('\n=== LEADERBOARD ===');
const leaderboard = db.prepare('SELECT * FROM leaderboard').all();
console.log(leaderboard);

db.close();
