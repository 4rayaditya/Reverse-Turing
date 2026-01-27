# Supabase Database Wake-Up Instructions

Your Supabase database is currently **paused**. Follow these steps to wake it up:

## Option 1: Wake Up Existing Supabase Database

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Login with your account

2. **Find Your Project**
   - Look for project: `pvjlovvejtmrpryybyvg`
   - Click on the project

3. **Wake Up the Database**
   - The dashboard should show a "Paused" status
   - Click the **"Restore"** or **"Unpause"** button
   - Wait 1-2 minutes for the database to wake up

4. **Get Connection Strings**
   - Go to **Settings** → **Database**
   - Copy the connection string
   - Update `.env` file with the correct connection string

5. **Test Connection**
   ```bash
   npx prisma db push
   ```

## Option 2: Create New Supabase Database (Recommended)

If you can't access the old one, create a fresh database:

### 1. Create New Project
1. Go to https://supabase.com/dashboard
2. Click **"New Project"**
3. Fill in:
   - **Name**: reverse-turing-poker
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **"Create new project"**
5. Wait ~2 minutes for setup

### 2. Get Connection Strings
1. Go to **Settings** → **Database**
2. Scroll to **Connection string**
3. Select **"URI"** tab
4. Copy both:
   - **Connection pooling** (for DATABASE_URL)
   - **Session mode** (for DIRECT_URL)

### 3. Update .env File
Replace in `.env`:
```env
DATABASE_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-xx-xxxx-x.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-xx-xxxx-x.pooler.supabase.com:5432/postgres"
```

### 4. Setup Database
```bash
# Push schema to Supabase
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Create test users
node scripts/create-test-users.js
```

### 5. Start Application
```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start Socket Server
node socket-server.js
```

## Current Connection String Format

Your `.env` should look like:
```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXTAUTH_SECRET="7a661c61d3a3c8383c03af2dd808c8bd3f45a16b538cd38ed0784a82b6054385"
NEXTAUTH_URL="http://localhost:3000"

SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE="your-service-role-key"
```

## Troubleshooting

### Error: "Can't reach database server"
- Database is paused → Wake it up in dashboard
- Wrong credentials → Check password in connection string
- Wrong project reference → Verify PROJECT-REF matches your project

### Error: "Tenant or user not found"
- Old project deleted → Create new project
- Wrong connection string format → Use format above

### Free Tier Pausing
Supabase free tier pauses databases after 1 week of inactivity. Solutions:
1. Wake it up when you need it
2. Upgrade to paid tier (~$25/month)
3. Keep Supabase active when needed
