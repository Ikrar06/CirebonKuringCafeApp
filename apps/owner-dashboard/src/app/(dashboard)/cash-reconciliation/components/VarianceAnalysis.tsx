'use client'

import { AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown } from 'lucide-react'

interface VarianceAnalysisProps {
  variance: number
  expectedAmount: number
  actualAmount: number
  notes?: string
}

export default function VarianceAnalysis({
  variance,
  expectedAmount,
  actualAmount,
  notes
}: VarianceAnalysisProps) {
  const variancePercent = expectedAmount > 0 ? (variance / expectedAmount) * 100 : 0
  const isOver = variance > 0
  const isUnder = variance < 0
  const isMatch = variance === 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getSeverity = () => {
    const absPercent = Math.abs(variancePercent)
    if (absPercent === 0) return 'success'
    if (absPercent < 1) return 'info'
    if (absPercent < 5) return 'warning'
    return 'error'
  }

  const severity = getSeverity()

  const severityConfig = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-900',
      subtext: 'text-green-700',
      icon: CheckCircle,
      iconColor: 'text-green-600',
      title: 'Perfect Balance',
      message: 'Cash count matches system records exactly.'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-900',
      subtext: 'text-blue-700',
      icon: Info,
      iconColor: 'text-blue-600',
      title: 'Minor Variance',
      message: 'Small discrepancy detected (less than 1%). This is within acceptable range.'
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-900',
      subtext: 'text-yellow-700',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
      title: 'Moderate Variance',
      message: 'Variance between 1-5%. Please review transactions and recount if necessary.'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-900',
      subtext: 'text-red-700',
      icon: AlertTriangle,
      iconColor: 'text-red-600',
      title: 'Significant Variance',
      message: 'Variance exceeds 5%. Immediate investigation required.'
    }
  }

  const config = severityConfig[severity]
  const Icon = config.icon

  const getPossibleCauses = () => {
    if (isMatch) return []

    const causes = []
    if (isOver) {
      causes.push('Unrecorded sales or transactions')
      causes.push('Customer overpayment not returned')
      causes.push('Previous day\'s cash not deposited')
      causes.push('Incorrect opening balance')
    } else {
      causes.push('Missing or unrecorded expenses')
      causes.push('Cash theft or loss')
      causes.push('Incorrect change given to customers')
      causes.push('Data entry errors in the system')
      causes.push('Deposits made but not recorded')
    }
    return causes
  }

  const getRecommendedActions = () => {
    if (isMatch) {
      return ['Submit reconciliation report', 'Prepare cash for deposit']
    }

    const actions = []
    if (Math.abs(variancePercent) >= 5) {
      actions.push('🔴 URGENT: Recount cash immediately')
      actions.push('🔴 Review all transactions for the period')
      actions.push('🔴 Check for system errors or unrecorded transactions')
    } else if (Math.abs(variancePercent) >= 1) {
      actions.push('⚠️ Recount cash to verify accuracy')
      actions.push('⚠️ Review recent transactions')
    }

    actions.push('📝 Document the variance with detailed notes')
    actions.push('📞 Notify management if variance persists')

    return actions
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Variance Analysis</h3>

      {/* Status Card */}
      <div className={`${config.bg} border ${config.border} rounded-lg p-4 mb-6`}>
        <div className="flex items-start gap-3">
          <Icon className={`h-6 w-6 ${config.iconColor} mt-0.5`} />
          <div className="flex-1">
            <h4 className={`font-semibold ${config.text} mb-1`}>{config.title}</h4>
            <p className={`text-sm ${config.subtext}`}>{config.message}</p>

            {variance !== 0 && (
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isOver ? (
                    <TrendingUp className={`h-4 w-4 ${config.iconColor}`} />
                  ) : (
                    <TrendingDown className={`h-4 w-4 ${config.iconColor}`} />
                  )}
                  <span className={`font-semibold ${config.text}`}>
                    {isOver ? '+' : ''}{formatCurrency(variance)}
                  </span>
                </div>
                <div className={`text-sm ${config.subtext}`}>
                  ({isOver ? '+' : ''}{variancePercent.toFixed(2)}% {isOver ? 'overage' : 'shortage'})
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Expected Amount</div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(expectedAmount)}</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Actual Count</div>
          <div className="text-xl font-bold text-gray-900">{formatCurrency(actualAmount)}</div>
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Notes</div>
          <p className="text-sm text-gray-600">{notes}</p>
        </div>
      )}

      {/* Possible Causes */}
      {!isMatch && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Possible Causes</h4>
          <ul className="space-y-2">
            {getPossibleCauses().map((cause, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-gray-400 mt-0.5">•</span>
                <span>{cause}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommended Actions */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Recommended Actions</h4>
        <div className="space-y-2">
          {getRecommendedActions().map((action, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className={`${
                action.includes('🔴') ? 'text-red-600' :
                action.includes('⚠️') ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {action}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
