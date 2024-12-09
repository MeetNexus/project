import React, { useState, useCallback } from 'react'
import { useProducts, useWeekData, useCategories } from '../hooks/useSupabase'
import { useOrders } from '../hooks/useOrders'
import { getCurrentWeekNumber, getDatesOfWeek } from '../utils/dateUtils'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import WeekSelector from '../components/WeekSelector'
import SalesForecastTable from '../components/SalesForecastTable'
import OrderCarousel from '../components/OrderCarousel'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { filterProducts } from '../utils/orderUtils'
import { importConsumptionDataFromExcel } from '../utils/excelParser'
import { toast } from 'react-hot-toast'
import { upsertWeekData } from '../services/weekService'
import { getDeliveryDates } from '../utils/dateUtils'
import { createInitialOrders } from '../services/orderService'
import { toggleProductVisibility } from '../services/productService'
import { calculateOrderNeeds } from '../utils/calculations'
import { updateOrderNeeds } from '../services/orderService'

export default function OrdersPage() {
  // State for date selection
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1)
  const [currentWeek, setCurrentWeek] = useState(getCurrentWeekNumber())
  
  // State for file upload and search
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hiddenProducts, setHiddenProducts] = useState<number[]>([])

  // Fetch data using custom hooks
  const { data: categories } = useCategories()
  const { 
    data: products, 
    isLoading: productsLoading, 
    refetch: refetchProducts 
  } = useProducts()
  
  const { 
    data: weekData, 
    isLoading: weekDataLoading, 
    refetch: refetchWeekData 
  } = useWeekData(currentYear, currentWeek)
  
  const { 
    orders, 
    updateOrderStock, 
    updateOrderQuantity,
    isLoading: ordersLoading,
    refetch: refetchOrders
  } = useOrders(weekData?.id)

  // Effect to create initial orders if none exist
  React.useEffect(() => {
    const initializeOrders = async () => {
      if (weekData?.id && (!orders || orders.length === 0)) {
        const deliveryDates = getDeliveryDates(currentYear, currentWeek)
        await createInitialOrders(weekData.id, deliveryDates)
        refetchOrders()
      }
    }

    initializeOrders()
  }, [weekData?.id, orders, currentYear, currentWeek, refetchOrders])

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  // Handle sales forecast change
  const handleSalesForecastChange = useCallback(async (date: string, value: number) => {
    if (!weekData) {
      // Create initial week data if it doesn't exist
      const initialWeekData = {
        year: currentYear,
        week_number: currentWeek,
        sales_forecast: { [date]: value },
        consumption_data: {}
      }
      await upsertWeekData(initialWeekData)
      refetchWeekData()
      return
    }

    try {
      const updatedWeekData = {
        ...weekData,
        sales_forecast: {
          ...weekData.sales_forecast,
          [date]: value
        }
      }
      await upsertWeekData(updatedWeekData)
      refetchWeekData()
    } catch (error) {
      console.error('Error updating sales forecast:', error)
      throw error
    }
  }, [weekData, currentYear, currentWeek, refetchWeekData])

  // Handle import
  const handleImport = async () => {
    if (!file) {
      toast.error('Veuillez sélectionner un fichier Excel')
      return
    }

    if (!weekData) {
      // Create initial week data if it doesn't exist
      const initialWeekData = {
        year: currentYear,
        week_number: currentWeek,
        sales_forecast: {},
        consumption_data: {}
      }
      await upsertWeekData(initialWeekData)
      refetchWeekData()
    }

    setIsImporting(true)
    try {
      await importConsumptionDataFromExcel(file, weekData!)
      toast.success('Import réussi')
      // Refresh data
      await Promise.all([
        refetchProducts(),
        refetchWeekData(),
        refetchOrders()
      ])
      setFile(null)
    } catch (error) {
      console.error("Erreur lors de l'importation:", error)
      toast.error("Erreur lors de l'importation du fichier")
    } finally {
      setIsImporting(false)
    }
  }

  // Handle product visibility toggle
  const handleToggleProductVisibility = async (productId: number) => {
    try {
      const product = products?.find(p => p.id === productId)
      if (!product) return

      // Update visibility in database
      await toggleProductVisibility(productId, !product.is_hidden)
      
      // Update local state
      setHiddenProducts(prev =>
        prev.includes(productId)
          ? prev.filter(id => id !== productId)
          : [...prev, productId]
      )

      // Refresh products
      refetchProducts()

      toast.success(
        product.is_hidden 
          ? 'Produit visible' 
          : 'Produit masqué'
      )
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la visibilité:', error)
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleStockChange = async (orderId: number, productId: number, value: number) => {
    try {
      await updateOrderStock(orderId, productId, value)
    } catch (error) {
      console.error('Error updating stock:', error)
      toast.error('Erreur lors de la mise à jour du stock')
    }
  }

  // Loading state
  if (productsLoading || weekDataLoading || ordersLoading) {
    return (
      <div className="p-8 max-w-[1920px] mx-auto">
        <Skeleton className="h-20 mb-6" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="p-8 max-w-[1920px] mx-auto">
      <Card variant="colored" className="mb-6">
        <CardHeader>
          <h1 className="text-2xl font-bold text-bk-brown">Gestion des Commandes</h1>
        </CardHeader>
      </Card>

      <WeekSelector
        currentYear={currentYear}
        currentMonth={currentMonth}
        currentWeek={currentWeek}
        onYearChange={setCurrentYear}
        onMonthChange={setCurrentMonth}
        onWeekChange={setCurrentWeek}
      />

      <div className="mb-6">
        <SalesForecastTable
          weekData={weekData}
          weekDates={getDatesOfWeek(currentYear, currentWeek)}
          onSalesForecastChange={handleSalesForecastChange}
        />
      </div>

      <Card variant="colored" className="mb-6">
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                label="Importer les données de consommation"
              />
            </div>
            <Button
              onClick={handleImport}
              disabled={!file || isImporting}
              className="self-end"
            >
              {isImporting ? 'Importation...' : 'Importer'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card variant="colored" className="mb-6">
        <CardContent>
          <Input
            type="text"
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {products && (
        <OrderCarousel
          orders={orders || []}
          categories={categories || []}
          products={filterProducts(products, searchTerm, hiddenProducts)}
          hiddenProducts={hiddenProducts}
          weekData={weekData!}
          onStockChange={handleStockChange}
          onOrderedQuantityChange={updateOrderQuantity}
          onToggleProductVisibility={handleToggleProductVisibility}
        />
      )}
    </div>
  )
}