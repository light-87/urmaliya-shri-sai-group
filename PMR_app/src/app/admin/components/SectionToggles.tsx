'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, LayoutGrid } from 'lucide-react'
import { SECTIONS, type SectionId } from '@/lib/sections'
import { useSectionStore } from '@/store/sectionStore'

// Admin switches for the optional sections. StockBoard, Inventory and Admin
// are always on. A section that is off is hidden from the menu and its pages
// and APIs are blocked for every PIN.
export function SectionToggles() {
  const { flags, loaded, fetchFlags, setFlags } = useSectionStore()
  const [saving, setSaving] = useState<SectionId | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  const handleToggle = async (section: SectionId, enabled: boolean) => {
    setError('')
    setSaving(section)
    try {
      const response = await fetch('/api/admin/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, enabled }),
      })
      const data = await response.json()
      if (data.success) {
        setFlags(data.flags)
      } else {
        setError(data.message || 'Failed to save. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5" />
          Sections
        </CardTitle>
        <CardDescription>
          Turn sections on or off for everyone. StockBoard, Inventory and Admin are always on.
          A section that is off is hidden and blocked, but its data is kept.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {SECTIONS.map((section) => (
          <label
            key={section.id}
            className="flex min-h-[52px] items-center justify-between gap-4 rounded-md px-2 py-2 hover:bg-accent cursor-pointer"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium">{section.label}</div>
              <div className="text-xs text-muted-foreground">{section.description}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground w-16 text-right">
                {saving === section.id ? 'Saving...' : flags[section.id] ? 'On' : 'Off'}
              </span>
              <Switch
                checked={flags[section.id]}
                disabled={!loaded || saving !== null}
                onCheckedChange={(checked) => handleToggle(section.id, checked)}
              />
            </div>
          </label>
        ))}
      </CardContent>
    </Card>
  )
}
