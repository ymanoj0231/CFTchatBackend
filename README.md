# Chat Backend API

A REST API built with **Node.js, TypeScript, Express, MySQL, and Firebase Cloud Firestore**.

- **MySQL:** users, one-to-one chat records, and chat membership.
- **Cloud Firestore:** messages, read receipts, and per-user last-seen positions.
- **Express + TypeScript:** API layer and application logic.
- **Zod:** request validation.

> This README describes the current learning/assignment implementation. Authentication, group chats, message editing/deletion, and real-time delivery are not included unless you have added them separately.

## 1. Prerequisites

Install:

- Node.js 20 or a supported LTS release
- npm
- MySQL Server 8.x (or compatible) and MySQL Workbench
- A Google account for Firebase
- Postman or curl
- Git (if cloning the repository)

Verify Node and npm:

```bash
node --version
npm --version
```

## 2. Get the project and install dependencies

If you already have the source, open its root directory. Otherwise:

```bash
git clone <YOUR_REPOSITORY_URL>
cd <YOUR_PROJECT_DIRECTORY>
```

Install packages:

```bash
npm install
```

Expected scripts in `package.json`:

```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  }
}
```

Preserve any other scripts already present in your project.

## 3. Set up MySQL

Open MySQL Workbench and execute the following SQL.

### 3.1 Create the database

```sql
CREATE DATABASE chat_backend
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chat_backend;
```

### 3.2 Create users

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
);
```

### 3.3 Create chats

The normalized user pair and unique constraint prevent duplicate one-to-one chats when users are supplied in reverse order.

```sql
CREATE TABLE chats (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_low_id BIGINT UNSIGNED NOT NULL,
    user_high_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_chat_user_pair (user_low_id, user_high_id),
    CONSTRAINT fk_chats_user_low
        FOREIGN KEY (user_low_id) REFERENCES users(id),
    CONSTRAINT fk_chats_user_high
        FOREIGN KEY (user_high_id) REFERENCES users(id),
    CONSTRAINT chk_chat_user_order
        CHECK (user_low_id < user_high_id)
);
```

### 3.4 Create chat_members

```sql
CREATE TABLE chat_members (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    chat_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_chat_member (chat_id, user_id),
    KEY idx_user_chats (user_id, chat_id),
    CONSTRAINT fk_chat_members_chat
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_members_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Verify:

```sql
SHOW TABLES;
```

You should see `users`, `chats`, and `chat_members`.

### 3.5 Create an application database account

Use a dedicated account instead of the MySQL root account. Replace the placeholder password with a strong unique password:

```sql
CREATE USER 'chat_app_user'@'%' IDENTIFIED BY '<STRONG_DATABASE_PASSWORD>';

GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP
ON chat_backend.*
TO 'chat_app_user'@'%';

FLUSH PRIVILEGES;
```

Restrict the account host and network access appropriately for your environment. Do not expose MySQL publicly.

## 4. Set up Firebase Firestore

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Create a Firebase project.
3. Open **Build → Firestore Database** and create a database.
4. Choose an appropriate database location.
5. Open **Project settings → Service accounts**.
6. Generate a new private key and download the JSON file.
7. Place it at the project path:

```text
secrets/firebase-service-account.json
```

The `secrets` directory should be in the project root.

**Security:** The service-account file contains private credentials. Never commit it, publish it, or share it. In production, prefer a managed identity or securely injected credentials rather than a downloaded key file.

### Firestore document layout

```text
chats/{chatId}/messages/{messageId}
    senderId
    text
    createdAt

chats/{chatId}/messages/{messageId}/readReceipts/{userId}
    userId
    readAt

chats/{chatId}/lastSeen/{userId}
    userId
    lastSeenMessageId
    lastSeenAt
```

Timestamps are stored as Firestore timestamps. A user's read receipt is stored under a document whose ID is that user's ID, so repeated writes update the same receipt.

## 5. Configure environment variables

Create `.env` in the project root:

```env
PORT=3000

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=chat_app_user
MYSQL_PASSWORD=<STRONG_DATABASE_PASSWORD>
MYSQL_DATABASE=chat_backend

FIREBASE_SERVICE_ACCOUNT_PATH=secrets/firebase-service-account.json
```

Change the values to match your local setup.

### If Node runs in WSL and MySQL runs on Windows

Inside WSL, `127.0.0.1` may not point to the Windows MySQL server. Find the Windows host/gateway address:

```bash
ip route | awk '/default/ {print $3}'
```

Use the reachable Windows host address as `MYSQL_HOST`, then test connectivity (install netcat if necessary):

```bash
nc -vz <WINDOWS_HOST_ADDRESS> 3306
```

Ensure MySQL accepts connections from WSL and Windows Firewall allows the connection. Do not expose port 3306 to untrusted networks.

### Protect secrets with .gitignore

Ensure `.gitignore` contains:

```gitignore
node_modules/
dist/
.env
secrets/
```

Never commit database passwords or Firebase private keys.

## 6. Project structure

The current project follows a layered architecture. Your repository may contain additional files:

```text
project-root/
├── secrets/
│   └── firebase-service-account.json
├── src/
│   ├── config/
│   │   ├── firebase.ts
│   │   └── mysql.ts
│   ├── controllers/
│   │   ├── chat.controller.ts
│   │   └── user.controller.ts
│   ├── repositories/
│   │   ├── chat.repository.ts
│   │   └── user.repository.ts
│   ├── services/
│   │   ├── chat.service.ts
│   │   ├── message.service.ts
│   │   └── user.service.ts
│   ├── routes/
│   │   └── chat.routes.ts
│   ├── types/
│   │   ├── chat.types.ts
│   │   ├── message.types.ts
│   │   └── user.types.ts
│   ├── app.ts
│   └── server.ts
├── .env
├── .gitignore
├── package.json
└── tsconfig.json
```

## 7. Run the application

Start in development mode:

```bash
npm run dev
```

The API should listen at:

```text
http://localhost:3000
```

If the health endpoint is configured:

```bash
curl http://localhost:3000/health
```

Compile TypeScript:

```bash
npm run build
```

Run the compiled application:

```bash
npm start
```

## 8. API reference

Base URL: `http://localhost:3000`

All request bodies are JSON.

### 8.1 Create user

**POST** `/user/create`

```json
{
  "name": "Manoj Kumar",
  "email": "manoj@example.com"
}
```

Success: `201 Created`. Duplicate email: `409 Conflict`.

### 8.2 Create or get a one-to-one chat

**POST** `/chat/create`

```json
{
  "userAId": 1,
  "userBId": 2
}
```

The pair is normalized, so `(1, 2)` and `(2, 1)` identify the same chat. The response includes `chatId` and `isNew`.

### 8.3 Send a message

**POST** `/chat/:chatId/message/send`

Example: `/chat/1/message/send`

```json
{
  "senderId": 1,
  "text": "Hello Sarah!"
}
```

Success: `201 Created`. The sender must be a member of the chat. Text is validated and limited to 5,000 characters.

### 8.4 Get messages

**GET** `/chat/:chatId/messages?limit=50`

- `limit` is optional.
- Default: `50`.
- Valid range: `1`–`100`.
- The service fetches the latest N messages and returns them oldest-to-newest within that result set.

### 8.5 Mark a message as read

**POST** `/chat/:chatId/message/:messageId/read`

```json
{
  "userId": 2
}
```

The user must be a chat member. The sender cannot mark their own message as read.

### 8.6 Update last seen

**POST** `/chat/:chatId/lastseen`

```json
{
  "userId": 2,
  "messageId": "FIRESTORE_MESSAGE_ID"
}
```

The user must be a chat member and the message must exist in that chat.

### 8.7 List a user's chats

**GET** `/user/:userId/chats`

Example: `/user/1/chats`

Returns each chat's ID, member IDs, and creation time. A valid user with no chats should receive an empty `data` array.

## 9. Test with Postman

1. Start the server with `npm run dev`.
2. Import the project's Postman collection JSON.
3. Set `baseUrl` to `http://localhost:3000`.
4. Create two users using `POST /user/create`, or use existing user IDs.
5. Set the `userAId` and `userBId` collection variables to those IDs.
6. Run **Create or Get Chat** and capture the returned `chatId`.
7. Send a message from each user and retain the returned Firestore message IDs.
8. Retrieve messages.
9. Mark the other participant's message as read.
10. Update last seen with a message ID belonging to that chat.
11. List chats for both users.

If your Postman collection predates the Create User endpoint, add a request for `POST {{baseUrl}}/user/create`.

## 10. Recommended test cases

| Feature | Scenario | Expected result |
|---|---|---|
| User | Valid name and email | `201` |
| User | Duplicate email | `409` |
| User | Invalid email or missing name | `400` |
| Chat | Two valid distinct users | Chat returned |
| Chat | Same user on both sides | `400` |
| Chat | Non-existent user | `404` |
| Message | Chat member sends message | `201` |
| Message | Non-member sends message | `403` |
| Message | Empty or oversized text | `400` |
| Get messages | Default limit | Up to 50 messages |
| Get messages | Limit 0 or above 100 | `400` |
| Read receipt | Member reads another user's message | `200` |
| Read receipt | Sender marks own message read | `400` |
| Read receipt | Non-member | `403` |
| Read receipt | Missing message | `404` |
| Last seen | Valid member and message | `200` |
| Last seen | Non-member | `403` |
| Last seen | Missing message | `404` |
| List chats | Existing user | `200` |
| List chats | User with no chats | `200`, empty list |
| List chats | Unknown user | `404` |