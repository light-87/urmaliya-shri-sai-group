import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { RegistryTransactionType, RegistryPaymentStatus } from '@/types'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Validation schema for creating registry transaction
const createRegistrySchema = z.object({
  date: z.string().transform(str => new Date(str)),
  registrationNumber: z.string().optional(),
  propertyLocation: z.string().min(1, 'Property location is required'),
  sellerName: z.string().min(1, 'Seller name is required'),
  buyerName: z.string().min(1, 'Buyer name is required'),
  transactionType: z.nativeEnum(RegistryTransactionType),
  propertyValue: z.number().positive('Property value must be positive'),

  // Government Fees (optional, default to 0)
  stampDuty: z.number().nonnegative().optional().default(0),
  registrationFees: z.number().nonnegative().optional().default(0),
  mutationFees: z.number().nonnegative().optional().default(0),
  documentationCharge: z.number().nonnegative().optional().default(0),

  // Service Charges (optional, default to 0)
  operatorCost: z.number().nonnegative().optional().default(0),
  brokerCommission: z.number().nonnegative().optional().default(0),
  recommendationFees: z.number().nonnegative().optional().default(0),

  // Payment Information (optional)
  creditReceived: z.number().nonnegative().optional().default(0),
  paymentMethod: z.string().optional(),

  // Payment Status
  paymentStatus: z.nativeEnum(RegistryPaymentStatus).optional().default(RegistryPaymentStatus.PENDING),

  // Notes
  notes: z.string().optional(),
})

// GET - Fetch registry transactions with pagination and filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - only ADMIN and REGISTRY_MANAGER can view registry
    if (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Registry access required.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const paymentStatus = searchParams.get('paymentStatus') as RegistryPaymentStatus | null
    const transactionType = searchParams.get('transactionType') as RegistryTransactionType | null
    const location = searchParams.get('location')
    const seller = searchParams.get('seller')
    const buyer = searchParams.get('buyer')
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build Supabase query
    let query = supabase
      .from('registry_transactions')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1)

    // Apply filters
    if (startDate) {
      query = query.gte('date', new Date(startDate).toISOString())
    }
    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      query = query.lte('date', end.toISOString())
    }
    if (paymentStatus) {
      query = query.eq('payment_status', paymentStatus)
    }
    if (transactionType) {
      query = query.eq('transaction_type', transactionType)
    }
    if (location) {
      query = query.ilike('property_location', `%${location}%`)
    }
    if (seller) {
      query = query.ilike('seller_name', `%${seller}%`)
    }
    if (buyer) {
      query = query.ilike('buyer_name', `%${buyer}%`)
    }

    const { data: transactions, error, count: total } = await query

    if (error) throw error

    // Transform database column names to camelCase for frontend
    const transformedTransactions = transactions?.map(tx => ({
      id: tx.id,
      transactionId: tx.transaction_id,
      registrationNumber: tx.registration_number,
      date: tx.date,
      propertyLocation: tx.property_location,
      sellerName: tx.seller_name,
      buyerName: tx.buyer_name,
      transactionType: tx.transaction_type,
      propertyValue: parseFloat(tx.property_value),
      stampDuty: parseFloat(tx.stamp_duty),
      registrationFees: parseFloat(tx.registration_fees),
      mutationFees: parseFloat(tx.mutation_fees),
      registrarOfficeFees: parseFloat(tx.registrar_office_fees),
      documentationCharge: parseFloat(tx.documentation_charge),
      operatorCost: parseFloat(tx.operator_cost),
      brokerCommission: parseFloat(tx.broker_commission),
      recommendationFees: parseFloat(tx.recommendation_fees),
      creditReceived: parseFloat(tx.credit_received),
      paymentMethod: tx.payment_method,
      stampCommission: parseFloat(tx.stamp_commission),
      totalExpenses: parseFloat(tx.total_expenses),
      balanceDue: parseFloat(tx.balance_due),
      amountProfit: parseFloat(tx.amount_profit),
      paymentStatus: tx.payment_status,
      notes: tx.notes,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
    }))

    return NextResponse.json({
      success: true,
      transactions: transformedTransactions,
      pagination: {
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit),
      },
    })
  } catch (error) {
    console.error('Registry GET error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch registry transactions' },
      { status: 500 }
    )
  }
}

// POST - Create new registry transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - only ADMIN and REGISTRY_MANAGER can create
    if (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Registry access required.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = createRegistrySchema.parse(body)

    // Get next transaction ID from database function
    const { data: nextIdData, error: idError } = await supabase
      .rpc('get_next_registry_transaction_id')

    if (idError || !nextIdData) {
      throw new Error('Failed to generate transaction ID')
    }

    const transactionId = nextIdData

    // Create transaction
    // Note: Auto-calculated fields (registrar_office_fees, stamp_commission,
    // total_expenses, balance_due, amount_profit) are handled by database GENERATED columns
    const { data: transaction, error } = await supabase
      .from('registry_transactions')
      .insert({
        id: randomUUID(),
        transaction_id: transactionId,
        registration_number: validatedData.registrationNumber,
        date: validatedData.date.toISOString(),
        property_location: validatedData.propertyLocation,
        seller_name: validatedData.sellerName,
        buyer_name: validatedData.buyerName,
        transaction_type: validatedData.transactionType,
        property_value: validatedData.propertyValue,
        stamp_duty: validatedData.stampDuty,
        registration_fees: validatedData.registrationFees,
        mutation_fees: validatedData.mutationFees,
        documentation_charge: validatedData.documentationCharge,
        operator_cost: validatedData.operatorCost,
        broker_commission: validatedData.brokerCommission,
        recommendation_fees: validatedData.recommendationFees,
        credit_received: validatedData.creditReceived,
        payment_method: validatedData.paymentMethod,
        payment_status: validatedData.paymentStatus,
        notes: validatedData.notes,
      })
      .select()
      .single()

    if (error) throw error

    // Transform to camelCase
    const transformedTransaction = {
      id: transaction.id,
      transactionId: transaction.transaction_id,
      registrationNumber: transaction.registration_number,
      date: transaction.date,
      propertyLocation: transaction.property_location,
      sellerName: transaction.seller_name,
      buyerName: transaction.buyer_name,
      transactionType: transaction.transaction_type,
      propertyValue: parseFloat(transaction.property_value),
      stampDuty: parseFloat(transaction.stamp_duty),
      registrationFees: parseFloat(transaction.registration_fees),
      mutationFees: parseFloat(transaction.mutation_fees),
      registrarOfficeFees: parseFloat(transaction.registrar_office_fees),
      documentationCharge: parseFloat(transaction.documentation_charge),
      operatorCost: parseFloat(transaction.operator_cost),
      brokerCommission: parseFloat(transaction.broker_commission),
      recommendationFees: parseFloat(transaction.recommendation_fees),
      creditReceived: parseFloat(transaction.credit_received),
      paymentMethod: transaction.payment_method,
      stampCommission: parseFloat(transaction.stamp_commission),
      totalExpenses: parseFloat(transaction.total_expenses),
      balanceDue: parseFloat(transaction.balance_due),
      amountProfit: parseFloat(transaction.amount_profit),
      paymentStatus: transaction.payment_status,
      notes: transaction.notes,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
    }

    return NextResponse.json({
      success: true,
      transaction: transformedTransaction,
      message: 'Registry transaction created successfully',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid data',
          errors: error.errors
        },
        { status: 400 }
      )
    }
    console.error('Registry POST error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create registry transaction'
      },
      { status: 500 }
    )
  }
}
