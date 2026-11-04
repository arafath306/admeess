import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// Generic hook for fetching data from Supabase
export function useSupabaseQuery<T>(
  tableName: string,
  options?: {
    select?: string
    orderBy?: { column: string; ascending?: boolean }
    limit?: number
    filters?: Array<{ column: string; operator: string; value: unknown }>
  }
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from(tableName)
        .select(options?.select || '*')

      if (options?.filters) {
        for (const filter of options.filters) {
          query = query.filter(filter.column, filter.operator, filter.value)
        }
      }

      if (options?.orderBy) {
        query = query.order(options.orderBy.column, {
          ascending: options.orderBy.ascending ?? false,
        })
      }

      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data: result, error: err } = await query
      if (err) throw err
      setData((result as T[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [tableName, options?.select, options?.limit, options?.orderBy?.column, options?.orderBy?.ascending])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

// Hook for getting count from a table
export function useSupabaseCount(tableName: string) {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { count: c, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      if (!error && c !== null) setCount(c)
      setLoading(false)
    }
    fetch()
  }, [tableName])

  return { count, loading }
}

// Hook for getting multiple counts at once
export function useMultipleCounts(tables: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      const results: Record<string, number> = {}
      await Promise.all(
        tables.map(async (table) => {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
          results[table] = error ? 0 : (count ?? 0)
        })
      )
      setCounts(results)
      setLoading(false)
    }
    fetchAll()
  }, [tables.join(',')])

  return { counts, loading }
}

// Format number for display (1000 -> 1K, 1000000 -> 1M)
export function formatCount(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toString()
}

// Format date for display
export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
