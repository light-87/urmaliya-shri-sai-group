# PMR Industries - Step-by-Step Implementation Plan

This document breaks down the comprehensive plan into actionable implementation steps.

---

## Phase 1: Project Setup & Authentication (Week 1)

### 1.1 Initialize Next.js Project
- [ ] Create Next.js 14 project with TypeScript
  ```bash
  npx create-next-app@latest ussg-app --typescript --tailwind --app --src-dir
  ```
- [ ] Configure `tsconfig.json` with strict mode
- [ ] Set up path aliases (`@/` for src)

### 1.2 Install Dependencies
- [ ] Install core dependencies:
  ```bash
  npm install @prisma/client jose zod react-hook-form @hookform/resolvers date-fns recharts jspdf jspdf-autotable xlsx googleapis zustand next-pwa
  ```
- [ ] Install shadcn/ui:
  ```bash
  npx shadcn@latest init
  npx shadcn@latest add button input dialog select dropdown-menu card label toast
  ```
- [ ] Install Radix UI primitives as needed

### 1.3 Configure Tailwind CSS
- [ ] Update `tailwind.config.ts` with custom colors:
  - Primary: `#D97757` (warm terracotta)
  - Background: `#FAFAF8` (warm off-white)
  - Success: `#22c55e` (green)
  - Error: `#ef4444` (red)
- [ ] Set up global styles in `globals.css`

### 1.4 Database Setup
- [ ] Initialize Prisma: `npx prisma init`
- [ ] Create `prisma/schema.prisma` with all models:
  - Pin (authentication)
  - InventoryTransaction
  - ExpenseTransaction
  - BackupLog
  - SystemSettings
- [ ] Define all enums (PinRole, Warehouse, BucketType, ActionType, ExpenseAccount, TransactionType)
- [ ] Create `prisma/seed.ts` with default PINs (1111, 2222, 3333)
- [ ] Set up Vercel Postgres and configure `DATABASE_URL`
- [ ] Run migrations: `npx prisma migrate dev --name init`
- [ ] Create `src/lib/prisma.ts` - Prisma client singleton

### 1.5 Authentication System
- [ ] Create `src/lib/auth.ts`:
  - `createSession()` - JWT token creation
  - `verifySession()` - Token verification
  - `deleteSession()` - Logout functionality
  - `hasPermission()` - Role hierarchy check
- [ ] Create `middleware.ts` for route protection:
  - Define public routes (`/login`)
  - Protect admin routes (`/admin`, `/dashboard`)
  - Protect expense routes from INVENTORY_ONLY role

### 1.6 Authentication API Routes
- [ ] Create `src/app/api/auth/login/route.ts`:
  - POST handler to verify PIN
  - Create session on success
  - Return role for redirect logic
- [ ] Create `src/app/api/auth/logout/route.ts`:
  - POST handler to delete session

### 1.7 Login Page
- [ ] Create `src/app/login/page.tsx`:
  - 4-digit PIN input with numeric keyboard
  - Submit button with loading state
  - Error message display
  - Redirect based on role after login

### 1.8 Layout & Navigation
- [ ] Create `src/app/layout.tsx` with metadata
- [ ] Create `src/components/Layout/Header.tsx`:
  - Logo, navigation links, logout button
  - Role-based link visibility
- [ ] Create `src/components/Layout/Navigation.tsx`:
  - Desktop horizontal nav
  - Show/hide links based on role
- [ ] Create `src/components/Layout/MobileNav.tsx`:
  - Bottom navigation for mobile
- [ ] Create root page that redirects to `/login`

### 1.9 Shared Components
- [ ] Create `src/components/shared/LoadingSpinner.tsx`
- [ ] Create `src/components/shared/ErrorMessage.tsx`

### 1.10 Store Setup
- [ ] Create `src/store/authStore.ts` with Zustand:
  - Store user role, pinId
  - Hydration from session

### 1.11 Type Definitions
- [ ] Create `src/types/index.ts`:
  - SessionData interface
  - All enum types
  - API response types

---

## Phase 2: Inventory Module (Week 2)

### 2.1 Inventory API Routes
- [ ] Create `src/app/api/inventory/route.ts`:
  - GET: Fetch transactions with filters (date, warehouse, bucketType)
  - GET: Return summary with current stock per bucket/warehouse
  - POST: Create new transaction with validation
- [ ] Create `src/app/api/inventory/[id]/route.ts`:
  - PUT: Update transaction (admin only)
  - DELETE: Delete transaction (admin only)

### 2.2 Running Total Calculation Logic
- [ ] Implement running total calculation in API:
  - On create: Get last transaction's running total for bucket+warehouse
  - Add/subtract based on action type
  - Store as runningTotal field
- [ ] Implement recalculation on edit/delete:
  - Recalculate all subsequent transactions

### 2.3 Inventory Page Structure
- [ ] Create `src/app/inventory/page.tsx`:
  - Fetch current stock and transactions
  - Render dashboard, form, and log

### 2.4 Inventory Dashboard Component
- [ ] Create `src/app/inventory/components/InventoryDashboard.tsx`:
  - Table with 10 bucket types as rows
  - Columns: Bucket Type, Pallavi, Tularam, Total
  - Pull data from summary endpoint

### 2.5 Add Entry Form Component
- [ ] Create `src/app/inventory/components/AddEntryForm.tsx`:
  - Dialog/modal with form fields:
    - Date (default today)
    - Warehouse dropdown
    - Bucket type dropdown
    - Action dropdown (STOCK/SELL)
    - Quantity (positive number)
    - Buyer/Seller text input
  - Validation:
    - Check quantity > 0
    - Check stock availability for SELL
    - Show error if overselling
  - Submit to POST /api/inventory

### 2.6 Transaction Log Component
- [ ] Create `src/app/inventory/components/TransactionLog.tsx`:
  - Table with columns: Date, Warehouse, Bucket Type, Action, Quantity, Buyer/Seller, Running Total
  - Reverse chronological order
  - Color coding:
    - STOCK: green background
    - SELL: red background
  - Admin only: Edit/Delete icons per row
  - Mobile responsive (horizontal scroll)

### 2.7 Date Search Component (Admin Only)
- [ ] Create `src/app/inventory/components/DateSearch.tsx`:
  - Date picker component
  - Search button
  - Filter transactions by selected date
  - Show only for admin role

### 2.8 Edit Transaction Modal
- [ ] Create edit functionality in TransactionLog:
  - Pre-fill form with existing data
  - Recalculate running totals on update
  - Confirmation for delete

### 2.9 Custom Hooks
- [ ] Create `src/hooks/useInventory.ts`:
  - Fetch transactions
  - Fetch summary
  - Add/edit/delete mutations
  - Refetch on mutation

---

## Phase 3: Expense Module (Week 3)

### 3.1 Expense API Routes
- [ ] Create `src/app/api/expenses/route.ts`:
  - GET: Fetch with filters (startDate, endDate, account, type, name, page, limit)
  - GET: Return unique names for autocomplete
  - GET: Pagination info
  - POST: Create new expense transaction
- [ ] Create `src/app/api/expenses/[id]/route.ts`:
  - PUT: Update expense (admin only)
  - DELETE: Delete expense (admin only)

### 3.2 Expense Page Structure
- [ ] Create `src/app/expenses/page.tsx`:
  - Fetch expenses with pagination
  - Add expense button
  - Expense table

### 3.3 Add Expense Form Component
- [ ] Create `src/app/expenses/components/AddExpenseForm.tsx`:
  - Dialog/modal with form fields:
    - Date
    - Amount (positive number in INR)
    - Account dropdown (5 accounts)
    - Type dropdown (INCOME/EXPENSE)
    - Name with autocomplete
  - Fetch unique names for autocomplete
  - Submit to POST /api/expenses

### 3.4 Autocomplete Functionality
- [ ] Implement name autocomplete in AddExpenseForm:
  - Debounced input
  - Show suggestions dropdown
  - Filter by input value
  - Allow new entries

### 3.5 Expense Table Component
- [ ] Create `src/app/expenses/components/ExpenseTable.tsx`:
  - Table with columns: Date, Amount, Account, Type, Name
  - Color coding:
    - INCOME: green text
    - EXPENSE: red text
  - Pagination controls (Previous/Next)
  - 100 entries per page
  - Admin only: Edit/Delete buttons

### 3.6 Edit Expense Modal
- [ ] Create edit functionality in ExpenseTable:
  - Same form as add, pre-filled
  - Update via PUT endpoint

### 3.7 Custom Hooks
- [ ] Create `src/hooks/useExpenses.ts`:
  - Fetch expenses with pagination
  - Fetch unique names
  - Add/edit/delete mutations

---

## Phase 4: Dashboard (Week 4)

### 4.1 Dashboard API Route
- [ ] Create `src/app/api/dashboard/route.ts`:
  - GET with query params: year, startDate, endDate, view
  - Return:
    - summary (totalIncome, totalExpense, netProfit)
    - monthlyData array
    - accountBreakdown (income and expense by account)
    - trendData for line chart
  - Calculate aggregations using Prisma groupBy

### 4.2 Dashboard Page Structure
- [ ] Create `src/app/dashboard/page.tsx`:
  - Admin role check
  - Filter controls at top
  - Grid layout for all components

### 4.3 Filter Controls
- [ ] Create filter section in dashboard page:
  - Year dropdown (2024, 2025, etc.)
  - Quick filters: "Last 12 Months", "All Time"
  - Custom date range picker
  - State management for active filter

### 4.4 Summary Cards Component
- [ ] Create `src/app/dashboard/components/SummaryCards.tsx`:
  - Three cards: Total Income, Total Expense, Net Profit
  - Color coded (green, red, blue)
  - Format currency in INR (e.g., ₹32,18,110)

### 4.5 Monthly Bar Chart Component
- [ ] Create `src/app/dashboard/components/MonthlyBarChart.tsx`:
  - Use recharts BarChart
  - Side-by-side bars for income (green) and expense (red)
  - X-axis: months
  - Y-axis: amount
  - Tooltip and legend

### 4.6 Account Breakdown Component
- [ ] Create `src/app/dashboard/components/AccountBreakdown.tsx`:
  - Two pie charts side by side
  - Income by account (left)
  - Expense by account (right)
  - Use recharts PieChart
  - Color palette for accounts

### 4.7 Trend Line Chart Component
- [ ] Create `src/app/dashboard/components/TrendLineChart.tsx`:
  - Use recharts LineChart
  - Two lines: income and expense
  - Show trend over time
  - Smooth curves

### 4.8 Monthly Table Component
- [ ] Create `src/app/dashboard/components/MonthlyTable.tsx`:
  - Table with columns: Month, Total Income, Total Expenses, Net Total
  - Orange header background
  - Row color based on net (green if positive, red if negative)
  - Format all amounts in INR

---

## Phase 5: Customer Statements (Week 5)

### 5.1 Statements API Route
- [ ] Create `src/app/api/statements/route.ts`:
  - GET with query params: name, startDate, endDate
  - Fetch all transactions for given name
  - Calculate total balance (sum of income - sum of expense)
  - Return transactions and totalBalance

### 5.2 Statements Page Structure
- [ ] Create `src/app/statements/page.tsx`:
  - Admin role check
  - Name dropdown selector
  - Optional date range
  - Generate button
  - Preview area

### 5.3 Statement Generator Component
- [ ] Create `src/app/statements/components/StatementGenerator.tsx`:
  - Fetch unique names for dropdown
  - Date range pickers (from/to)
  - Generate button
  - Loading state

### 5.4 PDF Generator Library
- [ ] Create `src/lib/pdf-generator.ts`:
  - Function `generateCustomerStatement(data)`
  - Add PMR logo
  - Company details (name, address, phone, email, GSTIN)
  - Customer name and total balance
  - Transaction table using jspdf-autotable
  - Orange header theme
  - Return jsPDF doc object

### 5.5 PDF Download Component
- [ ] Create `src/app/statements/components/PDFDownload.tsx`:
  - Preview transactions in table
  - Download button
  - Save as `{name}_statement.pdf`

---

## Phase 6: Admin Panel (Week 6)

### 6.1 Admin API Routes
- [ ] Create `src/app/api/admin/pins/route.ts`:
  - GET: Return list of roles (not PINs for security)
  - PUT: Update PIN for a given role
  - Validate 4-digit format
- [ ] Create `src/app/api/admin/upload/route.ts`:
  - POST: Accept FormData with Excel file
  - Parse with xlsx library
  - Extract "Inventory" and "Expenses" sheets
  - Validate data format
  - Insert into database
  - Calculate running totals for inventory
  - Return counts
- [ ] Create `src/app/api/admin/backup/route.ts`:
  - GET: Return backup logs
  - POST: Trigger manual backup
  - Create Excel with Inventory and Expenses sheets
  - Upload to Google Drive
  - Log result

### 6.2 Admin Page Structure
- [ ] Create `src/app/admin/page.tsx`:
  - Admin role check
  - Three sections: PIN Management, Bulk Upload, Backup Manager

### 6.3 PIN Management Component
- [ ] Create `src/app/admin/components/PinManagement.tsx`:
  - Three sections for three roles
  - Input for new 4-digit PIN
  - Update button per role
  - Validation (digits only, exactly 4)
  - Success/error feedback

### 6.4 Bulk Upload Component
- [ ] Create `src/app/admin/components/BulkUpload.tsx`:
  - File input for .xlsx/.xls
  - Upload button
  - Status message
  - Instructions for Excel format
  - Show counts after upload

### 6.5 Backup Manager Component
- [ ] Create `src/app/admin/components/BackupManager.tsx`:
  - Show automatic backup schedule info
  - Manual backup button
  - List of recent backups with status
  - Format dates nicely

### 6.6 Google Drive Integration
- [ ] Create `src/lib/google-drive.ts`:
  - Initialize OAuth2 client
  - `uploadBackupToDrive(buffer, fileName)` function
  - `listBackups()` function
  - Use service account or refresh token

### 6.7 Backup Logic
- [ ] Create `src/lib/backup.ts`:
  - `createBackup(type)` function
  - Fetch all inventory and expense data
  - Create Excel workbook with xlsx
  - Two sheets: Inventory, Expenses
  - Upload to Google Drive
  - Log result to BackupLog table

---

## Phase 7: PWA & Mobile Optimization (Week 7)

### 7.1 PWA Configuration
- [ ] Create `public/manifest.json`:
  - App name, short name, description
  - Start URL, display mode (standalone)
  - Theme and background colors
  - Icon definitions (192x192, 512x512)
- [ ] Create PWA icons in `public/icons/`:
  - icon-192x192.png
  - icon-512x512.png
  - apple-touch-icon.png
- [ ] Add logo `public/pmr-logo.png`

### 7.2 Service Worker
- [ ] Configure next-pwa in `next.config.js`:
  - Enable PWA
  - Disable in development
  - Set destination folder

### 7.3 Install Prompt
- [ ] Create `src/components/InstallPrompt.tsx`:
  - Listen for beforeinstallprompt event
  - Show install banner
  - Handle install/dismiss

### 7.4 Mobile Layout Optimization
- [ ] Review all pages for mobile responsiveness:
  - Inventory page
  - Expenses page
  - Dashboard page
  - Statements page
  - Admin page
- [ ] Ensure touch targets are 44x44px minimum
- [ ] Stack columns vertically on mobile
- [ ] Full-screen modals on mobile

### 7.5 Mobile Navigation
- [ ] Implement bottom navigation for mobile:
  - Fixed at bottom
  - Icons with labels
  - Active state indicator

### 7.6 Mobile Form Optimization
- [ ] Add `inputMode="numeric"` for number inputs
- [ ] Add `type="date"` for date inputs
- [ ] Ensure dropdowns are touch-friendly

---

## Phase 8: Automated Backups & Cron (Week 8)

### 8.1 Cron Job API Route
- [ ] Create `src/app/api/cron/daily-backup/route.ts`:
  - GET handler
  - Verify CRON_SECRET in Authorization header
  - Call createBackup('AUTOMATIC')
  - Return success/failure

### 8.2 Vercel Cron Configuration
- [ ] Update `vercel.json`:
  - Add crons array
  - Schedule: `30 18 * * *` (UTC = 12:00 AM IST)
  - Path: `/api/cron/daily-backup`
- [ ] Add CRON_SECRET environment variable

### 8.3 Backup Monitoring
- [ ] Ensure BackupLog captures:
  - Backup date
  - Type (MANUAL/AUTOMATIC)
  - Drive file ID
  - Inventory count
  - Expense count
  - Status
  - Error message if failed

### 8.4 Error Handling
- [ ] Add try-catch in backup creation
- [ ] Log errors to BackupLog
- [ ] Consider email notification on failure (future)

---

## Phase 9: Testing & Bug Fixes (Week 9)

### 9.1 Authentication Testing
- [ ] Test login with correct PIN
- [ ] Test login with incorrect PIN
- [ ] Test session persistence
- [ ] Test logout
- [ ] Test route protection
- [ ] Test role-based access

### 9.2 Inventory Testing
- [ ] Test add stock transaction
- [ ] Test add sell transaction
- [ ] Test stock validation (overselling)
- [ ] Test running total calculation
- [ ] Test summary dashboard accuracy
- [ ] Test date search
- [ ] Test edit transaction
- [ ] Test delete transaction
- [ ] Test running total recalculation

### 9.3 Expense Testing
- [ ] Test add expense
- [ ] Test add income
- [ ] Test autocomplete
- [ ] Test pagination
- [ ] Test edit expense
- [ ] Test delete expense

### 9.4 Dashboard Testing
- [ ] Test summary card values
- [ ] Test all charts render
- [ ] Test year filter
- [ ] Test last 12 months filter
- [ ] Test all time filter
- [ ] Test custom date range

### 9.5 Statement Testing
- [ ] Test name dropdown population
- [ ] Test PDF generation
- [ ] Test company details in PDF
- [ ] Test transaction accuracy
- [ ] Test balance calculation

### 9.6 Admin Testing
- [ ] Test PIN update
- [ ] Test bulk upload
- [ ] Test manual backup
- [ ] Test backup log display

### 9.7 Mobile Testing
- [ ] Test on actual mobile devices
- [ ] Test PWA installation
- [ ] Test all pages responsive
- [ ] Test touch interactions

### 9.8 Performance Testing
- [ ] Measure page load times
- [ ] Measure API response times
- [ ] Test with large datasets
- [ ] Check for memory leaks

### 9.9 Security Testing
- [ ] Test unauthorized access to admin routes
- [ ] Test unauthorized edit/delete
- [ ] Verify SQL injection protection
- [ ] Verify XSS protection

---

## Phase 10: Deployment & Handoff (Week 10)

### 10.1 Pre-Deployment Checklist
- [ ] All tests passing
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] All environment variables documented

### 10.2 Vercel Deployment
- [ ] Connect GitHub repository to Vercel
- [ ] Configure build command: `prisma generate && next build`
- [ ] Set region to `bom1` (Mumbai)
- [ ] Configure environment variables:
  - DATABASE_URL
  - JWT_SECRET
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
  - GOOGLE_REFRESH_TOKEN
  - GOOGLE_DRIVE_FOLDER_ID
  - CRON_SECRET

### 10.3 Database Setup
- [ ] Create Vercel Postgres database
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Seed initial data: `npx prisma db seed`

### 10.4 Google Drive Setup
- [ ] Create Google Cloud project
- [ ] Enable Drive API
- [ ] Create OAuth credentials
- [ ] Generate refresh token
- [ ] Create backup folder in Drive
- [ ] Get folder ID

### 10.5 Custom Domain (Optional)
- [ ] Configure custom domain in Vercel
- [ ] Update DNS records
- [ ] Verify SSL certificate

### 10.6 Production Testing
- [ ] Test login flow
- [ ] Test all features
- [ ] Test PWA installation
- [ ] Verify backup works
- [ ] Check cron job execution

### 10.7 Documentation
- [ ] Create user guide:
  - Login instructions
  - Inventory management
  - Expense tracking
  - Dashboard usage
  - Statement generation
  - Admin tasks
- [ ] Document Excel format for bulk upload

### 10.8 Client Training
- [ ] Demo all features
- [ ] Walk through admin panel
- [ ] Explain backup system
- [ ] Provide user guide

### 10.9 Handoff
- [ ] Transfer repository access
- [ ] Share environment variable list
- [ ] Provide Google Cloud access
- [ ] Document support process

---

## Environment Variables Reference

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-secret-key-here"

# Google Drive API
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="..."
GOOGLE_REFRESH_TOKEN="..."
GOOGLE_DRIVE_FOLDER_ID="..."

# Cron Jobs
CRON_SECRET="..."
```

---

## File Structure Summary

```
ussg-app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Initial data
├── public/
│   ├── icons/                 # PWA icons
│   ├── manifest.json          # PWA manifest
│   └── pmr-logo.png          # Company logo
├── src/
│   ├── app/
│   │   ├── api/              # All API routes
│   │   ├── admin/            # Admin panel
│   │   ├── dashboard/        # Analytics dashboard
│   │   ├── expenses/         # Expense tracking
│   │   ├── inventory/        # Inventory management
│   │   ├── login/            # Authentication
│   │   └── statements/       # PDF statements
│   ├── components/
│   │   ├── Layout/           # Navigation, header
│   │   ├── shared/           # Common components
│   │   └── ui/               # shadcn components
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # Utilities
│   ├── store/                # Zustand stores
│   └── types/                # TypeScript types
├── middleware.ts             # Route protection
├── next.config.js            # Next.js config
├── tailwind.config.ts        # Tailwind config
└── vercel.json               # Vercel deployment
```

---

## Estimated Timeline

| Phase | Description | Duration |
|-------|-------------|----------|
| 1 | Setup & Authentication | Week 1 |
| 2 | Inventory Module | Week 2 |
| 3 | Expense Module | Week 3 |
| 4 | Dashboard | Week 4 |
| 5 | Customer Statements | Week 5 |
| 6 | Admin Panel | Week 6 |
| 7 | PWA & Mobile | Week 7 |
| 8 | Automated Backups | Week 8 |
| 9 | Testing & Bug Fixes | Week 9 |
| 10 | Deployment & Handoff | Week 10 |

**Total: 10 weeks / 300-400 hours**

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed

# Start development
npm run dev

# Build for production
npm run build

# Deploy
vercel --prod
```
