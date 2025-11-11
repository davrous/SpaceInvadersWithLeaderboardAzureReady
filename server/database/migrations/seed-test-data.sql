-- ============================================================================
-- Sample Data for Testing
-- Purpose: Seed database with test users and scores for development
-- Usage: Run after schema.sql
-- ============================================================================

-- Insert test users
INSERT INTO users (provider, provider_id, username, email, profile_picture_url)
VALUES 
    ('github', 'test1', 'SpaceAce', 'spaceace@example.com', 'https://via.placeholder.com/64'),
    ('google', 'test2', 'AlienHunter', 'alienhunter@example.com', 'https://via.placeholder.com/64'),
    ('microsoft', 'test3', 'RetroGamer', 'retrogamer@example.com', 'https://via.placeholder.com/64')
ON CONFLICT(provider, provider_id) DO NOTHING;

-- Insert test scores
INSERT INTO scores (user_id, score, level_reached, session_id)
VALUES 
    -- SpaceAce's scores
    (1, 89500, 15, '00000000-0000-0000-0000-000000000001'),
    (1, 75000, 13, '00000000-0000-0000-0000-000000000002'),
    (1, 50000, 10, '00000000-0000-0000-0000-000000000003'),
    -- AlienHunter's scores
    (2, 72300, 12, '00000000-0000-0000-0000-000000000004'),
    (2, 65000, 11, '00000000-0000-0000-0000-000000000005'),
    (2, 58000, 9, '00000000-0000-0000-0000-000000000006'),
    -- RetroGamer's scores
    (3, 45000, 8, '00000000-0000-0000-0000-000000000007'),
    (3, 40000, 7, '00000000-0000-0000-0000-000000000008'),
    (3, 35000, 6, '00000000-0000-0000-0000-000000000009'),
    (3, 30000, 5, '00000000-0000-0000-0000-000000000010')
ON CONFLICT(session_id) DO NOTHING;
