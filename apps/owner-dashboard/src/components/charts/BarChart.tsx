'use client'

import { useState } from 'react'

export interface BarChartDataPoint {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarChartDataPoint[]
  height?: number
  showGrid?: boolean
  showValues?: boolean
  barColor?: string
  barGradient?: boolean
  orientation?: 'vertical' | 'horizontal'
  className?: string
  valueFormatter?: (value: number) => string
}

export default function BarChart({
  data,
  height = 300,
  showGrid = true,
  showValues = false,
  barColor = '#3B82F6', // blue-500
  barGradient = true,
  orientation = 'vertical',
  className = '',
  valueFormatter = (value) => value.toLocaleString()
}: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-400">No data available</p>
      </div>
    )
  }

  // Calculate max value
  const values = data.map(d => d.value)
  const maxValue = Math.max(...values, 1)

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 60, left: 60 }
  const chartWidth = 800
  const chartHeight = height
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Calculate bar dimensions
  const barGap = 8
  const totalGaps = (data.length - 1) * barGap
  const barWidth = (innerWidth - totalGaps) / data.length

  // Grid lines
  const gridLines = showGrid ? [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding.top + innerHeight * (1 - ratio)
    const value = maxValue * ratio
    return { y, value }
  }) : []

  return (
    <div className={`relative ${className}`}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Define gradients */}
        <defs>
          {barGradient && (
            <linearGradient id="barGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={barColor} stopOpacity="1" />
              <stop offset="100%" stopColor={barColor} stopOpacity="0.6" />
            </linearGradient>
          )}
        </defs>

        {/* Grid lines */}
        {showGrid && gridLines.map((line, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              y1={line.y}
              x2={chartWidth - padding.right}
              y2={line.y}
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 10}
              y={line.y}
              textAnchor="end"
              alignmentBaseline="middle"
              className="text-xs fill-gray-500"
              style={{ fontSize: '12px' }}
            >
              {valueFormatter(line.value)}
            </text>
          </g>
        ))}

        {/* Bars */}
        {data.map((item, i) => {
          const barHeight = (item.value / maxValue) * innerHeight
          const x = padding.left + i * (barWidth + barGap)
          const y = padding.top + innerHeight - barHeight
          const isHovered = hoveredIndex === i

          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color || (barGradient ? 'url(#barGradient)' : barColor)}
                className="cursor-pointer transition-all"
                rx={4}
                opacity={isHovered ? 1 : 0.9}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
              />

              {/* Value on top of bar */}
              {showValues && item.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="text-xs fill-gray-700 font-medium"
                  style={{ fontSize: '11px' }}
                >
                  {valueFormatter(item.value)}
                </text>
              )}

              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - padding.bottom + 15}
                textAnchor="middle"
                className="text-xs fill-gray-600"
                style={{ fontSize: '11px' }}
              >
                {item.label.length > 10 ? `${item.label.substring(0, 10)}...` : item.label}
              </text>
            </g>
          )
        })}

        {/* X and Y axis lines */}
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={chartWidth - padding.right}
          y2={padding.top + innerHeight}
          stroke="#9CA3AF"
          strokeWidth="2"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + innerHeight}
          stroke="#9CA3AF"
          strokeWidth="2"
        />
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg pointer-events-none z-10"
          style={{
            left: `${((padding.left + hoveredIndex * (barWidth + barGap) + barWidth / 2) / chartWidth) * 100}%`,
            top: `${((padding.top + innerHeight - (data[hoveredIndex].value / maxValue) * innerHeight) / chartHeight) * 100 - 5}%`,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <div className="font-semibold mb-1">{data[hoveredIndex].label}</div>
          <div className="text-white">{valueFormatter(data[hoveredIndex].value)}</div>
          <div
            className="absolute left-1/2 transform -translate-x-1/2"
            style={{ bottom: '-4px' }}
          >
            <div className="border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  )
}
