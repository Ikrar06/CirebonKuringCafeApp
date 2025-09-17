import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
  variant?: 'default' | 'destructive' | 'warning'
}

export default function ErrorMessage({
  title = 'Terjadi Kesalahan',
  message,
  onRetry,
  className = '',
  variant = 'default'
}: ErrorMessageProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-red-50 border-red-200 text-red-900'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900'
    }
  }

  const getIconColor = () => {
    switch (variant) {
      case 'destructive':
        return 'text-red-500'
      case 'warning':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${className}`}>
      <div className={`max-w-md w-full rounded-lg border p-6 text-center ${getVariantStyles()}`}>
        <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${getIconColor()}`} />

        <h2 className="text-lg font-semibold mb-2">
          {title}
        </h2>

        <p className="text-sm opacity-90 mb-6">
          {message}
        </p>

        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Coba Lagi</span>
          </button>
        )}
      </div>
    </div>
  )
}