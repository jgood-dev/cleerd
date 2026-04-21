'use client'

import { useEffect, useRef } from 'react'
import { Loader } from '@googlemaps/js-api-loader'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

let loaderPromise: Promise<void> | null = null

function getLoader() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null
  if (!loaderPromise) {
    const loader = new Loader({ apiKey, libraries: ['places'] })
    loaderPromise = loader.load().then(() => {})
  }
  return loaderPromise
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = '123 Oak St, Springfield, IL',
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)

  useEffect(() => {
    const promise = getLoader()
    if (!promise) return
    promise.then(() => {
      if (autocompleteRef.current || !inputRef.current) return
      const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      })
      autocompleteRef.current = ac
      ac.addListener('place_changed', () => {
        const place = ac.getPlace()
        if (place?.formatted_address) onChange(place.formatted_address)
      })
    })
  }, [])

  // Only sync DOM when parent clears the field (e.g. after form submit)
  useEffect(() => {
    if (inputRef.current && value === '') {
      inputRef.current.value = ''
    }
  }, [value])

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={
        className ??
        'flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
      }
      autoComplete="off"
    />
  )
}
