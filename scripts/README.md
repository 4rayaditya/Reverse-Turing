# Database Management Scripts

These scripts allow you to manage users and game data directly, both locally and on production (hosted sites).

## Setup for Production Use

To run these scripts against your **production database** (Supabase):

1. Create a `.env.production` file:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres"
```

2. Run scripts with production env:
```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.pvjlovvejtmrpryybyvg.supabase.co:5432/postgres"; node scripts/list-users.js

# Or temporarily modify .env before running
```

## Available Scripts

### 1. List All Users
```bash
node scripts/list-users.js
```
Shows all users with their points, games played, wins, and admin status.

### 2. Add New User
```bash
# Regular user
node scripts/add-user.js email@example.com "User Name"

# Admin user
node scripts/add-user.js admin@example.com "Admin Name" true
```
Creates a new user with default password: `password123` (user should change after login)

### 3. Delete User
```bash
node scripts/delete-user.js email@example.com
```
Permanently removes a user from the database.

### 4. Clear All Player Data
```bash
node scripts/clear-player-data.js
```
Resets ALL users to initial state:
- Points: 1000
- Games Played: 0
- Wins: 0

**⚠️ WARNING:** This affects all users! Use with caution.

### 5. Make User Admin
```bash
node scripts/make-admin.js email@example.com
```
Grants admin privileges to a user.

### 6. Create Test Users
```bash
node scripts/create-test-users.js
```
Creates multiple test users for development/testing.

## Production Workflow

### To affect hosted sites (Vercel/Render):

1. **Check current production data:**
```bash
DATABASE_URL="your-production-url" node scripts/list-users.js
```

2. **Add users to production:**
```bash
DATABASE_URL="your-production-url" node scripts/add-user.js player@test.com "Player One"
```

3. **Clear production player data:**
```bash
DATABASE_URL="your-production-url" node scripts/clear-player-data.js
```

4. **Make someone admin in production:**
```bash
DATABASE_URL="your-production-url" node scripts/make-admin.js user@email.com
```

## Restarting Finished Games

Games are stored **in-memory** on the socket server, so they reset when the server restarts.

### To restart a finished game:

**Option 1: Restart the socket server** (Render)
```bash
# Go to Render dashboard → Your socket server → Manual Deploy → "Deploy Latest Commit"
# Or click "Restart Service"
```

**Option 2: Reset specific pool** (if game still in memory)
- Use the admin panel in your web app
- Or emit `reset_pool` event with admin credentials

**Option 3: Clear all in-memory games**
- Restart the socket server (see Option 1)
- All games will be cleared and players can create new pools

### To make players rejoin:
- Players automatically leave pools when they disconnect
- They can create new pools or join existing ones
- **Fixed:** Players can now join multiple pools without "already in a game" error

## Environment Variables

Make sure your `.env` file has:
```env
DATABASE_URL="your-database-connection-string"
NEXTAUTH_SECRET="your-secret"
```

For production operations, temporarily set `DATABASE_URL` to your production database URL before running scripts.

## Safety Tips

- **Always backup** before running destructive operations (clear-player-data, delete-user)
- Test scripts locally first before running on production
- Use `list-users.js` to verify changes after running scripts
- Keep production DATABASE_URL secure and don't commit it to git
