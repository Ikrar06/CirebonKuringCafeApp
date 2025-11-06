'use client'

import { useState } from 'react'

export interface LineChartDataPoint {
  label: string
  value: number
  color?: string
}

interface LineChartProps {
  data: LineChartDataPoint[]
  height?: number
  showGrid?: boolean
  showPoints?: boolean
  lineColor?: string
  fillColor?: string
  strokeWidth?: number
  className?: string
  valueFormatter?: (value: number) => string
}

export default function LineChart({
  data,
  height = 300,
  showGrid = true,
  showPoints = true,
  lineColor = '#3B82F6', // blue-500
  fillColor = 'rgba(59, 130, 246, 0.1)', // blue-500 with opacity
  strokeWidth = 2,
  className = '',
  valueFormatter = (value) => value.toLocaleString()
}: LineChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <p className="text-gray-500">No data available</p>
      </div>
    )
  }

  // Calculate min and max values
  const values = data.map(d => d.value)
  const maxValue = Math.max(...values)
  const minValue = Math.min(...values, 0)
  const valueRange = maxValue - minValue || 1

  // Chart dimensions
  const padding = { top: 20, right: 20, bottom: 50, left: 60 }
  const chartWidth = 800
  const chartHeight = height
  const innerWidth = chartWidth - padding.left - padding.right
  const innerHeight = chartHeight - padding.top - padding.bottom

  // Calculate points
  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1 || 1)) * innerWidth
    const y = padding.top + innerHeight - ((d.value - minValue) / valueRange) * innerHeight
    return { x, y, ...d }
  })

  // Create path for line
  const linePath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`
  ).join(' ')

  // Create path for fill area
  const fillPath = `
    M ${points[0].x},${padding.top + innerHeight}
    L ${points[0].x},${points[0].y}
    ${points.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')}
    L ${points[points.length - 1].x},${padding.top + innerHeight}
    Z
  `

  // Grid lines
  const gridLines = showGrid ? [0, 0.25, 0.5, 0.75, 1].map(ratio => {
    const y = padding.top + innerHeight * (1 - ratio)
    const value = minValue + valueRange * ratio
    return { y, value }
  }) : []

  return (
    <div className={`relative ${className}`}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="overflow-visible"
      >
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

        {/* Fill area */}
        <path
          d={fillPath}
          fill={fillColor}
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {showPoints && points.map((point, i) => (
          <g key={i}>
            <circle
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === i ? 6 : 4}
              fill="white"
              stroke={point.color || lineColor}
              strokeWidth={2}
              className="cursor-pointer transition-all"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((point, i) => {
          // Show labels with spacing to avoid overlap
          const showLabel = data.length <= 10 || i % Math.ceil(data.length / 10) === 0
          if (!showLabel) return null

          return (
            <text
              key={i}
              x={point.x}
              y={chartHeight - padding.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-gray-600"
              style={{ fontSize: '11px' }}
            >
              {point.label}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg pointer-events-none z-10"
          style={{
            left: `${(points[hoveredIndex].x / chartWidth) * 100}%`,
            top: `${(points[hoveredIndex].y / chartHeight) * 100 - 10}%`,
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
