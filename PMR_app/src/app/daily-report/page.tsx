'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProtectedLayout } from '@/components/Layout/ProtectedLayout'
import { Button } from '@/components/ui/button'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import { RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import type { DailyReportData } from '@/types'
import { FinancialHealthCard } from './components/FinancialHealthCard'
import { InventoryActivityCard } from './components/InventoryActivityCard'
import { ProductionStatusCard } from './components/ProductionStatusCard'
import { OverallHealthCard } from './components/OverallHealthCard'
import { ExpenseBreakdownChart } from './components/ExpenseBreakdownChart'
import { ProductionFlowChart } from './components/ProductionFlowChart'
import { ActivityTimeline } from './components/ActivityTimeline'
import { QuickInsights } from './components/QuickInsights'

export default function DailyReportPage() {
  const [reportData, setReportData] = useState<DailyReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('date', selectedDate.toISOString())

      const response = await fetch(`/api/daily-report?${params}`)
      const result = await response.json()

      if (result.success && result.data) {
        setReportData(result.data)
        setLastUpdated(new Date())
      } else {
        console.error('Failed to fetch report:', result.error)
      }
    } catch (error) {
      console.error('Failed to fetch daily report:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedDate])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchReport()
    }, 5 * 60 * 1000) // 5 minutes

    return () => clearInterval(interval)
  }, [fetchReport])

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  const handleRefresh = () => {
    fetchReport()
  }

  if (loading && !reportData) {
    return (
      <ProtectedLayout>
        <PageLoader />
      </ProtectedLayout>
    )
  }

  if (!reportData) {
    return (
      <ProtectedLayout>
        <div className="p-6 text-center">
          <p className="text-gray-600">No data available for the selected date.</p>
          <Button onClick={handleRefresh} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </ProtectedLayout>
    )
  }

  const isToday =
    format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <ProtectedLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Report</h1>
            <p className="text-sm text-gray-500 mt-1">
              Comprehensive overview of daily operations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateChange(new Date())}
                disabled={isToday}
              >
                Today
              </Button>
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => handleDateChange(new Date(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-gray-500 text-right">
          Last updated: {format(lastUpdated, 'MMM dd, yyyy HH:mm:ss')}
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FinancialHealthCard financial={reportData.financial} />
          <InventoryActivityCard inventory={reportData.inventory} />
          <ProductionStatusCard production={reportData.production} />
          <OverallHealthCard health={reportData.health} />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ExpenseBreakdownChart financial={reportData.financial} />
          <ProductionFlowChart production={reportData.production} />
        </div>

        {/* Activity Timeline */}
        <ActivityTimeline timeline={reportData.timeline} />

        {/* Quick Insights */}
        {reportData.insights.length > 0 && (
          <QuickInsights insights={reportData.insights} />
        )}
      </div>
    </ProtectedLayout>
  )
}
