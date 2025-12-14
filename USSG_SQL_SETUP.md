# USSG (Urmaliya Shri Sai Group) - Complete SQL Setup

This document contains all SQL queries needed to set up the USSG company from start to end.

## 📋 Table of Contents
1. [Prerequisites & Database Structure](#prerequisites--database-structure)
2. [Step 1: Multi-Tenancy Setup](#step-1-multi-tenancy-setup)
3. [Step 2: Company Setup](#step-2-company-setup)
4. [Step 3: Warehouse Setup](#step-3-warehouse-setup)
5. [Step 4: Expense Account Setup](#step-4-expense-account-setup)
6. [Step 5: Registry Tables Setup](#step-5-registry-tables-setup)
7. [Step 6: Indexes and Performance](#step-6-indexes-and-performance)
8. [Step 7: RLS Policies](#step-7-rls-policies)
9. [Step 8: Initial Data Verification](#step-8-initial-data-verification)

---

## Prerequisites & Database Structure

### Database Platform
- **Platform**: Supabase (PostgreSQL)
- **Required Extensions**: `uuid-ossp`, `pg_crypto`

### Enable Required Extensions
```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable crypto functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

## Step 1: Multi-Tenancy Setup

### 1.1 Create Companies Table
This table will store both PMR and USSG company information.

```sql
-- Companies table for multi-tenancy
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE, -- 'PMR' or 'USSG'
  display_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_is_active ON companies(is_active);
```

### 1.2 Add company_id to Existing Tables
Add company reference to all existing tables for multi-tenancy.

```sql
-- Add company_id to InventoryTransaction
ALTER TABLE "InventoryTransaction"
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to expenses (if exists)
ALTER TABLE IF EXISTS expenses
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to ExpenseTransaction (if exists)
ALTER TABLE IF EXISTS "ExpenseTransaction"
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to StockTransaction (if exists)
ALTER TABLE IF EXISTS "StockTransaction"
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to leads (if exists)
ALTER TABLE IF EXISTS leads
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to backup_logs (if exists)
ALTER TABLE IF EXISTS backup_logs
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- Add company_id to pins (authentication)
ALTER TABLE IF EXISTS pins
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
```

### 1.3 Create Indexes for company_id
```sql
CREATE INDEX IF NOT EXISTS idx_inventory_company_id ON "InventoryTransaction"(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_company_id ON expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expense_transaction_company_id ON "ExpenseTransaction"(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_transaction_company_id ON "StockTransaction"(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_backup_logs_company_id ON backup_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_pins_company_id ON pins(company_id);
```

---

## Step 2: Company Setup

### 2.1 Insert PMR Company (if not exists)
```sql
-- Insert PMR company
INSERT INTO companies (id, name, code, display_name, is_active, settings)
VALUES (
  uuid_generate_v4(),
  'PMR Oil Company',
  'PMR',
  'PMR Oil Company',
  true,
  '{"warehouses": ["PALLAVI", "TULARAM", "FACTORY"], "expense_accounts": ["CASH", "PRASHANT_GAYDHANE", "PMR", "KPG_SAVING", "KP_ENTERPRISES"]}'
)
ON CONFLICT (code) DO NOTHING;
```

### 2.2 Insert USSG Company
```sql
-- Insert USSG company
INSERT INTO companies (id, name, code, display_name, is_active, settings)
VALUES (
  uuid_generate_v4(),
  'Urmaliya Shri Sai Group',
  'USSG',
  'Urmaliya Shri Sai Group',
  true,
  '{"warehouses": ["GURH", "REWA", "FACTORY"], "expense_accounts": ["CASH", "SHIWAM_TRIPATHI", "ICICI", "CC_CANARA", "CANARA_CURRENT", "SAWALIYA_SETH_MOTORS"]}'
);
```

---

## Step 3: Warehouse Setup

### 3.1 Create Warehouses Table
```sql
-- Warehouses table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique warehouse codes per company
  CONSTRAINT unique_warehouse_per_company UNIQUE (company_id, code)
);

-- Add updated_at trigger
CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_warehouses_company_id ON warehouses(company_id);
CREATE INDEX idx_warehouses_code ON warehouses(code);
CREATE INDEX idx_warehouses_is_active ON warehouses(is_active);
```

### 3.2 Insert PMR Warehouses
```sql
-- Get PMR company ID
DO $$
DECLARE
  pmr_company_id UUID;
BEGIN
  SELECT id INTO pmr_company_id FROM companies WHERE code = 'PMR';

  -- Insert PMR warehouses
  INSERT INTO warehouses (company_id, code, name, display_name, is_active)
  VALUES
    (pmr_company_id, 'PALLAVI', 'Pallavi', 'Pallavi', true),
    (pmr_company_id, 'TULARAM', 'Tularam', 'Tularam', true),
    (pmr_company_id, 'FACTORY', 'Factory', 'Factory', true)
  ON CONFLICT (company_id, code) DO NOTHING;
END $$;
```

### 3.3 Insert USSG Warehouses
```sql
-- Get USSG company ID and insert warehouses
DO $$
DECLARE
  ussg_company_id UUID;
BEGIN
  SELECT id INTO ussg_company_id FROM companies WHERE code = 'USSG';

  -- Insert USSG warehouses
  INSERT INTO warehouses (company_id, code, name, display_name, is_active)
  VALUES
    (ussg_company_id, 'GURH', 'Gurh', 'Gurh', true),
    (ussg_company_id, 'REWA', 'Rewa', 'Rewa', true),
    (ussg_company_id, 'FACTORY', 'Factory', 'Factory', true);
END $$;
```

---

## Step 4: Expense Account Setup

### 4.1 Create Expense Accounts Table
```sql
-- Expense accounts table
CREATE TABLE IF NOT EXISTS expense_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'GENERAL', -- CASH, BANK, CREDIT_CARD, etc.
  is_active BOOLEAN DEFAULT true,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique account codes per company
  CONSTRAINT unique_account_per_company UNIQUE (company_id, code)
);

-- Add updated_at trigger
CREATE TRIGGER update_expense_accounts_updated_at
  BEFORE UPDATE ON expense_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_expense_accounts_company_id ON expense_accounts(company_id);
CREATE INDEX idx_expense_accounts_code ON expense_accounts(code);
CREATE INDEX idx_expense_accounts_is_active ON expense_accounts(is_active);
CREATE INDEX idx_expense_accounts_type ON expense_accounts(account_type);
```

### 4.2 Insert PMR Expense Accounts
```sql
-- Insert PMR expense accounts
DO $$
DECLARE
  pmr_company_id UUID;
BEGIN
  SELECT id INTO pmr_company_id FROM companies WHERE code = 'PMR';

  INSERT INTO expense_accounts (company_id, code, name, display_name, account_type, is_active)
  VALUES
    (pmr_company_id, 'CASH', 'Cash', 'Cash', 'CASH', true),
    (pmr_company_id, 'PRASHANT_GAYDHANE', 'Prashant Gaydhane', 'Prashant Gaydhane', 'BANK', true),
    (pmr_company_id, 'PMR', 'PMR', 'PMR', 'BANK', true),
    (pmr_company_id, 'KPG_SAVING', 'KPG Saving', 'KPG Saving', 'BANK', true),
    (pmr_company_id, 'KP_ENTERPRISES', 'KP Enterprises', 'KP Enterprises', 'BANK', true)
  ON CONFLICT (company_id, code) DO NOTHING;
END $$;
```

### 4.3 Insert USSG Expense Accounts
```sql
-- Insert USSG expense accounts
DO $$
DECLARE
  ussg_company_id UUID;
BEGIN
  SELECT id INTO ussg_company_id FROM companies WHERE code = 'USSG';

  INSERT INTO expense_accounts (company_id, code, name, display_name, account_type, is_active)
  VALUES
    (ussg_company_id, 'CASH', 'Cash', 'Cash', 'CASH', true),
    (ussg_company_id, 'SHIWAM_TRIPATHI', 'Shiwam Tripathi', 'Shiwam Tripathi', 'BANK', true),
    (ussg_company_id, 'ICICI', 'ICICI', 'ICICI Bank', 'BANK', true),
    (ussg_company_id, 'CC_CANARA', 'CC Canara', 'CC Canara Bank', 'CREDIT_CARD', true),
    (ussg_company_id, 'CANARA_CURRENT', 'Canara Current', 'Canara Current Account', 'BANK', true),
    (ussg_company_id, 'SAWALIYA_SETH_MOTORS', 'Sawaliya Seth Motors', 'Sawaliya Seth Motors', 'GENERAL', true);
END $$;
```

---

## Step 5: Registry Tables Setup

### 5.1 Create Registry Transactions Table
```sql
-- Registry transactions table
CREATE TABLE IF NOT EXISTS registry_transactions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Company Reference (Multi-tenancy)
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Transaction Identification
  transaction_id VARCHAR(10) NOT NULL, -- REG001, REG002, etc. (per company)
  registration_number VARCHAR(50),

  -- Basic Information
  date DATE NOT NULL,
  property_location VARCHAR(200) NOT NULL,
  seller_name VARCHAR(200) NOT NULL,
  buyer_name VARCHAR(200) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,

  -- Property Value
  property_value DECIMAL(12,2) NOT NULL CHECK (property_value > 0),

  -- Government Fees (INPUT)
  stamp_duty DECIMAL(12,2) DEFAULT 0,
  registration_fees DECIMAL(12,2) DEFAULT 0,
  mutation_fees DECIMAL(12,2) DEFAULT 0,

  -- Auto-calculated: 0.25% of Property Value (EXPENSE)
  registrar_office_fees DECIMAL(12,2) GENERATED ALWAYS AS (property_value * 0.0025) STORED,

  -- Service Charges (INPUT)
  documentation_charge DECIMAL(12,2) DEFAULT 0,
  operator_cost DECIMAL(12,2) DEFAULT 0,
  broker_commission DECIMAL(12,2) DEFAULT 0,
  recommendation_fees DECIMAL(12,2) DEFAULT 0,

  -- Payment Information (INPUT)
  credit_received DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(50),

  -- Auto-calculated: 1.5% of Stamp Duty (INCOME)
  stamp_commission DECIMAL(12,2) GENERATED ALWAYS AS (stamp_duty * 0.015) STORED,

  -- Auto-calculated: Total Expenses
  total_expenses DECIMAL(12,2) GENERATED ALWAYS AS (
    stamp_duty +
    registration_fees +
    mutation_fees +
    (property_value * 0.0025) +
    documentation_charge +
    operator_cost +
    broker_commission +
    recommendation_fees
  ) STORED,

  -- Auto-calculated: Balance Due (What client owes)
  balance_due DECIMAL(12,2) GENERATED ALWAYS AS (
    (stamp_duty + registration_fees + mutation_fees +
     (property_value * 0.0025) + documentation_charge +
     operator_cost + broker_commission + recommendation_fees) -
    credit_received
  ) STORED,

  -- Auto-calculated: Amount Profit (Net Profit/Loss)
  amount_profit DECIMAL(12,2) GENERATED ALWAYS AS (
    (credit_received + (stamp_duty * 0.015)) -
    (stamp_duty + registration_fees + mutation_fees +
     (property_value * 0.0025) + documentation_charge +
     operator_cost + broker_commission + recommendation_fees)
  ) STORED,

  -- Payment Status
  payment_status VARCHAR(20) DEFAULT 'Pending',

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_transaction_id_per_company UNIQUE (company_id, transaction_id),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Cancelled')),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
    'Sale Deed', 'Gift Deed', 'Lease Deed', 'Mortgage Deed',
    'Power of Attorney', 'Agreement to Sell', 'Other'
  ))
);

-- Add updated_at trigger
CREATE TRIGGER update_registry_transactions_updated_at
  BEFORE UPDATE ON registry_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE registry_transactions IS 'Property registry transaction management with automatic financial calculations';
COMMENT ON COLUMN registry_transactions.registrar_office_fees IS 'Auto-calculated: 0.25% of property value (EXPENSE)';
COMMENT ON COLUMN registry_transactions.stamp_commission IS 'Auto-calculated: 1.5% of stamp duty (INCOME from government)';
COMMENT ON COLUMN registry_transactions.balance_due IS 'Auto-calculated: Total expenses - Credit received (amount client owes)';
COMMENT ON COLUMN registry_transactions.amount_profit IS 'Auto-calculated: (Credit received + Stamp commission) - Total expenses (NET PROFIT/LOSS)';
```

### 5.2 Create Registry Transaction Number Sequence Function
```sql
-- Function to generate next transaction ID for a company
CREATE OR REPLACE FUNCTION get_next_registry_transaction_id(p_company_id UUID)
RETURNS VARCHAR(10) AS $$
DECLARE
  last_number INTEGER;
  next_number INTEGER;
  next_id VARCHAR(10);
BEGIN
  -- Get the last transaction number for this company
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(transaction_id FROM 4) AS INTEGER)),
    0
  )
  INTO last_number
  FROM registry_transactions
  WHERE company_id = p_company_id
    AND transaction_id ~ '^REG[0-9]{3}$';

  -- Increment
  next_number := last_number + 1;

  -- Format as REG001, REG002, etc.
  next_id := 'REG' || LPAD(next_number::TEXT, 3, '0');

  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION get_next_registry_transaction_id IS 'Generates next sequential registry transaction ID (REG001, REG002, etc.) for a company';
```

### 5.3 Create Registry Expense Tracking Table (Optional but Recommended)
```sql
-- Registry expenses linkage to main expense tracking
-- This allows registry expenses to appear in main expense reports
CREATE TABLE IF NOT EXISTS registry_expense_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  registry_transaction_id UUID NOT NULL REFERENCES registry_transactions(id) ON DELETE CASCADE,
  expense_transaction_id UUID REFERENCES "ExpenseTransaction"(id) ON DELETE SET NULL,

  -- Link type: what kind of expense this represents
  expense_type VARCHAR(50) NOT NULL, -- 'STAMP_DUTY', 'REGISTRATION_FEES', etc.
  amount DECIMAL(12,2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_registry_expense_link UNIQUE (registry_transaction_id, expense_type)
);

CREATE INDEX idx_registry_expense_links_company_id ON registry_expense_links(company_id);
CREATE INDEX idx_registry_expense_links_registry_tx ON registry_expense_links(registry_transaction_id);
CREATE INDEX idx_registry_expense_links_expense_tx ON registry_expense_links(expense_transaction_id);

COMMENT ON TABLE registry_expense_links IS 'Links registry transaction expenses to main expense tracking system';
```

---

## Step 6: Indexes and Performance

### 6.1 Registry Transaction Indexes
```sql
-- Performance indexes for registry transactions
CREATE INDEX idx_registry_tx_company_id ON registry_transactions(company_id);
CREATE INDEX idx_registry_tx_date ON registry_transactions(date);
CREATE INDEX idx_registry_tx_location ON registry_transactions(property_location);
CREATE INDEX idx_registry_tx_payment_status ON registry_transactions(payment_status);
CREATE INDEX idx_registry_tx_transaction_type ON registry_transactions(transaction_type);
CREATE INDEX idx_registry_tx_seller ON registry_transactions(seller_name);
CREATE INDEX idx_registry_tx_buyer ON registry_transactions(buyer_name);
CREATE INDEX idx_registry_tx_transaction_id ON registry_transactions(transaction_id);
CREATE INDEX idx_registry_tx_created_at ON registry_transactions(created_at);

-- Composite indexes for common queries
CREATE INDEX idx_registry_tx_company_date ON registry_transactions(company_id, date DESC);
CREATE INDEX idx_registry_tx_company_status ON registry_transactions(company_id, payment_status);
CREATE INDEX idx_registry_tx_company_type ON registry_transactions(company_id, transaction_type);
```

---

## Step 7: RLS Policies

### 7.1 Enable Row Level Security
```sql
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE registry_expense_links ENABLE ROW LEVEL SECURITY;
```

### 7.2 Create RLS Policies

**Note**: These policies assume you have a session context that sets the current company_id. Adjust based on your auth implementation.

```sql
-- Policy for companies table (all users can read active companies)
CREATE POLICY companies_read_policy ON companies
  FOR SELECT
  USING (is_active = true);

-- Policy for warehouses (users can only see warehouses for their company)
CREATE POLICY warehouses_company_policy ON warehouses
  FOR ALL
  USING (
    company_id = current_setting('app.current_company_id', true)::UUID
    OR current_setting('app.current_company_id', true) IS NULL
  );

-- Policy for expense_accounts (users can only see accounts for their company)
CREATE POLICY expense_accounts_company_policy ON expense_accounts
  FOR ALL
  USING (
    company_id = current_setting('app.current_company_id', true)::UUID
    OR current_setting('app.current_company_id', true) IS NULL
  );

-- Policy for registry_transactions (users can only see their company's data)
CREATE POLICY registry_transactions_company_policy ON registry_transactions
  FOR ALL
  USING (
    company_id = current_setting('app.current_company_id', true)::UUID
    OR current_setting('app.current_company_id', true) IS NULL
  );

-- Policy for registry_expense_links
CREATE POLICY registry_expense_links_company_policy ON registry_expense_links
  FOR ALL
  USING (
    company_id = current_setting('app.current_company_id', true)::UUID
    OR current_setting('app.current_company_id', true) IS NULL
  );
```

---

## Step 8: Initial Data Verification

### 8.1 Verify Companies
```sql
-- Check companies created
SELECT
  id,
  code,
  display_name,
  is_active,
  created_at
FROM companies
ORDER BY code;
```

### 8.2 Verify USSG Warehouses
```sql
-- Check USSG warehouses
SELECT
  w.code,
  w.display_name,
  w.is_active,
  c.code as company_code
FROM warehouses w
JOIN companies c ON w.company_id = c.id
WHERE c.code = 'USSG'
ORDER BY w.code;
```

### 8.3 Verify USSG Expense Accounts
```sql
-- Check USSG expense accounts
SELECT
  ea.code,
  ea.display_name,
  ea.account_type,
  ea.is_active,
  c.code as company_code
FROM expense_accounts ea
JOIN companies c ON ea.company_id = c.id
WHERE c.code = 'USSG'
ORDER BY ea.code;
```

### 8.4 Test Registry Transaction ID Generation
```sql
-- Test transaction ID generation for USSG
DO $$
DECLARE
  ussg_id UUID;
  next_tx_id VARCHAR(10);
BEGIN
  SELECT id INTO ussg_id FROM companies WHERE code = 'USSG';
  next_tx_id := get_next_registry_transaction_id(ussg_id);
  RAISE NOTICE 'Next USSG Registry Transaction ID: %', next_tx_id;
END $$;
```

---

## 🎯 Quick Setup Script (Run All At Once)

**IMPORTANT**: Review and understand each section before running. This is a complete setup script.

```sql
-- ============================================================================
-- USSG Complete Database Setup Script
-- ============================================================================

-- Step 1: Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Create Updated At Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create Companies Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_companies_code ON companies(code);
CREATE INDEX idx_companies_is_active ON companies(is_active);

-- Step 4: Insert Companies
INSERT INTO companies (name, code, display_name, is_active, settings)
VALUES
  ('PMR Oil Company', 'PMR', 'PMR Oil Company', true,
   '{"warehouses": ["PALLAVI", "TULARAM", "FACTORY"], "expense_accounts": ["CASH", "PRASHANT_GAYDHANE", "PMR", "KPG_SAVING", "KP_ENTERPRISES"]}'),
  ('Urmaliya Shri Sai Group', 'USSG', 'Urmaliya Shri Sai Group', true,
   '{"warehouses": ["GURH", "REWA", "FACTORY"], "expense_accounts": ["CASH", "SHIWAM_TRIPATHI", "ICICI", "CC_CANARA", "CANARA_CURRENT", "SAWALIYA_SETH_MOTORS"]}')
ON CONFLICT (code) DO NOTHING;

-- Step 5: Create Warehouses Table
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_warehouse_per_company UNIQUE (company_id, code)
);

CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_warehouses_company_id ON warehouses(company_id);
CREATE INDEX idx_warehouses_code ON warehouses(code);

-- Step 6: Insert Warehouses
DO $$
DECLARE
  pmr_id UUID;
  ussg_id UUID;
BEGIN
  SELECT id INTO pmr_id FROM companies WHERE code = 'PMR';
  SELECT id INTO ussg_id FROM companies WHERE code = 'USSG';

  -- PMR Warehouses
  INSERT INTO warehouses (company_id, code, name, display_name, is_active)
  VALUES
    (pmr_id, 'PALLAVI', 'Pallavi', 'Pallavi', true),
    (pmr_id, 'TULARAM', 'Tularam', 'Tularam', true),
    (pmr_id, 'FACTORY', 'Factory', 'Factory', true)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- USSG Warehouses
  INSERT INTO warehouses (company_id, code, name, display_name, is_active)
  VALUES
    (ussg_id, 'GURH', 'Gurh', 'Gurh', true),
    (ussg_id, 'REWA', 'Rewa', 'Rewa', true),
    (ussg_id, 'FACTORY', 'Factory', 'Factory', true)
  ON CONFLICT (company_id, code) DO NOTHING;
END $$;

-- Step 7: Create Expense Accounts Table
CREATE TABLE IF NOT EXISTS expense_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'GENERAL',
  is_active BOOLEAN DEFAULT true,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_account_per_company UNIQUE (company_id, code)
);

CREATE TRIGGER update_expense_accounts_updated_at
  BEFORE UPDATE ON expense_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_expense_accounts_company_id ON expense_accounts(company_id);
CREATE INDEX idx_expense_accounts_code ON expense_accounts(code);

-- Step 8: Insert Expense Accounts
DO $$
DECLARE
  pmr_id UUID;
  ussg_id UUID;
BEGIN
  SELECT id INTO pmr_id FROM companies WHERE code = 'PMR';
  SELECT id INTO ussg_id FROM companies WHERE code = 'USSG';

  -- PMR Accounts
  INSERT INTO expense_accounts (company_id, code, name, display_name, account_type, is_active)
  VALUES
    (pmr_id, 'CASH', 'Cash', 'Cash', 'CASH', true),
    (pmr_id, 'PRASHANT_GAYDHANE', 'Prashant Gaydhane', 'Prashant Gaydhane', 'BANK', true),
    (pmr_id, 'PMR', 'PMR', 'PMR', 'BANK', true),
    (pmr_id, 'KPG_SAVING', 'KPG Saving', 'KPG Saving', 'BANK', true),
    (pmr_id, 'KP_ENTERPRISES', 'KP Enterprises', 'KP Enterprises', 'BANK', true)
  ON CONFLICT (company_id, code) DO NOTHING;

  -- USSG Accounts
  INSERT INTO expense_accounts (company_id, code, name, display_name, account_type, is_active)
  VALUES
    (ussg_id, 'CASH', 'Cash', 'Cash', 'CASH', true),
    (ussg_id, 'SHIWAM_TRIPATHI', 'Shiwam Tripathi', 'Shiwam Tripathi', 'BANK', true),
    (ussg_id, 'ICICI', 'ICICI', 'ICICI Bank', 'BANK', true),
    (ussg_id, 'CC_CANARA', 'CC Canara', 'CC Canara Bank', 'CREDIT_CARD', true),
    (ussg_id, 'CANARA_CURRENT', 'Canara Current', 'Canara Current Account', 'BANK', true),
    (ussg_id, 'SAWALIYA_SETH_MOTORS', 'Sawaliya Seth Motors', 'Sawaliya Seth Motors', 'GENERAL', true)
  ON CONFLICT (company_id, code) DO NOTHING;
END $$;

-- Step 9: Create Registry Transactions Table
CREATE TABLE IF NOT EXISTS registry_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transaction_id VARCHAR(10) NOT NULL,
  registration_number VARCHAR(50),
  date DATE NOT NULL,
  property_location VARCHAR(200) NOT NULL,
  seller_name VARCHAR(200) NOT NULL,
  buyer_name VARCHAR(200) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  property_value DECIMAL(12,2) NOT NULL CHECK (property_value > 0),
  stamp_duty DECIMAL(12,2) DEFAULT 0,
  registration_fees DECIMAL(12,2) DEFAULT 0,
  mutation_fees DECIMAL(12,2) DEFAULT 0,
  registrar_office_fees DECIMAL(12,2) GENERATED ALWAYS AS (property_value * 0.0025) STORED,
  documentation_charge DECIMAL(12,2) DEFAULT 0,
  operator_cost DECIMAL(12,2) DEFAULT 0,
  broker_commission DECIMAL(12,2) DEFAULT 0,
  recommendation_fees DECIMAL(12,2) DEFAULT 0,
  credit_received DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(50),
  stamp_commission DECIMAL(12,2) GENERATED ALWAYS AS (stamp_duty * 0.015) STORED,
  total_expenses DECIMAL(12,2) GENERATED ALWAYS AS (
    stamp_duty + registration_fees + mutation_fees + (property_value * 0.0025) +
    documentation_charge + operator_cost + broker_commission + recommendation_fees
  ) STORED,
  balance_due DECIMAL(12,2) GENERATED ALWAYS AS (
    (stamp_duty + registration_fees + mutation_fees + (property_value * 0.0025) +
     documentation_charge + operator_cost + broker_commission + recommendation_fees) - credit_received
  ) STORED,
  amount_profit DECIMAL(12,2) GENERATED ALWAYS AS (
    (credit_received + (stamp_duty * 0.015)) -
    (stamp_duty + registration_fees + mutation_fees + (property_value * 0.0025) +
     documentation_charge + operator_cost + broker_commission + recommendation_fees)
  ) STORED,
  payment_status VARCHAR(20) DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_transaction_id_per_company UNIQUE (company_id, transaction_id),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Cancelled')),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
    'Sale Deed', 'Gift Deed', 'Lease Deed', 'Mortgage Deed',
    'Power of Attorney', 'Agreement to Sell', 'Other'
  ))
);

CREATE TRIGGER update_registry_transactions_updated_at
  BEFORE UPDATE ON registry_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add indexes
CREATE INDEX idx_registry_tx_company_id ON registry_transactions(company_id);
CREATE INDEX idx_registry_tx_date ON registry_transactions(date);
CREATE INDEX idx_registry_tx_payment_status ON registry_transactions(payment_status);
CREATE INDEX idx_registry_tx_company_date ON registry_transactions(company_id, date DESC);

-- Step 10: Create Transaction ID Generator Function
CREATE OR REPLACE FUNCTION get_next_registry_transaction_id(p_company_id UUID)
RETURNS VARCHAR(10) AS $$
DECLARE
  last_number INTEGER;
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_id FROM 4) AS INTEGER)), 0)
  INTO last_number
  FROM registry_transactions
  WHERE company_id = p_company_id AND transaction_id ~ '^REG[0-9]{3}$';

  next_number := last_number + 1;
  RETURN 'REG' || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Verification
SELECT 'Setup Complete!' as status;
SELECT 'Companies:', code, display_name FROM companies ORDER BY code;
SELECT 'USSG Warehouses:', w.code FROM warehouses w
  JOIN companies c ON w.company_id = c.id WHERE c.code = 'USSG';
SELECT 'USSG Accounts:', ea.code FROM expense_accounts ea
  JOIN companies c ON ea.company_id = c.id WHERE c.code = 'USSG';
```

---

## 📝 Post-Setup Tasks

### 1. Update Existing Data
If you have existing PMR data, you need to update it with the correct company_id:

```sql
-- Update existing PMR data with company_id
DO $$
DECLARE
  pmr_id UUID;
BEGIN
  SELECT id INTO pmr_id FROM companies WHERE code = 'PMR';

  -- Update InventoryTransaction
  UPDATE "InventoryTransaction"
  SET company_id = pmr_id
  WHERE company_id IS NULL;

  -- Update ExpenseTransaction
  UPDATE "ExpenseTransaction"
  SET company_id = pmr_id
  WHERE company_id IS NULL;

  -- Update StockTransaction
  UPDATE "StockTransaction"
  SET company_id = pmr_id
  WHERE company_id IS NULL;

  -- Update leads
  UPDATE leads
  SET company_id = pmr_id
  WHERE company_id IS NULL;
END $$;
```

### 2. Make company_id NOT NULL (After Data Migration)
```sql
-- After migrating all existing data, make company_id required
ALTER TABLE "InventoryTransaction" ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE "ExpenseTransaction" ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE "StockTransaction" ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE leads ALTER COLUMN company_id SET NOT NULL;
```

---

## ✅ Final Checklist

- [ ] Extensions enabled (uuid-ossp, pgcrypto)
- [ ] Companies table created
- [ ] PMR company inserted
- [ ] USSG company inserted
- [ ] Warehouses table created
- [ ] PMR warehouses inserted
- [ ] USSG warehouses (Gurh, Rewa, Factory) inserted
- [ ] Expense accounts table created
- [ ] PMR expense accounts inserted
- [ ] USSG expense accounts (Shiwam Tripathi, ICICI, CC Canara, Canara Current, Sawaliya Seth Motors, Cash) inserted
- [ ] Registry transactions table created
- [ ] All indexes created
- [ ] Transaction ID generator function created
- [ ] Verification queries run successfully
- [ ] Existing PMR data migrated (if applicable)
- [ ] company_id columns set to NOT NULL (after migration)

---

## 🔍 Troubleshooting

### Error: "relation already exists"
- This means the table is already created. Safe to ignore or use `IF NOT EXISTS` clause.

### Error: "company_id cannot be null"
- Make sure to run the data migration script first before setting NOT NULL constraint.

### Error: "duplicate key value violates unique constraint"
- Check if you're trying to insert duplicate companies, warehouses, or accounts.
- Use `ON CONFLICT DO NOTHING` to safely skip duplicates.

### Transaction IDs not generating correctly
- Check the `get_next_registry_transaction_id` function
- Verify the regex pattern matches your transaction_id format

---

## 📞 Support

For questions or issues:
1. Check the verification queries in Step 8
2. Review the troubleshooting section above
3. Consult with database administrator

---

**Document Version**: 1.0
**Last Updated**: 2024-12-14
**Created For**: USSG (Urmaliya Shri Sai Group) Setup
