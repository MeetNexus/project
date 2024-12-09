import { Order, WeekData, Product } from '../types/interfaces'

export function calculateNeeds(order: Order, weekData: WeekData | null, products: Product[]) {
  if (!weekData?.consumption_data || !weekData?.sales_forecast) {
    return {}
  }

  const needs: { [key: number]: number } = {}
  const deliveryDate = new Date(order.delivery_date)

  products.forEach((product) => {
    // Gérer le cas où il n'y a pas de consommation pour le produit
    const consumption = weekData.consumption_data?.[product.reference_produit] ?? 0
    let totalSales = 0

    // Calculate total sales up to delivery date
    Object.entries(weekData.sales_forecast).forEach(([date, forecast]) => {
      if (new Date(date) <= deliveryDate) {
        totalSales += forecast
      }
    })

    // Calculate need based on consumption per 1000€ of sales
    const need = (consumption / 1000) * totalSales
    needs[product.id!] = Math.max(0, need - (order.real_stock?.[product.id!] || 0))
  })

  return needs
}

export function filterProducts(
  products: Product[],
  searchTerm: string,
  hiddenProducts: number[]
): Product[] {
  return products.filter(
    (product) =>
      !hiddenProducts.includes(product.id!) &&
      (product.nom_produit.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.reference_produit.toLowerCase().includes(searchTerm.toLowerCase()))
  )
}