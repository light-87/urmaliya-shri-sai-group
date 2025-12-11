'use client'

import { Coffee } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Developed by Vaibhav 🤗</span>
          <a
            href="https://buymeacoffee.com/vaibhavtalekar87"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Coffee className="h-4 w-4" />
            <span>Buy me a coffee</span>
          </a>
        </div>
      </div>
    </footer>
  )
}
