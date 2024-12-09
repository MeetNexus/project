import React, { useState, useEffect } from 'react'
import { useDebounce } from '../../hooks/useDebounce'
import Input from './Input'
import { cn } from '../../utils/cn'
import { formatNumber } from '../../utils/numberUtils'

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: number | string
  onChange: (value: number) => void
  className?: string
  delay?: number
  min?: number
  max?: number
  allowDecimals?: boolean
  maxDecimals?: number
  isValid?: boolean
}

export default function DebouncedInput({
  value: initialValue,
  onChange,
  className,
  delay = 500,
  min,
  max,
  allowDecimals = true,
  maxDecimals = 3,
  isValid = true,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = useState<string>(
    initialValue !== undefined && initialValue !== '' ? String(initialValue) : ''
  )
  const debouncedValue = useDebounce(value, delay)

  // Format initial value with up to 3 decimal places
  useEffect(() => {
    setValue(
      initialValue !== undefined && initialValue !== '' ? String(initialValue) : ''
    )
  }, [initialValue])

  useEffect(() => {
    const numValue = parseFloat(debouncedValue)
    if (!isNaN(numValue) && debouncedValue !== '') {
      const formattedInitial = initialValue !== undefined ? parseFloat(formatNumber(initialValue, 3)) : undefined
      const formattedNew = parseFloat(formatNumber(numValue, 3))
      
      // Only trigger onChange if the formatted values are different
      if (formattedInitial === undefined || formattedNew !== formattedInitial) {
        // Clamp value between min and max if provided
        const clampedValue = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, numValue))
        onChange(clampedValue)
      }
    }
  }, [debouncedValue, onChange, initialValue, min, max, value])

  return (
    <Input
      {...props}
      type="number"
      value={value}
      onChange={(e) => {
        const newValue = e.target.value
        // Validate based on whether decimals are allowed
        const validationRegex = allowDecimals 
          ? new RegExp(`^-?\\d*\\.?\\d{0,${maxDecimals}}$`)
          : /^-?\d*$/
        if (newValue === '' || validationRegex.test(newValue)) {
          setValue(newValue)
        }
      }}
      step={allowDecimals ? Math.pow(10, -maxDecimals) : 1}
      className={cn(
        'transition-colors duration-200',
        !isValid && 'border-red-300 focus:border-red-400 focus:ring-red-200',
        className
      )}
      min={min}
      max={max}
    />
  )
}