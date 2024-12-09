import { useSupabaseQuery } from './useSupabase'
import { Order } from '../types/interfaces'
import { supabase } from '../utils/supabaseClient'

import { convertToUnits, convertToPackages } from '../utils/calculations'
import { getProducts } from '../services/productService'

export function useOrders(weekDataId: number | undefined) {
  const { data: orders, refetch, ...rest } = useSupabaseQuery(
    ['orders', weekDataId],
    async () => {
      if (!weekDataId) return []
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('week_data_id', weekDataId)
      if (error) throw error
      return data as Order[]
    },
    {
      enabled: !!weekDataId,
    }
  )

  const updateOrder = async (order: Order) => {
    const { error } = await supabase
      .from('orders')
      .upsert(order)
      .eq('id', order.id)

    if (error) throw error
  }

  const updateOrderStock = async (orderId: number, productId: number, value: number) => {
    const order = orders?.find((o) => o.id === orderId)
    if (!order) return
    
    // Get product to perform unit conversion
    const products = await getProducts()
    const product = products.find(p => p.id === productId)
    if (!product) return
    
    // Convert stock from packages to units before storing
    const stockInUnits = convertToUnits(value, product)

    const updatedOrder = {
      ...order,
      real_stock: {
        ...order.real_stock,
        [productId]: stockInUnits,
      },
    }

    await updateOrder(updatedOrder)
    await refetch()
  }

  const updateOrderQuantity = async (orderId: number, productId: number, value: number) => {
    const order = orders?.find((o) => o.id === orderId)
    if (!order) return
    
    const updatedOrder = {
      ...order,
      ordered_quantities: {
        ...order.ordered_quantities,
        [productId]: value,
      }
    }

    await updateOrder(updatedOrder)
    // Force refetch to trigger recalculation
    await refetch()
  }

  return {
    orders,
    updateOrderStock,
    updateOrderQuantity,
    refetch,
    ...rest,
  }
}