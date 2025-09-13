'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import apiClient from '@/lib/api/client'
import type { Database } from '@/types/database'

// Types
type TableRow = Database['public']['Tables']['tables']['Row']
type TableStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'

interface TableData extends TableRow {
  location_description?: string
  capacity: number
  status: TableStatus
  qr_code: string
}

interface TableSession {
  tableId: string
  tableNumber: string
  sessionStarted: Date
  lastActivity: Date
  capacity: number
  location?: string
}

interface UseTableReturn {
  // Table state
  table: TableData | null
  isLoading: boolean
  error: string | null
  isOnline: boolean
  
  // Session state
  session: TableSession | null
  sessionDuration: number
  
  // Actions
  initializeTable: (tableId: string) => Promise<boolean>
  refreshTable: () => Promise<void>
  updateActivity: () => void
  endSession: () => void
  
  // Status checks
  isValidSession: boolean
  isTableAvailable: boolean
  
  // Real-time updates
  subscribeToUpdates: () => void
  unsubscribeFromUpdates: () => void
}

/**
 * Custom hook for table management and session handling
 */
export default function useTable(): UseTableReturn {
  const router = useRouter()
  
  // State management
  const [table, setTable] = useState<TableData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [session, setSession] = useState<TableSession | null>(null)
  const [sessionDuration, setSessionDuration] = useState(0)
  
  // Refs for cleanup and subscriptions
  const subscriptionRef = useRef<any>(null)
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Constants
  const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
  const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000 // 5 minutes
  const TABLE_REFRESH_INTERVAL = 2 * 60 * 1000 // 2 minutes

  /**
   * Initialize table data and session
   */
  const initializeTable = useCallback(async (tableId: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      // Validate table ID format
      if (!tableId || typeof tableId !== 'string') {
        throw new Error('Invalid table ID')
      }

      // Check for existing session
      const existingSession = loadSession()
      if (existingSession && existingSession.tableId === tableId) {
        // Validate session is not expired
        const timeSinceActivity = Date.now() - existingSession.lastActivity.getTime()
        if (timeSinceActivity < SESSION_TIMEOUT) {
          setSession(existingSession)
          toast.success(`Melanjutkan sesi di Meja ${existingSession.tableNumber}`)
        } else {
          clearSession()
          toast.info('Sesi sebelumnya telah berakhir')
        }
      }

      // Fetch table data
      const response = await apiClient.getTable(tableId)
      
      if (response.error) {
        if (response.status === 404) {
          throw new Error('Meja tidak ditemukan')
        }
        throw new Error(response.error.message || 'Gagal memuat data meja')
      }

      if (!response.data) {
        throw new Error('Data meja tidak valid')
      }

      const tableData = response.data as TableData

      // Validate table status
      if (tableData.status === 'maintenance') {
        throw new Error('Meja sedang dalam perbaikan')
      }

      // Update table state
      setTable(tableData)

      // Create or update session
      const newSession: TableSession = {
        tableId: tableData.id,
        tableNumber: tableData.table_number,
        sessionStarted: session?.sessionStarted || new Date(),
        lastActivity: new Date(),
        capacity: tableData.capacity,
        location: tableData.location_description,
      }

      setSession(newSession)
      saveSession(newSession)

      // Start session management
      startSessionTimer()
      startActivityTimer()

      return true

    } catch (error: any) {
      console.error('Error initializing table:', error)
      setError(error.message || 'Gagal memuat meja')
      toast.error(error.message || 'Gagal memuat meja')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [session])

  /**
   * Refresh table data
   */
  const refreshTable = useCallback(async () => {
    if (!table) return

    try {
      const response = await apiClient.getTable(table.id)
      
      if (response.error) {
        console.error('Error refreshing table:', response.error)
        return
      }

      if (response.data) {
        const updatedTable = response.data as TableData
        
        // Check if table status changed
        if (updatedTable.status !== table.status) {
          if (updatedTable.status === 'maintenance') {
            toast.error('Meja sedang dalam perbaikan')
            endSession()
            router.push('/')
            return
          }
          
          toast.info(`Status meja diperbarui: ${updatedTable.status}`)
        }

        setTable(updatedTable)
        updateActivity()
      }
    } catch (error) {
      console.error('Error refreshing table:', error)
    }
  }, [table, router])

  /**
   * Update user activity timestamp
   */
  const updateActivity = useCallback(() => {
    if (!session) return

    const updatedSession = {
      ...session,
      lastActivity: new Date(),
    }

    setSession(updatedSession)
    saveSession(updatedSession)
  }, [session])

  /**
   * End current session
   */
  const endSession = useCallback(() => {
    // Clear timers
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current)
      sessionTimerRef.current = null
    }
    if (activityTimerRef.current) {
      clearInterval(activityTimerRef.current)
      activityTimerRef.current = null
    }

    // Unsubscribe from real-time updates
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    // Clear session data
    setSession(null)
    setTable(null)
    clearSession()

    toast.info('Sesi berakhir')
  }, [])

  /**
   * Start session timeout timer
   */
  const startSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current)
    }

    sessionTimerRef.current = setTimeout(() => {
      toast.warning('Sesi akan berakhir dalam 5 menit karena tidak ada aktivitas')
      
      // Give user 5 more minutes
      sessionTimerRef.current = setTimeout(() => {
        endSession()
        router.push('/')
      }, 5 * 60 * 1000)
    }, SESSION_TIMEOUT - (5 * 60 * 1000))
  }, [endSession, router])

  /**
   * Start activity update timer
   */
  const startActivityTimer = useCallback(() => {
    if (activityTimerRef.current) {
      clearInterval(activityTimerRef.current)
    }

    activityTimerRef.current = setInterval(() => {
      refreshTable()
    }, TABLE_REFRESH_INTERVAL)
  }, [refreshTable])

  /**
   * Subscribe to real-time table updates
   */
  const subscribeToUpdates = useCallback(() => {
    if (!table || subscriptionRef.current) return

    subscriptionRef.current = apiClient.subscribeToTableUpdates(
      table.id,
      (update) => {
        console.log('Table update received:', update)
        
        if (update.new) {
          const updatedTable = update.new as TableData
          
          // Handle status changes
          if (updatedTable.status !== table.status) {
            if (updatedTable.status === 'maintenance') {
              toast.error('Meja sedang dalam perbaikan')
              endSession()
              router.push('/')
              return
            }
          }

          setTable(updatedTable)
          updateActivity()
        }
      }
    )
  }, [table, endSession, router, updateActivity])

  /**
   * Unsubscribe from real-time updates
   */
  const unsubscribeFromUpdates = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }
  }, [])

  /**
   * Session storage utilities
   */
  const saveSession = (sessionData: TableSession) => {
    try {
      localStorage.setItem('table-session', JSON.stringify({
        ...sessionData,
        sessionStarted: sessionData.sessionStarted.toISOString(),
        lastActivity: sessionData.lastActivity.toISOString(),
      }))
    } catch (error) {
      console.error('Error saving session:', error)
    }
  }

  const loadSession = (): TableSession | null => {
    try {
      const stored = localStorage.getItem('table-session')
      if (!stored) return null

      const parsed = JSON.parse(stored)
      return {
        ...parsed,
        sessionStarted: new Date(parsed.sessionStarted),
        lastActivity: new Date(parsed.lastActivity),
      }
    } catch (error) {
      console.error('Error loading session:', error)
      return null
    }
  }

  const clearSession = () => {
    try {
      localStorage.removeItem('table-session')
      // Also clear cart data when session ends
      localStorage.removeItem('cart-data')
    } catch (error) {
      console.error('Error clearing session:', error)
    }
  }

  /**
   * Calculate session duration
   */
  useEffect(() => {
    if (!session) {
      setSessionDuration(0)
      return
    }

    const interval = setInterval(() => {
      const duration = Date.now() - session.sessionStarted.getTime()
      setSessionDuration(Math.floor(duration / 1000)) // in seconds
    }, 1000)

    return () => clearInterval(interval)
  }, [session])

  /**
   * Network status monitoring
   */
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (table) {
        refreshTable()
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // Initial check
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [table, refreshTable])

  /**
   * Activity tracking
   */
  useEffect(() => {
    const handleActivity = () => {
      updateActivity()
      startSessionTimer() // Reset session timer on activity
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
    }
  }, [updateActivity, startSessionTimer])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (sessionTimerRef.current) {
        clearTimeout(sessionTimerRef.current)
      }
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current)
      }
      unsubscribeFromUpdates()
    }
  }, [unsubscribeFromUpdates])

  // Computed values
  const isValidSession = session !== null && table !== null
  const isTableAvailable = table?.status === 'available' || table?.status === 'occupied'

  return {
    // Table state
    table,
    isLoading,
    error,
    isOnline,
    
    // Session state
    session,
    sessionDuration,
    
    // Actions
    initializeTable,
    refreshTable,
    updateActivity,
    endSession,
    
    // Status checks
    isValidSession,
    isTableAvailable,
    
    // Real-time updates
    subscribeToUpdates,
    unsubscribeFromUpdates,
  }
}