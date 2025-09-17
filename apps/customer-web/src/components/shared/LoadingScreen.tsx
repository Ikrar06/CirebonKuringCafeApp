import { RefreshCw } from 'lucide-react'

interface LoadingScreenProps {
  title?: string
  message?: string
  className?: string
}

export default function LoadingScreen({
  title = 'Memuat...',
  message = 'Mohon tunggu sebentar...',
  className = ''
}: LoadingScreenProps) {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center ${className}`}>
      <div className="text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-600">
          {message}
        </p>
      </div>
    </div>
  )
}