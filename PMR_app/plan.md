# PMR Industries - Inventory & Expense Management System
## Complete Technical Specification Document
New Database
---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [Authentication System](#authentication-system)
5. [File Structure](#file-structure)
6. [API Endpoints](#api-endpoints)
7. [Feature Specifications](#feature-specifications)
8. [UI/UX Design Guidelines](#uiux-design-guidelines)
9. [Google Drive Integration](#google-drive-integration)
10. [PWA Configuration](#pwa-configuration)
11. [Deployment Configuration](#deployment-configuration)
12. [Development Phases](#development-phases)

---

## 1. Project Overview

### 1.1 Application Purpose
A web-based inventory and expense management system for PMR Industries to track bucket inventory across two warehouses and manage company expenses with role-based access control.

### 1.2 Key Users
- **Admin (PIN 1)**: Full access to all features
- **Expense + Inventory Manager (PIN 2)**: Can add/view expenses, manage inventory
- **Inventory Manager (PIN 3)**: Can only manage inventory

### 1.3 Core Modules
1. **Inventory Management**: Track 10 bucket types across 2 warehouses
2. **Expense Tracking**: Record income/expenses across multiple accounts
3. **Dashboard**: Visual analytics for admin
4. **Customer Statements**: Generate PDF statements for vendors/customers
5. **Admin Panel**: Manage PINs, bulk upload, backups

---

## 2. Technology Stack

### 2.1 Frontend
```json
{
  "framework": "Next.js 14.0+",
  "language": "TypeScript",
  "styling": "Tailwind CSS 3.4+",
  "ui_components": "shadcn/ui",
  "charts": "recharts",
  "forms": "react-hook-form + zod",
  "state_management": "zustand",
  "date_handling": "date-fns",
  "pdf_generation": "jspdf + jspdf-autotable"
}
```

### 2.2 Backend
```json
{
  "runtime": "Node.js 20+",
  "framework": "Next.js API Routes",
  "database": "PostgreSQL 15+ (Vercel Postgres)",
  "orm": "Prisma 5.0+",
  "authentication": "Custom PIN-based auth with JWT",
  "file_storage": "Google Drive API v3"
}
```

### 2.3 Deployment
```json
{
  "hosting": "Vercel",
  "database": "Vercel Postgres",
  "cron_jobs": "Vercel Cron Jobs",
  "environment": "Production + Preview"
}
```

---

## 3. Database Schema

### 3.1 Prisma Schema

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTHENTICATION
// ============================================

model Pin {
  id          String   @id @default(cuid())
  pinNumber   String   @unique // 4-digit PIN
  role        PinRole
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([pinNumber])
}

enum PinRole {
  ADMIN              // PIN 1: Full access
  EXPENSE_INVENTORY  // PIN 2: Expenses + Inventory
  INVENTORY_ONLY     // PIN 3: Inventory only
}

// ============================================
// INVENTORY MODULE
// ============================================

model InventoryTransaction {
  id            String        @id @default(cuid())
  date          DateTime
  warehouse     Warehouse
  bucketType    BucketType
  action        ActionType
  quantity      Int           // Signed: negative for Sell, positive for Stock
  buyerSeller   String
  runningTotal  Int
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([date])
  @@index([warehouse])
  @@index([bucketType])
  @@index([buyerSeller])
}

enum Warehouse {
  PALLAVI
  TULARAM
}

enum BucketType {
  TATA_G
  TATA_W
  AL_10_LTR
  AL
  BB
  ES
  MH
  MH_10_LTR
  TATA_10_LTR
  IBC_TANK
}

enum ActionType {
  STOCK
  SELL
}

// ============================================
// EXPENSE MODULE
// ============================================

model ExpenseTransaction {
  id          String          @id @default(cuid())
  date        DateTime
  amount      Decimal         @db.Decimal(12, 2) // Up to 99,99,99,999.99
  account     ExpenseAccount
  type        TransactionType
  name        String          // Vendor/Customer name
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@index([date])
  @@index([account])
  @@index([type])
  @@index([name])
}

enum ExpenseAccount {
  CASH
  PRASHANT_GAYDHANE
  PMR
  KPG_SAVING
  KP_ENTERPRISES
}

enum TransactionType {
  INCOME
  EXPENSE
}

// ============================================
// BACKUP LOGS
// ============================================

model BackupLog {
  id              String   @id @default(cuid())
  backupDate      DateTime @default(now())
  backupType      String   // "MANUAL" or "AUTOMATIC"
  driveFileId     String?  // Google Drive file ID
  inventoryCount  Int
  expenseCount    Int
  status          String   // "SUCCESS" or "FAILED"
  errorMessage    String?

  @@index([backupDate])
}

// ============================================
// SYSTEM SETTINGS
// ============================================

model SystemSettings {
  id                    String   @id @default(cuid())
  key                   String   @unique
  value                 String
  updatedAt             DateTime @updatedAt
}
```

### 3.2 Initial Database Seed

```typescript
// prisma/seed.ts

import { PrismaClient, PinRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default PINs (should be changed by admin)
  await prisma.pin.createMany({
    data: [
      { pinNumber: '1111', role: PinRole.ADMIN },
      { pinNumber: '2222', role: PinRole.EXPENSE_INVENTORY },
      { pinNumber: '3333', role: PinRole.INVENTORY_ONLY },
    ],
    skipDuplicates: true,
  })

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.disconnect()
  })
```

---

## 4. Authentication System

### 4.1 PIN-Based Authentication Flow

```typescript
// lib/auth.ts

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-here')

export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  expiresAt: number
}

// Create session token
export async function createSession(pinId: string, role: SessionData['role']) {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  
  const token = await new SignJWT({ pinId, role, expiresAt })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY)

  const cookieStore = cookies()
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours
  })

  return token
}

// Verify session token
export async function verifySession(): Promise<SessionData | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return null

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY)
    return payload as unknown as SessionData
  } catch (error) {
    return null
  }
}

// Delete session
export async function deleteSession() {
  const cookieStore = cookies()
  cookieStore.delete('session')
}

// Check permissions
export function hasPermission(
  userRole: SessionData['role'],
  requiredRole: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
): boolean {
  const roleHierarchy = {
    ADMIN: 3,
    EXPENSE_INVENTORY: 2,
    INVENTORY_ONLY: 1,
  }

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}
```

### 4.2 Middleware for Route Protection

```typescript
// middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySession } from '@/lib/auth'

const publicRoutes = ['/login']

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Allow public routes
  if (publicRoutes.includes(path)) {
    return NextResponse.next()
  }

  // Verify session
  const session = await verifySession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin-only routes
  if (path.startsWith('/admin') || path.startsWith('/dashboard')) {
    if (session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/inventory', request.url))
    }
  }

  // Expense routes - require ADMIN or EXPENSE_INVENTORY
  if (path.startsWith('/expenses')) {
    if (session.role === 'INVENTORY_ONLY') {
      return NextResponse.redirect(new URL('/inventory', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

---

## 5. File Structure

```
pmr-industries/
├── .env.local
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── icons/
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── apple-touch-icon.png
│   ├── manifest.json
│   └── pmr-logo.png
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx (redirects to /login)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── InventoryDashboard.tsx
│   │   │       ├── AddEntryForm.tsx
│   │   │       ├── TransactionLog.tsx
│   │   │       └── DateSearch.tsx
│   │   ├── expenses/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── AddExpenseForm.tsx
│   │   │       └── ExpenseTable.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── SummaryCards.tsx
│   │   │       ├── MonthlyBarChart.tsx
│   │   │       ├── AccountBreakdown.tsx
│   │   │       ├── TrendLineChart.tsx
│   │   │       └── MonthlyTable.tsx
│   │   ├── statements/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── StatementGenerator.tsx
│   │   │       └── PDFDownload.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   └── components/
│   │   │       ├── PinManagement.tsx
│   │   │       ├── BulkUpload.tsx
│   │   │       └── BackupManager.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── logout/route.ts
│   │       ├── inventory/
│   │       │   ├── route.ts (GET, POST)
│   │       │   └── [id]/route.ts (PUT, DELETE)
│   │       ├── expenses/
│   │       │   ├── route.ts (GET, POST)
│   │       │   └── [id]/route.ts (PUT, DELETE)
│   │       ├── dashboard/
│   │       │   └── route.ts
│   │       ├── statements/
│   │       │   └── route.ts
│   │       ├── admin/
│   │       │   ├── pins/route.ts
│   │       │   ├── upload/route.ts
│   │       │   └── backup/route.ts
│   │       └── cron/
│   │           └── daily-backup/route.ts
│   ├── components/
│   │   ├── ui/ (shadcn components)
│   │   ├── Layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── MobileNav.tsx
│   │   └── shared/
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorMessage.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   ├── google-drive.ts
│   │   ├── pdf-generator.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useInventory.ts
│   │   ├── useExpenses.ts
│   │   └── useAuth.ts
│   ├── store/
│   │   └── authStore.ts
│   └── types/
│       └── index.ts
└── vercel.json
```

---

## 6. API Endpoints

### 6.1 Authentication APIs

#### POST /api/auth/login
**Request:**
```typescript
{
  pin: string // 4-digit PIN
}
```

**Response:**
```typescript
{
  success: boolean
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  message?: string
}
```

#### POST /api/auth/logout
**Response:**
```typescript
{
  success: boolean
}
```

### 6.2 Inventory APIs

#### GET /api/inventory
**Query Parameters:**
```typescript
{
  date?: string // ISO date for filtering
  warehouse?: 'PALLAVI' | 'TULARAM'
  bucketType?: string
}
```

**Response:**
```typescript
{
  transactions: Array<{
    id: string
    date: string
    warehouse: string
    bucketType: string
    action: string
    quantity: number
    buyerSeller: string
    runningTotal: number
  }>
  summary: Array<{
    bucketType: string
    pallavi: number
    tularam: number
    total: number
  }>
}
```

#### POST /api/inventory
**Request:**
```typescript
{
  date: string // ISO date
  warehouse: 'PALLAVI' | 'TULARAM'
  bucketType: BucketType
  action: 'STOCK' | 'SELL'
  quantity: number // Always positive, will be signed based on action
  buyerSeller: string
}
```

**Response:**
```typescript
{
  success: boolean
  transaction: InventoryTransaction
  message?: string
}
```

#### PUT /api/inventory/[id]
**Request:**
```typescript
{
  date?: string
  warehouse?: string
  bucketType?: string
  action?: string
  quantity?: number
  buyerSeller?: string
}
```

**Response:**
```typescript
{
  success: boolean
  transaction: InventoryTransaction
  message?: string
}
```

#### DELETE /api/inventory/[id]
**Response:**
```typescript
{
  success: boolean
  message?: string
}
```

### 6.3 Expense APIs

#### GET /api/expenses
**Query Parameters:**
```typescript
{
  startDate?: string
  endDate?: string
  account?: string
  type?: 'INCOME' | 'EXPENSE'
  name?: string
  page?: number
  limit?: number // Default 100
}
```

**Response:**
```typescript
{
  transactions: Array<ExpenseTransaction>
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  uniqueNames: string[] // For autocomplete
}
```

#### POST /api/expenses
**Request:**
```typescript
{
  date: string
  amount: number
  account: ExpenseAccount
  type: 'INCOME' | 'EXPENSE'
  name: string
}
```

**Response:**
```typescript
{
  success: boolean
  transaction: ExpenseTransaction
  message?: string
}
```

#### PUT /api/expenses/[id]
**Request:** Same as POST

**Response:**
```typescript
{
  success: boolean
  transaction: ExpenseTransaction
  message?: string
}
```

#### DELETE /api/expenses/[id]
**Response:**
```typescript
{
  success: boolean
  message?: string
}
```

### 6.4 Dashboard API

#### GET /api/dashboard
**Query Parameters:**
```typescript
{
  year?: number
  startDate?: string
  endDate?: string
  view?: 'year' | 'last12months' | 'alltime'
}
```

**Response:**
```typescript
{
  summary: {
    totalIncome: number
    totalExpense: number
    netProfit: number
  }
  monthlyData: Array<{
    month: string
    income: number
    expense: number
    net: number
  }>
  accountBreakdown: {
    income: Array<{ account: string; amount: number }>
    expense: Array<{ account: string; amount: number }>
  }
  trendData: Array<{
    month: string
    income: number
    expense: number
  }>
}
```

### 6.5 Statement API

#### GET /api/statements
**Query Parameters:**
```typescript
{
  name: string
  startDate?: string
  endDate?: string
}
```

**Response:**
```typescript
{
  name: string
  transactions: Array<ExpenseTransaction>
  totalBalance: number // Income - Expense
}
```

### 6.6 Admin APIs

#### GET /api/admin/pins
**Response:**
```typescript
{
  pins: Array<{
    id: string
    role: string
    // PIN number is NOT exposed for security
  }>
}
```

#### PUT /api/admin/pins
**Request:**
```typescript
{
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY'
  newPin: string // 4-digit PIN
}
```

**Response:**
```typescript
{
  success: boolean
  message?: string
}
```

#### POST /api/admin/upload
**Request:** FormData with Excel file
```typescript
FormData {
  file: File // Excel with sheets: "Inventory", "Expenses"
}
```

**Response:**
```typescript
{
  success: boolean
  inventoryCount: number
  expenseCount: number
  message?: string
}
```

#### POST /api/admin/backup
**Request:**
```typescript
{
  type: 'MANUAL' | 'AUTOMATIC'
}
```

**Response:**
```typescript
{
  success: boolean
  driveFileId?: string
  inventoryCount: number
  expenseCount: number
  message?: string
}
```

### 6.7 Cron Job API

#### GET /api/cron/daily-backup
**Headers:**
```typescript
{
  Authorization: Bearer CRON_SECRET
}
```

**Response:**
```typescript
{
  success: boolean
  message?: string
}
```

---

## 7. Feature Specifications

### 7.1 Login Page

**Route:** `/login`

**UI Components:**
- PMR Industries logo
- 4-digit PIN input (numeric keyboard on mobile)
- Submit button
- Simple, clean design with Anthropic aesthetic

**Functionality:**
```typescript
// Login flow
1. User enters 4-digit PIN
2. System validates PIN against database
3. If valid:
   - Create JWT session
   - Set httpOnly cookie
   - Redirect based on role:
     - ADMIN → /dashboard
     - EXPENSE_INVENTORY → /inventory
     - INVENTORY_ONLY → /inventory
4. If invalid:
   - Show error message
   - Clear PIN input
```

**Code Structure:**
```typescript
// app/login/page.tsx

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (data.success) {
        // Redirect based on role
        if (data.role === 'ADMIN') {
          router.push('/dashboard')
        } else {
          router.push('/inventory')
        }
      } else {
        setError('Invalid PIN')
        setPin('')
      }
    } catch (error) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <img src="/pmr-logo.png" alt="PMR Industries" className="mx-auto h-16" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Enter PIN
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <Input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Enter 4-digit PIN"
            className="text-center text-2xl tracking-widest"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={pin.length !== 4 || loading} className="w-full">
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

### 7.2 Inventory Page

**Route:** `/inventory`

**Access:** All 3 PINs

**Sections:**

#### 7.2.1 Current Stock Dashboard

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Current Inventory Stock                     │
├──────────────┬────────────┬─────────┬───────┤
│ Bucket Type  │  Pallavi   │ Tularam │ Total │
├──────────────┼────────────┼─────────┼───────┤
│ TATA G       │     0      │   191   │  191  │
│ TATA W       │     0      │    1    │   1   │
│ AL 10 ltr    │     0      │   44    │  44   │
│ AL           │     0      │   310   │  310  │
│ BB           │     0      │   65    │  65   │
│ ES           │     0      │   30    │  30   │
│ MH           │     0      │   39    │  39   │
│ MH 10 Ltr    │     0      │   27    │  27   │
│ TATA 10 Ltr  │     0      │   59    │  59   │
│ IBC tank     │     0      │   16    │  16   │
└──────────────┴────────────┴─────────┴───────┘
```

**Calculation Logic:**
```typescript
// Calculate current stock per bucket per warehouse
function calculateStockSummary(transactions: InventoryTransaction[]) {
  const summary = {}
  
  // Group by bucket type and warehouse
  for (const bucket of Object.values(BucketType)) {
    for (const warehouse of Object.values(Warehouse)) {
      const key = `${bucket}_${warehouse}`
      
      // Get all transactions for this combination
      const relevantTransactions = transactions.filter(
        t => t.bucketType === bucket && t.warehouse === warehouse
      )
      
      // The last transaction has the running total
      const lastTransaction = relevantTransactions[relevantTransactions.length - 1]
      summary[key] = lastTransaction?.runningTotal || 0
    }
  }
  
  return summary
}
```

#### 7.2.2 Add Entry Button + Form

**Button:** Fixed at top of page (mobile-friendly)

**Form Modal:**
```typescript
// Form fields
{
  date: Date (default: today)
  warehouse: 'PALLAVI' | 'TULARAM' (dropdown)
  bucketType: BucketType (dropdown)
  action: 'STOCK' | 'SELL' (dropdown)
  quantity: number (positive only)
  buyerSeller: string (text input)
}
```

**Validation:**
```typescript
// Before submission
1. Check if quantity is positive
2. If action is SELL:
   - Get current stock for selected bucket + warehouse
   - If quantity > current stock:
     - Show error: "Cannot sell more than available stock"
     - Prevent submission
3. Calculate new running total:
   - currentStock + (action === 'SELL' ? -quantity : quantity)
```

**Form Component:**
```typescript
// components/inventory/AddEntryForm.tsx

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

const formSchema = z.object({
  date: z.date(),
  warehouse: z.enum(['PALLAVI', 'TULARAM']),
  bucketType: z.string(),
  action: z.enum(['STOCK', 'SELL']),
  quantity: z.number().positive(),
  buyerSeller: z.string().min(1),
})

export function AddEntryForm({ open, onClose, onSuccess, currentStock }) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      warehouse: 'TULARAM',
      action: 'STOCK',
      quantity: 0,
    },
  })

  const onSubmit = async (data) => {
    // Validation for overselling
    if (data.action === 'SELL') {
      const stock = currentStock[`${data.bucketType}_${data.warehouse}`] || 0
      if (data.quantity > stock) {
        form.setError('quantity', {
          message: `Cannot sell ${data.quantity}. Only ${stock} available in stock.`,
        })
        return
      }
    }

    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        onSuccess()
        onClose()
        form.reset()
      }
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bucket Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          {/* Form fields here */}
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

#### 7.2.3 Transaction Log

**Display:**
- Reverse chronological order (newest first)
- Columns: Date | Warehouse | Bucket Type | Action | Quantity | Buyer/Seller | Running Total
- Color coding:
  - STOCK rows: Light green background
  - SELL rows: Light red background
- Mobile responsive (stack columns or horizontal scroll)

**Admin Features:**
- Edit icon on each row → Opens edit modal
- Delete icon on each row → Confirmation dialog
- Edit modal same as Add form, pre-filled with existing data
- On edit: Recalculate all running totals after that transaction

#### 7.2.4 Date Search (Admin Only)

**UI:**
- Date picker component (modern calendar UI)
- "Search" button
- Results show below

**Functionality:**
```typescript
// Filter transactions by date
const filteredTransactions = transactions.filter(
  t => format(t.date, 'yyyy-MM-dd') === selectedDate
)
```

### 7.3 Expenses Page

**Route:** `/expenses`

**Access:** Admin (PIN 1) + Expense Manager (PIN 2)

**Layout:**

#### 7.3.1 Add Expense Button

**Form Fields:**
```typescript
{
  date: Date
  amount: number (positive, in ₹)
  account: ExpenseAccount (dropdown)
  type: 'INCOME' | 'EXPENSE' (dropdown)
  name: string (autocomplete)
}
```

**Autocomplete Logic:**
```typescript
// As user types in 'name' field
1. Fetch unique names from database
2. Filter names that match input
3. Show dropdown with suggestions
4. User can select or type new name
```

#### 7.3.2 Expense Table

**Display:**
- Paginated (100 entries per page) or infinite scroll
- Columns: Date | Amount | Account | Type | Name
- Color coding:
  - INCOME: Green text/background
  - EXPENSE: Red text/background
- Mobile responsive

**Admin Only:**
- Edit/Delete buttons on each row
- Edit opens modal with pre-filled data
- Delete shows confirmation dialog

**Pagination Component:**
```typescript
// components/expenses/ExpenseTable.tsx

export function ExpenseTable({ userRole }) {
  const [page, setPage] = useState(1)
  const [transactions, setTransactions] = useState([])
  const [total, setTotal] = useState(0)
  const limit = 100

  useEffect(() => {
    fetchExpenses()
  }, [page])

  const fetchExpenses = async () => {
    const response = await fetch(`/api/expenses?page=${page}&limit=${limit}`)
    const data = await response.json()
    setTransactions(data.transactions)
    setTotal(data.pagination.total)
  }

  return (
    <div>
      <table>
        {/* Table rows */}
      </table>
      
      <div className="pagination">
        <Button 
          disabled={page === 1}
          onClick={() => setPage(p => p - 1)}
        >
          Previous
        </Button>
        <span>Page {page} of {Math.ceil(total / limit)}</span>
        <Button 
          disabled={page >= Math.ceil(total / limit)}
          onClick={() => setPage(p => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
```

### 7.4 Dashboard (Admin Only)

**Route:** `/dashboard`

**Access:** Admin only (PIN 1)

#### 7.4.1 Filters

**Top of Page:**
```
┌──────────────────────────────────────────────┐
│ Year: [2025 ▼]  [Last 12 Months] [All Time] │
│ Custom Range: [From Date] to [To Date] [Go] │
└──────────────────────────────────────────────┘
```

**Filter Logic:**
```typescript
const [view, setView] = useState<'year' | 'last12months' | 'alltime' | 'custom'>('year')
const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
const [dateRange, setDateRange] = useState({ from: null, to: null })

// Fetch data based on active filter
useEffect(() => {
  fetchDashboardData()
}, [view, selectedYear, dateRange])
```

#### 7.4.2 Summary Cards

```
┌─────────────────┬─────────────────┬─────────────────┐
│  Total Income   │ Total Expense   │   Net Profit    │
│   ₹32,18,110    │   ₹27,33,589    │   ₹4,84,521     │
│   ↑ 12% from    │   ↓ 5% from     │   ↑ 45% from    │
│   last period   │   last period   │   last period   │
└─────────────────┴─────────────────┴─────────────────┘
```

**Card Component:**
```typescript
// components/dashboard/SummaryCards.tsx

export function SummaryCards({ data }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-700">Total Income</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-900">
            ₹{formatCurrency(data.totalIncome)}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-red-50 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Total Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-red-900">
            ₹{formatCurrency(data.totalExpense)}
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-700">Net Profit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-blue-900">
            ₹{formatCurrency(data.netProfit)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 7.4.3 Monthly Bar Chart

**Chart:** Side-by-side bars for Income (green) and Expense (red)

```typescript
// components/dashboard/MonthlyBarChart.tsx

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function MonthlyBarChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Income vs Expense</CardTitle>
      </CardHeader>
      <CardContent>
        <BarChart width={800} height={400} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="income" fill="#22c55e" name="Income" />
          <Bar dataKey="expense" fill="#ef4444" name="Expense" />
        </BarChart>
      </CardContent>
    </Card>
  )
}
```

#### 7.4.4 Account Breakdown

**Layout:** Two pie charts side by side

```
┌──────────────────┬──────────────────┐
│  Income by       │  Expense by      │
│  Account         │  Account         │
│                  │                  │
│  [Pie Chart]     │  [Pie Chart]     │
│                  │                  │
│  Cash: 45%       │  PMR: 60%        │
│  PMR: 30%        │  Cash: 25%       │
│  KPG: 25%        │  Others: 15%     │
└──────────────────┴──────────────────┘
```

```typescript
// components/dashboard/AccountBreakdown.tsx

import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

export function AccountBreakdown({ incomeData, expenseData }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-green-700">Income by Account</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart width={300} height={300}>
            <Pie
              data={incomeData}
              dataKey="amount"
              nameKey="account"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {incomeData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-red-700">Expense by Account</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart width={300} height={300}>
            <Pie
              data={expenseData}
              dataKey="amount"
              nameKey="account"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {expenseData.map((entry, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 7.4.5 Trend Line Chart

**Chart:** Two lines (Income in green, Expense in red)

```typescript
// components/dashboard/TrendLineChart.tsx

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function TrendLineChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Income & Expense Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <LineChart width={800} height={400} data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} name="Income" />
          <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Expense" />
        </LineChart>
      </CardContent>
    </Card>
  )
}
```

#### 7.4.6 Monthly Table

**Display:** Same as screenshot provided

```typescript
// components/dashboard/MonthlyTable.tsx

export function MonthlyTable({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full">
          <thead>
            <tr className="bg-orange-400">
              <th>Month</th>
              <th>Total Income</th>
              <th>Total Expenses</th>
              <th>Net Total</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr 
                key={index}
                className={row.net >= 0 ? 'bg-green-50' : 'bg-red-50'}
              >
                <td>{row.month}</td>
                <td className="text-green-700">₹{formatCurrency(row.income)}</td>
                <td className="text-red-700">₹{formatCurrency(row.expense)}</td>
                <td className={row.net >= 0 ? 'text-green-900 font-bold' : 'text-red-900 font-bold'}>
                  ₹{formatCurrency(row.net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
```

### 7.5 Customer Statements Page

**Route:** `/statements`

**Access:** Admin only (PIN 1)

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Generate Customer Statement                 │
│                                              │
│  Select Name: [OM NAGPUR ▼]                 │
│  Date Range: [From Date] to [To Date]       │
│  (Optional - leave blank for all time)       │
│                                              │
│  [Generate PDF]                              │
└─────────────────────────────────────────────┘

Preview:
┌─────────────────────────────────────────────┐
│  PMR Industries                              │
│  (Logo + Contact Details)                    │
│                                              │
│  Bill Summary for: OM NAGPUR                 │
│                          Total Balance: ₹... │
│                                              │
│  # | Date | Amount | Account | Type         │
│ ────────────────────────────────────────    │
│  1 | 1-Jan | ₹140,000 | PMR | Expense       │
│  2 | 2-Jan | ₹130,000 | PMR | Expense       │
│  ...                                         │
└─────────────────────────────────────────────┘
```

**PDF Generation:**
```typescript
// lib/pdf-generator.ts

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function generateCustomerStatement(data: {
  name: string
  transactions: any[]
  totalBalance: number
}) {
  const doc = new jsPDF()

  // Add logo
  doc.addImage('/pmr-logo.png', 'PNG', 10, 10, 30, 30)

  // Company details
  doc.setFontSize(20)
  doc.text('PMR Industries', 50, 20)
  doc.setFontSize(10)
  doc.text('At manegaon/s House no 592 post Pmpalgaon dist Bhandara Maharashtra', 50, 28)
  doc.text('Phone: 7020143332,7030847030', 50, 34)
  doc.text('Email: pbgaydhane@gmail.com', 50, 40)
  doc.text('GSTIN: 27AWQPG1790F1Z8', 50, 46)

  // Bill summary
  doc.setFontSize(14)
  doc.text(`Bill Summary for: ${data.name}`, 10, 60)
  
  // Total balance
  doc.setFontSize(12)
  doc.setTextColor(data.totalBalance >= 0 ? '#22c55e' : '#ef4444')
  doc.text(`Total Balance: ₹${data.totalBalance.toLocaleString('en-IN')}`, 150, 60)

  // Transaction table
  autoTable(doc, {
    startY: 70,
    head: [['#', 'Date', 'Amount', 'Account', 'Type']],
    body: data.transactions.map((t, index) => [
      index + 1,
      format(new Date(t.date), 'dd-MMM-yyyy'),
      `₹${t.amount.toLocaleString('en-IN')}`,
      t.account,
      t.type,
    ]),
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [251, 146, 60] }, // Orange
  })

  return doc
}
```

**Component:**
```typescript
// app/statements/page.tsx

'use client'

export default function StatementsPage() {
  const [selectedName, setSelectedName] = useState('')
  const [dateRange, setDateRange] = useState({ from: null, to: null })
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Fetch all unique names from expenses
    fetchNames()
  }, [])

  const fetchNames = async () => {
    const response = await fetch('/api/expenses')
    const data = await response.json()
    setNames(data.uniqueNames)
  }

  const handleGenerate = async () => {
    setLoading(true)
    
    const params = new URLSearchParams({
      name: selectedName,
      ...(dateRange.from && { startDate: dateRange.from }),
      ...(dateRange.to && { endDate: dateRange.to }),
    })

    const response = await fetch(`/api/statements?${params}`)
    const data = await response.json()

    // Generate PDF
    const pdf = generateCustomerStatement(data)
    pdf.save(`${selectedName}_statement.pdf`)

    setLoading(false)
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate Customer Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select
              value={selectedName}
              onValueChange={setSelectedName}
              options={names}
              placeholder="Select Name"
            />
            
            <div className="flex gap-4">
              <DatePicker
                selected={dateRange.from}
                onChange={(date) => setDateRange({ ...dateRange, from: date })}
                placeholderText="From Date (Optional)"
              />
              <DatePicker
                selected={dateRange.to}
                onChange={(date) => setDateRange({ ...dateRange, to: date })}
                placeholderText="To Date (Optional)"
              />
            </div>

            <Button 
              onClick={handleGenerate} 
              disabled={!selectedName || loading}
              className="w-full"
            >
              {loading ? 'Generating...' : 'Generate PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

### 7.6 Admin Settings Page

**Route:** `/admin`

**Access:** Admin only (PIN 1)

#### 7.6.1 PIN Management

```
┌─────────────────────────────────────────────┐
│  Change PINs                                 │
│                                              │
│  Admin PIN (Full Access)                     │
│  New PIN: [____]  [Update]                  │
│                                              │
│  Expense + Inventory PIN                     │
│  New PIN: [____]  [Update]                  │
│                                              │
│  Inventory Only PIN                          │
│  New PIN: [____]  [Update]                  │
└─────────────────────────────────────────────┘
```

**Component:**
```typescript
// components/admin/PinManagement.tsx

export function PinManagement() {
  const [pins, setPins] = useState({
    admin: '',
    expenseInventory: '',
    inventoryOnly: '',
  })

  const handleUpdatePin = async (role: string, newPin: string) => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      alert('PIN must be exactly 4 digits')
      return
    }

    const response = await fetch('/api/admin/pins', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, newPin }),
    })

    if (response.ok) {
      alert('PIN updated successfully')
      setPins({ ...pins, [role]: '' })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change PINs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Admin PIN */}
        <div>
          <Label>Admin PIN (Full Access)</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              maxLength={4}
              value={pins.admin}
              onChange={(e) => setPins({ ...pins, admin: e.target.value })}
              placeholder="New 4-digit PIN"
            />
            <Button onClick={() => handleUpdatePin('ADMIN', pins.admin)}>
              Update
            </Button>
          </div>
        </div>

        {/* Similar for other PINs */}
      </CardContent>
    </Card>
  )
}
```

#### 7.6.2 Bulk Upload

```
┌─────────────────────────────────────────────┐
│  Bulk Upload Data                            │
│                                              │
│  Upload Excel file with 2 sheets:            │
│  1. "Inventory" - Inventory transactions     │
│  2. "Expenses" - Expense transactions        │
│                                              │
│  [Choose File]  [Upload]                    │
│                                              │
│  Status: Ready                               │
└─────────────────────────────────────────────┘
```

**Expected Excel Format:**

**Sheet 1: "Inventory"**
| Date | Warehouse | BucketType | Action | Quantity | BuyerSeller |
|------|-----------|------------|--------|----------|-------------|
| 2025-01-01 | TULARAM | TATA G | STOCK | 100 | rajkumar |

**Sheet 2: "Expenses"**
| Date | Amount | Account | Type | Name |
|------|--------|---------|------|------|
| 2025-01-01 | 30000 | CASH | EXPENSE | BHUSHAN DONODE |

**Component:**
```typescript
// components/admin/BulkUpload.tsx

import * as XLSX from 'xlsx'

export function BulkUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState('Ready')
  const [loading, setLoading] = useState(false)

  const handleUpload = async () => {
    if (!file) return

    setLoading(true)
    setStatus('Processing...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setStatus(`Success! Uploaded ${data.inventoryCount} inventory + ${data.expenseCount} expense records`)
      } else {
        setStatus(`Error: ${data.message}`)
      }
    } catch (error) {
      setStatus('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Upload Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Upload Excel file with 2 sheets: "Inventory" and "Expenses"
          </p>
          
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <Button 
            onClick={handleUpload} 
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </Button>

          <p className="text-sm">Status: {status}</p>
        </div>
      </CardContent>
    </Card>
  )
}
```

**API Handler:**
```typescript
// app/api/admin/upload/route.ts

import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer)

    // Process Inventory sheet
    const inventorySheet = workbook.Sheets['Inventory']
    const inventoryData = XLSX.utils.sheet_to_json(inventorySheet)
    
    // Process Expenses sheet
    const expensesSheet = workbook.Sheets['Expenses']
    const expensesData = XLSX.utils.sheet_to_json(expensesSheet)

    // Insert into database
    const inventoryPromises = inventoryData.map((row: any) => {
      // Calculate running total logic here
      return prisma.inventoryTransaction.create({
        data: {
          date: new Date(row.Date),
          warehouse: row.Warehouse,
          bucketType: row.BucketType,
          action: row.Action,
          quantity: row.Quantity * (row.Action === 'SELL' ? -1 : 1),
          buyerSeller: row.BuyerSeller,
          runningTotal: 0, // Calculate properly
        },
      })
    })

    const expensePromises = expensesData.map((row: any) =>
      prisma.expenseTransaction.create({
        data: {
          date: new Date(row.Date),
          amount: row.Amount,
          account: row.Account,
          type: row.Type,
          name: row.Name,
        },
      })
    )

    await Promise.all([...inventoryPromises, ...expensePromises])

    return Response.json({
      success: true,
      inventoryCount: inventoryData.length,
      expenseCount: expensesData.length,
    })
  } catch (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }
}
```

#### 7.6.3 Backup Manager

```
┌─────────────────────────────────────────────┐
│  Backup Manager                              │
│                                              │
│  Automatic Backup: Enabled ✓                 │
│  Schedule: Daily at 12:00 AM IST             │
│  Last Backup: 19-Nov-2025 12:00 AM           │
│  Status: Success                             │
│                                              │
│  [Manual Backup Now]                         │
│                                              │
│  Recent Backups:                             │
│  ├─ 19-Nov-2025 12:00 AM (Auto) ✓           │
│  ├─ 18-Nov-2025 12:00 AM (Auto) ✓           │
│  └─ 17-Nov-2025 03:45 PM (Manual) ✓         │
└─────────────────────────────────────────────┘
```

**Component:**
```typescript
// components/admin/BackupManager.tsx

export function BackupManager() {
  const [backups, setBackups] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchBackupLogs()
  }, [])

  const fetchBackupLogs = async () => {
    const response = await fetch('/api/admin/backup')
    const data = await response.json()
    setBackups(data.logs)
  }

  const handleManualBackup = async () => {
    setLoading(true)
    
    const response = await fetch('/api/admin/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'MANUAL' }),
    })

    if (response.ok) {
      alert('Backup completed successfully')
      fetchBackupLogs()
    }

    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold">Automatic Backup: Enabled ✓</p>
              <p className="text-sm text-gray-600">Schedule: Daily at 12:00 AM IST</p>
            </div>
          </div>

          <Button 
            onClick={handleManualBackup} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Backing up...' : 'Manual Backup Now'}
          </Button>

          <div>
            <h4 className="font-semibold mb-2">Recent Backups</h4>
            <ul className="space-y-2">
              {backups.map((backup, index) => (
                <li key={index} className="text-sm">
                  {format(new Date(backup.backupDate), 'dd-MMM-yyyy hh:mm a')} 
                  ({backup.backupType}) {backup.status === 'SUCCESS' ? '✓' : '✗'}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 8. UI/UX Design Guidelines

### 8.1 Color Palette (Anthropic Style)

```css
/* Primary colors */
--primary: #D97757;      /* Warm terracotta */
--primary-hover: #C66643;

/* Neutral colors */
--background: #FAFAF8;   /* Warm off-white */
--surface: #FFFFFF;
--text-primary: #1A1A1A;
--text-secondary: #6B6B6B;
--border: #E5E5E5;

/* Semantic colors */
--success: #22c55e;      /* Green for income/profit */
--error: #ef4444;        /* Red for expense/loss */
--info: #3b82f6;         /* Blue for neutral */
--warning: #f59e0b;      /* Orange for alerts */
```

### 8.2 Typography

```css
/* Font family */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

/* Font sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

### 8.3 Component Styling

**Buttons:**
```css
.btn-primary {
  background: var(--primary);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(217, 119, 87, 0.3);
}
```

**Cards:**
```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
```

**Inputs:**
```css
.input {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  font-size: var(--text-base);
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(217, 119, 87, 0.1);
}
```

### 8.4 Layout Guidelines

**Header:**
- Fixed at top
- Height: 64px
- Logo on left
- Navigation in center
- User role indicator + logout on right

**Navigation:**
```
Desktop:
┌─────────────────────────────────────────────┐
│ [Logo]  Inventory  Expenses  Dashboard  ... │
└─────────────────────────────────────────────┘

Mobile (Bottom Nav):
┌─────────────────────────────────────────────┐
│             Content Area                     │
└─────────────────────────────────────────────┘
┌────────┬────────┬────────┬────────┬────────┐
│ Inv.   │ Exp.   │ Dash   │ Stmt   │ Admin  │
└────────┴────────┴────────┴────────┴────────┘
```

**Responsive Breakpoints:**
```css
/* Mobile: < 768px */
/* Tablet: 768px - 1024px */
/* Desktop: > 1024px */

@media (max-width: 768px) {
  /* Stack columns vertically */
  /* Show mobile navigation */
  /* Increase touch targets */
}
```

### 8.5 Mobile-First Considerations

**Touch Targets:**
- Minimum 44x44px for all interactive elements
- Adequate spacing between buttons

**Form Inputs:**
- Use `inputMode="numeric"` for number fields
- Use `type="date"` for date inputs
- Large, clear labels

**Tables:**
- Horizontal scroll on mobile
- OR stack columns vertically with labels

**Modals:**
- Full screen on mobile
- Slide up animation

---

## 9. Google Drive Integration

### 9.1 Setup Google Drive API

```typescript
// lib/google-drive.ts

import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/drive.file']

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
)

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
})

const drive = google.drive({ version: 'v3', auth: oauth2Client })

export async function uploadBackupToDrive(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  const fileMetadata = {
    name: fileName,
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID], // Backup folder ID
  }

  const media = {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    body: Readable.from(fileBuffer),
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id',
  })

  return response.data.id!
}

export async function listBackups(): Promise<any[]> {
  const response = await drive.files.list({
    q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 10,
  })

  return response.data.files || []
}
```

### 9.2 Backup Creation

```typescript
// lib/backup.ts

import * as XLSX from 'xlsx'
import { prisma } from './prisma'
import { uploadBackupToDrive } from './google-drive'

export async function createBackup(type: 'MANUAL' | 'AUTOMATIC') {
  try {
    // Fetch all data
    const inventory = await prisma.inventoryTransaction.findMany({
      orderBy: { date: 'asc' },
    })

    const expenses = await prisma.expenseTransaction.findMany({
      orderBy: { date: 'asc' },
    })

    // Create workbook
    const wb = XLSX.utils.book_new()

    // Inventory sheet
    const inventoryData = inventory.map(t => ({
      Date: format(t.date, 'yyyy-MM-dd'),
      Warehouse: t.warehouse,
      BucketType: t.bucketType,
      Action: t.action,
      Quantity: Math.abs(t.quantity),
      BuyerSeller: t.buyerSeller,
      RunningTotal: t.runningTotal,
    }))
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData)
    XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventory')

    // Expenses sheet
    const expensesData = expenses.map(t => ({
      Date: format(t.date, 'yyyy-MM-dd'),
      Amount: t.amount.toString(),
      Account: t.account,
      Type: t.type,
      Name: t.name,
    }))
    const wsExpenses = XLSX.utils.json_to_sheet(expensesData)
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses')

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Upload to Drive
    const fileName = `PMR_Backup_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`
    const driveFileId = await uploadBackupToDrive(buffer, fileName)

    // Log backup
    await prisma.backupLog.create({
      data: {
        backupType: type,
        driveFileId,
        inventoryCount: inventory.length,
        expenseCount: expenses.length,
        status: 'SUCCESS',
      },
    })

    return { success: true, driveFileId }
  } catch (error) {
    await prisma.backupLog.create({
      data: {
        backupType: type,
        inventoryCount: 0,
        expenseCount: 0,
        status: 'FAILED',
        errorMessage: error.message,
      },
    })

    return { success: false, error: error.message }
  }
}
```

### 9.3 Environment Variables

```env
# .env.local

DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key-here"

# Google Drive API
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="..."
GOOGLE_REFRESH_TOKEN="..."
GOOGLE_DRIVE_FOLDER_ID="..."

# Cron job secret
CRON_SECRET="..."
```

---

## 10. PWA Configuration

### 10.1 Manifest File

```json
// public/manifest.json

{
  "name": "PMR Industries - Inventory & Expense Manager",
  "short_name": "PMR Industries",
  "description": "Manage inventory and expenses for PMR Industries",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAFAF8",
  "theme_color": "#D97757",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 10.2 Service Worker

```typescript
// public/sw.js

const CACHE_NAME = 'pmr-industries-v1'
const urlsToCache = [
  '/',
  '/login',
  '/inventory',
  '/expenses',
  '/dashboard',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName)
          }
        })
      )
    )
  )
})
```

### 10.3 Next.js Configuration

```typescript
// next.config.js

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

module.exports = withPWA({
  // ... other Next.js config
})
```

### 10.4 Install Prompt

```typescript
// components/InstallPrompt.tsx

'use client'

import { useEffect, useState } from 'react'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setShowInstallPrompt(false)
    }

    setDeferredPrompt(null)
  }

  if (!showInstallPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white p-4 rounded-lg shadow-lg z-50">
      <p className="text-sm mb-2">Install PMR Industries app for quick access</p>
      <div className="flex gap-2">
        <Button onClick={handleInstall}>Install</Button>
        <Button variant="ghost" onClick={() => setShowInstallPrompt(false)}>
          Not now
        </Button>
      </div>
    </div>
  )
}
```

---

## 11. Deployment Configuration

### 11.1 Vercel Configuration

```json
// vercel.json

{
  "buildCommand": "prisma generate && next build",
  "devCommand": "next dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["bom1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "JWT_SECRET": "@jwt-secret",
    "GOOGLE_CLIENT_ID": "@google-client-id",
    "GOOGLE_CLIENT_SECRET": "@google-client-secret",
    "GOOGLE_REFRESH_TOKEN": "@google-refresh-token",
    "GOOGLE_DRIVE_FOLDER_ID": "@google-drive-folder-id",
    "CRON_SECRET": "@cron-secret"
  },
  "crons": [
    {
      "path": "/api/cron/daily-backup",
      "schedule": "30 18 * * *"
    }
  ]
}
```

**Note:** Schedule is in UTC. `30 18 * * *` = 6:30 PM UTC = 12:00 AM IST

### 11.2 Package.json

```json
{
  "name": "pmr-industries",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "next lint",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@prisma/client": "^5.7.0",
    "prisma": "^5.7.0",
    "jose": "^5.1.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.48.0",
    "@hookform/resolvers": "^3.3.0",
    "date-fns": "^2.30.0",
    "recharts": "^2.10.0",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.0",
    "xlsx": "^0.18.5",
    "googleapis": "^128.0.0",
    "zustand": "^4.4.0",
    "next-pwa": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.6"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

### 11.3 Database Migration

```bash
# Initial setup
npx prisma init
npx prisma migrate dev --name init
npx prisma generate

# Production migration
npx prisma migrate deploy
```

### 11.4 Vercel Postgres Setup

1. Go to Vercel dashboard
2. Create new Postgres database
3. Copy connection string
4. Add to environment variables as `DATABASE_URL`

---

## 12. Development Phases

### Phase 1: Setup & Authentication (Week 1)

**Tasks:**
1. Initialize Next.js project with TypeScript
2. Set up Tailwind CSS + shadcn/ui
3. Create Prisma schema
4. Set up Vercel Postgres
5. Implement authentication system:
   - Login page
   - PIN verification
   - JWT session management
   - Middleware for route protection
6. Create basic layout with navigation

**Deliverables:**
- Working login system
- Protected routes
- Basic navigation

### Phase 2: Inventory Module (Week 2)

**Tasks:**
1. Create inventory database operations
2. Build inventory dashboard (stock summary)
3. Implement add entry form
4. Build transaction log with pagination
5. Add date search (admin only)
6. Implement edit/delete functionality (admin only)
7. Add stock validation

**Deliverables:**
- Fully functional inventory management
- Real-time stock calculations
- Admin controls

### Phase 3: Expense Module (Week 3)

**Tasks:**
1. Create expense database operations
2. Build expense entry form with autocomplete
3. Implement expense table with pagination/infinite scroll
4. Add edit/delete functionality (admin only)
5. Create name autocomplete system

**Deliverables:**
- Complete expense tracking
- Autocomplete functionality
- Admin edit controls

### Phase 4: Dashboard (Week 4)

**Tasks:**
1. Build dashboard API endpoints
2. Create summary cards component
3. Implement monthly bar chart
4. Build account breakdown pie charts
5. Create trend line chart
6. Build monthly table
7. Add filter controls (year, date range, quick filters)

**Deliverables:**
- Fully interactive dashboard
- All charts and visualizations
- Filter functionality

### Phase 5: Customer Statements (Week 5)

**Tasks:**
1. Build statement generation API
2. Create statement page UI
3. Implement name dropdown
4. Add date range filter
5. Integrate jsPDF for PDF generation
6. Style PDF with company branding

**Deliverables:**
- Working statement generation
- Downloadable PDFs

### Phase 6: Admin Panel (Week 6)

**Tasks:**
1. Build PIN management UI and API
2. Create bulk upload functionality
3. Implement Excel parsing
4. Build backup system (manual)
5. Set up Google Drive integration
6. Create backup log viewer

**Deliverables:**
- Complete admin panel
- Bulk upload working
- Manual backup functional

### Phase 7: PWA & Mobile Optimization (Week 7)

**Tasks:**
1. Create manifest.json
2. Set up service worker
3. Generate PWA icons
4. Implement install prompt
5. Optimize mobile layouts
6. Test touch interactions
7. Ensure all features work on mobile

**Deliverables:**
- Installable PWA
- Fully responsive design
- Mobile-optimized UX

### Phase 8: Automated Backups & Cron (Week 8)

**Tasks:**
1. Set up Vercel Cron Jobs
2. Create daily backup endpoint
3. Test automated backup at midnight IST
4. Set up error notifications
5. Create backup monitoring

**Deliverables:**
- Automated daily backups
- Monitoring system

### Phase 9: Testing & Bug Fixes (Week 9)

**Tasks:**
1. Test all features on desktop
2. Test all features on mobile
3. Test different screen sizes
4. Test offline functionality
5. Fix identified bugs
6. Performance optimization
7. Security audit

**Deliverables:**
- Bug-free application
- Performance report
- Security checklist completed

### Phase 10: Deployment & Handoff (Week 10)

**Tasks:**
1. Deploy to Vercel production
2. Configure custom domain (if needed)
3. Set up environment variables
4. Run production database migrations
5. Seed initial PINs
6. Create user documentation
7. Train client
8. Handoff

**Deliverables:**
- Live production application
- User documentation
- Client training completed

---

## 13. Security Considerations

### 13.1 Authentication
- 4-digit PINs stored as hashed values
- JWT tokens with 24-hour expiration
- httpOnly cookies to prevent XSS
- Secure flag in production
- CSRF protection

### 13.2 API Security
- All mutations require authentication
- Role-based access control on all endpoints
- Input validation with Zod schemas
- SQL injection protection via Prisma
- Rate limiting on authentication endpoints

### 13.3 Data Protection
- Encrypted database connections
- Environment variables for secrets
- No sensitive data in client-side code
- Regular backups to Google Drive
- Backup encryption

### 13.4 Best Practices
- Regular dependency updates
- Security headers in next.config.js
- Content Security Policy
- Regular security audits
- Error logging (without exposing sensitive info)

---

## 14. Testing Checklist

### 14.1 Functionality Testing

**Authentication:**
- [ ] Login with correct PIN works
- [ ] Login with incorrect PIN shows error
- [ ] Session persists across page refreshes
- [ ] Logout clears session
- [ ] Protected routes redirect to login

**Inventory:**
- [ ] Can add stock transaction
- [ ] Can add sell transaction
- [ ] Stock validation prevents overselling
- [ ] Running total calculates correctly
- [ ] Summary dashboard shows correct totals
- [ ] Date search works (admin)
- [ ] Edit transaction works (admin)
- [ ] Delete transaction works (admin)
- [ ] Running totals recalculate after edit

**Expenses:**
- [ ] Can add expense
- [ ] Can add income
- [ ] Autocomplete suggests names
- [ ] Pagination works
- [ ] Edit works (admin)
- [ ] Delete works (admin)

**Dashboard:**
- [ ] Summary cards show correct totals
- [ ] Charts render correctly
- [ ] Filters work (year, last 12 months, all time)
- [ ] Custom date range works
- [ ] Data updates when filter changes

**Statements:**
- [ ] Name dropdown populates
- [ ] PDF generates correctly
- [ ] Company details appear
- [ ] Transaction table is accurate
- [ ] Total balance calculates correctly

**Admin:**
- [ ] PIN changes work
- [ ] Bulk upload processes Excel correctly
- [ ] Manual backup creates file
- [ ] Backup logs display

### 14.2 Mobile Testing
- [ ] All pages responsive
- [ ] Forms usable on mobile
- [ ] Charts resize properly
- [ ] Navigation works
- [ ] PWA installable
- [ ] Add to home screen works
- [ ] Offline functionality (basic caching)

### 14.3 Performance Testing
- [ ] Page load time < 3 seconds
- [ ] API responses < 500ms
- [ ] Large tables render smoothly
- [ ] Charts animate smoothly
- [ ] No memory leaks

### 14.4 Security Testing
- [ ] Cannot access admin routes without admin role
- [ ] Cannot edit/delete without permissions
- [ ] SQL injection attempts fail
- [ ] XSS attempts fail
- [ ] CSRF protection works
- [ ] Session expires after 24 hours

---

## 15. Maintenance & Support

### 15.1 Regular Tasks
- Monitor backup logs weekly
- Check error logs daily
- Review Google Drive storage monthly
- Update dependencies quarterly
- Security audit annually

### 15.2 Troubleshooting Guide

**Issue: Login not working**
- Check database connection
- Verify PIN in database
- Check JWT_SECRET in environment

**Issue: Backups failing**
- Verify Google Drive credentials
- Check GOOGLE_DRIVE_FOLDER_ID
- Review backup logs for errors
- Ensure sufficient Drive storage

**Issue: Charts not displaying**
- Check API endpoint responses
- Verify data format
- Check browser console for errors

### 15.3 Future Enhancements
- Email notifications for low stock
- Export reports to Excel
- Multi-user support with individual accounts
- Mobile app (React Native)
- Barcode scanning for inventory
- Integration with accounting software
- Advanced analytics and forecasting

---

## END OF SPECIFICATION

This comprehensive document provides everything needed to build the PMR Industries Inventory & Expense Management System. Follow the phases sequentially, test thoroughly, and refer back to this specification for implementation details.

**Total Estimated Timeline:** 10 weeks
**Estimated Development Hours:** 300-400 hours

Good luck with the build! 🚀