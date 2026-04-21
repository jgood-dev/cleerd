'use client'

import { Input } from './input'

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10)
  if (digits.length < 4) return digits
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function PhoneInput({ value, onChange, placeholder = '(555) 123-4567', className }: PhoneInputProps) {
  return (
    <Input
      type="tel"
      value={value}
      placeholder={placeholder}
      className={className}
      onChange={e => onChange(formatPhone(e.target.value))}
    />
  )
}
