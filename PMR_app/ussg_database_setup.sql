-- ============================================================================
-- USSG Database Setup Script (Without Multi-Tenancy)
-- Purpose: Setup USSG-specific warehouses, expense accounts, and registry system
-- Date: December 16, 2024
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Required Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 2: Create Helper Functions
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Create Warehouses Table
-- ============================================================================

-- Warehouses table for USSG
CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger for warehouses
CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for warehouses
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_is_active ON warehouses(is_active);

-- Add comments
COMMENT ON TABLE warehouses IS 'Warehouses for USSG inventory management';
COMMENT ON COLUMN warehouses.code IS 'Unique warehouse code (GURH, REWA, FACTORY)';

-- ============================================================================
-- STEP 4: Insert USSG Warehouses
-- ============================================================================

INSERT INTO warehouses (code, name, display_name, is_active)
VALUES
  ('GURH', 'Gurh', 'Gurh', true),
  ('REWA', 'Rewa', 'Rewa', true),
  ('FACTORY', 'Factory', 'Factory', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 5: Create Expense Accounts Table
-- ============================================================================

-- Expense accounts table for USSG
CREATE TABLE IF NOT EXISTS expense_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'GENERAL', -- CASH, BANK, CREDIT_CARD, GENERAL
  is_active BOOLEAN DEFAULT true,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger for expense_accounts
CREATE TRIGGER update_expense_accounts_updated_at
  BEFORE UPDATE ON expense_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for expense_accounts
CREATE INDEX IF NOT EXISTS idx_expense_accounts_code ON expense_accounts(code);
CREATE INDEX IF NOT EXISTS idx_expense_accounts_is_active ON expense_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_expense_accounts_type ON expense_accounts(account_type);

-- Add comments
COMMENT ON TABLE expense_accounts IS 'Expense accounts for USSG financial management';
COMMENT ON COLUMN expense_accounts.code IS 'Unique account code';
COMMENT ON COLUMN expense_accounts.account_type IS 'Account type: CASH, BANK, CREDIT_CARD, GENERAL';

-- ============================================================================
-- STEP 6: Insert USSG Expense Accounts
-- ============================================================================

INSERT INTO expense_accounts (code, name, display_name, account_type, is_active)
VALUES
  ('CASH', 'Cash', 'Cash', 'CASH', true),
  ('SHIWAM_TRIPATHI', 'Shiwam Tripathi', 'Shiwam Tripathi', 'BANK', true),
  ('ICICI', 'ICICI', 'ICICI Bank', 'BANK', true),
  ('CC_CANARA', 'CC Canara', 'CC Canara Bank', 'CREDIT_CARD', true),
  ('CANARA_CURRENT', 'Canara Current', 'Canara Current Account', 'BANK', true),
  ('SAWALIYA_SETH_MOTORS', 'Sawaliya Seth Motors', 'Sawaliya Seth Motors', 'GENERAL', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 7: Create Registry Transactions Table
-- ============================================================================

-- Registry transactions table (NEW for USSG)
-- This table manages property registry transactions with automatic calculations
CREATE TABLE IF NOT EXISTS registry_transactions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Transaction Identification
  transaction_id VARCHAR(10) NOT NULL UNIQUE, -- REG001, REG002, etc.
  registration_number VARCHAR(50), -- Optional official registration number

  -- Basic Information (REQUIRED)
  date DATE NOT NULL,
  property_location VARCHAR(200) NOT NULL,
  seller_name VARCHAR(200) NOT NULL,
  buyer_name VARCHAR(200) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  property_value DECIMAL(12,2) NOT NULL CHECK (property_value > 0),

  -- Government Fees (USER INPUT - defaults to 0)
  stamp_duty DECIMAL(12,2) DEFAULT 0,
  registration_fees DECIMAL(12,2) DEFAULT 0,
  mutation_fees DECIMAL(12,2) DEFAULT 0,
  documentation_charge DECIMAL(12,2) DEFAULT 0,

  -- AUTO-CALCULATED: Registrar Office Fees (0.25% of Property Value) - EXPENSE
  registrar_office_fees DECIMAL(12,2) GENERATED ALWAYS AS (property_value * 0.0025) STORED,

  -- Service Charges (USER INPUT - defaults to 0)
  operator_cost DECIMAL(12,2) DEFAULT 0,
  broker_commission DECIMAL(12,2) DEFAULT 0,
  recommendation_fees DECIMAL(12,2) DEFAULT 0,

  -- Payment Information (USER INPUT)
  credit_received DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(50),

  -- AUTO-CALCULATED: Stamp Commission (1.5% of Stamp Duty) - INCOME from government
  stamp_commission DECIMAL(12,2) GENERATED ALWAYS AS (stamp_duty * 0.015) STORED,

  -- AUTO-CALCULATED: Total Expenses
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

  -- AUTO-CALCULATED: Balance Due (Amount client still owes)
  balance_due DECIMAL(12,2) GENERATED ALWAYS AS (
    (stamp_duty + registration_fees + mutation_fees +
     (property_value * 0.0025) + documentation_charge +
     operator_cost + broker_commission + recommendation_fees) -
    credit_received
  ) STORED,

  -- AUTO-CALCULATED: Amount Profit (NET PROFIT/LOSS)
  -- Formula: (Credit Received + Stamp Commission) - Total Expenses
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
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Cancelled')),
  CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
    'Sale Deed',
    'Gift Deed',
    'Lease Deed',
    'Mortgage Deed',
    'Power of Attorney',
    'Agreement to Sell',
    'Other'
  ))
);

-- Add updated_at trigger for registry_transactions
CREATE TRIGGER update_registry_transactions_updated_at
  BEFORE UPDATE ON registry_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to explain auto-calculated fields
COMMENT ON TABLE registry_transactions IS 'Property registry transaction management with automatic financial calculations';
COMMENT ON COLUMN registry_transactions.registrar_office_fees IS 'AUTO-CALCULATED: 0.25% of property value (EXPENSE)';
COMMENT ON COLUMN registry_transactions.stamp_commission IS 'AUTO-CALCULATED: 1.5% of stamp duty (INCOME from government)';
COMMENT ON COLUMN registry_transactions.total_expenses IS 'AUTO-CALCULATED: Sum of all expenses';
COMMENT ON COLUMN registry_transactions.balance_due IS 'AUTO-CALCULATED: Total expenses - Credit received (amount client owes)';
COMMENT ON COLUMN registry_transactions.amount_profit IS 'AUTO-CALCULATED: (Credit received + Stamp commission) - Total expenses (NET PROFIT/LOSS)';

-- ============================================================================
-- STEP 8: Create Indexes for Registry Transactions
-- ============================================================================

-- Performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_registry_tx_date ON registry_transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_registry_tx_location ON registry_transactions(property_location);
CREATE INDEX IF NOT EXISTS idx_registry_tx_payment_status ON registry_transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_registry_tx_transaction_type ON registry_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_registry_tx_seller ON registry_transactions(seller_name);
CREATE INDEX IF NOT EXISTS idx_registry_tx_buyer ON registry_transactions(buyer_name);
CREATE INDEX IF NOT EXISTS idx_registry_tx_transaction_id ON registry_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_registry_tx_created_at ON registry_transactions(created_at DESC);

-- ============================================================================
-- STEP 9: Create Transaction ID Generator Function
-- ============================================================================

-- Function to generate next sequential registry transaction ID
CREATE OR REPLACE FUNCTION get_next_registry_transaction_id()
RETURNS VARCHAR(10) AS $$
DECLARE
  last_number INTEGER;
  next_number INTEGER;
  next_id VARCHAR(10);
BEGIN
  -- Get the last transaction number
  SELECT COALESCE(
    MAX(CAST(SUBSTRING(transaction_id FROM 4) AS INTEGER)),
    0
  )
  INTO last_number
  FROM registry_transactions
  WHERE transaction_id ~ '^REG[0-9]{3}$';

  -- Increment
  next_number := last_number + 1;

  -- Format as REG001, REG002, etc.
  next_id := 'REG' || LPAD(next_number::TEXT, 3, '0');

  RETURN next_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_registry_transaction_id IS 'Generates next sequential registry transaction ID (REG001, REG002, etc.)';

-- ============================================================================
-- STEP 10: Verification Queries
-- ============================================================================

-- Check warehouses created
SELECT 'USSG Warehouses Created:' AS info;
SELECT code, display_name, is_active
FROM warehouses
ORDER BY code;

-- Check expense accounts created
SELECT 'USSG Expense Accounts Created:' AS info;
SELECT code, display_name, account_type, is_active
FROM expense_accounts
ORDER BY code;

-- Test registry transaction ID generation
SELECT 'Next Registry Transaction ID:' AS info, get_next_registry_transaction_id() AS next_id;

-- Show setup complete message
SELECT '✅ USSG Database Setup Complete!' AS status;
SELECT '📁 Warehouses: 3 (Gurh, Rewa, Factory)' AS details
UNION ALL
SELECT '💰 Expense Accounts: 6 (Cash, Shiwam Tripathi, ICICI, CC Canara, Canara Current, Sawaliya Seth Motors)'
UNION ALL
SELECT '📋 Registry System: Ready with auto-calculations';

-- ============================================================================
-- END OF SETUP SCRIPT
-- ============================================================================
