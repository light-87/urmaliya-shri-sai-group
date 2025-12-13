import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const FACTORY_RESET_PIN = '14863'

// POST - Factory Reset (Delete all data)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    // Only admins can perform factory reset
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized. Only admins can perform factory reset.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { pin } = body

    // Verify PIN
    if (pin !== FACTORY_RESET_PIN) {
      return NextResponse.json(
        { success: false, message: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Get count of records before deletion
    const { count: stockCount } = await supabase
      .from('StockTransaction')
      .select('*', { count: 'exact', head: true })

    const { count: inventoryCount } = await supabase
      .from('InventoryTransaction')
      .select('*', { count: 'exact', head: true })

    const { count: expenseCount } = await supabase
      .from('ExpenseTransaction')
      .select('*', { count: 'exact', head: true })

    // Get the most recent successful backup before deleting
    const { data: lastBackup } = await supabase
      .from('BackupLog')
      .select('*')
      .eq('status', 'SUCCESS')
      .order('backupDate', { ascending: false })
      .limit(1)
      .single()

    const { count: backupCount } = await supabase
      .from('BackupLog')
      .select('*', { count: 'exact', head: true })

    // Delete all data
    await supabase.from('StockTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('InventoryTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('ExpenseTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('BackupLog').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Restore the last successful backup log (if exists)
    // This allows recovery from accidental factory reset
    if (lastBackup) {
      await supabase.from('BackupLog').insert({
        backupType: lastBackup.backupType,
        driveFileId: lastBackup.driveFileId,
        inventoryCount: lastBackup.inventoryCount,
        expenseCount: lastBackup.expenseCount,
        stockCount: lastBackup.stockCount,
        leadsCount: lastBackup.leadsCount,
        status: lastBackup.status,
        backupDate: lastBackup.backupDate,
        errorMessage: lastBackup.errorMessage,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Factory reset successful. All data has been deleted.',
      deletedCounts: {
        inventory: inventoryCount || 0,
        expenses: expenseCount || 0,
        stock: stockCount || 0,
        backups: backupCount || 0,
      },
    })
  } catch (error) {
    console.error('Factory reset error:', error)
    return NextResponse.json(
      { success: false, message: 'Factory reset failed' },
      { status: 500 }
    )
  }
}
