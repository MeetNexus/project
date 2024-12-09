import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useQuery, useQueryClient } from 'react-query'
import { createInitialWeekData } from '../services/weekService'
import { toast } from 'react-hot-toast'
import { getCategories } from '../services/categoryService'

export function useSupabaseQuery<T>(
  key: string | string[],
  queryFn: () => Promise<T>,
  options = {}
) {
  const queryClient = useQueryClient()

  return useQuery(key, queryFn, {
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: (error: any) => {
      console.error('Query error:', error)
      toast.error('Erreur lors de la récupération des données')
    },
    ...options,
  })
}

export function useCategories() {
  return useSupabaseQuery('categories', async () => {
    const categories = await getCategories()
    return categories
  })
}

export function useProducts() {
  return useSupabaseQuery('products', async () => {
    const { data, error } = await supabase.from('products').select('*')
    if (error) throw error
    return data
  })
}

export function useWeekData(year: number, weekNumber: number) {
  const queryClient = useQueryClient()

  return useSupabaseQuery(['weekData', year, weekNumber], async () => {
    try {
      const { data, error } = await supabase
        .from('weeks_data')
        .select('*')
        .eq('year', year)
        .eq('week_number', weekNumber)
        .maybeSingle()

      if (error) throw error

      // Si aucune donnée n'existe, créer les données initiales
      if (!data) {
        const newData = await createInitialWeekData(year, weekNumber)
        if (newData) {
          // Invalider les requêtes liées aux données de la semaine
          queryClient.invalidateQueries(['weekData', year, weekNumber])
          return newData
        }
      }

      return data
    } catch (error) {
      console.error('Erreur lors de la récupération des données de la semaine:', error)
      throw error
    }
  }, {
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache the data
  })
}

export function useOrders(weekDataId: number | undefined) {
  const queryClient = useQueryClient()

  return useSupabaseQuery(
    ['orders', weekDataId],
    async () => {
      if (!weekDataId) return []
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('week_data_id', weekDataId)
      if (error) throw error
      return data
    },
    {
      enabled: !!weekDataId,
      staleTime: 0,
      cacheTime: 0,
    }
  )
}