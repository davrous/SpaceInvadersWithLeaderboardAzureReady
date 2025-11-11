# API Contracts: User Leaderboard with Authentication

**Feature**: User Leaderboard with Authentication  
**Branch**: `001-user-leaderboard`  
**Created**: 2025-11-11

## Overview

This document defines the RESTful API contracts for the leaderboard feature. All endpoints follow REST conventions with JSON payloads and standard HTTP status codes.

**Base URL**: `http://localhost:3000` (development)  
**API Version**: v1  
**Content-Type**: `application/json`

---

## Authentication Endpoints

### 1. Initiate GitHub OAuth2 Flow

**Endpoint**: `GET /auth/github`

**Description**: Redirects user to GitHub OAuth2 authorization page.

**Authentication**: None (public endpoint)

**Request**: None (user clicks "Sign in with GitHub" button)

**Response**: `302 Redirect` to GitHub OAuth2 authorization URL

**Example**:
```
GET /auth/github
→ 302 Redirect to https://github.com/login/oauth/authorize?client_id=...
```

---

### 2. GitHub OAuth2 Callback

**Endpoint**: `GET /auth/github/callback`

**Description**: GitHub redirects here after user authorizes. Server exchanges code for tokens and creates/updates user.

**Authentication**: None (OAuth2 flow)

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from GitHub |
| `state` | string | Yes | CSRF protection token |

**Response**: `302 Redirect` to game page with session cookie set

**Success Flow**:
```
GET /auth/github/callback?code=abc123&state=xyz789
→ Server validates state, exchanges code for token
→ Fetches user profile from GitHub API
→ Creates/updates user in database
→ Sets session cookie
→ 302 Redirect to /
```

**Error Response**: `302 Redirect` to `/?auth_error=true`

---

### 3. Initiate Google OAuth2 Flow

**Endpoint**: `GET /auth/google`

**Description**: Redirects user to Google OAuth2 authorization page.

**Authentication**: None (public endpoint)

**Request**: None

**Response**: `302 Redirect` to Google OAuth2 authorization URL

---

### 4. Google OAuth2 Callback

**Endpoint**: `GET /auth/google/callback`

**Description**: Google redirects here after user authorizes.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from Google |
| `state` | string | Yes | CSRF protection token |

**Response**: `302 Redirect` to game page with session cookie set

---

### 5. Initiate Microsoft OAuth2 Flow

**Endpoint**: `GET /auth/microsoft`

**Description**: Redirects user to Microsoft OAuth2 authorization page.

**Authentication**: None (public endpoint)

**Request**: None

**Response**: `302 Redirect` to Microsoft OAuth2 authorization URL

---

### 6. Microsoft OAuth2 Callback

**Endpoint**: `GET /auth/microsoft/callback`

**Description**: Microsoft redirects here after user authorizes.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `code` | string | Yes | Authorization code from Microsoft |
| `state` | string | Yes | CSRF protection token |

**Response**: `302 Redirect` to game page with session cookie set

---

### 7. Get Current User Session

**Endpoint**: `GET /api/v1/auth/session`

**Description**: Returns currently authenticated user's information.

**Authentication**: Required (session cookie)

**Request**: None

**Success Response**: `200 OK`
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "space_ace",
    "provider": "github",
    "profile_picture_url": "https://avatars.githubusercontent.com/u/12345678"
  }
}
```

**Unauthenticated Response**: `200 OK`
```json
{
  "authenticated": false,
  "user": null
}
```

**Error Response**: `500 Internal Server Error`
```json
{
  "error": "Failed to retrieve session",
  "message": "An unexpected error occurred"
}
```

---

### 8. Sign Out

**Endpoint**: `POST /api/v1/auth/logout`

**Description**: Destroys the current user session.

**Authentication**: Optional (works whether authenticated or not)

**Request**: None

**Success Response**: `200 OK`
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Response**: `500 Internal Server Error`
```json
{
  "error": "Failed to logout",
  "message": "Session destruction failed"
}
```

---

## Leaderboard Endpoints

### 9. Get Global Leaderboard

**Endpoint**: `GET /api/v1/leaderboard`

**Description**: Returns top 100 players ranked by best score.

**Authentication**: None (public endpoint)

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 100 | Number of entries to return (1-100) |
| `offset` | integer | No | 0 | Pagination offset |

**Success Response**: `200 OK`
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": 1,
      "username": "space_ace",
      "profile_picture_url": "https://avatars.githubusercontent.com/u/12345678",
      "best_score": 89500,
      "best_level": 15,
      "last_played": "2025-11-11T14:45:23Z"
    },
    {
      "rank": 2,
      "user_id": 2,
      "username": "alien_hunter",
      "profile_picture_url": null,
      "best_score": 72300,
      "best_level": 12,
      "last_played": "2025-11-10T09:20:15Z"
    }
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

**Empty Response**: `200 OK`
```json
{
  "leaderboard": [],
  "total": 0,
  "limit": 100,
  "offset": 0
}
```

**Error Response**: `500 Internal Server Error`
```json
{
  "error": "Failed to fetch leaderboard",
  "message": "Database query failed"
}
```

---

### 10. Submit Score

**Endpoint**: `POST /api/v1/scores`

**Description**: Submit a new score for the authenticated user.

**Authentication**: Required (session cookie)

**Request Body**:
```json
{
  "score": 15750,
  "level_reached": 8,
  "session_id": "a3f5c8e2-9b4d-4a1c-8f6e-2d9c7b4a1e8f"
}
```

**Request Schema**:
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `score` | integer | Yes | 0 ≤ score ≤ 999999 | The score achieved |
| `level_reached` | integer | Yes | level ≥ 1 | Highest level reached |
| `session_id` | string | Yes | UUID v4 format | Unique game session identifier |

**Success Response**: `201 Created`
```json
{
  "success": true,
  "score": {
    "id": 42,
    "user_id": 1,
    "score": 15750,
    "level_reached": 8,
    "submitted_at": "2025-11-11T14:45:23Z"
  },
  "leaderboard_position": {
    "rank": 5,
    "is_new_personal_best": true,
    "previous_best": 12500
  }
}
```

**Error Responses**:

**401 Unauthorized** (not authenticated):
```json
{
  "error": "Authentication required",
  "message": "You must be signed in to submit scores"
}
```

**400 Bad Request** (validation failed):
```json
{
  "error": "Invalid score data",
  "message": "Score must be between 0 and 999,999",
  "field": "score"
}
```

**409 Conflict** (duplicate session):
```json
{
  "error": "Duplicate submission",
  "message": "This score has already been submitted"
}
```

**429 Too Many Requests** (rate limited):
```json
{
  "error": "Rate limit exceeded",
  "message": "Please wait before submitting another score",
  "retry_after": 45
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to submit score",
  "message": "Database error occurred"
}
```

---

### 11. Get User Statistics

**Endpoint**: `GET /api/v1/users/:userId/stats`

**Description**: Get statistics for a specific user (total games, best score, average, etc.)

**Authentication**: Optional (public for any user, enhanced data if viewing own profile)

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | integer | Yes | User ID to fetch stats for (use 'me' for current user) |

**Success Response**: `200 OK`
```json
{
  "user": {
    "id": 1,
    "username": "space_ace",
    "profile_picture_url": "https://avatars.githubusercontent.com/u/12345678"
  },
  "stats": {
    "total_games": 47,
    "best_score": 89500,
    "average_score": 35200,
    "first_game": "2025-10-15T08:30:00Z",
    "last_game": "2025-11-11T14:45:23Z",
    "leaderboard_rank": 1,
    "percentile": 95
  }
}
```

**Error Responses**:

**404 Not Found** (user doesn't exist):
```json
{
  "error": "User not found",
  "message": "No user with ID 999"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Failed to fetch stats",
  "message": "Database error occurred"
}
```

---

### 12. Get User's Recent Scores

**Endpoint**: `GET /api/v1/users/:userId/scores`

**Description**: Get recent score history for a specific user.

**Authentication**: Optional (public for top 10 scores, full history if viewing own profile)

**Path Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | integer | Yes | User ID (use 'me' for current user) |

**Query Parameters**:
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | integer | No | 10 | Number of scores to return |

**Success Response**: `200 OK`
```json
{
  "user_id": 1,
  "username": "space_ace",
  "scores": [
    {
      "id": 105,
      "score": 89500,
      "level_reached": 15,
      "submitted_at": "2025-11-11T14:45:23Z",
      "is_personal_best": true
    },
    {
      "id": 104,
      "score": 75000,
      "level_reached": 13,
      "submitted_at": "2025-11-10T18:20:15Z",
      "is_personal_best": false
    }
  ],
  "total": 47
}
```

**Error Responses**:

**404 Not Found**:
```json
{
  "error": "User not found",
  "message": "No user with ID 999"
}
```

---

## Error Response Format

All error responses follow a consistent format:

```json
{
  "error": "Error category",
  "message": "Human-readable error description",
  "field": "fieldName",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `AUTH_REQUIRED` | 401 | User must be authenticated |
| `INVALID_SESSION` | 401 | Session expired or invalid |
| `FORBIDDEN` | 403 | User doesn't have permission |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Request data validation failed |
| `DUPLICATE_ENTRY` | 409 | Resource already exists (e.g., duplicate session_id) |
| `RATE_LIMIT` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## HTTP Status Codes

| Status Code | Usage |
|-------------|-------|
| `200 OK` | Successful GET request |
| `201 Created` | Successful POST request (resource created) |
| `204 No Content` | Successful DELETE request |
| `302 Found` | OAuth2 redirects |
| `400 Bad Request` | Invalid request data |
| `401 Unauthorized` | Authentication required |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | Resource conflict (duplicate) |
| `429 Too Many Requests` | Rate limit exceeded |
| `500 Internal Server Error` | Server-side error |

---

## Authentication

### Session-Based Authentication

All authenticated endpoints require a session cookie:

**Cookie Name**: `connect.sid`  
**Attributes**: `HttpOnly`, `Secure` (production), `SameSite=Strict`  
**Expiration**: 24 hours of inactivity

### Checking Authentication Status

Clients can check authentication by calling `GET /api/v1/auth/session` and checking the `authenticated` field.

### Handling Authentication Errors

If an API call returns `401 Unauthorized`, the client should:
1. Display a "Sign in to continue" message
2. Provide buttons for GitHub/Google/Microsoft sign-in
3. After successful sign-in, retry the original request

---

## Rate Limiting

### Score Submission

- **Limit**: 1 submission per 60 seconds per user
- **Response**: `429 Too Many Requests` with `retry_after` field (seconds)
- **Header**: `Retry-After: 45`

### Leaderboard Queries

- **Limit**: 60 requests per minute per IP address
- **Response**: `429 Too Many Requests`
- **Header**: `X-RateLimit-Remaining: 0`

---

## CORS Configuration

### Allowed Origins

- Development: `http://localhost:3000`, `http://127.0.0.1:3000`
- Production: Configured via environment variable

### Allowed Methods

`GET`, `POST`, `DELETE`

### Allowed Headers

`Content-Type`, `Authorization`

### Credentials

`credentials: true` (allows cookies)

---

## Example Client Usage

### Fetch Leaderboard (Vanilla JavaScript)

```javascript
async function fetchLeaderboard() {
    try {
        const response = await fetch('/api/v1/leaderboard');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        return data.leaderboard;
    } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        return [];
    }
}
```

### Submit Score (Vanilla JavaScript)

```javascript
async function submitScore(score, level, sessionId) {
    try {
        const response = await fetch('/api/v1/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Include session cookie
            body: JSON.stringify({
                score: score,
                level_reached: level,
                session_id: sessionId
            })
        });
        
        if (response.status === 401) {
            // Not authenticated
            return { error: 'auth_required' };
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Failed to submit score:', error);
        throw error;
    }
}
```

### Check Authentication Status

```javascript
async function checkAuth() {
    try {
        const response = await fetch('/api/v1/auth/session', {
            credentials: 'include'
        });
        const data = await response.json();
        return data.authenticated ? data.user : null;
    } catch (error) {
        console.error('Failed to check auth:', error);
        return null;
    }
}
```

---

## Testing Endpoints

### Manual Testing with curl

**Fetch leaderboard**:
```bash
curl http://localhost:3000/api/v1/leaderboard
```

**Submit score (requires authenticated session)**:
```bash
curl -X POST http://localhost:3000/api/v1/scores \
  -H "Content-Type: application/json" \
  -b "connect.sid=your_session_cookie" \
  -d '{"score": 50000, "level_reached": 10, "session_id": "unique-uuid-here"}'
```

**Check session**:
```bash
curl http://localhost:3000/api/v1/auth/session \
  -b "connect.sid=your_session_cookie"
```

---

## Summary

This API provides:
- ✅ **OAuth2 authentication** with 3 providers (GitHub, Google, Microsoft)
- ✅ **Leaderboard queries** (public, no auth required)
- ✅ **Score submission** (authenticated users only)
- ✅ **User statistics** (public with enhanced data for own profile)
- ✅ **Session management** (secure cookies, 24-hour expiry)
- ✅ **Error handling** (consistent format, clear messages)
- ✅ **Rate limiting** (prevent abuse)

Next: Create quickstart guide for developers.
