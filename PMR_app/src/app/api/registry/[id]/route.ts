import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { z } from 'zod'
import { RegistryTransactionType, RegistryPaymentStatus } from '@/types'

export const dynamic = 'force-dynamic'

// Validation schema for updating registry transaction
// All fields are optional for partial updates
const updateRegistrySchema = z.object({
  date: z.string().transform(str => new Date(str)).optional(),
  registrationNumber: z.string().optional(),
  propertyLocation: z.string().min(1).optional(),
  sellerName: z.string().min(1).optional(),
  buyerName: z.string().min(1).optional(),
  transactionType: z.nativeEnum(RegistryTransactionType).optional(),
  propertyValue: z.number().positive().optional(),

  // Government Fees
  stampDuty: z.number().nonnegative().optional(),
  registrationFees: z.number().nonnegative().optional(),
  mutationFees: z.number().nonnegative().optional(),
  documentationCharge: z.number().nonnegative().optional(),

  // Service Charges
  operatorCost: z.number().nonnegative().optional(),
  brokerCommission: z.number().nonnegative().optional(),
  recommendationFees: z.number().nonnegative().optional(),

  // Payment Information
  creditReceived: z.number().nonnegative().optional(),
  paymentMethod: z.string().optional(),

  // Payment Status
  paymentStatus: z.nativeEnum(RegistryPaymentStatus).optional(),

  // Notes
  notes: z.string().optional(),
})

// Helper function to transform database row to camelCase
function transformTransaction(tx: any) {
  return {
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
  }
}

// GET - Fetch single registry transaction by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    if (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Registry access required.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const { data: transaction, error } = await supabase
      .from('registry_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !transaction) {
      return NextResponse.json(
        { success: false, message: 'Registry transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      transaction: transformTransaction(transaction),
    })
  } catch (error) {
    console.error('Registry GET (single) error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch registry transaction' },
      { status: 500 }
    )
  }
}

// PUT - Update registry transaction
// CRITICAL: This is a key feature - users must be able to edit transactions
// as information comes in over time (partial payments, fee updates, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission - ADMIN and REGISTRY_MANAGER can edit
    if (session.role !== 'ADMIN' && session.role !== 'REGISTRY_MANAGER') {
      return NextResponse.json(
        { success: false, message: 'Access denied. Registry access required.' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = updateRegistrySchema.parse(body)

    // Check if transaction exists
    const { data: existing, error: fetchError } = await supabase
      .from('registry_transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, message: 'Registry transaction not found' },
        { status: 404 }
      )
    }

    // Prepare update data (convert camelCase to snake_case)
    const updateData: Record<string, any> = {}

    if (validatedData.date) {
      updateData.date = validatedData.date.toISOString()
    }
    if (validatedData.registrationNumber !== undefined) {
      updateData.registration_number = validatedData.registrationNumber
    }
    if (validatedData.propertyLocation) {
      updateData.property_location = validatedData.propertyLocation
    }
    if (validatedData.sellerName) {
      updateData.seller_name = validatedData.sellerName
    }
    if (validatedData.buyerName) {
      updateData.buyer_name = validatedData.buyerName
    }
    if (validatedData.transactionType) {
      updateData.transaction_type = validatedData.transactionType
    }
    if (validatedData.propertyValue !== undefined) {
      updateData.property_value = validatedData.propertyValue
    }
    if (validatedData.stampDuty !== undefined) {
      updateData.stamp_duty = validatedData.stampDuty
    }
    if (validatedData.registrationFees !== undefined) {
      updateData.registration_fees = validatedData.registrationFees
    }
    if (validatedData.mutationFees !== undefined) {
      updateData.mutation_fees = validatedData.mutationFees
    }
    if (validatedData.documentationCharge !== undefined) {
      updateData.documentation_charge = validatedData.documentationCharge
    }
    if (validatedData.operatorCost !== undefined) {
      updateData.operator_cost = validatedData.operatorCost
    }
    if (validatedData.brokerCommission !== undefined) {
      updateData.broker_commission = validatedData.brokerCommission
    }
    if (validatedData.recommendationFees !== undefined) {
      updateData.recommendation_fees = validatedData.recommendationFees
    }
    if (validatedData.creditReceived !== undefined) {
      updateData.credit_received = validatedData.creditReceived
    }
    if (validatedData.paymentMethod !== undefined) {
      updateData.payment_method = validatedData.paymentMethod
    }
    if (validatedData.paymentStatus) {
      updateData.payment_status = validatedData.paymentStatus
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    // Update the transaction
    // Note: Auto-calculated fields will be recalculated by database GENERATED columns
    const { data: transaction, error: updateError } = await supabase
      .from('registry_transactions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      transaction: transformTransaction(transaction),
      message: 'Registry transaction updated successfully',
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
    console.error('Registry PUT error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to update registry transaction' },
      { status: 500 }
    )
  }
}

// DELETE - Delete registry transaction
// Note: Consider soft delete (status = Cancelled) instead of hard delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Only admin can delete
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check if transaction exists
    const { data: transaction, error: fetchError } = await supabase
      .from('registry_transactions')
      .select('id, transaction_id')
      .eq('id', id)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json(
        { success: false, message: 'Registry transaction not found' },
        { status: 404 }
      )
    }

    // Delete transaction (hard delete)
    // Alternative: Soft delete by setting payment_status = 'Cancelled'
    const { error: deleteError } = await supabase
      .from('registry_transactions')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({
      success: true,
      message: `Registry transaction ${transaction.transaction_id} deleted successfully`,
    })
  } catch (error) {
    console.error('Registry DELETE error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete registry transaction' },
      { status: 500 }
    )
  }
}
