# API Documentation

## Home

### Endpoint

`GET /`

### Description

Returns a simple welcome message

### Response

Plain text welcome message

### Example Response

```
Hello, BrainGrow AI!
```

## Search Videos

### Endpoint

`GET /search/<searchQuery>`

### Description

Searches for videos matching the given query in either title or tags

### Parameters

| Parameter   | Type   | Required | Description                         |
| ----------- | ------ | -------- | ----------------------------------- |
| searchQuery | string | Yes      | Search term to match against videos |

### Response

Returns JSON array of video objects with following fields:

- `id` (integer): Unique video identifier
- `title` (string): Video title
- `description` (string): Video description
- `url` (string): Video URL
- `tags` (string): Comma-separated tags
- `imageUrl` (string): Thumbnail URL

### Example Request

```bash
GET /search/python
```

### Example Response

```json
[
  {
    "id": 1,
    "title": "Python Tutorial",
    "description": "Learn Python basics",
    "url": "/videos/python-tutorial",
    "tags": "programming, python",
    "imageUrl": "/images/python-tutorial.jpg"
  }
]
```

## User Login

### Endpoint

`GET /login`

### Description

Authenticates user and returns JWT token

### Authentication

Basic Auth required (username and password in Authorization header)

### Response

- On success: JSON object with token and user info
- On failure: Error message with 401 status

### Success Response Fields

- `token` (string): JWT token for authenticated requests
- `user_id` (integer): Authenticated user ID
- `username` (string): Authenticated username

### Example Request

```bash
curl -u username:password http://localhost:5000/login
```

### Example Success Response

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": 1,
  "username": "testuser"
}
```

## User Profile

### Endpoint

`GET /profile`

### Description

Returns authenticated user's profile information

### Authentication

JWT token required in Authorization header

### Response

- On success: JSON object with user profile
- On failure: Error message with 401 status

### Success Response Fields

- `user_id` (integer): User ID
- `username` (string): Username
- `tendency` (string): User's learning tendency/preference
- `photoUrl` (string): URL to user's profile photo

### Example Request

```bash
curl -H "Authorization: <token>" http://localhost:5000/profile
```

### Example Success Response

```json
{
  "user_id": 1,
  "username": "testuser",
  "tendency": "visual",
  "photoUrl": "/profile/photo1.jpg"
}
```

### Error Responses

```json
{"error": "Authorization header missing"}
{"error": "Token has expired"}
{"error": "Invalid token"}
{"error": "Invalid credentials"}
```
