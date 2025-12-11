# Urmaliya Shri Sai Group - Implementation Plan

> **Client:** Urmaliya Shri Sai Group
> **Base Project:** PMR_app (clone)
> **Timeline:** 4 Days
> **Approach:** Separate repo, separate Supabase, manual SQL migrations via `migration.md`

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Day 1: Setup & Core Infrastructure](#day-1-setup--core-infrastructure)
3. [Day 2: Access Control & Simple Changes](#day-2-access-control--simple-changes)
4. [Day 3: Registry Module (New Feature)](#day-3-registry-module-new-feature)
5. [Day 4: Search, Dashboard, Backup & Migration](#day-4-search-dashboard-backup--migration)
6. [SQL Migrations Reference](#sql-migrations-reference)
7. [Files to Modify Reference](#files-to-modify-reference)
8. [Information Needed From Client](#information-needed-from-client)

---

## Project Overview

### Current PMR_app Structure

```
Pin Levels:
├── PIN 1: ADMIN             → Full access to all tabs
├── PIN 2: EXPENSE_INVENTORY → StockBoard, Inventory, Daily Report, Leads, Expenses, Search
└── PIN 3: INVENTORY_ONLY    → StockBoard, Inventory, Daily Report

Current Tabs:
├── StockBoard     → Production tracking, urea management
├── Inventory      → Bucket inventory (13 types + FREE_DEF)
├── Daily Report   → Comprehensive daily metrics (all users)
├── Leads          → Sales lead pipeline
├── Expenses       → Income/Expense tracking
├── Search         → Global search across transactions
├── Dashboard      → Financial analytics (Admin only)
├── Statements     → Account statements (Admin only)
└── Admin          → Settings, backup, restore (Admin only)
```

### New Structure for Urmaliya Shri Sai Group

```
Pin Levels:
├── PIN 1: ADMIN              → Full access + Registry (with DEF/Registry toggle)
├── PIN 2: EXPENSE_INVENTORY  → StockBoard, Inventory, Leads, Expenses, Search
├── PIN 3: INVENTORY_ONLY     → StockBoard, Inventory
└── PIN 4: REGISTRY_MANAGER   → Registry tabs only (NEW)

DEF Mode Tabs (visible when toggle = DEF):
├── StockBoard     → No change
├── Inventory      → AP_BLUE renamed to ECO bucket
├── Daily Report   → ADMIN ONLY (restricted from PIN 2 & 3)
├── Leads          → Same structure (one-time migration from client sheet)
├── Expenses       → Same structure (one-time migration from client sheet)
├── Search         → No change
├── Dashboard      → No change (Admin only)
├── Statements     → Logo/text updates for new client (Admin only)
└── Admin          → No change (Admin only)

Registry Mode Tabs (visible when toggle = Registry, or for PIN 4):
├── Registry Manager        → Customer records management (NEW)
├── Registry Expenses       → Income/Expense for registry (NEW)
├── Registry Search         → Advanced search for registry (NEW)
└── Registry Dashboard      → Registry analytics (NEW)

UI Behavior:
- ADMIN: Sees toggle switch in header to switch between DEF ↔ Registry modes
- REGISTRY_MANAGER (PIN 4): Only sees Registry tabs, no toggle needed
- EXPENSE_INVENTORY (PIN 2): Only sees DEF mode tabs (no Daily Report)
- INVENTORY_ONLY (PIN 3): Only sees StockBoard, Inventory
```

### Summary of All Changes

| Area | Change Type | Description |
|------|-------------|-------------|
| Inventory | Rename | `AP_BLUE` bucket → `ECO` bucket |
| Daily Report | Access Restriction | Admin only (remove from PIN 2 & 3) |
| Statements | Branding | Update logo + company text |
| Pin System | New Role | Add `REGISTRY_MANAGER` (PIN 4) |
| Navigation | New UI | DEF/Registry toggle for Admin |
| Registry Module | New Feature | 4 new tabs with full CRUD |
| Backup System | Update | Include Registry tables in backup/restore |
| Migration | One-time | Import Leads & Expenses from client sheets |

---

## Day 1: Setup & Core Infrastructure

### Phase 1.1 - Repository Setup

**Objective:** Create new repository with cloned codebase

**Steps:**
1. Create new GitHub repository (e.g., `urmaliya-shri-sai-group`)
2. Clone PMR_app codebase to new repo
3. Remove `.git` folder and reinitialize
4. Push to new repository

**Files to Update:**

```
package.json
├── Change "name": "pmr-industries" → "ussg-app"
├── Change "description" to appropriate text
```

---

### Phase 1.2 - Supabase Project Setup

**Objective:** Create new Supabase instance

**Steps:**
1. Go to [supabase.com](https://supabase.com) and create new project
2. Note down the following credentials:
   - Project URL
   - Anon Key
   - Service Role Key
   - Database URL (Transaction pooler - port 6543)
   - Direct URL (Session pooler - port 5432)
3. Create Google Drive folder for this client's backups
4. Set up Google Service Account (or reuse existing with new folder)

**Environment Variables to Configure:**

Create `.env.local` with:

```env
# Database (from Supabase dashboard → Settings → Database)
POSTGRES_PRISMA_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
POSTGRES_URL_NON_POOLING="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Authentication (generate new 32+ char secret)
JWT_SECRET="generate-a-new-secret-at-least-32-characters"

# Google Drive Backup
GOOGLE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_DRIVE_FOLDER_ID="new-folder-id-for-this-client"
```

---

### Phase 1.3 - Initial Database Setup (SQL)

**Objective:** Create all tables in Supabase

**Action:** Copy the SQL from [Migration 1.1](#migration-11---initial-database-setup) and run in Supabase SQL Editor.

This creates:
- All enum types
- Pin table (with default PINs)
- InventoryTransaction table
- StockTransaction table
- ExpenseTransaction table
- BackupLog table
- SystemSettings table
- Lead table

---

### Phase 1.4 - Branding Updates

**Objective:** Update app branding for Urmaliya Shri Sai Group

#### File 1: `src/components/Layout/Header.tsx`

**Location:** Lines 47-54

**Current Code:**
```tsx
<Link href="/inventory" className="flex items-center gap-2">
  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
    <span className="text-xs font-bold text-primary">PMR</span>
  </div>
  <span className="hidden font-semibold sm:inline-block">
    PMR Industries
  </span>
</Link>
```

**Change To:**
```tsx
<Link href="/inventory" className="flex items-center gap-2">
  <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
    <span className="text-xs font-bold text-primary">USSG</span>
  </div>
  <span className="hidden font-semibold sm:inline-block">
    Urmaliya Shri Sai Group
  </span>
</Link>
```

---

#### File 2: `src/app/layout.tsx`

**Find and Update metadata:**

```tsx
export const metadata: Metadata = {
  title: 'Urmaliya Shri Sai Group',
  description: 'Inventory and Expense Management System',
  // ... rest of metadata
}
```

---

#### File 3: `src/app/login/page.tsx`

Update any "PMR" references to "Urmaliya Shri Sai Group" or "USSG"

---

#### File 4: `src/lib/backup.ts`

**Location:** Line 221

**Current:**
```ts
const fileName = `PMR_Backup_${timestamp}.xlsx`
```

**Change To:**
```ts
const fileName = `USSG_Backup_${timestamp}.xlsx`
```

---

### Phase 1.5 - Add REGISTRY_MANAGER Pin Role

**Objective:** Add 4th pin level for Registry Manager

#### Step 1: Run SQL Migration

Copy SQL from [Migration 1.5](#migration-15---add-registry_manager-role) and run in Supabase SQL Editor.

---

#### Step 2: Update Prisma Schema

**File:** `prisma/schema.prisma`

**Location:** Lines 28-32

**Current:**
```prisma
enum PinRole {
  ADMIN             // PIN 1: Full access
  EXPENSE_INVENTORY // PIN 2: Expenses + Inventory
  INVENTORY_ONLY    // PIN 3: Inventory only
}
```

**Change To:**
```prisma
enum PinRole {
  ADMIN             // PIN 1: Full access + Registry (with toggle)
  EXPENSE_INVENTORY // PIN 2: Expenses + Inventory
  INVENTORY_ONLY    // PIN 3: Inventory only
  REGISTRY_MANAGER  // PIN 4: Registry only
}
```

---

#### Step 3: Update TypeScript Types

**File:** `src/types/index.ts`

**Location:** Lines 2-6

**Current:**
```ts
export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  expiresAt: number
}
```

**Change To:**
```ts
export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY' | 'REGISTRY_MANAGER'
  expiresAt: number
}
```

**Location:** Line 9

**Current:**
```ts
export type PinRole = 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
```

**Change To:**
```ts
export type PinRole = 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY' | 'REGISTRY_MANAGER'
```

---

#### Step 4: Update Auth Library

**File:** `src/lib/auth.ts`

**Location:** Lines 8-12

**Current:**
```ts
export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  expiresAt: number
}
```

**Change To:**
```ts
export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY' | 'REGISTRY_MANAGER'
  expiresAt: number
}
```

**Location:** Lines 62-66 (role hierarchy)

**Current:**
```ts
const roleHierarchy = {
  ADMIN: 3,
  EXPENSE_INVENTORY: 2,
  INVENTORY_ONLY: 1,
}
```

**Change To:**
```ts
const roleHierarchy = {
  ADMIN: 4,
  EXPENSE_INVENTORY: 2,
  INVENTORY_ONLY: 1,
  REGISTRY_MANAGER: 3,  // Separate branch - same level but different access
}
```

> **Note:** REGISTRY_MANAGER doesn't follow traditional hierarchy. Access will be checked explicitly in middleware.

---

### Phase 1.6 - Regenerate Prisma Client

**Command:**
```bash
npx prisma generate
```

> **Important:** Do NOT run `prisma migrate`. We're using manual SQL migrations.

---

### Phase 1.7 - Test Local Setup

**Steps:**
1. Run `npm install`
2. Run `npm run dev`
3. Verify app loads at `localhost:3000`
4. Test login with default PINs:
   - `1234` - Admin
   - `2345` - Expense/Inventory
   - `3456` - Inventory Only
   - `4567` - Registry Manager (will redirect to inventory for now)

---

### Day 1 Checklist

```
[ ] New GitHub repository created
[ ] Codebase cloned and pushed
[ ] New Supabase project created
[ ] Environment variables configured in .env.local
[ ] Initial database tables created via SQL (Migration 1.1)
[ ] Branding updated (Header, layout metadata, login page, backup filename)
[ ] REGISTRY_MANAGER role SQL executed (Migration 1.5)
[ ] Prisma schema updated with REGISTRY_MANAGER
[ ] TypeScript types updated
[ ] Auth library updated
[ ] Prisma client regenerated
[ ] App runs locally without errors
[ ] All 4 PIN logins work
```

---

## Day 2: Access Control & Simple Changes

### Phase 2.1 - Rename AP_BLUE to ECO Bucket

**Objective:** Change bucket name from "AP Blue" to "Eco"

#### Step 1: Run SQL Migration

Copy SQL from [Migration 2.1](#migration-21---rename-ap_blue-to-eco) and run in Supabase SQL Editor.

---

#### Step 2: Update Prisma Schema

**File:** `prisma/schema.prisma`

**Location:** Lines 62-77

**Find:** `AP_BLUE`
**Replace with:** `ECO`

Full enum after change:
```prisma
enum BucketType {
  TATA_G
  TATA_W
  TATA_HP
  AL_10_LTR
  AL
  BB
  ES
  MH
  MH_10_LTR
  TATA_10_LTR
  IBC_TANK
  ECO           // Changed from AP_BLUE
  INDIAN_OIL_20L
  FREE_DEF
}
```

---

#### Step 3: Update TypeScript Types

**File:** `src/types/index.ts`

**Location:** Lines 13-27 (BucketType)

**Find:** `'AP_BLUE'`
**Replace with:** `'ECO'`

---

**Location:** Lines 172-187 (BUCKET_TYPE_LABELS)

**Find:**
```ts
AP_BLUE: 'AP Blue',
```

**Replace with:**
```ts
ECO: 'Eco',
```

---

**Location:** Lines 189-205 (BUCKET_SIZES)

**Find:**
```ts
AP_BLUE: 20,
```

**Replace with:**
```ts
ECO: 20,
```

---

#### Step 4: Search for Other References

Run this command to find any other AP_BLUE references:
```bash
grep -r "AP_BLUE" src/
grep -r "AP Blue" src/
```

Update any found references to ECO/Eco.

---

#### Step 5: Regenerate Prisma Client

```bash
npx prisma generate
```

---

### Phase 2.2 - Restrict Daily Report to Admin Only

**Objective:** Remove Daily Report access from PIN 2 and PIN 3

#### Step 1: Update Middleware

**File:** `src/middleware.ts`

**Location:** Lines 36-41

**Current:**
```ts
// Admin-only routes
if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/statements')) {
  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/inventory', request.url))
  }
}
```

**Change To:**
```ts
// Admin-only routes (now includes Daily Report)
if (
  path.startsWith('/admin') ||
  path.startsWith('/dashboard') ||
  path.startsWith('/statements') ||
  path.startsWith('/daily-report')
) {
  if (role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/inventory', request.url))
  }
}
```

---

#### Step 2: Update Header Navigation

**File:** `src/components/Layout/Header.tsx`

**Location:** Lines 27-37

**Find:**
```ts
{ href: '/daily-report', label: 'Daily Report', roles: ['ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY'] },
```

**Replace with:**
```ts
{ href: '/daily-report', label: 'Daily Report', roles: ['ADMIN'] },
```

---

### Phase 2.3 - Create Mode Store for DEF/Registry Toggle

**Objective:** Create state management for Admin's mode toggle

#### Create New File: `src/store/modeStore.ts`

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AppMode = 'DEF' | 'REGISTRY'

interface ModeState {
  mode: AppMode
  setMode: (mode: AppMode) => void
  toggleMode: () => void
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: 'DEF',
      setMode: (mode) => set({ mode }),
      toggleMode: () => set((state) => ({
        mode: state.mode === 'DEF' ? 'REGISTRY' : 'DEF'
      })),
    }),
    {
      name: 'app-mode-storage',
    }
  )
)
```

---

### Phase 2.4 - Update Header with Mode Toggle

**Objective:** Add DEF/Registry toggle for Admin users

**File:** `src/components/Layout/Header.tsx`

#### Add Imports (at top of file):

```ts
import { useModeStore } from '@/store/modeStore'
import { Switch } from '@/components/ui/switch'
```

#### Add State Hook (inside Header function, after existing hooks):

```ts
const { mode, toggleMode } = useModeStore()
```

#### Replace navItems with Mode-Aware Navigation:

**Remove the existing `navItems` array and replace with:**

```ts
// DEF Mode navigation items
const defNavItems = [
  { href: '/stockboard', label: 'StockBoard', roles: ['ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY'] },
  { href: '/inventory', label: 'Inventory', roles: ['ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY'] },
  { href: '/daily-report', label: 'Daily Report', roles: ['ADMIN'] },
  { href: '/leads', label: 'Leads', roles: ['ADMIN', 'EXPENSE_INVENTORY'] },
  { href: '/expenses', label: 'Expenses', roles: ['ADMIN', 'EXPENSE_INVENTORY'] },
  { href: '/search', label: 'Search', roles: ['ADMIN', 'EXPENSE_INVENTORY'] },
  { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN'] },
  { href: '/statements', label: 'Statements', roles: ['ADMIN'] },
  { href: '/admin', label: 'Admin', roles: ['ADMIN'] },
]

// Registry Mode navigation items
const registryNavItems = [
  { href: '/registry', label: 'Registry', roles: ['ADMIN', 'REGISTRY_MANAGER'] },
  { href: '/registry/expenses', label: 'Registry Expenses', roles: ['ADMIN', 'REGISTRY_MANAGER'] },
  { href: '/registry/search', label: 'Registry Search', roles: ['ADMIN', 'REGISTRY_MANAGER'] },
  { href: '/registry/dashboard', label: 'Registry Dashboard', roles: ['ADMIN', 'REGISTRY_MANAGER'] },
]

// Select appropriate nav items based on role and mode
const getNavItems = () => {
  if (role === 'REGISTRY_MANAGER') {
    return registryNavItems
  }
  if (role === 'ADMIN') {
    return mode === 'DEF' ? defNavItems : registryNavItems
  }
  return defNavItems
}

const navItems = getNavItems()
```

#### Update visibleNavItems:

```ts
const visibleNavItems = navItems.filter(item =>
  role && item.roles.includes(role)
)
```

#### Add Toggle UI (in the header JSX, before logout button):

Find this section (around line 75-80):
```tsx
<div className="flex items-center gap-2">
  {role && (
    <span className="hidden sm:inline-block text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
      {role.replace('_', ' ')}
    </span>
  )}
```

Change to:
```tsx
<div className="flex items-center gap-2">
  {/* Mode Toggle - Only for Admin */}
  {role === 'ADMIN' && (
    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
      <span className={cn(
        'text-xs font-medium transition-colors',
        mode === 'DEF' ? 'text-primary' : 'text-muted-foreground'
      )}>
        DEF
      </span>
      <Switch
        checked={mode === 'REGISTRY'}
        onCheckedChange={toggleMode}
        className="data-[state=checked]:bg-primary"
      />
      <span className={cn(
        'text-xs font-medium transition-colors',
        mode === 'REGISTRY' ? 'text-primary' : 'text-muted-foreground'
      )}>
        Registry
      </span>
    </div>
  )}

  {role && (
    <span className="hidden sm:inline-block text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
      {role.replace('_', ' ')}
    </span>
  )}
```

---

### Phase 2.5 - Create Registry Route Placeholders

**Objective:** Create empty pages for Registry module

#### Create Directory Structure:

```
src/app/registry/
├── page.tsx
├── expenses/
│   └── page.tsx
├── search/
│   └── page.tsx
└── dashboard/
    └── page.tsx
```

#### File: `src/app/registry/page.tsx`

```tsx
export default function RegistryPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Registry Manager</h1>
      <p className="text-muted-foreground">
        Registry Manager will be implemented in Day 3.
      </p>
    </div>
  )
}
```

#### File: `src/app/registry/expenses/page.tsx`

```tsx
export default function RegistryExpensesPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Registry Expenses</h1>
      <p className="text-muted-foreground">
        Registry Expenses will be implemented in Day 3.
      </p>
    </div>
  )
}
```

#### File: `src/app/registry/search/page.tsx`

```tsx
export default function RegistrySearchPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Registry Search</h1>
      <p className="text-muted-foreground">
        Registry Search will be implemented in Day 4.
      </p>
    </div>
  )
}
```

#### File: `src/app/registry/dashboard/page.tsx`

```tsx
export default function RegistryDashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Registry Dashboard</h1>
      <p className="text-muted-foreground">
        Registry Dashboard will be implemented in Day 4.
      </p>
    </div>
  )
}
```

---

### Phase 2.6 - Update Middleware for Registry Routes

**Objective:** Protect registry routes for Admin and Registry Manager only

**File:** `src/middleware.ts`

**Add after the admin-only routes check (around line 48):**

```ts
// Registry routes - require ADMIN or REGISTRY_MANAGER
if (path.startsWith('/registry')) {
  if (role !== 'ADMIN' && role !== 'REGISTRY_MANAGER') {
    return NextResponse.redirect(new URL('/inventory', request.url))
  }
}
```

---

### Phase 2.7 - Update Login Redirect Logic

**Objective:** Redirect REGISTRY_MANAGER to registry page after login

**File:** `src/app/api/auth/login/route.ts`

Find the redirect logic and update to handle REGISTRY_MANAGER:

```ts
// After successful login, determine redirect URL
const redirectUrl = role === 'REGISTRY_MANAGER' ? '/registry' : '/stockboard'
```

Also update the client-side redirect in `src/app/login/page.tsx` if applicable.

---

### Day 2 Checklist

```
[ ] SQL Migration 2.1 executed (AP_BLUE → ECO)
[ ] Prisma schema updated (AP_BLUE → ECO)
[ ] TypeScript types updated (BucketType, labels, sizes)
[ ] Prisma client regenerated
[ ] Middleware updated (Daily Report admin-only)
[ ] Header navigation updated (Daily Report admin-only)
[ ] Mode store created (src/store/modeStore.ts)
[ ] Header updated with mode toggle
[ ] Registry placeholder pages created (4 pages)
[ ] Middleware updated for registry routes
[ ] Login redirect updated for REGISTRY_MANAGER
[ ] Test: Admin sees DEF/Registry toggle
[ ] Test: Toggle switches navigation correctly
[ ] Test: PIN 2/3 cannot access Daily Report
[ ] Test: PIN 4 goes to Registry
[ ] Test: ECO bucket appears in inventory
```

---

## Day 3: Registry Module (New Feature)

### Phase 3.1 - Create Registry Database Tables

**Objective:** Create RegistryRecord and RegistryTransaction tables

#### Run SQL Migration

Copy SQL from [Migration 3.1](#migration-31---registry-tables) and run in Supabase SQL Editor.

---

### Phase 3.2 - Update Prisma Schema

**File:** `prisma/schema.prisma`

**Add at the end of the file:**

```prisma
// ============================================
// REGISTRY MODULE
// ============================================

model RegistryRecord {
  id              String    @id @default(cuid())

  // Customer Information
  // NOTE: These fields are placeholders. Update based on client's actual sheet structure.
  name            String
  phone           String?
  address         String?

  // Flexible fields for client-specific data
  field1          String?   // Rename based on client needs
  field2          String?   // Rename based on client needs
  field3          String?   // Rename based on client needs
  field4          String?   // Rename based on client needs
  field5          String?   // Rename based on client needs

  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([name])
  @@index([phone])
}

model RegistryTransaction {
  id              String          @id @default(cuid())
  date            DateTime
  amount          Decimal         @db.Decimal(12, 2)
  type            TransactionType // Reuse existing INCOME/EXPENSE enum
  description     String
  notes           String?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([date])
  @@index([type])
}
```

---

### Phase 3.3 - Add Registry Types

**File:** `src/types/index.ts`

**Add at the end of the file:**

```ts
// ============================================
// REGISTRY TYPES
// ============================================

export interface RegistryRecord {
  id: string
  name: string
  phone?: string
  address?: string
  field1?: string
  field2?: string
  field3?: string
  field4?: string
  field5?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface RegistryRecordInput {
  name: string
  phone?: string
  address?: string
  field1?: string
  field2?: string
  field3?: string
  field4?: string
  field5?: string
  notes?: string
}

export interface RegistryTransaction {
  id: string
  date: string
  amount: number
  type: TransactionType  // INCOME or EXPENSE
  description: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface RegistryTransactionInput {
  date: Date
  amount: number
  type: TransactionType
  description: string
  notes?: string
}

export interface RegistryRecordResponse {
  records: RegistryRecord[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface RegistryTransactionResponse {
  transactions: RegistryTransaction[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// Display labels for registry fields (customize based on client needs)
export const REGISTRY_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  phone: 'Phone',
  address: 'Address',
  field1: 'Field 1',  // Update these based on client's actual field names
  field2: 'Field 2',
  field3: 'Field 3',
  field4: 'Field 4',
  field5: 'Field 5',
  notes: 'Notes',
}
```

---

### Phase 3.4 - Regenerate Prisma Client

```bash
npx prisma generate
```

---

### Phase 3.5 - Create Registry API Routes

#### Directory Structure:

```
src/app/api/registry/
├── route.ts                    # GET (list), POST (create)
├── [id]/
│   └── route.ts               # GET, PUT, DELETE single record
├── transactions/
│   ├── route.ts               # GET (list), POST (create)
│   └── [id]/
│       └── route.ts           # GET, PUT, DELETE single transaction
```

---

#### File: `src/app/api/registry/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth'

// GET - List all registry records with pagination and search
export async function GET(request: NextRequest) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''

    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { address: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}

    const [records, total] = await Promise.all([
      prisma.registryRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.registryRecord.count({ where }),
    ])

    return NextResponse.json({
      records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Registry fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch records' }, { status: 500 })
  }
}

// POST - Create new registry record
export async function POST(request: NextRequest) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const record = await prisma.registryRecord.create({
      data: {
        name: body.name.trim(),
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        field1: body.field1?.trim() || null,
        field2: body.field2?.trim() || null,
        field3: body.field3?.trim() || null,
        field4: body.field4?.trim() || null,
        field5: body.field5?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    console.error('Registry create error:', error)
    return NextResponse.json({ error: 'Failed to create record' }, { status: 500 })
  }
}
```

---

#### File: `src/app/api/registry/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth'

// GET - Get single registry record
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const record = await prisma.registryRecord.findUnique({
      where: { id: params.id },
    })

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    return NextResponse.json(record)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch record' }, { status: 500 })
  }
}

// PUT - Update registry record
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const record = await prisma.registryRecord.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim(),
        phone: body.phone?.trim() || null,
        address: body.address?.trim() || null,
        field1: body.field1?.trim() || null,
        field2: body.field2?.trim() || null,
        field3: body.field3?.trim() || null,
        field4: body.field4?.trim() || null,
        field5: body.field5?.trim() || null,
        notes: body.notes?.trim() || null,
      },
    })

    return NextResponse.json(record)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
  }
}

// DELETE - Delete registry record
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.registryRecord.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 })
  }
}
```

---

#### File: `src/app/api/registry/transactions/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth'

// GET - List all registry transactions
export async function GET(request: NextRequest) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const type = searchParams.get('type') // INCOME or EXPENSE
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search') || ''

    const where: any = {}

    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      where.type = type
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.date.lte = end
      }
    }

    if (search) {
      where.description = { contains: search, mode: 'insensitive' }
    }

    const [transactions, total] = await Promise.all([
      prisma.registryTransaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.registryTransaction.count({ where }),
    ])

    return NextResponse.json({
      transactions: transactions.map(tx => ({
        ...tx,
        amount: Number(tx.amount),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Registry transactions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

// POST - Create new registry transaction
export async function POST(request: NextRequest) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    if (!body.description || body.description.trim() === '') {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
    }

    if (!body.type || !['INCOME', 'EXPENSE'].includes(body.type)) {
      return NextResponse.json({ error: 'Type must be INCOME or EXPENSE' }, { status: 400 })
    }

    const transaction = await prisma.registryTransaction.create({
      data: {
        date: new Date(body.date),
        amount: body.amount,
        type: body.type,
        description: body.description.trim(),
        notes: body.notes?.trim() || null,
      },
    })

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    }, { status: 201 })
  } catch (error) {
    console.error('Registry transaction create error:', error)
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 })
  }
}
```

---

#### File: `src/app/api/registry/transactions/[id]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth'

// GET - Get single transaction
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const transaction = await prisma.registryTransaction.findUnique({
      where: { id: params.id },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch transaction' }, { status: 500 })
  }
}

// PUT - Update transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()

    const transaction = await prisma.registryTransaction.update({
      where: { id: params.id },
      data: {
        date: body.date ? new Date(body.date) : undefined,
        amount: body.amount,
        type: body.type,
        description: body.description?.trim(),
        notes: body.notes?.trim() || null,
      },
    })

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 })
  }
}

// DELETE - Delete transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await prisma.registryTransaction.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete transaction' }, { status: 500 })
  }
}
```

---

### Phase 3.6 - Create Registry Manager UI

**File:** `src/app/registry/page.tsx`

Replace placeholder with full implementation:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react'
import { RegistryRecord, REGISTRY_FIELD_LABELS } from '@/types'
import { format } from 'date-fns'

export default function RegistryPage() {
  const [records, setRecords] = useState<RegistryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<RegistryRecord | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  })

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    field1: '',
    field2: '',
    field3: '',
    field4: '',
    field5: '',
    notes: '',
  })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: '50',
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/registry?${params}`)
      const data = await res.json()

      setRecords(data.records || [])
      setPagination(prev => ({
        ...prev,
        totalPages: data.totalPages || 1,
        total: data.total || 0,
      }))
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      setLoading(false)
    }
  }, [search, pagination.page])

  useEffect(() => {
    fetchRecords()
  }, [fetchRecords])

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      field1: '',
      field2: '',
      field3: '',
      field4: '',
      field5: '',
      notes: '',
    })
    setEditingRecord(null)
  }

  const handleOpenForm = (record?: RegistryRecord) => {
    if (record) {
      setEditingRecord(record)
      setFormData({
        name: record.name,
        phone: record.phone || '',
        address: record.address || '',
        field1: record.field1 || '',
        field2: record.field2 || '',
        field3: record.field3 || '',
        field4: record.field4 || '',
        field5: record.field5 || '',
        notes: record.notes || '',
      })
    } else {
      resetForm()
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    resetForm()
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      alert('Name is required')
      return
    }

    setSubmitting(true)
    try {
      const url = editingRecord
        ? `/api/registry/${editingRecord.id}`
        : '/api/registry'
      const method = editingRecord ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        handleCloseForm()
        fetchRecords()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save record')
      }
    } catch (error) {
      alert('Failed to save record')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return

    try {
      const res = await fetch(`/api/registry/${id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchRecords()
      } else {
        alert('Failed to delete record')
      }
    } catch (error) {
      alert('Failed to delete record')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registry Manager</h1>
          <p className="text-muted-foreground">
            {pagination.total} records total
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or address..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No records found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.name}</TableCell>
                    <TableCell>{record.phone || '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {record.address || '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(record.createdAt), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(record)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            disabled={pagination.page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Edit Record' : 'Add New Record'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
                rows={2}
              />
            </div>

            {/* Additional fields - customize labels based on client needs */}
            {['field1', 'field2', 'field3', 'field4', 'field5'].map((field) => (
              <div key={field} className="space-y-2">
                <Label htmlFor={field}>{REGISTRY_FIELD_LABELS[field]}</Label>
                <Input
                  id={field}
                  value={formData[field as keyof typeof formData]}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={`Enter ${REGISTRY_FIELD_LABELS[field].toLowerCase()}`}
                />
              </div>
            ))}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingRecord ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

---

### Phase 3.7 - Create Registry Expenses UI

**File:** `src/app/registry/expenses/page.tsx`

Similar implementation to Registry Manager but for transactions. The structure will be:
- Add Income/Expense form
- Transaction table with date, amount, type, description
- Filter by type (Income/Expense) and date range
- Edit/Delete capabilities

> **Note:** Full implementation similar to main Expenses page but using `/api/registry/transactions` endpoints.

---

### Day 3 Checklist

```
[ ] SQL Migration 3.1 executed (Registry tables)
[ ] Prisma schema updated with Registry models
[ ] Registry types added to types/index.ts
[ ] Prisma client regenerated
[ ] API: /api/registry (GET, POST) created
[ ] API: /api/registry/[id] (GET, PUT, DELETE) created
[ ] API: /api/registry/transactions (GET, POST) created
[ ] API: /api/registry/transactions/[id] (GET, PUT, DELETE) created
[ ] Registry Manager page fully implemented
[ ] Registry Expenses page fully implemented
[ ] Test: Create registry record
[ ] Test: Edit registry record
[ ] Test: Delete registry record
[ ] Test: Search registry records
[ ] Test: Create registry transaction
[ ] Test: Filter transactions by type
[ ] Test: Filter transactions by date
```

---

## Day 4: Search, Dashboard, Backup & Migration

### Phase 4.1 - Registry Search API & UI

#### File: `src/app/api/registry/search/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // 'records', 'transactions', 'all'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const results: {
      records?: any[]
      transactions?: any[]
    } = {}

    // Search records
    if (type === 'records' || type === 'all') {
      results.records = await prisma.registryRecord.findMany({
        where: query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query } },
            { address: { contains: query, mode: 'insensitive' } },
            { notes: { contains: query, mode: 'insensitive' } },
            { field1: { contains: query, mode: 'insensitive' } },
            { field2: { contains: query, mode: 'insensitive' } },
          ],
        } : {},
        orderBy: { updatedAt: 'desc' },
        take: 50,
      })
    }

    // Search transactions
    if (type === 'transactions' || type === 'all') {
      const txWhere: any = {}

      if (query) {
        txWhere.description = { contains: query, mode: 'insensitive' }
      }

      if (startDate || endDate) {
        txWhere.date = {}
        if (startDate) txWhere.date.gte = new Date(startDate)
        if (endDate) {
          const end = new Date(endDate)
          end.setHours(23, 59, 59, 999)
          txWhere.date.lte = end
        }
      }

      const transactions = await prisma.registryTransaction.findMany({
        where: txWhere,
        orderBy: { date: 'desc' },
        take: 50,
      })

      results.transactions = transactions.map(tx => ({
        ...tx,
        amount: Number(tx.amount),
      }))
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Registry search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
```

#### File: `src/app/registry/search/page.tsx`

Full search UI with:
- Search input
- Type filter tabs (All, Records, Transactions)
- Date range filter (for transactions)
- Results displayed in categorized sections

---

### Phase 4.2 - Registry Dashboard API & UI

#### File: `src/app/api/registry/dashboard/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export async function GET(request: NextRequest) {
  const session = await verifySession()

  if (!session || (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Total counts
    const [totalRecords, totalTransactions] = await Promise.all([
      prisma.registryRecord.count(),
      prisma.registryTransaction.count(),
    ])

    // Income/Expense totals
    const [incomeAgg, expenseAgg] = await Promise.all([
      prisma.registryTransaction.aggregate({
        where: { type: 'INCOME' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.registryTransaction.aggregate({
        where: { type: 'EXPENSE' },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const totalIncome = Number(incomeAgg._sum.amount || 0)
    const totalExpense = Number(expenseAgg._sum.amount || 0)

    // Monthly data for last 6 months
    const monthlyData = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = endOfMonth(monthStart)

      const [monthIncome, monthExpense] = await Promise.all([
        prisma.registryTransaction.aggregate({
          where: {
            type: 'INCOME',
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
        prisma.registryTransaction.aggregate({
          where: {
            type: 'EXPENSE',
            date: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
      ])

      monthlyData.push({
        month: format(monthStart, 'MMM yyyy'),
        income: Number(monthIncome._sum.amount || 0),
        expense: Number(monthExpense._sum.amount || 0),
      })
    }

    // Recent activity
    const [recentRecords, recentTransactions] = await Promise.all([
      prisma.registryRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.registryTransaction.findMany({
        orderBy: { date: 'desc' },
        take: 5,
      }),
    ])

    return NextResponse.json({
      summary: {
        totalRecords,
        totalTransactions,
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        incomeCount: incomeAgg._count,
        expenseCount: expenseAgg._count,
      },
      monthlyData,
      recentActivity: {
        records: recentRecords,
        transactions: recentTransactions.map(tx => ({
          ...tx,
          amount: Number(tx.amount),
        })),
      },
    })
  } catch (error) {
    console.error('Registry dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard' }, { status: 500 })
  }
}
```

#### File: `src/app/registry/dashboard/page.tsx`

Dashboard UI with:
- Summary cards (Total Records, Income, Expense, Net Balance)
- Monthly bar chart (Income vs Expense)
- Recent records list
- Recent transactions list

---

### Phase 4.3 - Update Backup System

**Objective:** Include Registry tables in backup/restore

#### File: `src/lib/backup.ts`

Add after leads fetching (around line 85):

```ts
// Fetch registry records
let registryRecords: any[] = []
let registryRecordsCount = 0
try {
  registryRecords = await prisma.registryRecord.findMany({
    orderBy: { createdAt: 'asc' },
  })
  registryRecordsCount = registryRecords.length
} catch (error) {
  console.log('Registry records not available in backup')
}

// Fetch registry transactions
let registryTransactions: any[] = []
let registryTransactionsCount = 0
try {
  registryTransactions = await prisma.registryTransaction.findMany({
    orderBy: { date: 'asc' },
  })
  registryTransactionsCount = registryTransactions.length
} catch (error) {
  console.log('Registry transactions not available in backup')
}
```

Add Excel sheets (after leads sheet, around line 188):

```ts
// Registry Records sheet
if (registryRecords.length > 0) {
  const registryRecordsData = registryRecords.map((record) => ({
    ID: record.id,
    Name: record.name,
    Phone: record.phone || '',
    Address: record.address || '',
    Field1: record.field1 || '',
    Field2: record.field2 || '',
    Field3: record.field3 || '',
    Field4: record.field4 || '',
    Field5: record.field5 || '',
    Notes: record.notes || '',
    'Created At': format(new Date(record.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    'Updated At': format(new Date(record.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
  }))
  const registryRecordsSheet = XLSX.utils.json_to_sheet(registryRecordsData)
  XLSX.utils.book_append_sheet(workbook, registryRecordsSheet, 'RegistryRecords')
}

// Registry Transactions sheet
if (registryTransactions.length > 0) {
  const registryTxData = registryTransactions.map((tx) => ({
    ID: tx.id,
    Date: format(new Date(tx.date), 'yyyy-MM-dd'),
    Amount: Number(tx.amount),
    Type: tx.type,
    Description: tx.description,
    Notes: tx.notes || '',
    'Created At': format(new Date(tx.createdAt), 'yyyy-MM-dd HH:mm:ss'),
    'Updated At': format(new Date(tx.updatedAt), 'yyyy-MM-dd HH:mm:ss'),
  }))
  const registryTxSheet = XLSX.utils.json_to_sheet(registryTxData)
  XLSX.utils.book_append_sheet(workbook, registryTxSheet, 'RegistryTransactions')
}
```

Update BackupLog creation to include registry counts.

---

#### File: `src/app/api/admin/backup/restore/route.ts`

Add restore logic for Registry tables (similar pattern to existing):

```ts
// Clear and restore registry records
await prisma.registryRecord.deleteMany({})
if (registryRecordsData && registryRecordsData.length > 0) {
  for (const row of registryRecordsData) {
    await prisma.registryRecord.create({
      data: {
        id: row.ID,
        name: row.Name,
        phone: row.Phone || null,
        address: row.Address || null,
        field1: row.Field1 || null,
        field2: row.Field2 || null,
        field3: row.Field3 || null,
        field4: row.Field4 || null,
        field5: row.Field5 || null,
        notes: row.Notes || null,
        createdAt: new Date(row['Created At']),
        updatedAt: new Date(row['Updated At']),
      },
    })
  }
}

// Clear and restore registry transactions
await prisma.registryTransaction.deleteMany({})
if (registryTxData && registryTxData.length > 0) {
  for (const row of registryTxData) {
    await prisma.registryTransaction.create({
      data: {
        id: row.ID,
        date: new Date(row.Date),
        amount: row.Amount,
        type: row.Type,
        description: row.Description,
        notes: row.Notes || null,
        createdAt: new Date(row['Created At']),
        updatedAt: new Date(row['Updated At']),
      },
    })
  }
}
```

---

### Phase 4.4 - One-Time Migration Tools

**Objective:** Create tools to import from client's existing sheets

#### File: `src/app/api/admin/migrate/leads/route.ts`

Template for leads migration (column mapping TBD based on client sheet):

```ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifySession } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  const session = await verifySession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(sheet)

    // TODO: Define column mapping based on client's sheet
    // Example mapping (update based on actual client sheet columns):
    const columnMapping = {
      name: 'Name',        // Column name in client's sheet
      phone: 'Phone',      // Column name in client's sheet
      company: 'Company',  // Column name in client's sheet
    }

    let imported = 0
    let failed = 0

    for (const row of data as any[]) {
      try {
        await prisma.lead.create({
          data: {
            name: String(row[columnMapping.name] || 'Unknown').trim(),
            phone: String(row[columnMapping.phone] || '').trim(),
            company: row[columnMapping.company]?.trim() || null,
            status: 'NEW',
            priority: 'MEDIUM',
          },
        })
        imported++
      } catch (error) {
        console.error('Failed to import row:', row, error)
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      failed,
      total: data.length,
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
```

#### File: `src/app/api/admin/migrate/expenses/route.ts`

Similar structure for expenses migration.

#### Admin UI for Migration

Add migration component to Admin page for one-time imports.

---

### Phase 4.5 - Statement Branding (Info Needed)

**File:** Statement print components (TBD based on client info)

Update:
- Logo
- Company name
- Address
- Contact info
- Any other text

---

### Day 4 Checklist

```
[ ] Registry Search API created
[ ] Registry Search UI created
[ ] Registry Dashboard API created
[ ] Registry Dashboard UI created
[ ] Backup updated to include Registry tables
[ ] Restore updated to handle Registry tables
[ ] Test: Full backup includes registry data
[ ] Test: Restore recovers registry data
[ ] Migration API for Leads created
[ ] Migration API for Expenses created (if needed)
[ ] Migration UI added to Admin page
[ ] Statement branding updated (if info provided)
[ ] Test: Leads import works
[ ] Test: Expenses import works
[ ] Full end-to-end testing completed
```

---

## SQL Migrations Reference

All SQL to run in Supabase SQL Editor. Copy each migration in order.

---

### Migration 1.1 - Initial Database Setup

```sql
-- =============================================
-- USSG Migration 1.1: Initial Database Setup
-- Run this FIRST in a fresh Supabase project
-- =============================================

-- Create all enum types
CREATE TYPE "PinRole" AS ENUM ('ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY');
CREATE TYPE "Warehouse" AS ENUM ('PALLAVI', 'TULARAM', 'FACTORY');
CREATE TYPE "BucketType" AS ENUM ('TATA_G', 'TATA_W', 'TATA_HP', 'AL_10_LTR', 'AL', 'BB', 'ES', 'MH', 'MH_10_LTR', 'TATA_10_LTR', 'IBC_TANK', 'AP_BLUE', 'INDIAN_OIL_20L', 'FREE_DEF');
CREATE TYPE "ActionType" AS ENUM ('STOCK', 'SELL');
CREATE TYPE "StockTransactionType" AS ENUM ('ADD_UREA', 'PRODUCE_BATCH', 'SELL_FREE_DEF', 'FILL_BUCKETS', 'SELL_BUCKETS');
CREATE TYPE "StockCategory" AS ENUM ('UREA', 'FREE_DEF', 'FINISHED_GOODS');
CREATE TYPE "StockUnit" AS ENUM ('KG', 'LITERS', 'BAGS');
CREATE TYPE "ExpenseAccount" AS ENUM ('CASH', 'PRASHANT_GAYDHANE', 'PMR', 'KPG_SAVING', 'KP_ENTERPRISES');
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'NEED_TO_CALL', 'CALLED', 'GOT_RESPONSE', 'ON_HOLD', 'CALL_IN_7_DAYS', 'CONVERTED', 'NOT_INTERESTED');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "CallOutcome" AS ENUM ('NO_ANSWER', 'BUSY', 'INTERESTED', 'NEED_INFO', 'CALL_BACK_LATER', 'WRONG_NUMBER', 'NOT_INTERESTED_NOW');

-- Pin table
CREATE TABLE "Pin" (
    "id" TEXT NOT NULL,
    "pinNumber" TEXT NOT NULL,
    "role" "PinRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Pin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Pin_pinNumber_key" ON "Pin"("pinNumber");
CREATE INDEX "Pin_pinNumber_idx" ON "Pin"("pinNumber");

-- InventoryTransaction table
CREATE TABLE "InventoryTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "warehouse" "Warehouse" NOT NULL,
    "bucketType" "BucketType" NOT NULL,
    "action" "ActionType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buyerSeller" TEXT NOT NULL,
    "runningTotal" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryTransaction_date_idx" ON "InventoryTransaction"("date");
CREATE INDEX "InventoryTransaction_warehouse_idx" ON "InventoryTransaction"("warehouse");
CREATE INDEX "InventoryTransaction_bucketType_idx" ON "InventoryTransaction"("bucketType");
CREATE INDEX "InventoryTransaction_buyerSeller_idx" ON "InventoryTransaction"("buyerSeller");

-- StockTransaction table
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "StockTransactionType" NOT NULL,
    "category" "StockCategory" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "StockUnit" NOT NULL,
    "description" TEXT,
    "runningTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StockTransaction_date_idx" ON "StockTransaction"("date");
CREATE INDEX "StockTransaction_type_idx" ON "StockTransaction"("type");
CREATE INDEX "StockTransaction_category_idx" ON "StockTransaction"("category");

-- ExpenseTransaction table
CREATE TABLE "ExpenseTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "account" "ExpenseAccount" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ExpenseTransaction_date_idx" ON "ExpenseTransaction"("date");
CREATE INDEX "ExpenseTransaction_account_idx" ON "ExpenseTransaction"("account");
CREATE INDEX "ExpenseTransaction_type_idx" ON "ExpenseTransaction"("type");
CREATE INDEX "ExpenseTransaction_name_idx" ON "ExpenseTransaction"("name");

-- BackupLog table
CREATE TABLE "BackupLog" (
    "id" TEXT NOT NULL,
    "backupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backupType" TEXT NOT NULL,
    "driveFileId" TEXT,
    "inventoryCount" INTEGER NOT NULL,
    "expenseCount" INTEGER NOT NULL,
    "stockCount" INTEGER NOT NULL DEFAULT 0,
    "leadsCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BackupLog_backupDate_idx" ON "BackupLog"("backupDate");

-- SystemSettings table
CREATE TABLE "SystemSettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- Lead table
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "lastCallDate" TIMESTAMP(3),
    "nextFollowUpDate" TIMESTAMP(3),
    "callOutcome" "CallOutcome",
    "quickNote" TEXT,
    "additionalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_priority_idx" ON "Lead"("priority");
CREATE INDEX "Lead_nextFollowUpDate_idx" ON "Lead"("nextFollowUpDate");
CREATE INDEX "Lead_lastCallDate_idx" ON "Lead"("lastCallDate");

-- Insert default PINs (change these for production!)
INSERT INTO "Pin" ("id", "pinNumber", "role", "createdAt", "updatedAt")
VALUES
  ('clpin001', '1234', 'ADMIN', NOW(), NOW()),
  ('clpin002', '2345', 'EXPENSE_INVENTORY', NOW(), NOW()),
  ('clpin003', '3456', 'INVENTORY_ONLY', NOW(), NOW());

-- Done!
SELECT 'Migration 1.1 complete - Initial database setup' as status;
```

---

### Migration 1.5 - Add REGISTRY_MANAGER Role

```sql
-- =============================================
-- USSG Migration 1.5: Add REGISTRY_MANAGER Role
-- Run AFTER Migration 1.1
-- =============================================

-- Add new value to PinRole enum
ALTER TYPE "PinRole" ADD VALUE 'REGISTRY_MANAGER';

-- Insert PIN for Registry Manager
INSERT INTO "Pin" ("id", "pinNumber", "role", "createdAt", "updatedAt")
VALUES ('clpin004', '4567', 'REGISTRY_MANAGER', NOW(), NOW());

-- Done!
SELECT 'Migration 1.5 complete - REGISTRY_MANAGER role added' as status;
```

---

### Migration 2.1 - Rename AP_BLUE to ECO

```sql
-- =============================================
-- USSG Migration 2.1: Rename AP_BLUE to ECO
-- Run AFTER Migration 1.5
-- =============================================

-- Step 1: Add ECO to the enum
ALTER TYPE "BucketType" ADD VALUE 'ECO';

-- Step 2: Update any existing AP_BLUE data to ECO
-- (Run this only if there's existing data)
UPDATE "InventoryTransaction"
SET "bucketType" = 'ECO'
WHERE "bucketType" = 'AP_BLUE';

-- Note: PostgreSQL doesn't allow removing enum values easily.
-- AP_BLUE will remain in enum but won't be used.
-- This is fine for production use.

-- Done!
SELECT 'Migration 2.1 complete - ECO bucket added (AP_BLUE deprecated)' as status;
```

---

### Migration 3.1 - Registry Tables

```sql
-- =============================================
-- USSG Migration 3.1: Registry Module Tables
-- Run AFTER Migration 2.1
-- =============================================

-- RegistryRecord table
CREATE TABLE "RegistryRecord" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "field1" TEXT,
    "field2" TEXT,
    "field3" TEXT,
    "field4" TEXT,
    "field5" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistryRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistryRecord_name_idx" ON "RegistryRecord"("name");
CREATE INDEX "RegistryRecord_phone_idx" ON "RegistryRecord"("phone");

-- RegistryTransaction table
CREATE TABLE "RegistryTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RegistryTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RegistryTransaction_date_idx" ON "RegistryTransaction"("date");
CREATE INDEX "RegistryTransaction_type_idx" ON "RegistryTransaction"("type");

-- Add registry counts to BackupLog (optional, for future backups)
ALTER TABLE "BackupLog" ADD COLUMN IF NOT EXISTS "registryRecordsCount" INTEGER DEFAULT 0;
ALTER TABLE "BackupLog" ADD COLUMN IF NOT EXISTS "registryTransactionsCount" INTEGER DEFAULT 0;

-- Done!
SELECT 'Migration 3.1 complete - Registry tables created' as status;
```

---

## Files to Modify Reference

### Quick Reference by Day

| Day | Files |
|-----|-------|
| 1 | `package.json`, `src/app/layout.tsx`, `src/components/Layout/Header.tsx`, `src/lib/backup.ts`, `prisma/schema.prisma`, `src/types/index.ts`, `src/lib/auth.ts` |
| 2 | `prisma/schema.prisma`, `src/types/index.ts`, `src/middleware.ts`, `src/components/Layout/Header.tsx`, `src/store/modeStore.ts` (new), `src/app/registry/*` (new) |
| 3 | `prisma/schema.prisma`, `src/types/index.ts`, `src/app/api/registry/*` (new), `src/app/registry/page.tsx`, `src/app/registry/expenses/page.tsx` |
| 4 | `src/app/api/registry/search/route.ts` (new), `src/app/api/registry/dashboard/route.ts` (new), `src/lib/backup.ts`, `src/app/api/admin/backup/restore/route.ts`, `src/app/api/admin/migrate/*` (new) |

---

## Information Needed From Client

### Before Day 1
- [ ] Confirm app name: "Urmaliya Shri Sai Group" or shorter?
- [ ] Logo file (PNG or SVG preferred, ideally square)
- [ ] Google Drive folder ID for backups (or create new folder)

### Before Day 3
- [ ] Registry record structure:
  - What fields per customer? (name, phone, address are default)
  - What are field1-field5 actually called?
  - Any additional fields needed?

### Before Day 4
- [ ] Leads sheet from client:
  - Column names for: Name, Phone, Company, etc.
  - Sample file to test import

- [ ] Expenses sheet from client (if different from PMR format):
  - Column names for: Date, Amount, Account, Type, Name

- [ ] Statement branding:
  - Company full name
  - Address
  - Phone/Email
  - GSTIN (if applicable)
  - Any tagline or footer text

### Dashboard Metrics (can decide later)
- [ ] What key metrics to show on Registry Dashboard?

---

## Deployment Checklist

### Before Go-Live
```
[ ] All environment variables set in hosting platform
[ ] Supabase project configured and tested
[ ] All SQL migrations executed in order
[ ] Google Drive backup folder created and connected
[ ] All 4 PINs set and communicated to client
[ ] One-time data migration completed (Leads, Expenses)
[ ] Full backup created and verified
[ ] All features tested end-to-end
[ ] Statement branding verified
```

### Post-Deployment
```
[ ] Verify automatic backups working
[ ] Verify all 4 PIN levels can log in
[ ] Verify mode toggle works for Admin
[ ] Verify Registry CRUD works
[ ] Train client on basic usage
[ ] Document custom configurations
```

---

*End of USSG Implementation Plan*
