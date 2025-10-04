'use client'

import { useState } from 'react'

export interface PieChartDataPoint {
  label: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieChartDataPoint[]
  size?: number
  showLegend?: boolean
  showPercentages?: boolean
  donutMode?: boolean
  donutWidth?: number
  className?: string
  valueFormatter?: (value: number) => string
}

const DEFAULT_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // green-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
]

export default function PieChart({
  data,
  size = 300,
  showLegend = true,
  showPercentages = true,
  donutMode = false,
  donutWidth = 60,
  className = '',
  valueFormatter = (value) => value.toLocaleString()
}: PieChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
        <p className="text-gray-400">No data available</p>
      </div>
    )
  }

  // Calculate total and percentages
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const dataWithPercentages = data.map((item, index) => ({
    ...item,
    percentage: total > 0 ? (item.value / total) * 100 : 0,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length]
  }))

  // Calculate pie slices
  const radius = size / 2 - 10
  let currentAngle = -90 // Start at top
  const slices = dataWithPercentages.map((item) => {
    const angle = (item.percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    // Calculate path for the slice
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const innerRadius = donutMode ? radius - donutWidth : 0

    const x1 = size / 2 + radius * Math.cos(startRad)
    const y1 = size / 2 + radius * Math.sin(startRad)
    const x2 = size / 2 + radius * Math.cos(endRad)
    const y2 = size / 2 + radius * Math.sin(endRad)

    const largeArcFlag = angle > 180 ? 1 : 0

    let path: string
    if (donutMode) {
      const innerX1 = size / 2 + innerRadius * Math.cos(startRad)
      const innerY1 = size / 2 + innerRadius * Math.sin(startRad)
      const innerX2 = size / 2 + innerRadius * Math.cos(endRad)
      const innerY2 = size / 2 + innerRadius * Math.sin(endRad)

      path = `
        M ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        L ${innerX2} ${innerY2}
        A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerX1} ${innerY1}
        Z
      `
    } else {
      path = `
        M ${size / 2} ${size / 2}
        L ${x1} ${y1}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
        Z
      `
    }

    // Calculate label position
    const labelAngle = (startAngle + endAngle) / 2
    const labelRad = (labelAngle * Math.PI) / 180
    const labelRadius = donutMode ? innerRadius + donutWidth / 2 : radius * 0.7
    const labelX = size / 2 + labelRadius * Math.cos(labelRad)
    const labelY = size / 2 + labelRadius * Math.sin(labelRad)

    return {
      ...item,
      path,
      labelX,
      labelY,
      startAngle,
      endAngle
    }
  })

  return (
    <div className={`flex ${showLegend ? 'flex-col md:flex-row' : ''} items-center gap-6 ${className}`}>
      {/* Pie Chart */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {slices.map((slice, i) => {
            const isHovered = hoveredIndex === i
            const scale = isHovered ? 1.05 : 1
            const transformOrigin = `${size / 2}px ${size / 2}px`

            return (
              <g key={i}>
                <path
                  d={slice.path}
                  fill={slice.color}
                  className="cursor-pointer transition-all"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin,
                    opacity: hoveredIndex === null || isHovered ? 1 : 0.7
                  }}
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />

                {/* Percentage label on slice */}
                {showPercentages && slice.percentage >= 5 && (
                  <text
                    x={slice.labelX}
                    y={slice.labelY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className="fill-white font-bold pointer-events-none"
                    style={{ fontSize: '14px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
                  >
                    {slice.percentage.toFixed(1)}%
                  </text>
                )}
              </g>
            )
          })}

          {/* Center text for donut mode */}
          {donutMode && (() => {
            const formattedTotal = valueFormatter(total)
            const innerRadius = radius - donutWidth
            const availableWidth = innerRadius * 1.6 // Max width for text (diameter * 0.8)
            const textLength = formattedTotal.length

            // Dynamic font size based on text length
            let fontSize = 20
            let labelFontSize = 12
            let spacing = 10

            if (textLength > 15) {
              fontSize = 12
              labelFontSize = 10
              spacing = 8
            } else if (textLength > 12) {
              fontSize = 14
              labelFontSize = 11
              spacing = 9
            } else if (textLength > 10) {
              fontSize = 16
              spacing = 9
            } else if (textLength > 8) {
              fontSize = 18
              spacing = 9
            }

            return (
              <g>
                <text
                  x={size / 2}
                  y={size / 2 - spacing}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="fill-gray-600 font-medium"
                  style={{ fontSize: `${labelFontSize}px` }}
                >
                  Total
                </text>
                <text
                  x={size / 2}
                  y={size / 2 + spacing + 3}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className="fill-gray-900 font-bold"
                  style={{
                    fontSize: `${fontSize}px`,
                    maxWidth: `${availableWidth}px`
                  }}
                >
                  {formattedTotal}
                </text>
              </g>
            )
          })()}
        </svg>

        {/* Tooltip */}
        {hoveredIndex !== null && (
          <div className="absolute top-0 left-full ml-4 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg pointer-events-none z-10 whitespace-nowrap">
            <div className="font-semibold mb-1">{slices[hoveredIndex].label}</div>
            <div className="text-white">{valueFormatter(slices[hoveredIndex].value)}</div>
            <div className="text-gray-300 text-xs mt-1">
              {slices[hoveredIndex].percentage.toFixed(1)}% of total
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex-1 min-w-0">
          <div className="space-y-2">
            {slices.map((slice, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                  hoveredIndex === i ? 'bg-gray-100 shadow-sm' : 'hover:bg-gray-50'
                }`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-4 h-4 rounded flex-shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-sm text-gray-900 truncate font-medium">
                    {slice.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-900 font-semibold">
                    {valueFormatter(slice.value)}
                  </span>
                  <span className="text-gray-500 w-12 text-right">
                    {slice.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-lg font-bold text-gray-900">
                {valueFormatter(total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
