'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FixInventoryPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleFix = async () => {
    if (!confirm('This will recalculate all inventory running totals. Continue?')) {
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-inventory-totals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fix inventory totals')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Fix Inventory Running Totals</h1>
          <p className="text-gray-600">
            This tool recalculates all running totals in the InventoryTransaction table in correct chronological order.
            Use this to fix issues caused by backdated transactions.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">What this does:</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mb-6">
            <li>Fetches all inventory transactions ordered by date and creation time</li>
            <li>Recalculates running totals for each bucket+warehouse combination</li>
            <li>Updates any incorrect running totals in the database</li>
            <li>Provides a detailed summary of changes made</li>
          </ul>

          <button
            onClick={handleFix}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Fixing...' : 'Run Fix'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 font-semibold mb-2">Error</h3>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-green-800 font-semibold mb-4">
              ✅ {result.message}
            </h3>

            {result.finalBalances && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Final Balances:</h4>
                <div className="bg-white rounded p-4 space-y-2 max-h-60 overflow-auto">
                  {Object.entries(result.finalBalances).map(([combo, balance]: [string, any]) => (
                    <div key={combo} className="flex justify-between">
                      <span className="font-medium">{combo}:</span>
                      <span>{balance} buckets</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.logs && result.logs.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Detailed Log:</h4>
                <div className="bg-gray-900 text-green-400 rounded p-4 overflow-auto max-h-96 font-mono text-sm">
                  {result.logs.map((log: string, index: number) => (
                    <div key={index}>{log}</div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/inventory')}
              className="mt-6 w-full bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Go to Inventory
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
