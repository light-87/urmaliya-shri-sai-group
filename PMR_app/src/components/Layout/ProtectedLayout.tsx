'use client'

import { Header } from './Header'
import { Footer } from './Footer'

interface ProtectedLayoutProps {
  children: React.ReactNode
}

export function ProtectedLayout({ children }: ProtectedLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container mx-auto px-4 py-6 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}
