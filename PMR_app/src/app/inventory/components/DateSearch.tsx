'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, X } from 'lucide-react'

interface DateSearchProps {
  onSearch: (date: string | null) => void
}

export function DateSearch({ onSearch }: DateSearchProps) {
  const [date, setDate] = useState('')

  const handleSearch = () => {
    onSearch(date || null)
  }

  const handleClear = () => {
    setDate('')
    onSearch(null)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Search by Date</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label htmlFor="searchDate" className="sr-only">Date</Label>
            <Input
              id="searchDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
          {date && (
            <Button onClick={handleClear} variant="outline" size="icon">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
