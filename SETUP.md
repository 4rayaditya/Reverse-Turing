# Setup Instructions

## 1. Configure Supabase
Ensure your Supabase database credentials are set in `.env`.

## 2. Push Schema & Generate Prisma Client
```bash
npm run db:push
```

## 3. Create Test Users
```bash
node scripts/create-test-users.js
```

## 4. Start the Development Server
```bash
npm run dev
```

## 5. Start the Socket Server (in a separate terminal)
```bash
node socket-server.js
```

## Test Users Created
- player1@test.com / password123
- player2@test.com / password123
- player3@test.com / password123
- player4@test.com / password123
- player5@test.com / password123
- player6@test.com / password123

All test users have 1000 points and are NOT admins.
