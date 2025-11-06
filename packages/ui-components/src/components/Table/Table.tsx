/**
 * Table Component
 * 
 * Clean, responsive data table component with Google-inspired design
 * Supports sorting, filtering, pagination, and responsive design
 */

import React, { forwardRef, useState, useMemo } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

// Table variants for different styles
const tableVariants = cva(
  [
    'w-full border-collapse bg-white',
    'border border-gray-200 rounded-lg overflow-hidden',
  ],
  {
    variants: {
      variant: {
        default: 'shadow-sm',
        bordered: 'border-gray-300',
        striped: '',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

// Column definition interface
export interface TableColumn<T = any> {
  key: string
  title: string
  dataIndex?: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  filterable?: boolean
  render?: (value: any, record: T, index: number) => React.ReactNode
  className?: string
}

// Table props interface
export interface TableProps<T = any> extends VariantProps<typeof tableVariants> {
  /**
   * Table data source
   */
  data: T[]
  /**
   * Column definitions
   */
  columns: TableColumn<T>[]
  /**
   * Loading state
   */
  loading?: boolean
  /**
   * Empty state message
   */
  emptyText?: string
  /**
   * Row key extractor
   */
  rowKey?: string | ((record: T) => string)
  /**
   * Row selection config
   */
  rowSelection?: {
    selectedRowKeys?: string[]
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void
    type?: 'checkbox' | 'radio'
  }
  /**
   * Row click handler
   */
  onRow?: (record: T, index: number) => {
    onClick?: (event: React.MouseEvent) => void
    onDoubleClick?: (event: React.MouseEvent) => void
    className?: string
  }
  /**
   * Pagination config
   */
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
    showSizeChanger?: boolean
    pageSizeOptions?: number[]
  }
  /**
   * Table className
   */
  className?: string
}

/**
 * Main Table Component
 */
export function Table<T = any>({
  data,
  columns,
  loading = false,
  emptyText = 'No data available',
  rowKey = 'id',
  rowSelection,
  onRow,
  pagination,
  variant,
  size,
  className,
}: TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: 'asc' | 'desc'
  } | null>(null)

  const [filterConfig, setFilterConfig] = useState<Record<string, string>>({})

  // Get row key
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record)
    }
    return (record as any)[rowKey] || index.toString()
  }

  // Handle sorting
  const handleSort = (columnKey: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    
    if (sortConfig && sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    
    setSortConfig({ key: columnKey, direction })
  }

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return data

    return [...data].sort((a, b) => {
      const column = columns.find(col => col.key === sortConfig.key)
      if (!column) return 0

      const aValue = column.dataIndex ? (a as any)[column.dataIndex] : (a as any)[column.key]
      const bValue = column.dataIndex ? (b as any)[column.dataIndex] : (b as any)[column.key]

      if (aValue === bValue) return 0

      const comparison = aValue > bValue ? 1 : -1
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortConfig, columns])

  // Filter data
  const filteredData = useMemo(() => {
    return sortedData.filter(record => {
      return Object.entries(filterConfig).every(([key, filterValue]) => {
        if (!filterValue) return true
        
        const column = columns.find(col => col.key === key)
        if (!column) return true

        const recordValue = column.dataIndex ? (record as any)[column.dataIndex] : (record as any)[column.key]
        return String(recordValue).toLowerCase().includes(filterValue.toLowerCase())
      })
    })
  }, [sortedData, filterConfig, columns])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return filteredData

    const startIndex = (pagination.current - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return filteredData.slice(startIndex, endIndex)
  }, [filteredData, pagination])

  if (loading) {
    return <TableSkeleton columns={columns} />
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Filters */}
      <TableFilters 
        columns={columns}
        filterConfig={filterConfig}
        onFilterChange={setFilterConfig}
      />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={tableVariants({ variant, size, className })}>
          <TableHeader
            columns={columns}
            sortConfig={sortConfig}
            onSort={handleSort}
            hasSelection={!!rowSelection}
            selectionType={rowSelection?.type}
            selectedRowKeys={rowSelection?.selectedRowKeys || []}
            allRowKeys={paginatedData.map((record, index) => getRowKey(record, index))}
            onSelectAll={rowSelection?.onChange}
            allRows={paginatedData}
          />
          
          <TableBody
            data={paginatedData}
            columns={columns}
            emptyText={emptyText}
            getRowKey={getRowKey}
            rowSelection={rowSelection}
            onRow={onRow}
            variant={variant || 'default'}
          />
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <TablePagination
          current={pagination.current}
          pageSize={pagination.pageSize}
          total={filteredData.length}
          onChange={pagination.onChange}
          showSizeChanger={pagination.showSizeChanger}
          pageSizeOptions={pagination.pageSizeOptions}
        />
      )}
    </div>
  )
}

/**
 * Table Header Component
 */
interface TableHeaderProps<T> {
  columns: TableColumn<T>[]
  sortConfig: { key: string; direction: 'asc' | 'desc' } | null
  onSort: (key: string) => void
  hasSelection: boolean
  selectionType?: 'checkbox' | 'radio'
  selectedRowKeys: string[]
  allRowKeys: string[]
  onSelectAll?: (keys: string[], rows: T[]) => void
  allRows: T[]
}

function TableHeader<T>({
  columns,
  sortConfig,
  onSort,
  hasSelection,
  selectionType,
  selectedRowKeys,
  allRowKeys,
  onSelectAll,
  allRows,
}: TableHeaderProps<T>) {
  const isAllSelected = allRowKeys.length > 0 && allRowKeys.every(key => selectedRowKeys.includes(key))
  const isIndeterminate = selectedRowKeys.length > 0 && !isAllSelected

  const handleSelectAll = () => {
    if (!onSelectAll) return

    if (isAllSelected) {
      onSelectAll([], [])
    } else {
      onSelectAll(allRowKeys, allRows)
    }
  }

  return (
    <thead>
      <tr className="border-b border-gray-200 bg-gray-50">
        {hasSelection && (
          <th className="w-12 px-4 py-3">
            {selectionType !== 'radio' && (
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={input => {
                  if (input) input.indeterminate = isIndeterminate
                }}
                onChange={handleSelectAll}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
              />
            )}
          </th>
        )}
        
        {columns.map((column) => (
          <th
            key={column.key}
            className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 ${
              column.align === 'center' ? 'text-center' : 
              column.align === 'right' ? 'text-right' : ''
            } ${column.className || ''}`}
            style={column.width ? { width: column.width } : undefined}
          >
            <div className="flex items-center space-x-1">
              <span>{column.title}</span>
              
              {column.sortable && (
                <button
                  onClick={() => onSort(column.key)}
                  className="text-gray-500 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {sortConfig?.key === column.key ? (
                      sortConfig.direction === 'asc' ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      )
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}

/**
 * Table Body Component
 */
interface TableBodyProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  emptyText: string
  getRowKey: (record: T, index: number) => string
  rowSelection?: {
    selectedRowKeys?: string[]
    onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void
    type?: 'checkbox' | 'radio'
  }
  onRow?: (record: T, index: number) => any
  variant?: 'default' | 'bordered' | 'striped'
}

function TableBody<T>({
  data,
  columns,
  emptyText,
  getRowKey,
  rowSelection,
  onRow,
  variant,
}: TableBodyProps<T>) {
  const handleRowSelect = (record: T, rowKey: string) => {
    if (!rowSelection?.onChange) return

    const { selectedRowKeys = [], type = 'checkbox' } = rowSelection
    let newSelectedKeys: string[]

    if (type === 'radio') {
      newSelectedKeys = [rowKey]
    } else {
      if (selectedRowKeys.includes(rowKey)) {
        newSelectedKeys = selectedRowKeys.filter(key => key !== rowKey)
      } else {
        newSelectedKeys = [...selectedRowKeys, rowKey]
      }
    }

    const selectedRows = data.filter((_, index) => 
      newSelectedKeys.includes(getRowKey(_, index))
    )

    rowSelection.onChange(newSelectedKeys, selectedRows)
  }

  if (data.length === 0) {
    return (
      <tbody>
        <tr>
          <td 
            colSpan={columns.length + (rowSelection ? 1 : 0)}
            className="px-4 py-12 text-center text-gray-500"
          >
            <div className="flex flex-col items-center">
              <svg 
                className="h-12 w-12 text-gray-300 mb-4"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              {emptyText}
            </div>
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody className="divide-y divide-gray-200 bg-white">
      {data.map((record, index) => {
        const rowKey = getRowKey(record, index)
        const isSelected = rowSelection?.selectedRowKeys?.includes(rowKey)
        const rowProps = onRow?.(record, index) || {}

        return (
          <tr
            key={rowKey}
            className={`transition-colors hover:bg-gray-50 ${
              isSelected ? 'bg-blue-50' : ''
            } ${variant === 'striped' && index % 2 === 1 ? 'bg-gray-50' : ''} ${
              rowProps.className || ''
            }`}
            onClick={rowProps.onClick}
            onDoubleClick={rowProps.onDoubleClick}
          >
            {rowSelection && (
              <td className="w-12 px-4 py-3">
                <input
                  type={rowSelection.type || 'checkbox'}
                  checked={isSelected}
                  onChange={() => handleRowSelect(record, rowKey)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
              </td>
            )}
            
            {columns.map((column) => {
              const dataIndex = column.dataIndex || column.key
              const value = (record as any)[dataIndex]
              
              return (
                <td
                  key={column.key}
                  className={`px-4 py-3 text-sm text-gray-900 ${
                    column.align === 'center' ? 'text-center' : 
                    column.align === 'right' ? 'text-right' : ''
                  } ${column.className || ''}`}
                >
                  {column.render 
                    ? column.render(value, record, index)
                    : value
                  }
                </td>
              )
            })}
          </tr>
        )
      })}
    </tbody>
  )
}

/**
 * Table Filters Component
 */
interface TableFiltersProps<T> {
  columns: TableColumn<T>[]
  filterConfig: Record<string, string>
  onFilterChange: (config: Record<string, string>) => void
}

function TableFilters<T>({
  columns,
  filterConfig,
  onFilterChange,
}: TableFiltersProps<T>) {
  const filterableColumns = columns.filter(col => col.filterable)
  
  if (filterableColumns.length === 0) return null

  const handleFilterChange = (columnKey: string, value: string) => {
    onFilterChange({
      ...filterConfig,
      [columnKey]: value,
    })
  }

  const clearFilters = () => {
    onFilterChange({})
  }

  const hasActiveFilters = Object.values(filterConfig).some(value => value)

  return (
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-700">Filters:</span>
        
        {filterableColumns.map((column) => (
          <div key={column.key} className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">{column.title}:</label>
            <input
              type="text"
              value={filterConfig[column.key] || ''}
              onChange={(e) => handleFilterChange(column.key, e.target.value)}
              placeholder={`Filter ${column.title.toLowerCase()}...`}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600 text-gray-600"
            />
          </div>
        ))}
        
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Table Pagination Component
 */
interface TablePaginationProps {
  current: number
  pageSize: number
  total: number
  onChange: (page: number, pageSize: number) => void
  showSizeChanger?: boolean
  pageSizeOptions?: number[]
}

function TablePagination({
  current,
  pageSize,
  total,
  onChange,
  showSizeChanger = false,
  pageSizeOptions = [10, 20, 50, 100],
}: TablePaginationProps) {
  const totalPages = Math.ceil(total / pageSize)
  const startIndex = (current - 1) * pageSize + 1
  const endIndex = Math.min(current * pageSize, total)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onChange(page, pageSize)
    }
  }

  const handlePageSizeChange = (newPageSize: number) => {
    onChange(1, newPageSize)
  }

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => handlePageChange(current - 1)}
          disabled={current <= 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => handlePageChange(current + 1)}
          disabled={current >= totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex}</span> to{' '}
            <span className="font-medium">{endIndex}</span> of{' '}
            <span className="font-medium">{total}</span> results
          </p>
          
          {showSizeChanger && (
            <div className="flex items-center space-x-2">
              <label className="text-sm text-gray-700">Show:</label>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              >
                {pageSizeOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(current - 1)}
            disabled={current <= 1}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>

          {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
            let pageNumber
            if (totalPages <= 7) {
              pageNumber = i + 1
            } else if (current <= 4) {
              pageNumber = i + 1
            } else if (current >= totalPages - 3) {
              pageNumber = totalPages - 6 + i
            } else {
              pageNumber = current - 3 + i
            }

            return (
              <button
                key={pageNumber}
                onClick={() => handlePageChange(pageNumber)}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  current === pageNumber
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {pageNumber}
              </button>
            )
          })}

          <button
            onClick={() => handlePageChange(current + 1)}
            disabled={current >= totalPages}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Table Loading Skeleton
 */
function TableSkeleton({ columns }: { columns: TableColumn[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex space-x-4">
            {columns.map((column) => (
              <div key={column.key} className="h-4 bg-gray-300 rounded flex-1"></div>
            ))}
          </div>
        </div>
        
        {/* Rows skeleton */}
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="border-b border-gray-200 px-4 py-3">
            <div className="flex space-x-4">
              {columns.map((column) => (
                <div key={column.key} className="h-4 bg-gray-200 rounded flex-1"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Export types
export { tableVariants }
export type { VariantProps }