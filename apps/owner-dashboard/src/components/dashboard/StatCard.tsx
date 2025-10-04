'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'

export interface StatCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: LucideIcon
  description?: string
  loading?: boolean
  className?: string
}

export default function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description,
  loading = false,
  className = ''
}: StatCardProps) {
  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-6 animate-pulse ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
          <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        </div>
        <div className="flex items-center mt-4">
          <div className="h-4 bg-gray-200 rounded w-1/4 mr-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600'
      case 'negative':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getIconColor = () => {
    switch (changeType) {
      case 'positive':
        return 'bg-green-100 text-green-600'
      case 'negative':
        return 'bg-red-100 text-red-600'
      default:
        return 'bg-blue-100 text-blue-600'
    }
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <div className={`p-3 rounded-full ${getIconColor()}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>

      {(change || description) && (
        <div className="flex items-center mt-4">
          {change && (
            <span className={`text-sm font-medium ${getChangeColor()}`}>
              {change}
            </span>
          )}
          {description && (
            <span className={`text-sm text-gray-500 ${change ? 'ml-2' : ''}`}>
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
