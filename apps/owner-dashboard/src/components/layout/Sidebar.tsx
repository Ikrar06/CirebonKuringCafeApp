'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingBag,
  ClipboardList,
  Users,
  Package,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Shield,
  Bell,
  Percent,
  DollarSign,
  Receipt,
  FileText,
  Calendar,
  Clock
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface SidebarItem {
  id: string
  label: string
  icon: React.ElementType
  href: string
  badge?: string | number
  children?: SidebarItem[]
}

interface SidebarProps {
  className?: string
}

const sidebarItems: SidebarItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/'
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ClipboardList,
    href: '/orders',
    badge: 'live',
    children: [
      { id: 'orders-live', label: 'Live Orders', icon: Receipt, href: '/orders/live' },
      { id: 'orders-history', label: 'Order History', icon: ClipboardList, href: '/orders/history' }
    ]
  },
  {
    id: 'menu',
    label: 'Menu Management',
    icon: ShoppingBag,
    href: '/menu'
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    href: '/inventory',
    children: [
      { id: 'inventory-stock', label: 'Stock Management', icon: Package, href: '/inventory' },
      { id: 'inventory-ingredients', label: 'Ingredients', icon: Coffee, href: '/inventory/ingredients' },
      { id: 'inventory-suppliers', label: 'Suppliers', icon: Users, href: '/inventory/suppliers' }
    ]
  },
  {
    id: 'employees',
    label: 'Staff Management',
    icon: Users,
    href: '/employees'
  },
  {
    id: 'leave-requests',
    label: 'Leave Requests',
    icon: Calendar,
    href: '/leave-requests'
  },
  {
    id: 'overtime-requests',
    label: 'Overtime Requests',
    icon: Clock,
    href: '/overtime-requests'
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: DollarSign,
    href: '/payroll'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    href: '/analytics',
    children: [
      { id: 'analytics-overview', label: 'Overview', icon: BarChart3, href: '/analytics' },
      { id: 'analytics-sales', label: 'Sales Analytics', icon: DollarSign, href: '/analytics/sales' },
      { id: 'analytics-customers', label: 'Customer Analytics', icon: Users, href: '/analytics/customers' },
      { id: 'analytics-finance', label: 'Financial Reports', icon: Receipt, href: '/analytics/finance' },
      { id: 'analytics-staff', label: 'Employee Performance', icon: Users, href: '/analytics/staff' }
    ]
  },
  {
    id: 'promos',
    label: 'Promotions',
    icon: Percent,
    href: '/promos'
  },
  {
    id: 'cash-reconciliation',
    label: 'Cash Management',
    icon: DollarSign,
    href: '/cash-reconciliation'
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    href: '/reports'
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
    href: '/notifications'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    href: '/settings'
  }
]

export default function Sidebar({ className = '' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  // Auto-expand parent items that have active children
  useEffect(() => {
    const expanded: string[] = []
    sidebarItems.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => pathname === child.href)
        if (hasActiveChild || pathname.startsWith(item.href + '/')) {
          expanded.push(item.id)
        }
      }
    })
    setExpandedItems(expanded)
  }, [pathname])

  const isExactActive = (href: string) => {
    // Only exact match for child items
    return pathname === href
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleItemClick = (item: SidebarItem) => {
    if (item.children) {
      toggleExpand(item.id)
    } else {
      router.push(item.href)
    }
  }

  const handleLogout = () => {
    logout()
  }

  const renderMenuItem = (item: SidebarItem, level = 0) => {
    const Icon = item.icon
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.id)

    // Check exact match for this item
    const isExact = isExactActive(item.href)

    // For parent items (level 0) with children:
    // Show as "hasActiveChild" (blue muda) if any child is active (including child with same href)
    const hasActiveChild = level === 0 && hasChildren && item.children?.some(child => {
      return pathname === child.href
    })

    // For parent items, don't highlight with blue terang if it has children (let hasActiveChild handle it)
    const shouldHighlightParent = level === 0 && hasChildren ? false : isExact

    return (
      <div key={item.id}>
        <button
          onClick={() => handleItemClick(item)}
          className={`
            w-full flex items-center justify-between p-3 rounded-lg text-left transition-all duration-200
            ${level > 0 ? 'ml-4 pl-4' : ''}
            ${level === 0
              ? shouldHighlightParent
                ? 'bg-blue-600 text-white shadow-lg'
                : hasActiveChild
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              : isExact
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title={isCollapsed ? item.label : undefined}
        >
          <div className="flex items-center space-x-3">
            <Icon
              className={`h-5 w-5 ${(level === 0 && shouldHighlightParent) || (level > 0 && isExact) ? 'text-white' : hasActiveChild ? 'text-blue-600' : 'text-gray-500'} flex-shrink-0`}
            />
            {!isCollapsed && (
              <>
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span className={`
                    px-2 py-1 text-xs rounded-full font-medium
                    ${item.badge === 'live'
                      ? 'bg-green-100 text-green-800 animate-pulse'
                      : 'bg-gray-100 text-gray-800'
                    }
                  `}>
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </div>

          {!isCollapsed && hasChildren && (
            <ChevronRight
              className={`h-4 w-4 transition-transform duration-200 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
          )}
        </button>

        {/* Child items */}
        {!isCollapsed && hasChildren && isExpanded && (
          <div className="mt-1 space-y-1 pr-2">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`
      bg-white border-r border-gray-200 flex flex-col transition-all duration-300
      ${isCollapsed ? 'w-16' : 'w-64'}
      ${className}
    `}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Coffee className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-gray-900">Cafe Dashboard</h1>
              <p className="text-xs text-gray-500">Owner Panel</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* User Info */}
      {!isCollapsed && user && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {user.name || user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Owner
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {sidebarItems.map(item => renderMenuItem(item))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center justify-center p-3 rounded-lg
            text-red-600 hover:bg-red-50 hover:text-red-700
            transition-colors font-medium
            ${isCollapsed ? '' : 'space-x-3'}
          `}
          title={isCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}
