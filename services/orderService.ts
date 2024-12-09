import { supabase } from '../utils/supabaseClient'
import { Order } from '../types/interfaces'
import { DATABASE_TABLES, ORDER_FIELDS } from '../constants/database'
import { getWeekData } from './weekService'

export async function getOrdersForWeek(weekDataId: number): Promise<Order[]> {
  const { data, error } = await supabase
    .from(DATABASE_TABLES.ORDERS)
    .select('*')
    .eq(ORDER_FIELDS.WEEK_DATA_ID, weekDataId)

  if (error) {
    console.error('Erreur lors de la récupération des commandes :', error)
    throw error
  }

  return data as Order[]
}

export async function getPreviousWeekOrders(year: number, weekNumber: number): Promise<Order[]> {
  try {
    // Calculate previous week
    const prevWeek = weekNumber === 1 ? 52 : weekNumber - 1
    const prevYear = weekNumber === 1 ? year - 1 : year
    
    // Get previous week's data
    const prevWeekData = await getWeekData(prevYear, prevWeek)
    if (!prevWeekData?.id) return []
    
    // Get orders for previous week
    return await getOrdersForWeek(prevWeekData.id)
  } catch (error) {
    console.error('Error fetching previous week orders:', error)
    return []
  }
}

export async function createInitialOrders(weekDataId: number, deliveryDates: string[]): Promise<void> {
  try {
    const orders = deliveryDates.map((date, index) => ({
      week_data_id: weekDataId,
      order_number: index + 1,
      delivery_date: date,
      real_stock: {},
      needs: {},
      ordered_quantities: {}
    }))

    const { error } = await supabase
      .from(DATABASE_TABLES.ORDERS)
      .upsert(orders, {
        onConflict: 'week_data_id,order_number'
      })

    if (error) throw error
  } catch (error) {
    console.error('Erreur lors de la création des commandes initiales:', error)
    throw error
  }
}

export async function updateOrderNeeds(order: Order, needs: { [productId: number]: number }): Promise<void> {
  try {
    const { error } = await supabase
      .from(DATABASE_TABLES.ORDERS)
      .update({ needs })
      .eq('id', order.id)

    if (error) throw error
  } catch (error) {
    console.error('Erreur lors de la mise à jour des besoins:', error)
    throw error
  }
}

export async function upsertOrder(order: Order): Promise<Order> {
  const { data, error } = await supabase
    .from(DATABASE_TABLES.ORDERS)
    .upsert(order, {
      onConflict: 'week_data_id,order_number',
    })
    .select()
    .single()

  if (error) {
    console.error('Erreur lors de la mise à jour de la commande :', error)
    throw error
  }

  return data as Order
}

export async function deleteOrder(weekDataId: number, orderNumber: number): Promise<void> {
  const { error } = await supabase
    .from(DATABASE_TABLES.ORDERS)
    .delete()
    .eq(ORDER_FIELDS.WEEK_DATA_ID, weekDataId)
    .eq(ORDER_FIELDS.ORDER_NUMBER, orderNumber)

  if (error) {
    console.error('Erreur lors de la suppression de la commande :', error)
    throw error
  }
}