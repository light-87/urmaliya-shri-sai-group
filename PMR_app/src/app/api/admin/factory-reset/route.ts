import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { randomUUID } from 'crypto'

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

    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })

    const { count: registryCount } = await supabase
      .from('registry_transactions')
      .select('*', { count: 'exact', head: true })

    const { count: warehousesCount } = await supabase
      .from('warehouses')
      .select('*', { count: 'exact', head: true })

    const { count: expenseAccountsCount } = await supabase
      .from('expense_accounts')
      .select('*', { count: 'exact', head: true })

    // Get the most recent successful backup before deleting
    const { data: lastBackup } = await supabase
      .from('backup_logs')
      .select('*')
      .eq('status', 'SUCCESS')
      .order('backupDate', { ascending: false })
      .limit(1)
      .single()

    const { count: backupCount } = await supabase
      .from('backup_logs')
      .select('*', { count: 'exact', head: true })

    // Delete all data from all tables
    // Note: We do NOT delete 'pins' table to preserve authentication access
    await supabase.from('StockTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('InventoryTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('ExpenseTransaction').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('registry_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('warehouses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('expense_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('backup_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Restore the last successful backup log (if exists)
    // This allows recovery from accidental factory reset
    if (lastBackup) {
      await supabase.from('backup_logs').insert({
        id: randomUUID(),
        backupType: lastBackup.backupType,
        driveFileId: lastBackup.driveFileId,
        inventoryCount: lastBackup.inventoryCount,
        expenseCount: lastBackup.expenseCount,
        stockCount: lastBackup.stockCount,
        leadsCount: lastBackup.leadsCount,
        registryCount: lastBackup.registryCount || 0,
        warehousesCount: lastBackup.warehousesCount || 0,
        expenseAccountsCount: lastBackup.expenseAccountsCount || 0,
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
        leads: leadsCount || 0,
        registry: registryCount || 0,
        warehouses: warehousesCount || 0,
        expenseAccounts: expenseAccountsCount || 0,
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
