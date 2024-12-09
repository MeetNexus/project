import { Order, Product, Category } from '../types/interfaces'
import { EyeIcon, EyeOffIcon } from '@heroicons/react/outline'
import { Card, CardContent, CardHeader } from './ui/Card'
import { Table, TableHeader, TableHead, TableRow } from './ui/Table'
import { Badge } from './ui/Badge'
import CategoryGroup from './CategoryGroup'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import SortableTableHead from './ui/SortableTableHead'
import { useMemo } from 'react'
import { useSorting } from '../hooks/useSorting'
import { calculateOrderNeeds } from '../utils/calculations'
import { useEffect, useState } from 'react'
import { getPreviousWeekOrders } from '../services/orderService'

interface OrderCardProps {
  order: Order
  products: Product[]
  categories: Category[]
  hiddenProducts: number[]
  weekData: WeekData
  previousOrders: Order[]
  onStockChange: (orderId: number, productId: number, value: number) => void
  onOrderedQuantityChange: (orderId: number, productId: number, value: number) => void
  onToggleProductVisibility: (productId: number) => void
}

export default function OrderCard({
  order,
  products,
  categories,
  hiddenProducts,
  weekData,
  previousOrders,
  onStockChange,
  onOrderedQuantityChange,
  onToggleProductVisibility,
}: OrderCardProps) {
  const [previousWeekOrders, setPreviousWeekOrders] = useState<Order[]>([])

  useEffect(() => {
    const fetchPreviousWeekOrders = async () => {
      const orders = await getPreviousWeekOrders(weekData.year, weekData.week_number)
      setPreviousWeekOrders(orders)
    }
    fetchPreviousWeekOrders()
  }, [weekData.year, weekData.week_number])

  const filteredProducts = useMemo(() => 
    products.filter(product => !hiddenProducts.includes(product.id!) && !product.is_hidden),
    [products, hiddenProducts]
  )

  const productsWithNeeds = useMemo(() => 
    filteredProducts.map(product => {
      const need = calculateOrderNeeds(
        order,
        weekData,
        product,
        previousOrders,
        previousWeekOrders
      )
      return {
        ...product,
        need
      }
    }),
    [filteredProducts, order, weekData, previousOrders, previousWeekOrders, order.real_stock]
  )

  const deliveryDate = new Date(order.delivery_date)
  const isToday = new Date().toDateString() === deliveryDate.toDateString()
  const isPast = deliveryDate < new Date()

  return (
    <div className="space-y-4">
      <Card variant="colored" hover={true}>
        <CardHeader className="border-b border-bk-yellow/20 bg-bk-red">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-flame font-bold text-bk-brown">
              Commande {order.order_number}
            </h2>
            <Badge variant={isToday ? 'default' : isPast ? 'secondary' : 'outline'}>
              {format(deliveryDate, 'EEEE d MMMM', { locale: fr })}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {categories.map((category) => {
        const categoryProducts = filteredProducts.filter(p => p.category_id === category.id)
        if (categoryProducts.length === 0) return null

        const categoryProductsWithNeeds = productsWithNeeds.filter(p => p.category_id === category.id)

        const { sortedItems: sortedProducts, sortConfig, requestSort } = useSorting(
          categoryProductsWithNeeds,
          { key: 'nom_produit', direction: 'asc' }
        )

        return (
          <Card key={category.id} variant="default" className="overflow-hidden">
            <CardHeader className="bg-bk-yellow/5 py-3">
              <h3 className="text-lg font-flame font-medium text-bk-brown">
                {category.name}
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      label="Produit"
                      sortKey="nom_produit"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="w-[40%] text-xs lg:text-sm"
                    />
                    <SortableTableHead
                      label="Stock"
                      sortKey="stock"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="w-[20%] text-xs lg:text-sm text-center"
                    />
                    <SortableTableHead
                      label="Besoin"
                      sortKey="need"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="w-[20%] text-xs lg:text-sm text-center"
                    />
                    <SortableTableHead
                      label="Quantité"
                      sortKey="ordered"
                      sortConfig={sortConfig}
                      onSort={requestSort}
                      className="w-[20%] text-xs lg:text-sm text-center"
                    />
                    <TableHead className="w-12 p-0"></TableHead>
                  </TableRow>
                </TableHeader>
                <CategoryGroup
                  category={category}
                  products={sortedProducts || []}
                  hiddenProducts={hiddenProducts}
                  realStock={order.real_stock || {}}
                  orderedQuantities={order.ordered_quantities || {}}
                  onStockChange={(productId, value) => 
                    onStockChange(order.id!, productId, value)
                  }
                  onOrderedQuantityChange={(productId, value) =>
                    onOrderedQuantityChange(order.id!, productId, value)
                  }
                  onToggleProductVisibility={onToggleProductVisibility}
                />
              </Table>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}