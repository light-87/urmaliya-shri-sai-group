// Session Types
export interface SessionData {
  pinId: string
  role: 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY' | 'REGISTRY_MANAGER'
  expiresAt: number
}

// Enum Types (mirror Prisma enums)
export type PinRole = 'ADMIN' | 'EXPENSE_INVENTORY' | 'INVENTORY_ONLY' | 'REGISTRY_MANAGER'

export type Warehouse = 'PALLAVI' | 'TULARAM' | 'FACTORY'

export type BucketType =
  | 'TATA_G'
  | 'TATA_W'
  | 'TATA_HP'
  | 'AL_10_LTR'
  | 'AL'
  | 'BB'
  | 'ES'
  | 'MH'
  | 'MH_10_LTR'
  | 'TATA_10_LTR'
  | 'IBC_TANK'
  | 'ECO'
  | 'INDIAN_OIL_20L'
  | 'FREE_DEF'

export type ActionType = 'STOCK' | 'SELL'

export type ExpenseAccount =
  | 'CASH'
  | 'PRASHANT_GAYDHANE'
  | 'PMR'
  | 'KPG_SAVING'
  | 'KP_ENTERPRISES'

export type TransactionType = 'INCOME' | 'EXPENSE'

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// Inventory Types
export interface InventoryTransaction {
  id: string
  date: string
  warehouse: Warehouse
  bucketType: BucketType
  action: ActionType
  quantity: number
  buyerSeller: string
  runningTotal: number
  createdAt: string
  updatedAt: string
}

export interface InventorySummary {
  bucketType: BucketType
  pallavi: number
  tularam: number
  total: number
}

export interface InventoryResponse {
  transactions: InventoryTransaction[]
  summary: InventorySummary[]
}

// Expense Types
export interface ExpenseTransaction {
  id: string
  date: string
  amount: number
  account: ExpenseAccount
  type: TransactionType
  name: string
  createdAt: string
  updatedAt: string
}

export interface ExpensePagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ExpenseResponse {
  transactions: ExpenseTransaction[]
  pagination: ExpensePagination
  uniqueNames: string[]
}

// Dashboard Types
export interface DashboardSummary {
  totalIncome: number
  totalExpense: number
  netProfit: number
}

export interface MonthlyData {
  month: string
  income: number
  expense: number
  net: number
}

export interface AccountBreakdown {
  account: string
  amount: number
}

export interface DashboardResponse {
  summary: DashboardSummary
  monthlyData: MonthlyData[]
  accountBreakdown: {
    income: AccountBreakdown[]
    expense: AccountBreakdown[]
  }
  trendData: {
    month: string
    income: number
    expense: number
  }[]
}

// Statement Types
export interface StatementResponse {
  name: string
  transactions: ExpenseTransaction[]
  totalBalance: number
}

// Backup Types
export interface BackupLog {
  id: string
  backupDate: string
  backupType: string
  driveFileId?: string
  inventoryCount: number
  expenseCount: number
  stockCount: number
  leadsCount: number
  status: string
  errorMessage?: string
}

// Form Input Types
export interface InventoryInput {
  date: Date
  warehouse: Warehouse
  bucketType: BucketType
  action: ActionType
  quantity: number
  buyerSeller: string
}

export interface ExpenseInput {
  date: Date
  amount: number
  account: ExpenseAccount
  type: TransactionType
  name: string
}

// Display Labels
export const BUCKET_TYPE_LABELS: Record<BucketType, string> = {
  TATA_G: 'TATA G',
  TATA_W: 'TATA W',
  TATA_HP: 'TATA HP',
  AL_10_LTR: 'AL 10 ltr',
  AL: 'AL',
  BB: 'BB',
  ES: 'ES',
  MH: 'MH',
  MH_10_LTR: 'MH 10 Ltr',
  TATA_10_LTR: 'TATA 10 Ltr',
  IBC_TANK: 'IBC tank',
  ECO: 'Eco',
  INDIAN_OIL_20L: 'Indian Oil 20 Ltr',
  FREE_DEF: 'Free DEF',
}

// Bucket sizes in liters (0 for non-sellable items)
export const BUCKET_SIZES: Record<BucketType, number> = {
  TATA_G: 20,
  TATA_W: 20,
  TATA_HP: 20,
  AL_10_LTR: 10,
  AL: 20,
  BB: 20,
  ES: 20,
  MH: 20,
  MH_10_LTR: 10,
  TATA_10_LTR: 10,
  IBC_TANK: 0, // Not counted as sellable product (for counting empty tanks)
  ECO: 20,
  INDIAN_OIL_20L: 20,
  FREE_DEF: 0, // Not counted (liters tracked separately in quantity field)
}

export const ACCOUNT_LABELS: Record<ExpenseAccount, string> = {
  CASH: 'Cash',
  PRASHANT_GAYDHANE: 'Prashant Gaydhane',
  PMR: 'PMR',
  KPG_SAVING: 'KPG Saving',
  KP_ENTERPRISES: 'KP Enterprises',
}

export const WAREHOUSE_LABELS: Record<Warehouse, string> = {
  PALLAVI: 'Pallavi',
  TULARAM: 'Tularam',
  FACTORY: 'Factory',
}

// Stock Tracking Types
export type StockTransactionType =
  | 'ADD_UREA'
  | 'PRODUCE_BATCH'
  | 'SELL_FREE_DEF'
  | 'FILL_BUCKETS'
  | 'SELL_BUCKETS'

export type StockCategory = 'UREA' | 'FREE_DEF' | 'FINISHED_GOODS'

export type StockUnit = 'KG' | 'LITERS' | 'BAGS'

export interface StockTransaction {
  id: string
  date: string
  type: StockTransactionType
  category: StockCategory
  quantity: number
  unit: StockUnit
  description?: string
  runningTotal: number
  createdAt: string
  updatedAt: string
}

export interface StockSummary {
  ureaKg: number
  ureaBags: number
  ureaCansProduceL: number
  freeDEF: number
  bucketsInLiters: number
  finishedGoods: number
}

export interface StockResponse {
  transactions: StockTransaction[]
  summary: StockSummary
}

export interface StockInput {
  date: Date
  type: StockTransactionType
  category: StockCategory
  quantity: number
  unit: StockUnit
  description?: string
}

// Stock constants
export const UREA_PER_BATCH_KG = 360
export const UREA_BAGS_PER_BATCH = 8
export const KG_PER_BAG = 45
export const LITERS_PER_BATCH = 1000

export const STOCK_TYPE_LABELS: Record<StockTransactionType, string> = {
  ADD_UREA: 'Add Urea',
  PRODUCE_BATCH: 'Produce Batch',
  SELL_FREE_DEF: 'Sell Free DEF',
  FILL_BUCKETS: 'Fill Buckets',
  SELL_BUCKETS: 'Sell Buckets',
}

export const STOCK_CATEGORY_LABELS: Record<StockCategory, string> = {
  UREA: 'Urea (Raw Material)',
  FREE_DEF: 'Free DEF',
  FINISHED_GOODS: 'Finished Goods',
}

// Daily Report Types
export interface FinancialMetrics {
  totalIncome: number
  totalExpense: number
  netProfit: number
  transactionCount: number
  topAccount: {
    account: ExpenseAccount
    amount: number
  } | null
  accountBreakdown: {
    account: ExpenseAccount
    income: number
    expense: number
  }[]
  comparison: {
    incomeTrend: number // percentage change from previous day
    expenseTrend: number
    netTrend: number
  }
}

export interface InventoryMetrics {
  totalBucketsMoved: number
  bucketsStocked: number
  bucketsSold: number
  activeBucketTypes: number
  currentStockLevel: number // percentage
  mostActiveBucket: {
    type: BucketType
    quantity: number
  } | null
  warehouseActivity: {
    warehouse: Warehouse
    stocked: number
    sold: number
  }[]
}

export interface ProductionMetrics {
  litersProduced: number
  ureaConsumed: number
  batchesCompleted: number
  freeDEFSold: number
  currentUreaStock: number
  productionEfficiency: number // percentage
}

export interface HealthMetrics {
  overallScore: number // 0-100
  status: 'EXCELLENT' | 'GOOD' | 'ATTENTION_NEEDED' | 'CRITICAL'
  alerts: {
    type: 'NEGATIVE_CASH_FLOW' | 'LOW_STOCK' | 'LOW_UREA' | 'NO_PRODUCTION'
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    message: string
  }[]
  totalActivities: number
  operationalEfficiency: number // percentage
}

export type TimelineItemType = 'EXPENSE' | 'INVENTORY' | 'STOCK'

export interface TimelineItem {
  id: string
  time: string // ISO datetime
  type: TimelineItemType
  icon: string
  title: string
  description: string
  amount?: number
  details: Record<string, unknown>
  colorClass: string
}

export interface QuickInsight {
  id: string
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'TIP'
  icon: string
  message: string
}

export interface DailyReportData {
  date: string
  financial: FinancialMetrics
  inventory: InventoryMetrics
  production: ProductionMetrics
  health: HealthMetrics
  timeline: TimelineItem[]
  insights: QuickInsight[]
}

export interface DailyReportResponse {
  success: boolean
  data?: DailyReportData
  error?: string
}

// Lead Types
export type LeadStatus =
  | 'NEW'
  | 'NEED_TO_CALL'
  | 'CALLED'
  | 'GOT_RESPONSE'
  | 'ON_HOLD'
  | 'CALL_IN_7_DAYS'
  | 'CONVERTED'
  | 'NOT_INTERESTED'

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type CallOutcome =
  | 'NO_ANSWER'
  | 'BUSY'
  | 'INTERESTED'
  | 'NEED_INFO'
  | 'CALL_BACK_LATER'
  | 'WRONG_NUMBER'
  | 'NOT_INTERESTED_NOW'

export interface Lead {
  id: string
  name: string
  phone: string
  company?: string
  status: LeadStatus
  priority: Priority
  lastCallDate?: string
  nextFollowUpDate?: string
  callOutcome?: CallOutcome
  quickNote?: string
  additionalNotes?: string
  createdAt: string
  updatedAt: string
}

export interface LeadInput {
  name: string
  phone: string
  company?: string
  status?: LeadStatus
  priority?: Priority
  nextFollowUpDate?: Date
  callOutcome?: CallOutcome
  quickNote?: string
  additionalNotes?: string
}

export interface LeadResponse {
  leads: Lead[]
  total: number
}

// Lead Display Labels
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  NEED_TO_CALL: 'Need to Call',
  CALLED: 'Called',
  GOT_RESPONSE: 'Got Response',
  ON_HOLD: 'On Hold',
  CALL_IN_7_DAYS: 'Call in 7 Days',
  CONVERTED: 'Converted',
  NOT_INTERESTED: 'Not Interested',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
}

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  NO_ANSWER: "Didn't pick up",
  BUSY: 'Said they are busy',
  INTERESTED: 'Wants to know more',
  NEED_INFO: 'Asked for details',
  CALL_BACK_LATER: 'Call back later',
  WRONG_NUMBER: 'Wrong number',
  NOT_INTERESTED_NOW: 'Not interested',
}

export const QUICK_NOTE_OPTIONS = [
  'Interested in product',
  'Need to send quote',
  'Waiting for decision',
  'Asked to call back',
  'Not available - try later',
  'Wrong number',
  'Already has supplier',
  'Budget constraints',
  'Will contact us',
]

// Priority colors for UI
export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: 'bg-green-100 text-green-800 border-green-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
  URGENT: 'bg-red-100 text-red-800 border-red-300',
}

// Status colors for UI
export const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-300',
  NEED_TO_CALL: 'bg-purple-100 text-purple-800 border-purple-300',
  CALLED: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  GOT_RESPONSE: 'bg-green-100 text-green-800 border-green-300',
  ON_HOLD: 'bg-gray-100 text-gray-800 border-gray-300',
  CALL_IN_7_DAYS: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  CONVERTED: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  NOT_INTERESTED: 'bg-red-100 text-red-800 border-red-300',
}
