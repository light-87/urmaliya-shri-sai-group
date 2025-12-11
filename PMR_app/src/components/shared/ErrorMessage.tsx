import { cn } from '@/lib/utils'
import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  message: string
  className?: string
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-destructive text-sm p-3 bg-destructive/10 rounded-md',
        className
      )}
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  )
}
