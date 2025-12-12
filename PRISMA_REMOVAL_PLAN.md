# Prisma Removal Plan

## Overview
Remove Prisma completely from the codebase and migrate all remaining Prisma-dependent code to use Supabase client directly.

## Current State Analysis

### Already Migrated to Supabase (✅ Complete)
- `/api/expenses` (GET, POST)
- `/api/inventory` (GET, POST)
- `/api/leads` (GET, POST)
- `/api/stock` (GET, POST)
- `/api/dashboard` (GET)
- `/api/daily-report` (GET)
- `/api/statements` (GET)
- `/api/search` (GET)

### Still Using Prisma (❌ Needs Migration)
1. **Update Routes (PUT/DELETE):**
   - `/api/expenses/[id]` - Update & Delete operations
   - `/api/inventory/[id]` - Update & Delete operations
   - `/api/leads/[id]` - Update & Delete operations
   - `/api/stock/[id]` - Update & Delete operations

2. **Admin Routes:**
   - `/api/admin/pins` - PIN management (GET, POST, PUT)
   - `/api/admin/backup` - Backup creation
   - `/api/admin/backup/list` - Backup listing
   - `/api/admin/backup/restore` - Backup restoration
   - `/api/admin/bulk-upload` - Bulk Excel upload
   - `/api/admin/bulk-upload-csv` - Bulk CSV upload
   - `/api/admin/delete-transactions` - Transaction deletion
   - `/api/admin/factory-reset` - Database reset

3. **Auth Routes:**
   - `/api/auth/login` - PIN verification

4. **Library Files:**
   - `src/lib/prisma.ts` - Prisma client setup
   - `src/lib/backup.ts` - Backup functionality
   - `src/lib/bulk-import.ts` - Bulk import
   - `src/lib/excel-parser.ts` - Excel parsing (may use Prisma enums)
   - `src/lib/csv-parser.ts` - CSV parsing (may use Prisma enums)

## Implementation Plan

### Phase 1: Migrate Update/Delete Routes (Priority: HIGH)
**Estimated Time:** 1-2 hours

#### 1.1 Expenses [id] Route
- **File:** `src/app/api/expenses/[id]/route.ts`
- **Changes:**
  - Replace `prisma.expenseTransaction.findUnique()` with Supabase query
  - Replace `prisma.expenseTransaction.update()` with Supabase update
  - Replace `prisma.expenseTransaction.delete()` with Supabase delete
  - Remove enum type conflicts (already using our custom enums)

#### 1.2 Inventory [id] Route
- **File:** `src/app/api/inventory/[id]/route.ts`
- **Changes:**
  - Replace `prisma.inventoryTransaction.findUnique()` with Supabase query
  - Replace `prisma.inventoryTransaction.update()` with Supabase update
  - Replace `prisma.inventoryTransaction.delete()` with Supabase delete
  - Replace `prisma.stockTransaction.findMany()` with Supabase queries
  - Replace `prisma.stockTransaction.delete()` with Supabase delete
  - Update helper functions (recalculateRunningTotals, getBucketSize)

#### 1.3 Leads [id] Route
- **File:** `src/app/api/leads/[id]/route.ts`
- **Changes:**
  - Replace `prisma.lead.findUnique()` with Supabase query
  - Replace `prisma.lead.update()` with Supabase update
  - Replace `prisma.lead.delete()` with Supabase delete

#### 1.4 Stock [id] Route
- **File:** `src/app/api/stock/[id]/route.ts`
- **Changes:**
  - Replace `prisma.stockTransaction.findUnique()` with Supabase query
  - Replace `prisma.stockTransaction.update()` with Supabase update
  - Replace `prisma.stockTransaction.delete()` with Supabase delete
  - Update helper function (recalculateRunningTotals)

### Phase 2: Migrate Auth Routes (Priority: HIGH)
**Estimated Time:** 30 minutes

#### 2.1 Login Route
- **File:** `src/app/api/auth/login/route.ts`
- **Changes:**
  - Replace `prisma.pin.findUnique()` with Supabase query
  - Update PIN verification logic

### Phase 3: Migrate Admin Routes (Priority: MEDIUM)
**Estimated Time:** 2-3 hours

#### 3.1 PIN Management
- **File:** `src/app/api/admin/pins/route.ts`
- **Changes:**
  - Replace `prisma.pin.findMany()` with Supabase query
  - Replace `prisma.pin.create()` with Supabase insert
  - Replace `prisma.pin.update()` with Supabase update

#### 3.2 Backup Creation
- **File:** `src/lib/backup.ts` + `src/app/api/admin/backup/route.ts`
- **Changes:**
  - Replace all `prisma.*Transaction.findMany()` with Supabase queries
  - Replace `prisma.backupLog.create()` with Supabase insert
  - Update Excel generation to not rely on Prisma types

#### 3.3 Backup List
- **File:** `src/app/api/admin/backup/list/route.ts`
- **Changes:**
  - Replace `prisma.backupLog.findMany()` with Supabase query

#### 3.4 Backup Restore
- **File:** `src/app/api/admin/backup/restore/route.ts`
- **Changes:**
  - Replace all `prisma.*.create()` calls with Supabase inserts
  - Replace all `prisma.*.deleteMany()` calls with Supabase deletes
  - Remove all enum type conflicts

#### 3.5 Bulk Upload
- **File:** `src/app/api/admin/bulk-upload/route.ts` + `src/lib/bulk-import.ts`
- **Changes:**
  - Replace `prisma.*Transaction.createMany()` with Supabase batch inserts
  - Update error handling

#### 3.6 Bulk Upload CSV
- **File:** `src/app/api/admin/bulk-upload-csv/route.ts` + `src/lib/csv-parser.ts`
- **Changes:**
  - Same as bulk upload

#### 3.7 Delete Transactions
- **File:** `src/app/api/admin/delete-transactions/route.ts`
- **Changes:**
  - Replace `prisma.*Transaction.deleteMany()` with Supabase deletes

#### 3.8 Factory Reset
- **File:** `src/app/api/admin/factory-reset/route.ts`
- **Changes:**
  - Replace `prisma.$transaction()` with sequential Supabase operations
  - Replace all `prisma.*.deleteMany()` with Supabase deletes

### Phase 4: Update Library Files (Priority: MEDIUM)
**Estimated Time:** 1 hour

#### 4.1 Excel Parser
- **File:** `src/lib/excel-parser.ts`
- **Changes:**
  - Remove any Prisma enum imports
  - Use only our custom enums from `@/types`

#### 4.2 CSV Parser
- **File:** `src/lib/csv-parser.ts`
- **Changes:**
  - Remove any Prisma enum imports
  - Use only our custom enums from `@/types`

### Phase 5: Remove Prisma Dependencies (Priority: HIGH)
**Estimated Time:** 30 minutes

#### 5.1 Remove Prisma Files
- Delete `src/lib/prisma.ts`
- Delete `prisma/` directory (keep schema for reference if needed)
- Delete `prisma/seed.ts`

#### 5.2 Update Package Dependencies
- **File:** `package.json`
- **Changes:**
  - Remove `@prisma/client` from dependencies
  - Remove `prisma` from devDependencies
  - Remove `prisma` config section
  - Remove `db:seed` script

#### 5.3 Update Environment Variables
- **File:** `.env.example` or documentation
- **Changes:**
  - Remove `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`
  - Keep only Supabase env vars

#### 5.4 Update Type Exports
- **File:** `src/types/index.ts`
- **Changes:**
  - Already done - we have our own enums
  - No further changes needed

### Phase 6: Testing & Validation (Priority: HIGH)
**Estimated Time:** 1-2 hours

#### 6.1 Build Verification
- Run `npm run build` - should complete without Prisma errors
- Verify all routes compile successfully

#### 6.2 Functional Testing
- Test all API routes:
  - Create, Read, Update, Delete for all entities
  - Backup creation and restoration
  - Bulk upload
  - PIN management
  - Auth flow

#### 6.3 Clean Dependencies
- Run `npm install` to update lock file
- Remove any unused imports

## Migration Patterns

### Pattern 1: Find Unique
```typescript
// BEFORE (Prisma)
const item = await prisma.table.findUnique({
  where: { id }
})

// AFTER (Supabase)
const { data: item, error } = await supabase
  .from('Table')
  .select('*')
  .eq('id', id)
  .single()
```

### Pattern 2: Update
```typescript
// BEFORE (Prisma)
const updated = await prisma.table.update({
  where: { id },
  data: { field: value }
})

// AFTER (Supabase)
const { data: updated, error } = await supabase
  .from('Table')
  .update({ field: value })
  .eq('id', id)
  .select()
  .single()
```

### Pattern 3: Delete
```typescript
// BEFORE (Prisma)
await prisma.table.delete({
  where: { id }
})

// AFTER (Supabase)
const { error } = await supabase
  .from('Table')
  .delete()
  .eq('id', id)
```

### Pattern 4: Delete Many
```typescript
// BEFORE (Prisma)
await prisma.table.deleteMany({
  where: { field: value }
})

// AFTER (Supabase)
const { error } = await supabase
  .from('Table')
  .delete()
  .eq('field', value)
```

### Pattern 5: Create Many (Batch Insert)
```typescript
// BEFORE (Prisma)
await prisma.table.createMany({
  data: items,
  skipDuplicates: true
})

// AFTER (Supabase)
const { error } = await supabase
  .from('Table')
  .insert(items)
  .select()
```

## Success Criteria

✅ All API routes use Supabase exclusively
✅ No imports from `@prisma/client` anywhere
✅ No type conflicts between enum systems
✅ Build completes successfully
✅ All tests pass (if applicable)
✅ Prisma dependencies removed from package.json
✅ Application runs without Prisma client

## Rollback Plan

If migration fails:
1. Revert to previous git commit
2. Keep Prisma alongside Supabase temporarily
3. Address blocking issues before retry

## Benefits After Completion

1. ✅ **Single database client** - Only Supabase
2. ✅ **No type conflicts** - Single enum system
3. ✅ **Cleaner codebase** - Remove unnecessary abstraction
4. ✅ **Faster builds** - No Prisma generation step
5. ✅ **Simplified deployment** - No Prisma client requirements
6. ✅ **Better performance** - Direct Supabase connection pooling
