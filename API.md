# API

## Types

### `AuthLevel`
- 0 - Unverified
- 1 - Applicant
- 2 - Attendee
- 3 - Volunteer
- 4 - Organiser

### `APIUser`

- `authId`: string - the ID of the user under hs_auth
- `discordId`: string - the ID of the linked Discord account
- `authLevel`: **AuthLevel**
- `email`: string - the user's email
- `name`: string - the user's name
- `team?`: string - the user's team, if they're in one

### `APITeam`

- `authId`: string - the ID of the team under hs_auth
- `name`: string - the name of the team
- `creator`: string - the hs_auth ID of the creator of the team
- `teamNumber`: number - the team number in Discord (starts at 1)

## Routes

### `GET /api/v1/users`

Returns `APIUser[]`, i.e.

**Response:**
```js
{
    "users": [
        {
            "authId": "5e5d7b8d22683803b4819963",
            "discordId": "66464597281380173",
            "authLevel": 4,
            "email": "am...@gmail.com",
            "name": "Test",
            "team": "5e615dsf22686h03b481874f"
        },
        // ...
    ]
}
```

### `PUT /api/v1/users`

Links a HackerSuite account to a Discord account. If there are any links involving either of the given IDs, these links will be deleted and the new link will replace them.

**Request (JSON body):**

- `discordId`: string
- `authId`: string
- `full?`: boolean - if true, then a full APIUser will be returned.

**Response:**
```js
{
    "user": {
        "authId": "5e5d7b8d22683803b4819963",
        "discordId": "66464597281380173",
        // the following properties are ONLY provided if full: true is passed in the request body!
        "authLevel": 4,
        "email": "am...@gmail.com",
        "name": "Test",
        "team": "5e615dsf22686h03b481874f"
    }
}
```

### `GET /api/v1/users/:id`

Returns `APIUser` for the user with the given Discord ID. If one cannot be found, then the response is a 404
with a null user property.

**Response (200):**
```js
{
    "user": {
        "authId": "5e5d7b8d22683803b4819963",
        "discordId": "66464597281380173",
        // the following properties are ONLY provided if full: true is passed in the request body!
        "authLevel": 4,
        "email": "am...@gmail.com",
        "name": "Test",
        "team": "5e615dsf22686h03b481874f"
    }
}
```

**Response (404):**
```js
{
    "user": null
}
```

### `DELETE /api/v1/users/:id`

Deletes the user with the given Discord ID. If the user didn't exist in the first place, then the API
will still respond normally.

The response is an empty JSON object.

**Response:**
```js
{}
```

### `GET /api/v1/teams`

Returns `APITeam[]` of all the linked teams, i.e.

**Response:**
```js
{
    "teams": [
        {
            "authId": "5e615c6a22664303b48199cf",
            "creator": "5e615a6a22664303b48199df",
            "name": "Team Name Here",
            "teamNumber": 1
        },
        // ...
    ]
}
```