'use client'

import { Percent, DollarSign, Gift, Package } from 'lucide-react'

interface PromoType {
  value: string
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
  borderColor: string
}

interface PromoTypeSelectorProps {
  value: string
  onChange: (value: string) => void
}

const promoTypes: PromoType[] = [
  {
    value: 'percentage',
    label: 'Percentage Discount',
    description: 'Discount based on percentage of total (e.g., 20% off)',
    icon: <Percent className="h-6 w-6" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    value: 'fixed_amount',
    label: 'Fixed Amount Discount',
    description: 'Fixed discount amount (e.g., Rp 10,000 off)',
    icon: <DollarSign className="h-6 w-6" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    value: 'buy_get',
    label: 'Buy X Get Y',
    description: 'Buy certain quantity, get items free or discounted',
    icon: <Gift className="h-6 w-6" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    value: 'bundle',
    label: 'Bundle Price',
    description: 'Special price for bundled items',
    icon: <Package className="h-6 w-6" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
]

export default function PromoTypeSelector({ value, onChange }: PromoTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {promoTypes.map((type) => {
        const isSelected = value === type.value

        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={`p-4 border-2 rounded-xl text-left transition-all hover:shadow-md ${
              isSelected
                ? `${type.borderColor} ${type.bgColor} ring-2 ring-offset-2`
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${isSelected ? type.bgColor : 'bg-gray-100'} ${isSelected ? type.color : 'text-gray-600'}`}>
                {type.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className={`font-semibold ${isSelected ? type.color : 'text-gray-900'}`}>
                    {type.label}
                  </h4>
                  {isSelected && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${type.bgColor} ${type.color}`}>
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">{type.description}</p>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
