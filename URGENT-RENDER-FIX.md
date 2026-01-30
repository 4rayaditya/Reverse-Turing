# 🚨 URGENT: Fix Render Database Connection

## The Problem
Your Render service is using the wrong DATABASE_URL. The error shows it's trying to connect to:
```
aws-1-ap-south-1.pooler.supabase.com:6543
```

But your actual Supabase project is at:
```
db.pvjlovvejtmrpryybyvg.supabase.co
```

## What You Need To Do RIGHT NOW

### Step 1: Get the Correct Pooler Connection String

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/pvjlovvejtmrpryybyvg
2. **Click "Settings"** in the left sidebar
3. **Click "Database"** in the settings menu
4. **Scroll down to "Connection string"**
5. **Change the dropdown from "Direct connection" to "Transaction pooler"**
6. **Copy the connection string** - it should look like:
   ```
   postgresql://postgres.pvjlovvejtmrpryybyvg:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

### Step 2: Update Render Environment Variable

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Select your service**: `reverse-turing-socket`
3. **Go to the "Environment" tab**
4. **Find the DATABASE_URL variable**
5. **Replace it with the pooler connection string from Step 1**
6. **Add `?pgbouncer=true` to the end** of the URL
7. **Click "Save Changes"**

### Step 3: Verify the Region

Your connection string should **NOT** contain `aws-1-ap-south-1` (that's Mumbai/Asia Pacific).

Common correct regions:
- `aws-0-us-east-1` (US East)
- `aws-0-us-west-1` (US West) 
- `aws-0-eu-west-1` (EU Ireland)

## Expected Final DATABASE_URL Format

```
postgresql://postgres.pvjlovvejtmrpryybyvg:[PASSWORD]@aws-0-[CORRECT-REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

## After You Fix It

You should see these logs in Render:
```
[ENV] DATABASE_URL configured: postgresql://postgres.****@aws-...
[DB] PgBouncer detected - prepared statements disabled
Socket.io server listening on 0.0.0.0:3003
```

**Do this now - your socket server can't connect to the database until you update the DATABASE_URL on Render!**