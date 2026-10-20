# Teacher Session Booking API

A small REST API for creating users, creating teacher availability, booking sessions, completing booked sessions, and viewing a user's upcoming and completed sessions.

## Technology stack

- Node.js
- TypeScript
- Express
- MongoDB and Mongoose
- dotenv for environment variables

The API intentionally has no authentication, frontend, teacher-management endpoint, or unrelated features. Teachers are inserted using the included seed script.

## Prerequisites

1. Node.js 20 or newer and npm.
2. MongoDB running locally, or a MongoDB connection URI (for example, a MongoDB Atlas URI).
3. Postman, if you want to run the included collection.

## Installation and configuration

```bash
npm install
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

Edit `.env`:

```env
PORT=5000
MONGODB_URI="your db url"
NODE_ENV="development"
```

For a local database, start MongoDB and keep the URI shown above. For MongoDB Atlas or another hosted database, set `MONGODB_URI` to the connection URI supplied by that service. Keep credentials in `.env`; do not commit it. `.env.example` is safe to commit.

The server waits for MongoDB to connect before it starts listening for requests.

## Seed a teacher for local testing

There is deliberately no teacher creation endpoint. After setting `.env`, run:

```bash
npm run seed:teachers
```

The script inserts or updates a sample teacher named **Priya Sharma** (`priya.sharma@example.com`) and prints the teacher's MongoDB ID. Copy that ID into the Postman collection's `teacherId` variable before creating sessions. The seed operation is idempotent for this email address.

## Run the API

Development mode with automatic reload:

```bash
npm run dev
```

Compile the TypeScript project:

```bash
npm run build
```

Run the compiled server:

```bash
npm start
```

The compiled seed script is available after building:

```bash
npm run seed:teachers:build
```

The API listens on `http://localhost:5000` by default. Build output is written to `dist/`.

## API response format

Most successful responses use this structure:

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "_id": "671a12345678901234567890",
    "fullName": "Rahul Kumar",
    "email": "rahul@example.com",
    "phone": "9876543210"
  }
}
```

Errors use a consistent structure:

```json
{
  "success": false,
  "message": "A clear error message"
}
```

The user-session endpoint returns exactly the requested `success` plus `data` grouping. Internal stack traces and database credentials are not returned to clients.

## Endpoints

### 1. Create user

`POST /users`

Request:

```json
{
  "fullName": "Rahul Kumar",
  "email": "rahul@example.com",
  "phone": "9876543210"
}
```

Returns **201 Created**. Emails are trimmed and lowercased before insertion; a database unique index prevents duplicate emails. Duplicate-email errors return **409 Conflict**. Missing or invalid fields return **400 Bad Request**.

### 2. Create session

`POST /sessions`

Request:

```json
{
  "teacherId": "671a22345678901234567890",
  "startTime": "2026-10-25T10:00:00.000Z",
  "endTime": "2026-10-25T11:00:00.000Z"
}
```

Returns **201 Created**. The teacher must already exist (**404** otherwise), dates must be valid, and `endTime` must be later than `startTime` (**400** otherwise). The API sets `status` to `AVAILABLE`, `userId` to `null`, and `completedAt` to `null`; client-supplied values for those fields are ignored.

Example success response (IDs shortened for readability):

```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "_id": "671a33345678901234567890",
    "teacherId": "671a22345678901234567890",
    "userId": null,
    "startTime": "2026-10-25T10:00:00.000Z",
    "endTime": "2026-10-25T11:00:00.000Z",
    "status": "AVAILABLE",
    "completedAt": null
  }
}
```

### 3. Get available sessions for a date

`GET /sessions/available?dateTimestamp=1792886400000`

`dateTimestamp` is required and represents **Unix time in milliseconds**. The selected instant determines a **UTC calendar date**; the API returns `AVAILABLE` sessions whose `startTime` is in the half-open UTC interval `[00:00:00.000Z, next day 00:00:00.000Z)`, sorted by `startTime` ascending. Invalid timestamps return **400**. No matches produce an empty `data` array.

This endpoint uses `Session.aggregate()` with `$match` and `$sort`, not `find()`.

Example response:

```json
{
  "success": true,
  "message": "Available sessions fetched successfully",
  "data": [
    {
      "_id": "671a33345678901234567890",
      "teacherId": "671a22345678901234567890",
      "userId": null,
      "startTime": "2026-10-25T10:00:00.000Z",
      "endTime": "2026-10-25T11:00:00.000Z",
      "status": "AVAILABLE",
      "completedAt": null
    }
  ]
}
```

### 4. Book a session

`POST /sessions/:id/book`

Request:

```json
{
  "userId": "671a12345678901234567890"
}
```

Only an existing user can book an existing `AVAILABLE` session. On success the API stores the user's ID and changes status to `BOOKED` (**200**). Invalid IDs or input return **400**; a missing user or session returns **404**; an already booked or otherwise unavailable session returns **409**.

Booking uses one atomic `findOneAndUpdate()` whose filter includes `_id` and `status: "AVAILABLE"`. This ensures that simultaneous requests cannot both book the same session.

Example success response (IDs shortened for readability):

```json
{
  "success": true,
  "message": "Session booked successfully",
  "data": {
    "_id": "671a33345678901234567890",
    "teacherId": "671a22345678901234567890",
    "userId": "671a12345678901234567890",
    "status": "BOOKED",
    "completedAt": null
  }
}
```

### 5. Mark a session complete

`PATCH /sessions/:id/complete`

No request body is needed. Only a `BOOKED` session can transition to `COMPLETED`. The API sets `completedAt` to the current time and returns the updated session (**200**). Invalid IDs return **400**; missing sessions return **404**; available or already completed sessions return **409**.

Completion also uses an atomic conditional `findOneAndUpdate()` filtered by `_id` and `status: "BOOKED"`.

Example success response (IDs shortened for readability):

```json
{
  "success": true,
  "message": "Session marked as completed successfully",
  "data": {
    "_id": "671a33345678901234567890",
    "teacherId": "671a22345678901234567890",
    "userId": "671a12345678901234567890",
    "status": "COMPLETED",
    "completedAt": "2026-10-25T11:00:00.000Z"
  }
}
```

### 6. Get a user's sessions

`GET /users/:id/sessions`

Returns **200** for an existing user, **400** for an invalid user ID, and **404** if the user does not exist.

```json
{
  "success": true,
  "data": {
    "upcomingSessions": [],
    "completedSessions": []
  }
}
```

- `upcomingSessions`: this user's `BOOKED` sessions with `startTime >= now`, sorted by `startTime` ascending.
- `completedSessions`: this user's `COMPLETED` sessions, sorted by `completedAt` descending.

This endpoint verifies the user exists, then uses one `Session.aggregate()` pipeline containing `$match` by `userId` and `$facet` to build both arrays. A past session that remains `BOOKED` appears in neither array until completed; this follows the assignment's explicit definitions.

## Session lifecycle and data model

The only valid lifecycle is:

```text
AVAILABLE -> BOOKED -> COMPLETED
```

The API does not allow booking `BOOKED`/`COMPLETED` sessions or completing `AVAILABLE`/`COMPLETED` sessions. The three Mongoose models are `User`, `Teacher`, and `Session`; all have automatic `createdAt` and `updatedAt` timestamps. The schema declares references, status validation, and indexes for availability, per-user session lists, and teacher schedules.

## Postman collection

Import `postman/teacher-session-booking-api.json` into Postman. The collection includes all six endpoints plus negative cases for duplicate email, invalid date range, missing teacher/user, completing an available session, and repeated booking.

Before running the collection:

1. Start MongoDB and run `npm run seed:teachers`.
2. Set the collection variable `baseUrl` to your API URL (default `http://localhost:5000`).
3. Replace the collection variable `teacherId` with the ID printed by the seed script.
4. Run the **Happy Path** folder in order. The collection saves `userId` and `sessionId` from successful responses.
5. Run **Failure Scenarios** after the happy path. The duplicate email and invalid-state requests expect error responses.

The example Postman dates are deliberately set in 2099 so the sample sessions remain in the future for the upcoming-session definition. The collection's `dateTimestamp` is midnight UTC on the date of its primary session. Change both the session's `startTime`/`endTime` and `dateTimestamp` together if you want to test another date. The teacher ID is a placeholder until you replace it with the seeded teacher's actual ID.

## Verification notes

Run `npm run build` to verify TypeScript compilation. API integration and concurrent booking behavior require a reachable MongoDB instance; the project does not include a bundled database server. To test concurrency, send two `POST /sessions/:id/book` requests for the same available session at the same time: one should succeed and the other should return **409 Conflict**.
