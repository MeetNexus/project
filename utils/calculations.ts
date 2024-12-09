import { Product, WeekData, Order } from '../types/interfaces'

export function convertToUnits(value: number, product: Product): number {
  if (!product.unit_conversion) return value
  
  const { number_of_packs, units_per_pack } = product.unit_conversion
  if (!number_of_packs || !units_per_pack) return value
  
  // Convert packages to units by multiplying
  const totalUnits = value * number_of_packs * units_per_pack
  return totalUnits
}

export function convertToPackages(value: number, product: Product): number {
  if (!product.unit_conversion) return value
  
  const { number_of_packs, units_per_pack } = product.unit_conversion
  if (!number_of_packs || !units_per_pack) return value
  
  // Convert to packages by dividing by total units per package
  const totalUnitsPerPackage = number_of_packs * units_per_pack
  const convertedValue = value / totalUnitsPerPackage
  // Round to 2 decimal places after conversion
  return Math.round(convertedValue * 100) / 100
}

export function calculateConsumption(
  product: Product,
  weekData: WeekData,
  salesForecast: number
): number {
  if (!weekData.consumption_data || !product.reference_produit) {
    return 0
  }

  const consumptionPer1000 = weekData.consumption_data[product.reference_produit] || 0
  // Calculate raw consumption without rounding
  return (consumptionPer1000 * salesForecast) / 1000
}

export function calculateInitialStock(
  product: Product,
  order: Order,
  previousOrders: Order[],
  previousWeekOrders: Order[]
): number {
  let initialStock = 0

  if (order.order_number === 1) {
    // For first order of the week, use third order from previous week
    const prevWeekOrder = previousWeekOrders.find(o => o.order_number === 3)
    if (prevWeekOrder) {
      const prevOrderedQuantity = prevWeekOrder.ordered_quantities?.[product.id!] || 0
      initialStock = convertToUnits(prevOrderedQuantity, product)
    }
  } else {
    // For other orders, use the previous order from current week
    const previousOrder = previousOrders
      .sort((a, b) => b.order_number - a.order_number)
      .find(o => o.order_number < order.order_number)

    if (previousOrder) {
      const previousOrderedQuantity = previousOrder.ordered_quantities?.[product.id!] || 0
      initialStock = convertToUnits(previousOrderedQuantity, product)
    }
  }

  // Add real stock if defined (without converting units)
  if (order.real_stock && typeof order.real_stock[product.id!] === 'number') {
    initialStock += order.real_stock[product.id!]
  }

  return initialStock
}

export function calculateTotalSalesForecast(
  weekData: WeekData,
  deliveryDate: Date
): number {
  if (!weekData.sales_forecast) return 0

  return Object.entries(weekData.sales_forecast)
    .filter(([date]) => new Date(date) <= deliveryDate)
    .reduce((total, [_, forecast]) => total + forecast, 0)
}

export function calculateOrderNeeds(
  order: Order,
  weekData: WeekData,
  product: Product,
  previousOrders: Order[],
  previousWeekOrders: Order[] = []
): number {
  const deliveryDate = new Date(order.delivery_date)
  const totalSalesForecast = calculateTotalSalesForecast(weekData, deliveryDate)
  const consumption = calculateConsumption(product, weekData, totalSalesForecast)
  const initialStock = calculateInitialStock(product, order, previousOrders, previousWeekOrders)
  
  // Calculate raw needs without rounding or unit conversion (allowing negative values)
  const rawNeeds = consumption - initialStock
  
  // Convert to packages and round to 2 decimal places only at the end
  return convertToPackages(rawNeeds, product)
}