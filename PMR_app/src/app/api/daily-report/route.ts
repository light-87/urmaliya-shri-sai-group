import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import {
  DailyReportResponse,
  DailyReportData,
  FinancialMetrics,
  InventoryMetrics,
  ProductionMetrics,
  HealthMetrics,
  TimelineItem,
  QuickInsight,
  ExpenseAccount,
  BucketType,
  Warehouse,
} from '@/types'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

// GET - Fetch daily report data
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const dateParam = searchParams.get('date')
    const targetDate = dateParam ? new Date(dateParam) : new Date()

    const dayStart = startOfDay(targetDate)
    const dayEnd = endOfDay(targetDate)
    const prevDayStart = startOfDay(subDays(targetDate, 1))
    const prevDayEnd = endOfDay(subDays(targetDate, 1))

    // Fetch all data in parallel
    const [
      expenseTransactions,
      prevExpenseTransactions,
      inventoryTransactions,
      inventorySummary,
      stockTransactions,
      stockSummary,
    ] = await Promise.all([
      // Current day expenses
      prisma.expenseTransaction.findMany({
        where: {
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        orderBy: { date: 'desc' },
      }),
      // Previous day expenses for comparison
      prisma.expenseTransaction.findMany({
        where: {
          date: {
            gte: prevDayStart,
            lte: prevDayEnd,
          },
        },
      }),
      // Current day inventory
      prisma.inventoryTransaction.findMany({
        where: {
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        orderBy: { date: 'desc' },
      }),
      // Current inventory summary (all warehouses)
      prisma.inventoryTransaction.findMany({
        orderBy: { date: 'asc' },
      }),
      // Current day stock transactions
      prisma.stockTransaction.findMany({
        where: {
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        orderBy: { date: 'desc' },
      }),
      // Get latest stock summary
      prisma.stockTransaction.findMany({
        orderBy: { date: 'asc' },
      }),
    ])

    // Calculate Financial Metrics
    const financial = calculateFinancialMetrics(
      expenseTransactions,
      prevExpenseTransactions
    )

    // Calculate Inventory Metrics
    const inventory = calculateInventoryMetrics(
      inventoryTransactions,
      inventorySummary
    )

    // Calculate Production Metrics
    const production = calculateProductionMetrics(
      stockTransactions,
      stockSummary
    )

    // Calculate Health Metrics
    const health = calculateHealthMetrics(
      financial,
      inventory,
      production,
      targetDate
    )

    // Build Timeline
    const timeline = buildTimeline(
      expenseTransactions,
      inventoryTransactions,
      stockTransactions
    )

    // Generate Insights
    const insights = generateInsights(financial, inventory, production, health)

    const reportData: DailyReportData = {
      date: targetDate.toISOString(),
      financial,
      inventory,
      production,
      health,
      timeline,
      insights,
    }

    const response: DailyReportResponse = {
      success: true,
      data: reportData,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Daily report error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch daily report',
      },
      { status: 500 }
    )
  }
}

// Helper function to calculate financial metrics
function calculateFinancialMetrics(
  transactions: any[],
  prevTransactions: any[]
): FinancialMetrics {
  const totalIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const netProfit = totalIncome - totalExpense

  const prevIncome = prevTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const prevExpense = prevTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const prevNet = prevIncome - prevExpense

  // Calculate trends
  const incomeTrend = prevIncome > 0 ? ((totalIncome - prevIncome) / prevIncome) * 100 : 0
  const expenseTrend = prevExpense > 0 ? ((totalExpense - prevExpense) / prevExpense) * 100 : 0
  const netTrend = prevNet !== 0 ? ((netProfit - prevNet) / Math.abs(prevNet)) * 100 : 0

  // Account breakdown
  const accountMap = new Map<
    ExpenseAccount,
    { income: number; expense: number }
  >()

  transactions.forEach((t) => {
    const existing = accountMap.get(t.account) || { income: 0, expense: 0 }
    if (t.type === 'INCOME') {
      existing.income += Number(t.amount)
    } else {
      existing.expense += Number(t.amount)
    }
    accountMap.set(t.account, existing)
  })

  const accountBreakdown = Array.from(accountMap.entries()).map(
    ([account, amounts]) => ({
      account,
      income: amounts.income,
      expense: amounts.expense,
    })
  )

  // Find top account by total activity
  const topAccount =
    accountBreakdown.length > 0
      ? accountBreakdown.reduce((max, curr) => {
          const currTotal = curr.income + curr.expense
          const maxTotal = max.income + max.expense
          return currTotal > maxTotal ? curr : max
        })
      : null

  return {
    totalIncome,
    totalExpense,
    netProfit,
    transactionCount: transactions.length,
    topAccount: topAccount
      ? {
          account: topAccount.account,
          amount: topAccount.income + topAccount.expense,
        }
      : null,
    accountBreakdown,
    comparison: {
      incomeTrend,
      expenseTrend,
      netTrend,
    },
  }
}

// Helper function to calculate inventory metrics
function calculateInventoryMetrics(
  transactions: any[],
  allTransactions: any[]
): InventoryMetrics {
  // Exclude FREE_DEF from calculations (it's in liters, not bucket count)
  const filteredTransactions = transactions.filter((t) => t.bucketType !== 'FREE_DEF')
  const filteredAllTransactions = allTransactions.filter((t) => t.bucketType !== 'FREE_DEF')

  const totalBucketsMoved = filteredTransactions.reduce(
    (sum, t) => sum + Math.abs(t.quantity),
    0
  )

  const bucketsStocked = filteredTransactions
    .filter((t) => t.action === 'STOCK')
    .reduce((sum, t) => sum + t.quantity, 0)

  const bucketsSold = Math.abs(
    filteredTransactions
      .filter((t) => t.action === 'SELL')
      .reduce((sum, t) => sum + t.quantity, 0)
  )

  const activeBucketTypes = new Set(filteredTransactions.map((t) => t.bucketType)).size

  // Calculate current stock levels (excluding FREE_DEF)
  const stockByBucket = new Map<BucketType, number>()
  filteredAllTransactions.forEach((t) => {
    stockByBucket.set(t.bucketType, t.runningTotal)
  })

  // Assume optimal stock is 1000 buckets total (adjustable)
  const totalStock = Array.from(stockByBucket.values()).reduce(
    (sum, val) => sum + val,
    0
  )
  const currentStockLevel = Math.min((totalStock / 1000) * 100, 100)

  // Find most active bucket type (excluding FREE_DEF)
  const bucketActivity = new Map<BucketType, number>()
  filteredTransactions.forEach((t) => {
    const current = bucketActivity.get(t.bucketType) || 0
    bucketActivity.set(t.bucketType, current + Math.abs(t.quantity))
  })

  const mostActiveBucket =
    bucketActivity.size > 0
      ? Array.from(bucketActivity.entries()).reduce((max, curr) =>
          curr[1] > max[1] ? curr : max
        )
      : null

  // Warehouse activity (excluding FREE_DEF)
  const warehouseMap = new Map<
    Warehouse,
    { stocked: number; sold: number }
  >()

  filteredTransactions.forEach((t) => {
    const existing = warehouseMap.get(t.warehouse) || { stocked: 0, sold: 0 }
    if (t.action === 'STOCK') {
      existing.stocked += t.quantity
    } else {
      existing.sold += Math.abs(t.quantity)
    }
    warehouseMap.set(t.warehouse, existing)
  })

  const warehouseActivity = Array.from(warehouseMap.entries()).map(
    ([warehouse, activity]) => ({
      warehouse,
      stocked: activity.stocked,
      sold: activity.sold,
    })
  )

  return {
    totalBucketsMoved,
    bucketsStocked,
    bucketsSold,
    activeBucketTypes,
    currentStockLevel,
    mostActiveBucket: mostActiveBucket
      ? { type: mostActiveBucket[0], quantity: mostActiveBucket[1] }
      : null,
    warehouseActivity,
  }
}

// Helper function to calculate production metrics
function calculateProductionMetrics(
  transactions: any[],
  allTransactions: any[]
): ProductionMetrics {
  const produceBatchTransactions = transactions.filter(
    (t) => t.type === 'PRODUCE_BATCH' && t.category === 'FREE_DEF'
  )

  const litersProduced = produceBatchTransactions.reduce(
    (sum, t) => sum + t.quantity,
    0
  )

  const ureaConsumed = Math.abs(
    transactions
      .filter((t) => t.type === 'PRODUCE_BATCH' && t.category === 'UREA')
      .reduce((sum, t) => sum + t.quantity, 0)
  )

  // Each batch is 1000L, count unique production events
  const batchesCompleted = produceBatchTransactions.length

  const freeDEFSold = Math.abs(
    transactions
      .filter((t) => t.type === 'SELL_FREE_DEF')
      .reduce((sum, t) => sum + t.quantity, 0)
  )

  // Get current urea stock from latest transaction
  const ureaTransactions = allTransactions.filter((t) => t.category === 'UREA')
  const currentUreaStock =
    ureaTransactions.length > 0
      ? ureaTransactions[ureaTransactions.length - 1].runningTotal
      : 0

  // Calculate efficiency: actual produced / theoretical max
  const theoreticalMax = (ureaConsumed / 360) * 1000
  const productionEfficiency =
    theoreticalMax > 0 ? (litersProduced / theoreticalMax) * 100 : 0

  return {
    litersProduced,
    ureaConsumed,
    batchesCompleted,
    freeDEFSold,
    currentUreaStock,
    productionEfficiency,
  }
}

// Helper function to calculate health metrics
function calculateHealthMetrics(
  financial: FinancialMetrics,
  inventory: InventoryMetrics,
  production: ProductionMetrics,
  date: Date
): HealthMetrics {
  let score = 100
  const alerts: HealthMetrics['alerts'] = []

  // Check financial health
  if (financial.netProfit < 0) {
    score -= 30
    alerts.push({
      type: 'NEGATIVE_CASH_FLOW',
      severity: 'HIGH',
      message: `Negative cash flow: ₹${Math.abs(financial.netProfit).toLocaleString('en-IN')}`,
    })
  }

  // Check inventory stock level
  if (inventory.currentStockLevel < 20) {
    score -= 20
    alerts.push({
      type: 'LOW_STOCK',
      severity: 'MEDIUM',
      message: `Low inventory stock: ${inventory.currentStockLevel.toFixed(1)}% of optimal`,
    })
  }

  // Check urea stock (need at least 720kg for 2 batches)
  if (production.currentUreaStock < 720) {
    score -= 20
    alerts.push({
      type: 'LOW_UREA',
      severity: 'MEDIUM',
      message: `Low urea stock: ${production.currentUreaStock}kg (less than 2 batches)`,
    })
  }

  // Check production on weekdays
  const dayOfWeek = date.getDay()
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
  if (isWeekday && production.batchesCompleted === 0 && production.litersProduced === 0) {
    score -= 30
    alerts.push({
      type: 'NO_PRODUCTION',
      severity: 'HIGH',
      message: 'No production activity on a weekday',
    })
  }

  // Determine status
  let status: HealthMetrics['status']
  if (score >= 80) status = 'EXCELLENT'
  else if (score >= 60) status = 'GOOD'
  else if (score >= 40) status = 'ATTENTION_NEEDED'
  else status = 'CRITICAL'

  const totalActivities =
    financial.transactionCount +
    inventory.totalBucketsMoved +
    production.batchesCompleted

  // Operational efficiency (simple average of key metrics)
  const operationalEfficiency = Math.min(
    (score + production.productionEfficiency + inventory.currentStockLevel) / 3,
    100
  )

  return {
    overallScore: Math.max(score, 0),
    status,
    alerts,
    totalActivities,
    operationalEfficiency,
  }
}

// Helper function to build unified timeline
function buildTimeline(
  expenseTransactions: any[],
  inventoryTransactions: any[],
  stockTransactions: any[]
): TimelineItem[] {
  const timeline: TimelineItem[] = []

  // Add expense transactions
  expenseTransactions.forEach((t) => {
    timeline.push({
      id: `expense-${t.id}`,
      time: t.date.toISOString(),
      type: 'EXPENSE',
      icon: t.type === 'INCOME' ? 'trending-up' : 'trending-down',
      title: t.type === 'INCOME' ? 'Income Received' : 'Expense Paid',
      description: `₹${Number(t.amount).toLocaleString('en-IN')} - ${t.name} (${t.account})`,
      amount: Number(t.amount),
      details: {
        account: t.account,
        type: t.type,
        name: t.name,
      },
      colorClass:
        t.type === 'INCOME'
          ? 'bg-blue-50 border-blue-200'
          : 'bg-red-50 border-red-200',
    })
  })

  // Add inventory transactions
  inventoryTransactions.forEach((t) => {
    timeline.push({
      id: `inventory-${t.id}`,
      time: t.date.toISOString(),
      type: 'INVENTORY',
      icon: t.action === 'STOCK' ? 'package-plus' : 'package-minus',
      title: t.action === 'STOCK' ? 'Inventory Stocked' : 'Inventory Sold',
      description: `${Math.abs(t.quantity)} ${t.bucketType} buckets - ${t.buyerSeller} (${t.warehouse})`,
      amount: t.quantity,
      details: {
        warehouse: t.warehouse,
        bucketType: t.bucketType,
        action: t.action,
        buyerSeller: t.buyerSeller,
        runningTotal: t.runningTotal,
      },
      colorClass:
        t.action === 'STOCK'
          ? 'bg-green-50 border-green-200'
          : 'bg-orange-50 border-orange-200',
    })
  })

  // Add stock transactions
  stockTransactions.forEach((t) => {
    let title = ''
    let icon = 'factory'

    switch (t.type) {
      case 'ADD_UREA':
        title = 'Urea Added'
        icon = 'package-plus'
        break
      case 'PRODUCE_BATCH':
        title = 'Batch Produced'
        icon = 'flask-conical'
        break
      case 'SELL_FREE_DEF':
        title = 'Free DEF Sold'
        icon = 'droplet'
        break
      case 'FILL_BUCKETS':
        title = 'Buckets Filled'
        icon = 'container'
        break
      case 'SELL_BUCKETS':
        title = 'Buckets Sold'
        icon = 'shopping-cart'
        break
    }

    timeline.push({
      id: `stock-${t.id}`,
      time: t.date.toISOString(),
      type: 'STOCK',
      icon,
      title,
      description: `${Math.abs(t.quantity)} ${t.unit} ${t.category}${t.description ? ` - ${t.description}` : ''}`,
      amount: t.quantity,
      details: {
        type: t.type,
        category: t.category,
        unit: t.unit,
        description: t.description,
        runningTotal: t.runningTotal,
      },
      colorClass: 'bg-purple-50 border-purple-200',
    })
  })

  // Sort by time descending
  timeline.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return timeline
}

// Helper function to generate insights
function generateInsights(
  financial: FinancialMetrics,
  inventory: InventoryMetrics,
  production: ProductionMetrics,
  health: HealthMetrics
): QuickInsight[] {
  const insights: QuickInsight[] = []

  // Financial insights
  if (financial.netProfit > 50000) {
    insights.push({
      id: 'high-profit',
      type: 'SUCCESS',
      icon: 'trophy',
      message: `Excellent! Net profit of ₹${financial.netProfit.toLocaleString('en-IN')} today`,
    })
  }

  if (financial.comparison.incomeTrend > 20) {
    insights.push({
      id: 'income-growth',
      type: 'SUCCESS',
      icon: 'trending-up',
      message: `Income up ${financial.comparison.incomeTrend.toFixed(1)}% from yesterday`,
    })
  }

  // Inventory insights
  if (inventory.mostActiveBucket) {
    insights.push({
      id: 'active-bucket',
      type: 'INFO',
      icon: 'package',
      message: `${inventory.mostActiveBucket.type} is the most active bucket type today (${inventory.mostActiveBucket.quantity} units)`,
    })
  }

  if (inventory.currentStockLevel < 30) {
    insights.push({
      id: 'restock-needed',
      type: 'WARNING',
      icon: 'alert-triangle',
      message: `Stock level at ${inventory.currentStockLevel.toFixed(1)}% - consider restocking`,
    })
  }

  // Production insights
  if (production.productionEfficiency >= 95 && production.batchesCompleted > 0) {
    insights.push({
      id: 'efficient-production',
      type: 'SUCCESS',
      icon: 'zap',
      message: `High production efficiency: ${production.productionEfficiency.toFixed(1)}%`,
    })
  }

  if (production.batchesCompleted > 0) {
    insights.push({
      id: 'production-summary',
      type: 'INFO',
      icon: 'info',
      message: `Produced ${production.litersProduced}L from ${production.batchesCompleted} batch${production.batchesCompleted > 1 ? 'es' : ''}`,
    })
  }

  // General tips
  if (insights.length === 0 && health.status === 'EXCELLENT') {
    insights.push({
      id: 'all-good',
      type: 'SUCCESS',
      icon: 'check-circle',
      message: 'All systems operating normally. Great job!',
    })
  }

  return insights
}
