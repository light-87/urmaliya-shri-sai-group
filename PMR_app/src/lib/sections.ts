// Section on/off switches, controlled by the admin from the Admin page.
//
// StockBoard, Inventory and Admin are always on and are NOT listed here.
// Every section below is OFF unless system_settings has a row
// `section_<id>_enabled` = 'true'. A missing table, missing row or failed
// read all count as OFF, so the sections stay hidden until the admin turns
// them on.
//
// This file must stay edge-safe (no supabase-js import) because
// middleware.ts uses it.

export const SECTIONS = [
  { id: 'registry', label: 'Registry', description: 'Registry, Registry Expenses, Registry Search, Registry Dashboard', pagePrefix: '/registry', apiPrefix: '/api/registry' },
  { id: 'daily_report', label: 'Daily Report', description: 'Daily Report page', pagePrefix: '/daily-report', apiPrefix: '/api/daily-report' },
  { id: 'leads', label: 'Leads', description: 'Leads page (and the Leads PIN login)', pagePrefix: '/leads', apiPrefix: '/api/leads' },
  { id: 'expenses', label: 'Expenses', description: 'Expenses page', pagePrefix: '/expenses', apiPrefix: '/api/expenses' },
  { id: 'search', label: 'Search', description: 'Search page', pagePrefix: '/search', apiPrefix: '/api/search' },
  { id: 'dashboard', label: 'Dashboard', description: 'Dashboard page', pagePrefix: '/dashboard', apiPrefix: '/api/dashboard' },
  { id: 'statements', label: 'Statements', description: 'Statements page', pagePrefix: '/statements', apiPrefix: '/api/statements' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']
export type SectionFlags = Record<SectionId, boolean>

export const SECTION_IDS = SECTIONS.map((s) => s.id) as SectionId[]

export function sectionSettingKey(id: SectionId) {
  return `section_${id}_enabled`
}

export function allSectionsOff(): SectionFlags {
  return Object.fromEntries(SECTION_IDS.map((id) => [id, false])) as SectionFlags
}

function matchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(prefix + '/')
}

// Which section (if any) a page or API path belongs to.
export function sectionForPath(path: string): { id: SectionId; isApi: boolean } | null {
  for (const s of SECTIONS) {
    if (matchesPrefix(path, s.apiPrefix)) return { id: s.id, isApi: true }
    if (matchesPrefix(path, s.pagePrefix)) return { id: s.id, isApi: false }
  }
  return null
}

// Which section a nav link belongs to (null = always on).
export function sectionForHref(href: string): SectionId | null {
  const match = sectionForPath(href)
  return match && !match.isApi ? match.id : null
}

// Reads the flags straight from Supabase's REST API with a plain fetch, so it
// works in edge middleware and in Node API routes alike.
export async function fetchSectionFlags(): Promise<SectionFlags> {
  const flags = allSectionsOff()
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return flags

  try {
    const res = await fetch(
      `${url}/rest/v1/system_settings?select=key,value&key=like.section_*`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) return flags

    const rows = (await res.json()) as Array<{ key: string; value: string | null }>
    for (const id of SECTION_IDS) {
      const row = rows.find((r) => r.key === sectionSettingKey(id))
      flags[id] = row?.value === 'true'
    }
  } catch (error) {
    console.error('Failed to read section flags:', error)
  }
  return flags
}
