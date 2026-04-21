'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

interface AddressAutocompleteProps {
  defaultValue?: string
  onPlaceSelected?: (address: string) => void
  placeholder?: string
  className?: string
}

let placesPromise: Promise<any> | null = null

function loadPlaces() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) return null
  if (!placesPromise) {
    setOptions({ key: apiKey, libraries: ['places'] })
    placesPromise = importLibrary('places')
  }
  return placesPromise
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  function AddressAutocomplete({ defaultValue = '', onPlaceSelected, placeholder = '123 Oak St, Springfield, IL', className }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(ref, () => inputRef.current!)

    useEffect(() => {
      const promise = loadPlaces()
      if (!promise || !inputRef.current) return
      promise.then(() => {
        if (!inputRef.current) return
        const ac = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
        })
        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (place?.formatted_address && onPlaceSelected) {
            onPlaceSelected(place.formatted_address)
          }
        })
      })
    }, [])

    return (
      <input
        ref={inputRef}
        type="text"
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={
          className ??
          'flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
        }
        autoComplete="off"
      />
    )
  }
)
