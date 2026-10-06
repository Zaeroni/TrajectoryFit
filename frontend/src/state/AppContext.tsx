import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/client'
import type { User } from '../api/types'
import { todayISO } from '../lib/dates'

interface AppState {
  users: User[]
  currentUser: User | null
  loadingUsers: boolean
  usersError: string | null
  setCurrentUserId: (id: string) => void
  /** Re-fetch users. `silent` skips the full-screen spinner (used after edits). */
  reloadUsers: (silent?: boolean) => Promise<void>
  selectedDate: string
  setSelectedDate: (iso: string) => void
  /** Increments whenever logged data changes, so screens can re-fetch. */
  dataVersion: number
  bumpData: () => void
  toast: (message: string) => void
  toastMessage: string | null
}

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>(todayISO())
  const [dataVersion, setDataVersion] = useState(0)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  const reloadUsers = useCallback(async (silent = false) => {
    if (!silent) setLoadingUsers(true)
    setUsersError(null)
    try {
      const list = await api.listUsers()
      setUsers(list)
      setCurrentUserId((prev) => {
        if (prev && list.some((u) => u.id === prev)) return prev
        // Default to a crash_dieter if present (most illustrative), else the first user.
        const preferred = list.find((u) => u.archetype === 'crash_dieter') ?? list[0]
        return preferred?.id ?? null
      })
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : 'Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => { void reloadUsers() }, [reloadUsers])

  const bumpData = useCallback(() => setDataVersion((v) => v + 1), [])

  const toast = useCallback((message: string) => {
    setToastMessage(message)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMessage(null), 2200)
  }, [])

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? null,
    [users, currentUserId],
  )

  const value: AppState = {
    users, currentUser, loadingUsers, usersError,
    setCurrentUserId, reloadUsers,
    selectedDate, setSelectedDate,
    dataVersion, bumpData,
    toast, toastMessage,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
