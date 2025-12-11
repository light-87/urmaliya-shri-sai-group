# Database Migration Instructions

## 🚨 Important: Run This Migration on Vercel

The app has been deployed with new code that requires a database schema update. You need to run the migration to enable the StockBoard features.

## What This Migration Does

1. Adds `AP_BLUE` bucket type to the existing BucketType enum
2. Creates new enums: `StockTransactionType`, `StockCategory`, `StockUnit`
3. Creates the `StockTransaction` table for tracking production and materials
4. Adds indexes for performance

## How to Run the Migration

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Make sure `DATABASE_URL` is set correctly
4. Go to **Deployments** → Select your latest deployment
5. Click on the **"..."** menu → **Redeploy**
6. In the deployment logs, the migration should run automatically

If it doesn't run automatically, proceed to Option 2.

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project
vercel link

# Get your production DATABASE_URL
vercel env pull .env.production

# Run the migration against production
DATABASE_URL="your-production-database-url" npx prisma migrate deploy
```

### Option 3: Direct Database Access

If you have direct access to your PostgreSQL database:

```bash
# Connect to your database
psql "your-database-url"

# Run the migration SQL
\i prisma/migrations/20251121155631_add_stock_tracking/migration.sql
```

## Verify Migration Success

After running the migration:

1. Go to your deployed app
2. Log in as ADMIN
3. Navigate to **StockBoard** tab
4. You should see the empty stock overview (no errors)
5. Try adding Urea - it should work without errors
6. Go to **Inventory** - it should show your existing data again

## If You Get Errors

If you see errors about `StockTransaction` table not existing:

1. Check Vercel deployment logs for migration errors
2. Verify the migration file exists: `prisma/migrations/20251121155631_add_stock_tracking/migration.sql`
3. Try running `npx prisma migrate deploy` manually with your production DATABASE_URL
4. If the enum value `AP_BLUE` already exists, you may need to skip that line in the migration

## Need Help?

The inventory will work normally even if the migration hasn't been run yet - it just won't track stock. Once you run the migration, stock tracking will start working automatically.
