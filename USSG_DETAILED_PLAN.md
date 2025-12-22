# USSG (Urmaliya Shri Sai Group) - Detailed Implementation Plan

**Document Purpose:** Complete implementation plan (NO CODE) for all USSG changes and new features

**Date:** December 14, 2024

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Multi-Tenancy Architecture](#1-multi-tenancy-architecture)
3. [Warehouse Changes](#2-warehouse-changes)
4. [Expense Account Changes](#3-expense-account-changes)
5. [Registry System Implementation](#4-registry-system-implementation)
6. [UI/UX Changes](#5-uiux-changes)
7. [API Changes](#6-api-changes)
8. [Database Schema Changes](#7-database-schema-changes)
9. [Testing Strategy](#8-testing-strategy)
10. [Implementation Phases](#9-implementation-phases)
11. [Risks & Mitigation](#10-risks--mitigation)

---

## Executive Summary

### Goals
Transform the current single-company system (PMR) into a multi-tenant platform supporting both PMR and USSG companies with:
- Company-specific warehouses
- Company-specific expense accounts
- A completely new Registry Transaction Management System

### Key Differences Between PMR and USSG

| Feature | PMR | USSG |
|---------|-----|------|
| **Warehouses** | Pallavi, Tularam, Factory | Gurh, Rewa, Factory |
| **Expense Accounts** | Cash, Prashant Gaydhane, PMR, KPG Saving, KP Enterprises | Cash, Shivam Tripathi, ICICI, CC Canara, Canara Current, Sawaliya Seth Motors |
| **Registry Feature** | Not applicable | NEW - Full registry transaction management |

### Approach
- **Multi-tenancy:** Database-level company separation
- **Dynamic Configuration:** Warehouses and accounts stored in database, not hardcoded
- **Registry:** Standalone module with automatic calculations
- **Edit-Friendly:** All registry transactions fully editable

---

## 1. Multi-Tenancy Architecture

### 1.1 Concept

**What is Multi-Tenancy:**
Multiple companies (tenants) use the same application and database, but their data is completely isolated from each other.

**Why This Approach:**
- Single codebase for all companies
- Easier maintenance and updates
- Shared infrastructure costs
- Consistent feature set

### 1.2 Company Management

**Companies Table Design:**

**Purpose:** Central registry of all companies using the system

**Fields:**
- ID (UUID, primary key)
- Code (unique identifier: "PMR", "USSG")
- Name (full company name)
- Display Name (for UI)
- Active Status (enable/disable company)
- Settings (JSON blob for company-specific configuration)
- Created At, Updated At timestamps

**Business Rules:**
- Company code must be unique
- Cannot delete company with existing data
- Settings JSON can store custom configuration per company

**Initial Data:**
1. PMR Oil Company (code: PMR)
2. Urmaliya Shri Sai Group (code: USSG)

### 1.3 Data Isolation Strategy

**Approach:** Every transaction table includes `company_id`

**Tables to Update:**
- InventoryTransaction
- ExpenseTransaction
- StockTransaction
- Leads
- BackupLogs
- Pins (for authentication)
- Registry tables (new)

**How It Works:**
1. User logs in → Company context established
2. All queries automatically filter by company_id
3. User sees only their company's data
4. Database constraints prevent cross-company access

**Row Level Security (RLS):**
- PostgreSQL RLS policies enforce company filtering at database level
- Even if application bug exists, database prevents data leakage
- Defense-in-depth approach

### 1.4 Company Selection UX

**Options to Consider:**

**Option A: Dropdown in Header**
- User sees dropdown with available companies
- Selects company to work with
- Selection stored in session
- Can switch companies without logging out
- **Pros:** Flexible, easy to switch
- **Cons:** Could accidentally work in wrong company

**Option B: Separate Logins**
- Each PIN tied to specific company
- User logs in to specific company
- Cannot switch without logging out
- **Pros:** Clear separation, no confusion
- **Cons:** Less flexible

**Option C: URL-based**
- Different URLs for each company (pmr.app.com, ussg.app.com)
- **Pros:** Very clear separation
- **Cons:** More complex deployment

**Recommendation:** Start with Option B (PIN-based), can add Option A later if needed

### 1.5 Company Context Flow

**Login Flow:**
1. User enters PIN
2. System looks up PIN → finds company_id and role
3. Session created with: pin_id, role, company_id
4. All subsequent requests include company context
5. Middleware validates and injects company_id into queries

**Query Pattern:**
```
Every query must include:
WHERE company_id = [current_user_company_id]
```

**Middleware Responsibilities:**
- Extract company_id from session
- Validate company is active
- Inject company context into request
- Prevent unauthorized cross-company access

---

## 2. Warehouse Changes

### 2.1 Current State

**Problem:**
- Warehouse names hardcoded as TypeScript enum
- Enum values: PALLAVI, TULARAM, FACTORY
- Cannot easily add/change warehouses
- Company-specific warehouses not supported

**Impact:**
- Cannot have different warehouses for USSG
- Requires code changes to add new warehouse
- Cannot deactivate warehouses

### 2.2 New Design

**Solution:** Database-driven warehouses table

**Warehouses Table Structure:**

**Fields:**
- ID (UUID)
- Company ID (foreign key to companies)
- Code (programmatic identifier: GURH, REWA, etc.)
- Name (same as code, for compatibility)
- Display Name (user-friendly name)
- Active Status (can deactivate without deleting)
- Location (optional: physical address)
- Timestamps

**Unique Constraint:** company_id + code (same code can exist across companies)

**Example Data:**

PMR Company:
- PALLAVI / Pallavi / Active
- TULARAM / Tularam / Active
- FACTORY / Factory / Active

USSG Company:
- GURH / Gurh / Active
- REWA / Rewa / Active
- FACTORY / Factory / Active

### 2.3 Integration Points

**Inventory Transaction Form:**
- Warehouse dropdown populated from database
- Filtered by current company
- Shows only active warehouses
- Sorted alphabetically

**Inventory Summary:**
- Column headers generated dynamically
- PMR shows: Pallavi | Tularam | Total
- USSG shows: Gurh | Rewa | Total
- Summary calculation adapts to available warehouses

**Reports:**
- Warehouse filter shows company-specific list
- Historical reports maintain warehouse references
- Can handle warehouse name changes

### 2.4 Migration Strategy

**Phase 1: Create Table**
- Create warehouses table
- Insert PMR warehouses
- Insert USSG warehouses
- Keep existing enum in code (backward compatible)

**Phase 2: Update Code**
- Fetch warehouses from database for dropdowns
- Continue storing warehouse code as string
- Validation checks against database

**Phase 3: (Optional) Data Migration**
- Migrate old enum references to IDs
- Or keep as codes for simplicity

**Recommendation:** Keep codes as strings for simplicity and backward compatibility

### 2.5 Business Rules

**Adding Warehouse:**
- Admin can add new warehouse for their company
- Code must be unique within company
- Immediately available in all transactions

**Deactivating Warehouse:**
- Set active = false
- Hides from dropdowns
- Historical data unaffected
- Can reactivate later

**Deleting Warehouse:**
- Not recommended if transactions exist
- Consider soft delete (active = false) instead

---

## 3. Expense Account Changes

### 3.1 Current State

**Problem:**
- Expense accounts hardcoded as enum
- PMR accounts: CASH, PRASHANT_GAYDHANE, PMR, KPG_SAVING, KP_ENTERPRISES
- USSG needs different accounts
- Cannot add accounts without code deployment

### 3.2 New Design

**Expense Accounts Table Structure:**

**Fields:**
- ID (UUID)
- Company ID (foreign key)
- Code (programmatic identifier)
- Name (internal name)
- Display Name (shown in UI)
- Account Type (CASH, BANK, CREDIT_CARD, GENERAL)
- Active Status
- Opening Balance (optional)
- Current Balance (optional, can be calculated)
- Timestamps

**USSG Accounts:**
1. CASH / Cash / Cash / Type: CASH
2. SHIVAM_TRIPATHI / Shivam Tripathi / Type: BANK
3. ICICI / ICICI / ICICI Bank / Type: BANK
4. CC_CANARA / CC Canara / CC Canara Bank / Type: CREDIT_CARD
5. CANARA_CURRENT / Canara Current / Canara Current Account / Type: BANK
6. SAWALIYA_SETH_MOTORS / Sawaliya Seth Motors / Type: GENERAL

### 3.3 Account Types Purpose

**Why Categorize:**

**CASH:**
- Physical cash transactions
- Petty cash management
- No bank reconciliation needed

**BANK:**
- Bank account transfers
- Check payments
- Bank statement reconciliation

**CREDIT_CARD:**
- Credit card transactions
- Track credit limits
- Monthly statement reconciliation

**GENERAL:**
- Other account types
- Partner accounts
- Flexible category

**Benefits:**
- Better reporting (cash vs bank vs credit)
- Different reconciliation workflows
- Account grouping in UI
- Future features (credit card statements, bank imports)

### 3.4 Balance Tracking Options

**Option A: Calculated Real-Time**
- Sum all transactions on demand
- Opening Balance + ∑(INCOME) - ∑(EXPENSE)
- **Pros:** Always accurate, no sync issues
- **Cons:** Slower with many transactions

**Option B: Stored and Updated**
- Update current_balance on each transaction
- Use database triggers or app logic
- **Pros:** Fast retrieval
- **Cons:** Sync issues if transaction deleted/modified

**Option C: Hybrid**
- Store balance but recalculate periodically
- Use stored value for display
- Recalculate for critical operations
- **Pros:** Fast and reliable
- **Cons:** More complex

**Recommendation:** Option A initially, migrate to Option C if performance issues

### 3.5 Integration Points

**Expense Form:**
- Account dropdown from database
- Filtered by company
- Grouped by account type (optional)
- Only active accounts shown

**Dashboard:**
- Account breakdown per company
- Balance summary per account
- Account type totals

**Statements:**
- Generate statement for specific account
- Filter transactions by account
- Show running balance
- Export to PDF/Excel

### 3.6 Migration Considerations

**Existing PMR Data:**
- Map current enum values to new account records
- Update transaction records with account_id or keep code
- Verify all mappings successful

**Storage Options:**
- Store account_id (foreign key) - cleaner but can break if account deleted
- Store account_code (string) - simpler and safer
- Store both (hybrid) - best of both worlds

**Recommendation:** Store both account_id and account_code

---

## 4. Registry System Implementation

### 4.1 Business Overview

**What is Registry:**
Property registry transaction tracking system for real estate deals.

**Key Characteristics:**
- Complex financial calculations
- Multiple government fees
- Commission income from stamp duty
- Service charges and broker fees
- Partial payments over time
- Need to edit transactions as information comes in

**Unique Requirements:**
- MUST support editing existing transactions
- Auto-calculate 4 specific fields
- Display calculations in real-time
- Track payment status
- Calculate profit/loss accurately

### 4.2 Data Model

**Registry Transactions Table:**

**Identification Fields:**
- ID (UUID primary key)
- Transaction ID (REG001, REG002, etc. - auto-generated, unique per company)
- Registration Number (optional, from registry office)
- Company ID (for multi-tenancy)

**Basic Information:**
- Date (required)
- Property Location (required)
- Seller Name (required)
- Buyer Name (required)
- Transaction Type (dropdown: Sale Deed, Gift Deed, Lease Deed, Mortgage Deed, Power of Attorney, Agreement to Sell, Other)
- Property Value (required, must be > 0)

**Government Fees (Input by User):**
- Stamp Duty (currency)
- Registration Fees (currency)
- Mutation Fees (currency)
- Documentation Charge (currency)

**Auto-Calculated: Registrar Office Fees**
- Formula: Property Value × 0.0025 (0.25%)
- Type: EXPENSE
- Always calculated, never manually entered
- Updates when property value changes

**Service Charges (Input by User):**
- Operator Cost (currency)
- Broker Commission (currency)
- Recommendation Fees Paid (currency)

**Payment Information (Input by User):**
- Credit Received (total from client)
- Payment Method (text: Cash, UPI, Bank Transfer, etc.)

**Auto-Calculated: Stamp Commission**
- Formula: Stamp Duty × 0.015 (1.5%)
- Type: INCOME (this is revenue, not expense!)
- Government pays this commission
- Updates when stamp duty changes

**Auto-Calculated: Total Expenses**
- Formula: Sum of all expenses
- = Stamp Duty + Registration Fees + Mutation Fees + Registrar Office Fees + Documentation Charge + Operator Cost + Broker Commission + Recommendation Fees

**Auto-Calculated: Balance Due**
- Formula: Total Expenses - Credit Received
- Meaning: How much client still owes (or overpaid if negative)
- Positive = Client owes money
- Negative = Client overpaid
- Zero = Fully settled

**Auto-Calculated: Amount Profit**
- Formula: (Credit Received + Stamp Commission) - Total Expenses
- This is the NET PROFIT/LOSS
- Includes stamp commission as income
- Most important metric
- Color-coded: Green if positive (profit), Red if negative (loss)

**Other Fields:**
- Payment Status (dropdown: Pending, Partial, Paid, Cancelled)
- Notes (text area)
- Created At, Updated At timestamps

### 4.3 Transaction ID Generation

**Format:** REG001, REG002, REG003, etc.

**Requirements:**
- Sequential per company
- Auto-generated on creation
- Never manually entered
- Zero-padded to 3 digits
- Unique per company

**Implementation Approach:**
- Database function to get next number
- Query: SELECT MAX(transaction_id number) for company
- Increment by 1
- Format as REG + zero-padded number

**Concurrency Handling:**
- Use database sequence or locks
- Prevent duplicate IDs if two users create simultaneously

### 4.4 Auto-Calculation Implementation

**Database Level (PostgreSQL):**
- Use GENERATED columns (STORED)
- Calculations happen in database
- Always accurate
- No application code needed
- Automatically update when dependencies change

**Application Level:**
- Calculate in API before saving
- Or use database triggers
- Return calculated values in API response

**Real-Time UI Updates:**
- As user types, trigger calculation
- Update displayed values immediately
- Show formulas in tooltips
- Highlight calculated fields differently

**Example Calculations:**

Property Value: ₹10,00,000
↓
Registrar Office Fees = 10,00,000 × 0.0025 = ₹2,500 (auto)

Stamp Duty: ₹50,000 (user enters)
↓
Stamp Commission = 50,000 × 0.015 = ₹750 (auto, INCOME)

All Expenses:
- Stamp Duty: ₹50,000
- Registration Fees: ₹10,000
- Mutation Fees: ₹5,000
- Registrar Office Fees: ₹2,500 (auto)
- Documentation: ₹3,000
- Operator: ₹2,000
- Broker: ₹15,000
- Recommendation: ₹5,000
Total Expenses = ₹92,500 (auto)

Credit Received: ₹80,000 (user enters)
↓
Balance Due = 92,500 - 80,000 = ₹12,500 (client owes) (auto)

Amount Profit:
- Income: 80,000 + 750 = ₹80,750
- Expenses: ₹92,500
- Profit = 80,750 - 92,500 = -₹11,750 (LOSS) (auto)

### 4.5 Edit Functionality Requirements

**Critical Requirement:** Users MUST be able to edit existing transactions

**Why Edit is Important:**
- Transactions often created with partial information
- Fees come in over time
- Payments received in installments
- Client provides additional details later

**Edit Scenarios:**

**Scenario 1: Partial Entry**
- Create transaction with basic info only
- Property value and seller/buyer known
- All fees are zero initially
- Later: Update with actual fees as they're paid

**Scenario 2: Payment Updates**
- Create transaction with zero payment
- Status: Pending
- Later: Client pays ₹50,000 → Update credit_received, status = Partial
- Later: Client pays remaining → Update credit_received, status = Paid

**Scenario 3: Fee Corrections**
- Stamp duty amount was estimated
- Actual amount differs
- Edit stamp duty → Stamp commission auto-updates → Profit recalculates

**Edit Form Behavior:**
- Load all existing data into form fields
- Allow changing any non-calculated field
- Auto-calculations update in real-time
- Save button updates record
- Show "last updated" timestamp

**What Can Be Edited:**
- All user-input fields
- Payment status
- Notes

**What Cannot Be Edited:**
- Transaction ID (auto-generated, permanent)
- Company ID (security)
- Auto-calculated fields (read-only)
- Created At timestamp

### 4.6 Validation Rules

**Required Fields:**
- Date
- Property Location
- Seller Name
- Buyer Name
- Transaction Type
- Property Value (must be > 0)

**Optional Fields (Default to 0):**
- All fee fields
- Credit received
- Payment method
- Notes

**Business Logic Validation:**
- Property value must be positive number
- Date cannot be far future (warning, not error)
- Transaction type must be from valid list
- Payment status must be valid option
- Credit received cannot be negative

**Warnings (Not Errors):**
- Credit received much higher than expenses (possible overpayment)
- Very old date (possible data entry error)
- Very high property value (confirm)

### 4.7 Payment Status Workflow

**Status Options:**

**Pending:**
- No payment received
- Credit Received = 0
- Balance Due = Total Expenses
- Default status for new transactions

**Partial:**
- Some payment received
- 0 < Credit Received < Total Expenses
- Balance Due > 0
- Manually set by user

**Paid:**
- Payment complete
- Credit Received >= Total Expenses
- Balance Due <= 0
- Can be set automatically or manually

**Cancelled:**
- Transaction didn't complete
- Deal fell through
- Exclude from financial summaries
- Keep for historical records

**Status Management:**
- User manually updates status
- Or auto-suggest based on credit received
- Show status prominently in list view
- Filter/search by status

### 4.8 UI/UX Design

**List View Requirements:**

**Table Columns:**
- Transaction ID (clickable)
- Date (sortable)
- Property Location (searchable)
- Seller → Buyer (combined or separate)
- Property Value
- Amount Profit (color-coded)
- Payment Status (badge)
- Actions (Edit, View, Delete)

**Filters:**
- Date range
- Payment status
- Transaction type
- Property location (autocomplete)
- Min/max property value

**Search:**
- By seller name
- By buyer name
- By location
- By transaction ID
- By registration number

**Sorting:**
- By date (default: newest first)
- By profit (high to low)
- By property value
- By location

**Pagination:**
- 50 records per page
- Page number navigation
- Total count display

**Form View Requirements:**

**Layout: Multi-Section Form**

**Section 1: Basic Information**
- Date picker (defaults to today)
- Registration number (optional text input)
- Property location (text input with autocomplete from previous entries)
- Transaction type (dropdown: 7 options)
- Seller name (text input with autocomplete)
- Buyer name (text input with autocomplete)
- Property value (currency input with ₹ symbol, required)

**Section 2: Government Fees & Charges**
- Stamp duty (currency input)
- Registration fees (currency input)
- Mutation fees (currency input)
- Documentation charge (currency input)
- **Registrar office fees (READ-ONLY, highlighted)**
  - Shows value and calculation
  - Example: "₹2,500 (0.25% of ₹10,00,000)"
  - Updates as property value changes

**Section 3: Service Charges & Costs**
- Operator cost (currency input)
- Broker commission (currency input)
- Recommendation fees paid (currency input)

**Section 4: Payments & Receipts**
- Credit received (currency input)
- Payment method (text input or dropdown: Cash, UPI, Bank Transfer, Cheque, etc.)
- **Stamp commission (READ-ONLY, highlighted green)**
  - Shows value and calculation
  - Example: "₹750 (1.5% of ₹50,000)"
  - Label: "INCOME"
  - Updates as stamp duty changes

**Section 5: Summary & Status**
- **Balance due (READ-ONLY, color-coded)**
  - Red background if positive (client owes)
  - Green background if negative (overpaid)
  - Shows label: "Client owes ₹12,500" or "Overpaid by ₹2,500"
- **Amount profit (READ-ONLY, prominent, color-coded)**
  - Large text
  - Green if positive (profit), red if negative (loss)
  - Shows breakdown on hover
  - Example: "Profit: ₹1,125" or "Loss: ₹5,000"
- Payment status (dropdown: 4 options)
- Notes (textarea, optional)

**Real-Time Calculation Display:**

**Summary Panel (Desktop - Sticky):**
Displays on right side of form, always visible:

```
TRANSACTION SUMMARY
════════════════════════════
Total Income:
  Credit Received:      ₹90,000
  Stamp Commission:        ₹750
  ────────────────────────────
  TOTAL INCOME:         ₹90,750

Total Expenses:
  Stamp Duty:           ₹50,000
  Registration Fees:    ₹10,000
  Mutation Fees:         ₹5,000
  Registrar Fees:        ₹2,500
  Documentation:         ₹3,000
  Operator Cost:         ₹2,000
  Broker Commission:    ₹15,000
  Recommendation:        ₹5,000
  ────────────────────────────
  TOTAL EXPENSES:       ₹92,500

════════════════════════════
BALANCE DUE:            ₹1,750
AMOUNT PROFIT:         -₹1,750
════════════════════════════
```

Updates in real-time as user types.

**Mobile View:**
- Summary panel at bottom (not sticky)
- Full-width inputs
- Collapsible sections
- Larger touch targets

**Detail View Requirements:**

**Purpose:** Read-only view of complete transaction

**Layout:**
- Grouped sections like form
- All fields displayed (even if empty)
- Calculated fields highlighted
- Transaction history (created, last updated)
- Edit button (opens form)
- Print/PDF export button
- Delete button (with confirmation)

**Visual Indicators:**
- Auto-calculated fields: Light gray background, lock icon
- Required fields: Asterisk (in form mode)
- Profit/loss: Large, color-coded number
- Payment status: Colored badge

### 4.9 Reporting Requirements

**Reports Needed:**

**1. Transaction List Report**
- All transactions for date range
- Columns: Date, ID, Location, Seller, Buyer, Value, Profit, Status
- Totals row: Sum of values, sum of profits
- Export: PDF, Excel, CSV

**2. Payment Status Report**
- Group by payment status
- Count and total amount per status
- Highlight pending payments
- Total outstanding amount

**3. Financial Summary Report**
- Time period selection (this month, last month, year, custom)
- Total income (credit received + stamp commission)
- Total expenses (all categories)
- Net profit
- Average profit per transaction
- Transaction count

**4. Location-wise Report**
- Group by property location
- Transaction count per location
- Total value per location
- Average profit per location

**5. Monthly Trend Report**
- Transactions per month
- Revenue per month
- Profit per month
- Line or bar chart

**6. Outstanding Payments Report**
- Transactions with balance due > 0
- Sorted by amount or date
- Aging analysis
- Contact info for follow-up

**Report Features:**
- Date range filters
- Status filters
- Export formats (PDF formatted, Excel for analysis, CSV for raw data)
- Charts and visualizations
- Print-friendly formatting

---

## 5. UI/UX Changes

### 5.1 Navigation Updates

**Current Navigation (PMR):**
- StockBoard
- Inventory
- Daily Report
- Leads
- Expenses
- Search
- Dashboard
- Statements
- Admin

**New Navigation (USSG):**

**If USSG has Registry:**
- StockBoard
- Inventory
- Daily Report (if applicable)
- Leads
- Expenses
- Search
- **Registry (NEW)**
- Dashboard
- Statements
- Admin

**Registry Submenu (if implemented):**
- Registry Manager
- Registry Search

**Company Indicator in Header:**
- Show current company name
- Show current company logo/icon
- If user has access to multiple companies, show selector

### 5.2 Forms Updates

**Inventory Form:**
- Warehouse dropdown: Fetch from database
- Filter by company
- Show only active warehouses

**Expense Form:**
- Account dropdown: Fetch from database
- Filter by company
- Group by account type (optional)
- Show only active accounts

**Registry Form:**
- Complete new form
- Multi-section layout
- Real-time calculations
- Summary panel

### 5.3 Dashboard Updates

**Company-Specific Metrics:**
- All metrics filtered by company
- Warehouse names from database
- Account names from database
- Add registry metrics (if USSG)

**Registry Metrics (USSG only):**
- Total transactions this month
- Total profit from registry
- Pending registry payments
- Registry transaction count

### 5.4 Mobile Responsiveness

**List Views:**
- Stack columns on mobile
- Card layout instead of table
- Swipeable actions
- Infinite scroll or pagination

**Forms:**
- Full-width inputs
- Larger touch targets
- Collapsible sections
- Bottom sheet for actions

**Dashboard:**
- Stack widgets vertically
- Scrollable cards
- Simplified charts

---

## 6. API Changes

### 6.1 Existing API Updates

**All Existing Routes:**

**Required Changes:**
1. Extract company_id from session
2. Add company_id to WHERE clause
3. Validate user has access to company
4. Return company-filtered data only

**Inventory API (`/api/inventory`):**
- GET: Filter by company_id
- POST: Set company_id from session
- PUT: Verify transaction belongs to company
- DELETE: Verify transaction belongs to company
- Join warehouses table for display names

**Expense API (`/api/expenses`):**
- GET: Filter by company_id
- POST: Set company_id, validate account belongs to company
- PUT: Verify transaction belongs to company
- DELETE: Verify transaction belongs to company
- Join expense_accounts table for display names

**Stock API (`/api/stock`):**
- Similar updates to inventory

**Dashboard API (`/api/dashboard`):**
- Calculate metrics for current company only
- Use company's warehouses and accounts
- Add registry metrics if applicable

**Statement API (`/api/statement/:name`):**
- Filter by company
- Use company accounts

### 6.2 New Registry APIs

**Registry Transactions API:**

**GET /api/registry**
- List registry transactions
- Query params:
  - date / dateFrom / dateTo (date filtering)
  - paymentStatus (filter by status)
  - transactionType (filter by type)
  - location (search location)
  - seller (search seller)
  - buyer (search buyer)
  - page, limit (pagination)
  - sortBy, sortOrder (sorting)
- Response:
  - Array of transactions
  - Pagination metadata
  - Summary stats (optional)
- Filter by company_id automatically

**GET /api/registry/:id**
- Get single transaction
- Return full object with calculated fields
- Verify belongs to company

**POST /api/registry**
- Create new transaction
- Generate transaction_id
- Validate required fields
- Set company_id from session
- Database calculates auto fields
- Return created object

**PUT /api/registry/:id**
- Update existing transaction (CRITICAL)
- Verify belongs to company
- Validate changes
- Database recalculates auto fields
- Return updated object

**DELETE /api/registry/:id** (Optional)
- Delete transaction
- Or soft delete (set status = Cancelled)
- Verify belongs to company

**GET /api/registry/summary**
- Financial summary for date range
- Total transactions
- Total income (received + commission)
- Total expenses
- Net profit
- Pending payments
- Status breakdown

**Validation in APIs:**
- Required fields present
- Property value > 0
- Valid enums (type, status)
- Reasonable date (not far future)
- No SQL injection
- No XSS

**Error Handling:**
- 400: Validation error (with details)
- 401: Not authenticated
- 403: Not authorized (wrong company)
- 404: Not found
- 500: Server error

**User-Friendly Messages:**
- "Property value is required"
- "Transaction not found"
- "You don't have access to this transaction"
(NOT: "Validation failed on field X")

### 6.3 Middleware Updates

**Company Context Middleware:**
- Extract company_id from session
- Validate company exists and is active
- Set company context for request
- Handle missing/invalid company

**Authorization Middleware:**
- Check user role for company
- Verify permissions for operation
- Prevent cross-company access

**Error Handling Middleware:**
- Catch company-related errors
- Return user-friendly messages
- Log security violations

---

## 7. Database Schema Changes

### 7.1 New Tables

**1. Companies Table**
```
companies
├── id (UUID, PK)
├── code (VARCHAR unique - "PMR", "USSG")
├── name (VARCHAR - full company name)
├── display_name (VARCHAR - for UI)
├── is_active (BOOLEAN - enable/disable)
├── settings (JSONB - flexible config)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

Indexes:
- code
- is_active
```

**2. Warehouses Table**
```
warehouses
├── id (UUID, PK)
├── company_id (UUID, FK to companies)
├── code (VARCHAR - "GURH", "REWA", etc.)
├── name (VARCHAR)
├── display_name (VARCHAR)
├── is_active (BOOLEAN)
├── location (TEXT - optional)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

Unique constraint: (company_id, code)
Indexes:
- company_id
- code
- is_active
```

**3. Expense Accounts Table**
```
expense_accounts
├── id (UUID, PK)
├── company_id (UUID, FK to companies)
├── code (VARCHAR - "CASH", "ICICI", etc.)
├── name (VARCHAR)
├── display_name (VARCHAR)
├── account_type (VARCHAR - CASH/BANK/CREDIT_CARD/GENERAL)
├── is_active (BOOLEAN)
├── opening_balance (DECIMAL optional)
├── current_balance (DECIMAL optional)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

Unique constraint: (company_id, code)
Indexes:
- company_id
- code
- is_active
- account_type
```

**4. Registry Transactions Table**
```
registry_transactions
├── id (UUID, PK)
├── company_id (UUID, FK to companies)
├── transaction_id (VARCHAR(10) - "REG001", etc.)
├── registration_number (VARCHAR optional)
├── date (DATE required)
├── property_location (VARCHAR required)
├── seller_name (VARCHAR required)
├── buyer_name (VARCHAR required)
├── transaction_type (VARCHAR required)
├── property_value (DECIMAL required, > 0)
│
├── stamp_duty (DECIMAL default 0)
├── registration_fees (DECIMAL default 0)
├── mutation_fees (DECIMAL default 0)
├── registrar_office_fees (DECIMAL GENERATED - property_value * 0.0025)
├── documentation_charge (DECIMAL default 0)
├── operator_cost (DECIMAL default 0)
├── broker_commission (DECIMAL default 0)
├── recommendation_fees (DECIMAL default 0)
│
├── credit_received (DECIMAL default 0)
├── payment_method (VARCHAR)
├── stamp_commission (DECIMAL GENERATED - stamp_duty * 0.015)
│
├── total_expenses (DECIMAL GENERATED - sum of expenses)
├── balance_due (DECIMAL GENERATED - total_expenses - credit_received)
├── amount_profit (DECIMAL GENERATED - (credit_received + stamp_commission) - total_expenses)
│
├── payment_status (VARCHAR default 'Pending')
├── notes (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

Unique constraint: (company_id, transaction_id)
Check constraint: property_value > 0
Check constraint: payment_status IN ('Pending', 'Partial', 'Paid', 'Cancelled')
Check constraint: transaction_type IN (valid types)

Indexes:
- company_id
- date
- property_location
- payment_status
- transaction_type
- seller_name
- buyer_name
- transaction_id
- (company_id, date) composite
```

### 7.2 Existing Table Modifications

**Add company_id to all transaction tables:**

**InventoryTransaction:**
- Add: company_id (UUID, FK, nullable initially)
- Add index on company_id
- After migration, make NOT NULL

**ExpenseTransaction:**
- Add: company_id (UUID, FK, nullable initially)
- Add index on company_id
- After migration, make NOT NULL

**StockTransaction:**
- Add: company_id (UUID, FK, nullable initially)
- Add index on company_id
- After migration, make NOT NULL

**Leads:**
- Add: company_id (UUID, FK, nullable initially)
- Add index on company_id
- After migration, make NOT NULL

**BackupLogs:**
- Add: company_id (UUID, FK, nullable initially)
- Add index on company_id
- After migration, make NOT NULL

**Pins (Authentication):**
- Add: company_id (UUID, FK, nullable initially)
- Add index on company_id
- After migration, make NOT NULL

### 7.3 Database Functions

**Transaction ID Generator:**
```
Function: get_next_registry_transaction_id(company_id UUID)
Returns: VARCHAR(10)
Logic:
  1. Get MAX number from transaction_id for this company
  2. Increment by 1
  3. Format as 'REG' + zero-padded number
  4. Return
```

**Updated At Trigger:**
```
Trigger: update_updated_at_column
On: All tables with updated_at
Logic:
  Before UPDATE, set updated_at = NOW()
```

### 7.4 Row Level Security

**Enable RLS on all tables:**
```
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_transactions ENABLE ROW LEVEL SECURITY;
(and all other tables)
```

**RLS Policies:**

**Companies:**
- All users can read active companies
- Only admins can modify

**All Transaction Tables:**
- Users can only access data where:
  company_id = current_setting('app.current_company_id')::UUID

**How to Set Company Context:**
```
Before queries:
SET LOCAL app.current_company_id = '[user_company_id]';
```

### 7.5 Indexes for Performance

**Critical Indexes:**

**Transaction Tables:**
- company_id (filter by company)
- date (date range queries)
- status fields (filter by status)
- name/description fields (search)

**Composite Indexes:**
- (company_id, date) - common query pattern
- (company_id, status) - filtering
- (company_id, type) - reports

**Full-Text Search (Optional):**
- On property_location, seller_name, buyer_name
- For better search performance

### 7.6 Constraints

**Foreign Keys:**
- All company_id columns → companies(id) ON DELETE CASCADE
- Warehouse company_id → companies(id) ON DELETE CASCADE
- Account company_id → companies(id) ON DELETE CASCADE

**Unique Constraints:**
- (company_id, warehouse_code)
- (company_id, account_code)
- (company_id, transaction_id)

**Check Constraints:**
- property_value > 0
- payment_status IN valid values
- transaction_type IN valid values

---

## 8. Testing Strategy

### 8.1 Unit Testing

**Database Functions:**
- Test transaction ID generation
- Test auto-calculation formulas (registrar fees, commission, profit)
- Test with edge cases (zero values, very large values)
- Test concurrent ID generation

**API Routes:**
- Test all CRUD operations
- Test validation logic
- Test error handling
- Test company filtering
- Test authorization

**Components:**
- Test form validation
- Test calculation updates
- Test company switching
- Test error states

### 8.2 Integration Testing

**API Integration:**
- Test full request/response cycle
- Test database integration
- Test company isolation (cannot access other company data)
- Test role-based access

**UI Integration:**
- Test form submission
- Test data fetching
- Test company switching flow
- Test navigation

### 8.3 End-to-End Testing

**Critical User Flows:**

**Flow 1: PMR User Creates Inventory Transaction**
1. Login as PMR user
2. Navigate to inventory
3. See only PMR warehouses (Pallavi, Tularam)
4. Create transaction
5. Verify saved correctly
6. Verify appears in list

**Flow 2: USSG User Creates Expense**
1. Login as USSG user
2. Navigate to expenses
3. See only USSG accounts (Shivam Tripathi, ICICI, etc.)
4. Create transaction
5. Verify saved correctly

**Flow 3: USSG User Creates and Edits Registry Transaction**
1. Login as USSG user
2. Navigate to registry
3. Create new transaction with partial data
4. Verify auto-calculations correct
5. Save transaction
6. Edit transaction to add payment
7. Verify recalculations correct
8. Save changes
9. Verify updated correctly

**Flow 4: Company Isolation**
1. Login as PMR user
2. Create inventory transaction
3. Logout
4. Login as USSG user
5. Navigate to inventory
6. Verify PMR transaction NOT visible
7. Create USSG transaction
8. Verify only USSG data visible

**Testing Tools:**
- Jest for unit tests
- React Testing Library for components
- Supertest for API testing
- Cypress or Playwright for E2E

### 8.4 Performance Testing

**Load Testing:**
- Test with 10,000 transactions
- Test pagination performance
- Test search performance
- Test summary calculations

**Database Performance:**
- Verify indexes used
- Check query execution plans
- Optimize slow queries

**Target Metrics:**
- Page load < 2 seconds
- API response < 500ms
- Search results < 1 second
- Summary calculations < 2 seconds

### 8.5 Security Testing

**Access Control:**
- Verify cannot access other company data
- Verify role permissions enforced
- Verify RLS policies working

**SQL Injection:**
- Test with malicious inputs
- Verify parameterized queries

**XSS Prevention:**
- Test with script tags in inputs
- Verify sanitization

**Authentication:**
- Verify session management
- Verify logout works
- Verify session expiration

---

## 9. Implementation Phases

### Phase 1: Foundation (Multi-Tenancy)
**Duration:** 1-2 weeks

**Goals:**
- Multi-tenancy infrastructure in place
- Company table created
- All tables have company_id
- Existing PMR data migrated

**Tasks:**
1. Create companies table
2. Insert PMR and USSG companies
3. Add company_id to all tables
4. Migrate existing data to PMR company
5. Update API middleware
6. Update session management
7. Test company isolation

**Deliverables:**
- Companies table with PMR and USSG
- All tables have company_id
- PMR functionality unchanged
- Company context in all APIs

**Testing:**
- Migration successful
- PMR data intact
- Company filtering works
- No cross-company data leakage

**Success Criteria:**
- [ ] Companies table exists with 2 companies
- [ ] All transaction tables have company_id
- [ ] All existing data has PMR company_id
- [ ] API filters by company
- [ ] Tests pass

---

### Phase 2: Warehouses & Accounts
**Duration:** 1 week

**Goals:**
- Dynamic warehouses for both companies
- Dynamic expense accounts for both companies
- USSG can use Gurh and Rewa warehouses
- USSG can use new expense accounts

**Tasks:**
1. Create warehouses table
2. Insert PMR warehouses (Pallavi, Tularam, Factory)
3. Insert USSG warehouses (Gurh, Rewa, Factory)
4. Update inventory UI to use database warehouses
5. Create expense_accounts table
6. Insert PMR accounts
7. Insert USSG accounts
8. Update expense UI to use database accounts
9. Test both companies

**Deliverables:**
- Warehouses table with all warehouses
- Expense accounts table with all accounts
- Inventory form shows correct warehouses
- Expense form shows correct accounts
- Summary displays dynamic columns

**Testing:**
- PMR sees Pallavi/Tularam
- USSG sees Gurh/Rewa
- PMR sees PMR accounts
- USSG sees USSG accounts
- Cannot select wrong warehouse/account

**Success Criteria:**
- [ ] Warehouses table created
- [ ] All warehouses inserted
- [ ] Expense accounts table created
- [ ] All accounts inserted
- [ ] PMR inventory works with DB warehouses
- [ ] USSG inventory works with Gurh/Rewa
- [ ] PMR expenses work with DB accounts
- [ ] USSG expenses work with new accounts
- [ ] Tests pass

---

### Phase 3: Registry Backend
**Duration:** 1-2 weeks

**Goals:**
- Registry database table ready
- Registry API complete
- Auto-calculations working
- Transaction ID generation working

**Tasks:**
1. Create registry_transactions table
2. Implement auto-calculation columns
3. Create transaction ID generator function
4. Implement POST /api/registry (create)
5. Implement GET /api/registry (list with filters)
6. Implement GET /api/registry/:id (details)
7. Implement PUT /api/registry/:id (update - CRITICAL)
8. Implement DELETE /api/registry/:id (optional)
9. Implement GET /api/registry/summary
10. Add validation logic
11. Add error handling
12. Test all endpoints

**Deliverables:**
- Registry transactions table with generated columns
- Full CRUD API for registry
- Auto-calculations in database
- Transaction ID generation working
- Validation in place

**Testing:**
- Create transaction with auto-calculations
- Update transaction and verify recalculations
- Transaction IDs sequential and unique
- Validation catches errors
- Company isolation working

**Success Criteria:**
- [ ] Registry table created
- [ ] Auto-calculated columns working
- [ ] Transaction ID generates correctly
- [ ] POST creates transaction
- [ ] GET lists transactions with filters
- [ ] GET/:id returns single transaction
- [ ] PUT updates transaction
- [ ] Calculations update on edit
- [ ] Validation working
- [ ] Tests pass

---

### Phase 4: Registry Frontend
**Duration:** 2-3 weeks

**Goals:**
- Full registry UI working
- Create, edit, view, delete transactions
- Real-time calculations in UI
- Mobile responsive

**Tasks:**
1. Create registry list page
   - Table with all columns
   - Filters (date, status, type, location)
   - Search (seller, buyer, location)
   - Pagination
   - Color-coded profit
2. Create registry form component
   - Multi-section layout
   - All input fields
   - Real-time calculation display
   - Summary panel
   - Validation UI
3. Create registry detail view
   - Read-only display
   - Edit button
   - Print/export
4. Implement real-time calculations
   - Calculate as user types
   - Update summary panel
   - Show formulas in tooltips
5. Mobile responsiveness
   - Card layout for list
   - Collapsible form sections
   - Bottom summary panel
6. Testing
   - Component tests
   - Integration tests
   - E2E tests

**Deliverables:**
- Complete registry UI
- List, form, detail views
- Real-time calculations working
- Mobile friendly

**Testing:**
- Create transaction via UI
- Edit transaction via UI
- Calculations update in real-time
- Filters work
- Search works
- Mobile view functional

**Success Criteria:**
- [ ] Registry list page complete
- [ ] Registry form complete
- [ ] Registry detail view complete
- [ ] Real-time calculations working
- [ ] Summary panel updates
- [ ] All filters and search work
- [ ] Create transaction works
- [ ] Edit transaction works
- [ ] Delete works
- [ ] Mobile responsive
- [ ] Tests pass

---

### Phase 5: Reports & Analytics
**Duration:** 1 week

**Goals:**
- Registry reports functional
- Dashboard updated
- Export functionality working

**Tasks:**
1. Implement registry summary API
2. Create registry reports
   - Transaction list report
   - Payment status report
   - Financial summary report
   - Location-wise report
   - Monthly trend report
   - Outstanding payments report
3. Update dashboard
   - Add registry metrics
   - Company-specific widgets
4. Implement export
   - PDF export
   - Excel export
   - CSV export
5. Add visualizations
   - Charts for trends
   - Pie charts for status
   - Bar charts for comparisons

**Deliverables:**
- All reports implemented
- Export to multiple formats
- Dashboard with registry metrics
- Charts and visualizations

**Testing:**
- Reports generate correctly
- Export files valid
- Charts display properly
- Data accurate

**Success Criteria:**
- [ ] All 6 reports implemented
- [ ] Export to PDF works
- [ ] Export to Excel works
- [ ] Export to CSV works
- [ ] Dashboard shows registry metrics
- [ ] Charts render correctly
- [ ] Tests pass

---

### Phase 6: Polish & Deploy
**Duration:** 1 week

**Goals:**
- Production ready
- Deployed and tested
- Users trained

**Tasks:**
1. End-to-end testing
2. Performance optimization
3. Security audit
4. Documentation
5. User training materials
6. Deployment
7. Post-deployment verification

**Deliverables:**
- Production deployment
- User documentation
- Training materials
- All tests passing

**Testing:**
- Full E2E tests
- Performance benchmarks met
- Security review complete
- User acceptance testing

**Success Criteria:**
- [ ] All E2E tests pass
- [ ] Performance targets met
- [ ] Security audit complete
- [ ] Deployed to production
- [ ] User documentation complete
- [ ] Training materials ready
- [ ] Users trained
- [ ] Post-deployment checks pass

---

## 10. Risks & Mitigation

### Risk 1: Data Migration Failure

**Risk:** Existing PMR data could be corrupted during migration

**Impact:** High - Loss of production data

**Probability:** Medium

**Mitigation:**
- Full backup before migration
- Test migration in development first
- Run migration in transaction (can rollback)
- Verify data counts before/after
- Staged migration approach
- Rollback plan ready

**Contingency:**
- If migration fails, restore from backup
- Investigate issue
- Fix and retry
- No data loss if backup is good

---

### Risk 2: Performance Degradation

**Risk:** Adding company_id to all queries could slow down application

**Impact:** Medium - Slower user experience

**Probability:** Low

**Mitigation:**
- Add indexes on company_id
- Database indexing on all filter columns
- Query optimization
- Load testing before launch
- Monitor query performance
- Use EXPLAIN to check query plans

**Contingency:**
- Add more indexes
- Optimize slow queries
- Cache frequently accessed data
- Database query tuning

---

### Risk 3: Calculation Errors

**Risk:** Auto-calculations in registry could be incorrect

**Impact:** High - Financial inaccuracy

**Probability:** Low (if tested)

**Mitigation:**
- Database-level calculations (more reliable)
- Thorough testing of formulas
- Manual verification against samples
- User acceptance testing
- Show calculations explicitly
- Allow users to verify

**Contingency:**
- If error found, fix formula
- Recalculate all affected transactions
- Database trigger can update all
- Notify users of correction

---

### Risk 4: User Confusion

**Risk:** Users confused by new company selection or registry system

**Impact:** Medium - Low adoption, support burden

**Probability:** Medium

**Mitigation:**
- Intuitive UI design
- Clear labels and instructions
- Helpful tooltips
- Training sessions
- Good documentation
- User testing before launch

**Contingency:**
- Additional training
- UI improvements based on feedback
- Support documentation
- Help videos

---

### Risk 5: Cross-Company Data Leakage

**Risk:** Security bug could expose one company's data to another

**Impact:** Critical - Privacy breach

**Probability:** Very Low (if properly implemented)

**Mitigation:**
- Row Level Security (RLS) at database level
- Application-level filtering
- Comprehensive authorization checks
- Security code review
- Penetration testing
- Automated security tests

**Contingency:**
- If leak discovered, immediately fix
- Audit affected data
- Notify affected parties
- Strengthen security measures

---

### Risk 6: Edit Conflicts

**Risk:** Two users editing same registry transaction simultaneously

**Impact:** Low - One user's changes could be overwritten

**Probability:** Low

**Mitigation:**
- Optimistic locking (check updated_at timestamp)
- Show warning if data changed
- Last write wins (acceptable for this use case)
- Audit log of changes (optional)

**Contingency:**
- User sees warning that data was changed
- Can review and re-apply changes
- Unlikely to be critical issue

---

### Risk 7: Transaction ID Conflicts

**Risk:** Two transactions created simultaneously get same ID

**Impact:** Medium - Duplicate IDs break uniqueness

**Probability:** Very Low

**Mitigation:**
- Database sequence for ID generation
- Unique constraint on (company_id, transaction_id)
- Database will prevent duplicates
- Proper error handling
- Retry logic if conflict

**Contingency:**
- Database constraint prevents save
- Show error to user
- Retry with next ID
- Graceful handling

---

## 11. Success Criteria

### Technical Success

**Multi-Tenancy:**
- [ ] Companies table exists with PMR and USSG
- [ ] All data isolated by company
- [ ] No cross-company data access possible
- [ ] RLS policies enforced

**Warehouses:**
- [ ] Warehouses table with all entries
- [ ] PMR uses Pallavi, Tularam, Factory
- [ ] USSG uses Gurh, Rewa, Factory
- [ ] Dynamic in UI

**Expense Accounts:**
- [ ] Expense accounts table with all entries
- [ ] PMR uses original accounts
- [ ] USSG uses: Cash, Shivam Tripathi, ICICI, CC Canara, Canara Current, Sawaliya Seth Motors
- [ ] Dynamic in UI

**Registry System:**
- [ ] Full CRUD operations work
- [ ] Auto-calculations accurate (registrar fees, stamp commission, balance due, profit)
- [ ] Edit functionality works
- [ ] Transaction ID generates correctly
- [ ] Payment status tracking works
- [ ] Real-time UI calculations work
- [ ] Mobile responsive

**Performance:**
- [ ] Page load < 2 seconds
- [ ] API response < 500ms
- [ ] All tests passing

**Security:**
- [ ] No data leakage between companies
- [ ] RLS working
- [ ] Authorization enforced
- [ ] No SQL injection vulnerabilities

---

### Business Success

**User Adoption:**
- [ ] Users can manage USSG independently
- [ ] Registry system simplifies workflow
- [ ] Automatic calculations save time
- [ ] Users trained and comfortable

**Data Accuracy:**
- [ ] Registry calculations accurate
- [ ] Financial reports correct
- [ ] No data loss during migration
- [ ] System reliable

**Functionality:**
- [ ] All core features working
- [ ] Edit functionality meets needs
- [ ] Reports provide insights
- [ ] Export works correctly

---

## 12. Documentation Requirements

### Technical Documentation
1. **Database Schema Documentation**
   - All tables and columns
   - Relationships and foreign keys
   - Indexes and constraints
   - Generated columns and formulas

2. **API Documentation**
   - All endpoints
   - Request/response formats
   - Authentication requirements
   - Error codes

3. **Component Documentation**
   - Component hierarchy
   - Props and state
   - Key functionality

4. **Deployment Guide**
   - Environment setup
   - Database migration steps
   - Configuration requirements

5. **Troubleshooting Guide**
   - Common issues
   - Solutions
   - Debugging tips

---

### User Documentation
1. **User Manual**
   - Getting started
   - Feature overview
   - Step-by-step guides

2. **Registry User Guide**
   - How to add transaction
   - How to edit transaction
   - Understanding calculations
   - Payment tracking
   - Reports

3. **FAQ**
   - Common questions
   - Best practices

4. **Quick Reference**
   - Keyboard shortcuts
   - Field requirements
   - Calculation formulas

---

### Training Materials
1. **Video Walkthrough**
   - System overview
   - Registry walkthrough
   - Common tasks

2. **Step-by-Step Tutorials**
   - Create first registry transaction
   - Edit transaction with payments
   - Generate reports

3. **Calculation Guide**
   - How auto-calculations work
   - Formula reference
   - Examples

---

## Appendix A: Registry Calculation Examples

### Example 1: Simple Transaction with Profit

**Input:**
- Property Value: ₹10,00,000
- Stamp Duty: ₹50,000
- Registration Fees: ₹10,000
- Credit Received: ₹65,000

**Auto-Calculations:**
- Registrar Office Fees = 10,00,000 × 0.0025 = ₹2,500
- Stamp Commission = 50,000 × 0.015 = ₹750
- Total Expenses = 50,000 + 10,000 + 2,500 = ₹62,500
- Balance Due = 62,500 - 65,000 = -₹2,500 (overpaid)
- Amount Profit = (65,000 + 750) - 62,500 = ₹3,250 ✓ PROFIT

---

### Example 2: Complex Transaction with Loss

**Input:**
- Property Value: ₹25,00,000
- Stamp Duty: ₹1,25,000
- Registration Fees: ₹20,000
- Mutation Fees: ₹10,000
- Documentation: ₹5,000
- Operator Cost: ₹3,000
- Broker Commission: ₹50,000
- Recommendation Fees: ₹10,000
- Credit Received: ₹2,00,000

**Auto-Calculations:**
- Registrar Office Fees = 25,00,000 × 0.0025 = ₹6,250
- Stamp Commission = 1,25,000 × 0.015 = ₹1,875
- Total Expenses = 1,25,000 + 20,000 + 10,000 + 6,250 + 5,000 + 3,000 + 50,000 + 10,000 = ₹2,29,250
- Balance Due = 2,29,250 - 2,00,000 = ₹29,250 (client owes)
- Amount Profit = (2,00,000 + 1,875) - 2,29,250 = -₹27,375 ✗ LOSS

---

### Example 3: Partial Payment Scenario

**Initial Entry:**
- Property Value: ₹15,00,000
- All fees at zero
- Credit Received: ₹0

**Auto-Calculations:**
- Registrar Office Fees = ₹3,750
- All others = 0
- Balance Due = ₹3,750
- Profit = -₹3,750 (loss)

**After Getting Fee Information (Edit):**
- Stamp Duty: ₹75,000 (user adds)
- Registration Fees: ₹15,000 (user adds)

**Recalculated:**
- Registrar Office Fees = ₹3,750 (same)
- Stamp Commission = 75,000 × 0.015 = ₹1,125 (new)
- Total Expenses = ₹93,750
- Balance Due = ₹93,750
- Profit = ₹1,125 - ₹93,750 = -₹92,625 (loss)

**After First Payment (Edit):**
- Credit Received: ₹50,000 (user adds)
- Payment Status: Partial (user sets)

**Recalculated:**
- Balance Due = 93,750 - 50,000 = ₹43,750 (still owe)
- Profit = (50,000 + 1,125) - 93,750 = -₹42,625 (loss)

**After Final Payment (Edit):**
- Credit Received: ₹94,875 (user updates)
- Payment Status: Paid (user sets)

**Recalculated:**
- Balance Due = 93,750 - 94,875 = -₹1,125 (overpaid)
- Profit = (94,875 + 1,125) - 93,750 = ₹2,250 ✓ PROFIT

This shows edit functionality is critical!

---

**End of Detailed Implementation Plan**

**Document Version:** 1.0
**Created:** December 14, 2024
**Purpose:** Complete technical specification for USSG implementation (no code, only detailed planning)
