// Test script to verify score submission
console.log('Testing score submission...');

// Check the game state
if (typeof game !== 'undefined') {
    console.log('Game object exists:', game);
    console.log('Current score:', game.score);
    console.log('Current level:', game.currentLevel);
}

// Check leaderboard
if (typeof leaderboard !== 'undefined') {
    console.log('Leaderboard object exists:', leaderboard);
}

// Check auth client
if (typeof authClient !== 'undefined') {
    console.log('Auth client exists:', authClient);
    console.log('Is authenticated:', authClient.isAuthenticated());
    if (authClient.isAuthenticated()) {
        console.log('Current user:', authClient.getUser());
    }
}

// Test handleGameOver function
if (typeof handleGameOver !== 'undefined') {
    console.log('handleGameOver function exists');
    
    // Try calling it with test data (only if authenticated)
    if (authClient && authClient.isAuthenticated()) {
        console.log('Attempting to submit test score...');
        handleGameOver(1000, 2).then(() => {
            console.log('Test score submission completed');
        }).catch(err => {
            console.error('Test score submission failed:', err);
        });
    } else {
        console.log('Not authenticated - cannot test score submission');
    }
} else {
    console.log('handleGameOver function does not exist');
}
