'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/store/authStore'
import { useModeStore } from '@/store/modeStore'
import { cn } from '@/lib/utils'
import { Menu, X, LogOut } from 'lucide-react'

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { role, clearAuth } = useAuthStore()
  const { mode, toggleMode } = useModeStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      clearAuth()
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // DEF Mode navigation items
  const defNavItems = [
    { href: '/stockboard', label: 'StockBoard', roles: ['ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY'] },
    { href: '/inventory', label: 'Inventory', roles: ['ADMIN', 'EXPENSE_INVENTORY', 'INVENTORY_ONLY'] },
    { href: '/daily-report', label: 'Daily Report', roles: ['ADMIN'] },
    { href: '/leads', label: 'Leads', roles: ['ADMIN', 'EXPENSE_INVENTORY'] },
    { href: '/expenses', label: 'Expenses', roles: ['ADMIN', 'EXPENSE_INVENTORY'] },
    { href: '/search', label: 'Search', roles: ['ADMIN', 'EXPENSE_INVENTORY'] },
    { href: '/dashboard', label: 'Dashboard', roles: ['ADMIN'] },
    { href: '/statements', label: 'Statements', roles: ['ADMIN'] },
    { href: '/admin', label: 'Admin', roles: ['ADMIN'] },
  ]

  // Registry Mode navigation items
  const registryNavItems = [
    { href: '/registry', label: 'Registry', roles: ['ADMIN', 'REGISTRY_MANAGER'] },
    { href: '/registry/expenses', label: 'Registry Expenses', roles: ['ADMIN', 'REGISTRY_MANAGER'] },
    { href: '/registry/search', label: 'Registry Search', roles: ['ADMIN', 'REGISTRY_MANAGER'] },
    { href: '/registry/dashboard', label: 'Registry Dashboard', roles: ['ADMIN', 'REGISTRY_MANAGER'] },
  ]

  // Select appropriate nav items based on role and mode
  const getNavItems = () => {
    if (role === 'REGISTRY_MANAGER') {
      return registryNavItems
    }
    if (role === 'ADMIN') {
      return mode === 'DEF' ? defNavItems : registryNavItems
    }
    return defNavItems
  }

  const navItems = getNavItems()

  const visibleNavItems = navItems.filter(item =>
    role && item.roles.includes(role)
  )

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/inventory" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-primary">USSG</span>
            </div>
            <span className="hidden font-semibold sm:inline-block">
              Urmaliya Shri Sai Group
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle - Only for Admin */}
          {role === 'ADMIN' && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full">
              <span className={cn(
                'text-xs font-medium transition-colors',
                mode === 'DEF' ? 'text-primary' : 'text-muted-foreground'
              )}>
                DEF
              </span>
              <Switch
                checked={mode === 'REGISTRY'}
                onCheckedChange={toggleMode}
                className="data-[state=checked]:bg-primary"
              />
              <span className={cn(
                'text-xs font-medium transition-colors',
                mode === 'REGISTRY' ? 'text-primary' : 'text-muted-foreground'
              )}>
                Registry
              </span>
            </div>
          )}

          {role && (
            <span className="hidden sm:inline-block text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              {role.replace('_', ' ')}
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="hidden md:flex"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t">
          <nav className="container flex flex-col p-4 gap-1">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  pathname === item.href
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {item.label}
              </Link>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="justify-start mt-2"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>
        </div>
      )}
    </header>
  )
}
