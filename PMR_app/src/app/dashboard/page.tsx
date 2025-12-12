'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { SummaryCards } from './components/SummaryCards'
import { MonthlyBarChart } from './components/MonthlyBarChart'
import { MonthlyTable } from './components/MonthlyTable'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import type { DashboardResponse } from '@/types'
import { ExpenseAccount, ACCOUNT_LABELS } from '@/types'
import { Check, ChevronsUpDown } from 'lucide-react'

const allAccounts: ExpenseAccount[] = Object.values(ExpenseAccount)

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'year' | 'last12months' | 'alltime'>('year')
  const [year, setYear] = useState(new Date().getFullYear())
  const [selectedAccounts, setSelectedAccounts] = useState<ExpenseAccount[] | 'ALL'>('ALL')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        view,
        year: year.toString(),
        accounts: selectedAccounts === 'ALL' ? 'ALL' : selectedAccounts.join(','),
      })

      const response = await fetch(`/api/dashboard?${params}`)
      const result = await response.json()

      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [view, year, selectedAccounts])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Generate year options
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  // Handle account selection
  const toggleAccount = (account: ExpenseAccount) => {
    if (selectedAccounts === 'ALL') {
      setSelectedAccounts([account])
    } else {
      const current = selectedAccounts as ExpenseAccount[]
      if (current.includes(account)) {
        const updated = current.filter(a => a !== account)
        setSelectedAccounts(updated.length === 0 ? 'ALL' : updated)
      } else {
        setSelectedAccounts([...current, account])
      }
    }
  }

  const selectAllAccounts = () => {
    setSelectedAccounts('ALL')
  }

  const getAccountDisplayText = () => {
    if (selectedAccounts === 'ALL') {
      return 'All Accounts'
    }
    const count = (selectedAccounts as ExpenseAccount[]).length
    if (count === 1) {
      return ACCOUNT_LABELS[selectedAccounts[0]]
    }
    return `${count} Accounts Selected`
  }

  if (loading) {
    return (
      <ProtectedLayout>
        <PageLoader />
      </ProtectedLayout>
    )
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-[200px] justify-between"
                >
                  {getAccountDisplayText()}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <div className="p-2 space-y-2">
                  <div className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer">
                    <Checkbox
                      checked={selectedAccounts === 'ALL'}
                      onCheckedChange={selectAllAccounts}
                    />
                    <label
                      className="flex-1 cursor-pointer text-sm font-medium"
                      onClick={selectAllAccounts}
                    >
                      All Accounts
                    </label>
                    {selectedAccounts === 'ALL' && (
                      <Check className="h-4 w-4" />
                    )}
                  </div>
                  <div className="border-t pt-2">
                    {allAccounts.map((account) => {
                      const isSelected = selectedAccounts !== 'ALL' && selectedAccounts.includes(account)
                      return (
                        <div
                          key={account}
                          className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer"
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleAccount(account)}
                          />
                          <label
                            className="flex-1 cursor-pointer text-sm"
                            onClick={() => toggleAccount(account)}
                          >
                            {ACCOUNT_LABELS[account]}
                          </label>
                          {isSelected && <Check className="h-4 w-4" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {view === 'year' && (
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-1">
              <Button
                variant={view === 'year' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('year')}
              >
                Year
              </Button>
              <Button
                variant={view === 'last12months' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('last12months')}
              >
                Last 12 Months
              </Button>
              <Button
                variant={view === 'alltime' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('alltime')}
              >
                All Time
              </Button>
            </div>
          </div>
        </div>

        {data && (
          <>
            <SummaryCards
              totalIncome={data.summary.totalIncome}
              totalExpense={data.summary.totalExpense}
              netProfit={data.summary.netProfit}
            />

            <MonthlyBarChart data={data.monthlyData} />

            <MonthlyTable data={data.monthlyData} />
          </>
        )}
      </div>
    </ProtectedLayout>
  )
}
