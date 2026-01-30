# URGENT: Fix Render Database Connection

## Error on Render
```
FATAL: Tenant or user not found
```

## Root Cause
The DATABASE_URL environment variable on Render is either:
1. Not set
2. Using wrong format
3. Using incorrect credentials

## Immediate Fix Steps

### Step 1: Get Correct Connection String from Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/[your-project]
2. Navigate to: **Settings** → **Database**
3. Scroll to **Connection string** section
4. Select **Transaction pooler** mode (important!)
5. Copy the connection string - it should look like:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
6. **Add `?pgbouncer=true` to the end**:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### Step 2: Update Render Environment Variable

1. Go to Render Dashboard: https://dashboard.render.com/
2. Select your **reverse-turing-socket** service
3. Go to **Environment** tab
4. Find or add **DATABASE_URL** variable
5. Paste the connection string from Step 1
6. Click **Save Changes**
7. Render will automatically redeploy

### Step 3: Verify After Deployment

Check the logs for:
```
✅ [ENV] DATABASE_URL configured: postgresql://postgres.****@aws-...
✅ [DB] PgBouncer detected - prepared statements disabled
✅ Socket.io server listening on 0.0.0.0:3003
```

### Common Mistakes to Avoid

❌ **Wrong**: Using direct connection (port 5432)
```
postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres
```

❌ **Wrong**: Missing pgbouncer parameter
```
postgresql://postgres.xxx:pass@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

✅ **Correct**: Transaction pooler with pgbouncer=true
```
postgresql://postgres.xxx:pass@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

## Vercel vs Render Connection Strings

Both services should use the **same DATABASE_URL** (transaction pooler connection):

```
postgresql://postgres.[PROJECT]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

The only difference is Vercel may benefit from `&connection_limit=1` at the end.

## Still Not Working?

If you still see "Tenant or user not found" after updating:

1. **Verify password has no special characters** that need URL encoding
   - If password is: `p@ss#word`
   - Should be: `p%40ss%23word`

2. **Check the region** in the connection string matches your Supabase project region

3. **Verify the project reference** (the part after `postgres.` and before `:`) is correct

4. **Test the connection string locally**:
   ```bash
   npm install -g @prisma/client
   DATABASE_URL="your-connection-string" node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.\$queryRaw\`SELECT 1\`.then(() => console.log('✅ Connected')).catch(e => console.error('❌', e.message))"
   ```

## Quick Debug Commands

After updating the environment variable, watch the Render logs:

```bash
# In Render dashboard logs, you should see:
[ENV] DATABASE_URL configured: postgresql://postgres.****@aws-...
[DB] PgBouncer detected - prepared statements disabled
Socket.io server listening on 0.0.0.0:3003
```

If you see these lines, the database connection is working! 🎉
