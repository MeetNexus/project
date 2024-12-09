import { Category, Product } from '../types/interfaces'
import { Table, TableBody, TableRow, TableCell } from './ui/Table'
import { EyeIcon, EyeOffIcon } from '@heroicons/react/outline'
import DebouncedInput from './ui/DebouncedInput'

import { convertToPackages } from '../utils/calculations'

interface CategoryGroupProps {
  category: Category
  products: Product[]
  hiddenProducts: number[]
  realStock: { [key: number]: number }
  orderedQuantities: { [key: number]: number }
  onStockChange: (productId: number, value: number) => void
  onOrderedQuantityChange: (productId: number, value: number) => void
  onToggleProductVisibility: (productId: number) => void
}

export default function CategoryGroup({
  category,
  products,
  hiddenProducts,
  realStock,
  orderedQuantities,
  onStockChange,
  onOrderedQuantityChange,
  onToggleProductVisibility,
}: CategoryGroupProps) {
  return (
    <TableBody>
      {products.map((product) => {
        const need = product.need !== undefined ? product.need : 0
        // Convert stock from units to packages for display
        const stockInUnits = realStock[product.id!] || 0
        const stockInPackages = stockInUnits ? convertToPackages(stockInUnits, product) : ''
        const ordered = orderedQuantities[product.id!] || ''
        const needsMet = need <= 0 || ordered >= need

        return (
          <TableRow key={product.id} className="h-14">
            <TableCell className="py-2 px-2">
              <div className="flex flex-col">
                <span className="text-xs lg:text-sm font-medium text-bk-brown truncate">
                  {product.nom_produit}
                </span>
                <span className="text-[10px] lg:text-xs text-gray-500">
                  Ref: {product.reference_produit}
                </span>
              </div>
            </TableCell>
            <TableCell className="py-2 px-1 text-center">
              <DebouncedInput
                value={stockInPackages}
                onChange={(value) => onStockChange(product.id!, value)}
                className="w-full h-8 text-xs lg:text-sm px-1"
                min={0}
                allowDecimals={true}
                maxDecimals={3}
              />
            </TableCell>
            <TableCell className="py-2 px-1 text-center">
              <span className={`text-xs lg:text-sm font-medium ${
                need <= 0 ? 'text-blue-600' : needsMet ? 'text-green-600' : 'text-amber-600'
              }`}>
                {need !== undefined ? need.toFixed(2) : '0.00'}
              </span>
            </TableCell>
            <TableCell className="py-2 px-1 text-center">
              <DebouncedInput
                value={ordered}
                onChange={(value) => onOrderedQuantityChange(product.id!, value)}
                className={`w-full h-8 text-xs lg:text-sm px-1 ${
                  needsMet ? 'border-green-300' : 'border-amber-300'
                }`}
                min={0}
                allowDecimals={false}
                isValid={needsMet}
              />
            </TableCell>
            <TableCell className="py-2 px-1 w-8">
              <button
                onClick={() => onToggleProductVisibility(product.id!)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                {hiddenProducts.includes(product.id!) ? (
                  <EyeOffIcon className="h-3 w-3 lg:h-4 lg:w-4 text-gray-400" />
                ) : (
                  <EyeIcon className="h-3 w-3 lg:h-4 lg:w-4 text-gray-400" />
                )}
              </button>
            </TableCell>
          </TableRow>
        )
      })}
    </TableBody>
  )
}