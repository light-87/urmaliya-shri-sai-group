-- ============================================================================
-- USSG Complete Database Setup Script
-- Purpose: Create all tables from scratch for USSG database
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
-- STEP 3: Create Authentication Tables
-- ============================================================================

-- Pins table for user authentication
CREATE TABLE IF NOT EXISTS pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin VARCHAR(6) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY', 'REGISTRY_MANAGER'))
);

CREATE TRIGGER update_pins_updated_at
  BEFORE UPDATE ON pins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_pins_pin ON pins(pin);
CREATE INDEX idx_pins_is_active ON pins(is_active);

COMMENT ON TABLE pins IS 'User authentication via PIN codes';

-- ============================================================================
-- STEP 4: Create Warehouses Table
-- ============================================================================

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

CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_warehouses_code ON warehouses(code);
CREATE INDEX idx_warehouses_is_active ON warehouses(is_active);

COMMENT ON TABLE warehouses IS 'Warehouses for USSG inventory management';

-- Insert USSG Warehouses
INSERT INTO warehouses (code, name, display_name, is_active)
VALUES
  ('GURH', 'Gurh', 'Gurh', true),
  ('REWA', 'Rewa', 'Rewa', true),
  ('FACTORY', 'Factory', 'Factory', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 5: Create Expense Accounts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS expense_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  account_type VARCHAR(50) DEFAULT 'GENERAL',
  is_active BOOLEAN DEFAULT true,
  opening_balance DECIMAL(12,2) DEFAULT 0,
  current_balance DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TRIGGER update_expense_accounts_updated_at
  BEFORE UPDATE ON expense_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_expense_accounts_code ON expense_accounts(code);
CREATE INDEX idx_expense_accounts_is_active ON expense_accounts(is_active);
CREATE INDEX idx_expense_accounts_type ON expense_accounts(account_type);

COMMENT ON TABLE expense_accounts IS 'Expense accounts for USSG financial management';

-- Insert USSG Expense Accounts
INSERT INTO expense_accounts (code, name, display_name, account_type, is_active)
VALUES
  ('CASH', 'Cash', 'Cash', 'CASH', true),
  ('SHIWAM_TRIPATHI', 'Shiwam Tripathi', 'Shiwam Tripathi', 'BANK', true),
  ('ICICI', 'ICICI', 'ICICI Bank', 'BANK', true),
  ('CC_CANARA', 'CC Canara', 'CC Canara Bank', 'CREDIT_CARD', true),
  ('CANARA_CURRENT', 'Canara Current', 'Canara Current Account', 'BANK', true),
  ('SAWALIYA_SETH_MOTORS', 'Sawaliya Seth Motors', 'Sawaliya Seth Motors', 'GENERAL', true),
  ('VINAY', 'Vinay', 'Vinay', 'BANK', true),
  ('SACHIN', 'Sachin', 'Sachin', 'BANK', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- STEP 6: Create Inventory Transaction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  warehouse VARCHAR(50) NOT NULL,
  "bucketType" VARCHAR(50) NOT NULL,
  action VARCHAR(10) NOT NULL,
  quantity INTEGER NOT NULL,
  "buyerSeller" VARCHAR(255) NOT NULL,
  "runningTotal" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_warehouse CHECK (warehouse IN ('GURH', 'REWA', 'FACTORY')),
  CONSTRAINT valid_bucket_type CHECK ("bucketType" IN (
    'TATA_G', 'TATA_W', 'TATA_HP', 'AL_10_LTR', 'AL', 'BB', 'ES',
    'MH', 'MH_10_LTR', 'TATA_10_LTR', 'IBC_TANK', 'ECO', 'INDIAN_OIL_20L', 'FREE_DEF'
  )),
  CONSTRAINT valid_action CHECK (action IN ('STOCK', 'SELL'))
);

CREATE TRIGGER update_inventory_transaction_updated_at
  BEFORE UPDATE ON "InventoryTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_inventory_date ON "InventoryTransaction"(date DESC);
CREATE INDEX idx_inventory_warehouse ON "InventoryTransaction"(warehouse);
CREATE INDEX idx_inventory_bucket_type ON "InventoryTransaction"("bucketType");
CREATE INDEX idx_inventory_action ON "InventoryTransaction"(action);
CREATE INDEX idx_inventory_created_at ON "InventoryTransaction"("createdAt" DESC);

COMMENT ON TABLE "InventoryTransaction" IS 'Inventory transactions for bucket stock management';

-- ============================================================================
-- STEP 7: Create Expense Transaction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "ExpenseTransaction" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  account VARCHAR(50) NOT NULL,
  type VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_account CHECK (account IN (
    'CASH', 'SHIWAM_TRIPATHI', 'ICICI', 'CC_CANARA', 'CANARA_CURRENT', 'SAWALIYA_SETH_MOTORS', 'VINAY', 'SACHIN'
  )),
  CONSTRAINT valid_type CHECK (type IN ('INCOME', 'EXPENSE')),
  CONSTRAINT positive_amount CHECK (amount >= 0)
);

CREATE TRIGGER update_expense_transaction_updated_at
  BEFORE UPDATE ON "ExpenseTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_expense_date ON "ExpenseTransaction"(date DESC);
CREATE INDEX idx_expense_account ON "ExpenseTransaction"(account);
CREATE INDEX idx_expense_type ON "ExpenseTransaction"(type);
CREATE INDEX idx_expense_name ON "ExpenseTransaction"(name);
CREATE INDEX idx_expense_created_at ON "ExpenseTransaction"("createdAt" DESC);

COMMENT ON TABLE "ExpenseTransaction" IS 'Financial transactions for income and expenses';

-- ============================================================================
-- STEP 8: Create Stock Transaction Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "StockTransaction" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  type VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  description TEXT,
  "runningTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_stock_type CHECK (type IN (
    'ADD_UREA', 'PRODUCE_BATCH', 'SELL_FREE_DEF', 'FILL_BUCKETS', 'SELL_BUCKETS'
  )),
  CONSTRAINT valid_category CHECK (category IN ('UREA', 'FREE_DEF', 'FINISHED_GOODS')),
  CONSTRAINT valid_unit CHECK (unit IN ('KG', 'LITERS', 'BAGS'))
);

CREATE TRIGGER update_stock_transaction_updated_at
  BEFORE UPDATE ON "StockTransaction"
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_stock_date ON "StockTransaction"(date DESC);
CREATE INDEX idx_stock_type ON "StockTransaction"(type);
CREATE INDEX idx_stock_category ON "StockTransaction"(category);
CREATE INDEX idx_stock_created_at ON "StockTransaction"("createdAt" DESC);

COMMENT ON TABLE "StockTransaction" IS 'Stock transactions for DEF production tracking';

-- ============================================================================
-- STEP 9: Create Leads Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  company VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'NEW',
  priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
  "lastCallDate" TIMESTAMP WITH TIME ZONE,
  "nextFollowUpDate" TIMESTAMP WITH TIME ZONE,
  "callOutcome" VARCHAR(50),
  "quickNote" TEXT,
  "additionalNotes" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN (
    'NEW', 'NEED_TO_CALL', 'CALLED', 'GOT_RESPONSE', 'ON_HOLD',
    'CALL_IN_7_DAYS', 'CONVERTED', 'NOT_INTERESTED'
  )),
  CONSTRAINT valid_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  CONSTRAINT valid_call_outcome CHECK ("callOutcome" IS NULL OR "callOutcome" IN (
    'NO_ANSWER', 'BUSY', 'INTERESTED', 'NEED_INFO',
    'CALL_BACK_LATER', 'WRONG_NUMBER', 'NOT_INTERESTED_NOW'
  ))
);

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_priority ON leads(priority);
CREATE INDEX idx_leads_next_followup ON leads("nextFollowUpDate");
CREATE INDEX idx_leads_name ON leads(name);
CREATE INDEX idx_leads_phone ON leads(phone);
CREATE INDEX idx_leads_created_at ON leads("createdAt" DESC);

COMMENT ON TABLE leads IS 'Lead management and customer relationship tracking';

-- ============================================================================
-- STEP 10: Create Backup Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "backupDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "backupType" VARCHAR(50) NOT NULL,
  "driveFileId" VARCHAR(255),
  "inventoryCount" INTEGER DEFAULT 0,
  "expenseCount" INTEGER DEFAULT 0,
  "stockCount" INTEGER DEFAULT 0,
  "leadsCount" INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_backup_type CHECK ("backupType" IN ('MANUAL', 'AUTOMATIC', 'SCHEDULED')),
  CONSTRAINT valid_status CHECK (status IN ('SUCCESS', 'FAILED', 'PARTIAL'))
);

CREATE INDEX idx_backup_date ON backup_logs("backupDate" DESC);
CREATE INDEX idx_backup_status ON backup_logs(status);
CREATE INDEX idx_backup_created_at ON backup_logs("createdAt" DESC);

COMMENT ON TABLE backup_logs IS 'Backup operation logs and metadata';

-- ============================================================================
-- STEP 11: Create Registry Transactions Table (NEW for USSG)
-- ============================================================================

CREATE TABLE IF NOT EXISTS registry_transactions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Transaction Identification
  transaction_id VARCHAR(10) NOT NULL UNIQUE,
  registration_number VARCHAR(50),

  -- Basic Information
  date DATE NOT NULL,
  property_location VARCHAR(200) NOT NULL,
  seller_name VARCHAR(200) NOT NULL,
  buyer_name VARCHAR(200) NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  property_value DECIMAL(12,2) NOT NULL CHECK (property_value > 0),

  -- Government Fees (INPUT)
  stamp_duty DECIMAL(12,2) DEFAULT 0,
  registration_fees DECIMAL(12,2) DEFAULT 0,
  mutation_fees DECIMAL(12,2) DEFAULT 0,
  documentation_charge DECIMAL(12,2) DEFAULT 0,

  -- Auto-calculated: 0.25% of Property Value (EXPENSE)
  registrar_office_fees DECIMAL(12,2) GENERATED ALWAYS AS (property_value * 0.0025) STORED,

  -- Service Charges (INPUT)
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

  -- Auto-calculated: Balance Due
  balance_due DECIMAL(12,2) GENERATED ALWAYS AS (
    (stamp_duty + registration_fees + mutation_fees +
     (property_value * 0.0025) + documentation_charge +
     operator_cost + broker_commission + recommendation_fees) -
    credit_received
  ) STORED,

  -- Auto-calculated: Amount Profit (NET PROFIT/LOSS)
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
    'Sale Deed', 'Gift Deed', 'Lease Deed', 'Mortgage Deed',
    'Power of Attorney', 'Agreement to Sell', 'Other'
  ))
);

CREATE TRIGGER update_registry_transactions_updated_at
  BEFORE UPDATE ON registry_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE registry_transactions IS 'Property registry transaction management with automatic financial calculations';
COMMENT ON COLUMN registry_transactions.registrar_office_fees IS 'AUTO-CALCULATED: 0.25% of property value (EXPENSE)';
COMMENT ON COLUMN registry_transactions.stamp_commission IS 'AUTO-CALCULATED: 1.5% of stamp duty (INCOME from government)';
COMMENT ON COLUMN registry_transactions.total_expenses IS 'AUTO-CALCULATED: Sum of all expenses';
COMMENT ON COLUMN registry_transactions.balance_due IS 'AUTO-CALCULATED: Total expenses - Credit received';
COMMENT ON COLUMN registry_transactions.amount_profit IS 'AUTO-CALCULATED: (Credit + Commission) - Expenses (NET PROFIT/LOSS)';

-- Create indexes
CREATE INDEX idx_registry_tx_date ON registry_transactions(date DESC);
CREATE INDEX idx_registry_tx_location ON registry_transactions(property_location);
CREATE INDEX idx_registry_tx_payment_status ON registry_transactions(payment_status);
CREATE INDEX idx_registry_tx_transaction_type ON registry_transactions(transaction_type);
CREATE INDEX idx_registry_tx_seller ON registry_transactions(seller_name);
CREATE INDEX idx_registry_tx_buyer ON registry_transactions(buyer_name);
CREATE INDEX idx_registry_tx_transaction_id ON registry_transactions(transaction_id);
CREATE INDEX idx_registry_tx_created_at ON registry_transactions(created_at DESC);

-- ============================================================================
-- STEP 12: Create Transaction ID Generator Function for Registry
-- ============================================================================

CREATE OR REPLACE FUNCTION get_next_registry_transaction_id()
RETURNS VARCHAR(10) AS $$
DECLARE
  last_number INTEGER;
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_id FROM 4) AS INTEGER)), 0)
  INTO last_number
  FROM registry_transactions
  WHERE transaction_id ~ '^REG[0-9]{3}$';

  next_number := last_number + 1;
  RETURN 'REG' || LPAD(next_number::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_next_registry_transaction_id IS 'Generates next sequential registry transaction ID (REG001, REG002, etc.)';

-- ============================================================================
-- STEP 13: Create Default Admin PIN (IMPORTANT!)
-- ============================================================================

-- Insert default PINs for different access levels
-- IMPORTANT: These are default PINs - change them after setup for security!
INSERT INTO pins (pin, role, name, is_active)
VALUES
  ('1111', 'ADMIN', 'Admin User', true),
  ('2222', 'REGISTRY_MANAGER', 'Registry Manager', true),
  ('3333', 'EXPENSE_INVENTORY', 'Expense & Inventory Manager', true),
  ('4444', 'INVENTORY_ONLY', 'Inventory User', true)
ON CONFLICT (pin) DO NOTHING;

-- ============================================================================
-- STEP 14: Verification Queries
-- ============================================================================

-- Count tables created
SELECT 'Tables Created:' AS info;
SELECT
  'pins' AS table_name, COUNT(*) AS record_count FROM pins
UNION ALL
SELECT 'warehouses', COUNT(*) FROM warehouses
UNION ALL
SELECT 'expense_accounts', COUNT(*) FROM expense_accounts
UNION ALL
SELECT 'InventoryTransaction', COUNT(*) FROM "InventoryTransaction"
UNION ALL
SELECT 'ExpenseTransaction', COUNT(*) FROM "ExpenseTransaction"
UNION ALL
SELECT 'StockTransaction', COUNT(*) FROM "StockTransaction"
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'backup_logs', COUNT(*) FROM backup_logs
UNION ALL
SELECT 'registry_transactions', COUNT(*) FROM registry_transactions;

-- Show USSG Warehouses
SELECT 'USSG Warehouses:' AS info;
SELECT code, display_name, is_active
FROM warehouses
ORDER BY code;

-- Show USSG Expense Accounts
SELECT 'USSG Expense Accounts:' AS info;
SELECT code, display_name, account_type, is_active
FROM expense_accounts
ORDER BY code;

-- Test Registry Transaction ID Generation
SELECT 'Next Registry Transaction ID:' AS info, get_next_registry_transaction_id() AS next_id;

-- Show default admin PIN
SELECT 'Default Admin PIN:' AS info;
SELECT pin, role, name FROM pins WHERE role = 'ADMIN';

-- ============================================================================
-- FINAL SUCCESS MESSAGE
-- ============================================================================

SELECT '✅ USSG Database Setup Complete!' AS status;
SELECT
  '📋 Tables Created: 9 (pins, warehouses, expense_accounts, InventoryTransaction, ExpenseTransaction, StockTransaction, leads, backup_logs, registry_transactions)' AS details
UNION ALL
SELECT '📁 Warehouses: 3 (Gurh, Rewa, Factory)'
UNION ALL
SELECT '💰 Expense Accounts: 6 (Cash, Shiwam Tripathi, ICICI, CC Canara, Canara Current, Sawaliya Seth Motors)'
UNION ALL
SELECT '📋 Registry System: Ready with auto-calculations'
UNION ALL
SELECT '🔑 Default PINs: 1111 (Admin), 2222 (Registry), 3333 (Expense/Inv), 4444 (Inv Only)';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

/*
IMPORTANT SECURITY NOTES:
1. Default PINs have been created for all access levels (change after setup!):
   - 1111: ADMIN (full access to all features)
   - 2222: REGISTRY_MANAGER (registry features only)
   - 3333: EXPENSE_INVENTORY (expenses and inventory management)
   - 4444: INVENTORY_ONLY (inventory view and management only)
2. Change these default PINs immediately after setup for security!
3. Set up proper backup procedures for your data
4. Keep your database credentials secure

NEXT STEPS:
1. Run this SQL script in your Supabase database
2. Change all default PINs for security
3. Configure .env file with database connection details
4. Start the application and login with appropriate PIN
5. Begin using the system!

WAREHOUSE SETUP:
- GURH: Gurh warehouse
- REWA: Rewa warehouse
- FACTORY: Factory warehouse

EXPENSE ACCOUNTS:
- CASH: Cash transactions
- SHIWAM_TRIPATHI: Shiwam Tripathi bank account
- ICICI: ICICI Bank account
- CC_CANARA: CC Canara credit card
- CANARA_CURRENT: Canara Current account
- SAWALIYA_SETH_MOTORS: Sawaliya Seth Motors account

REGISTRY SYSTEM:
- Automatic calculation of registrar fees (0.25% of property value)
- Automatic calculation of stamp commission (1.5% of stamp duty)
- Automatic calculation of total expenses, balance due, and profit
- Full edit capability for all transactions
- Transaction ID auto-generation (REG001, REG002, etc.)

For questions or support, refer to the documentation files:
- USSG_DETAILED_PLAN.md
- USSG_SETUP_COMPLETE.md
- PHASE_2_COMPLETE.md
- PHASE_3_COMPLETE.md
*/

-- ============================================================================
-- END OF COMPLETE DATABASE SETUP SCRIPT
-- ============================================================================
