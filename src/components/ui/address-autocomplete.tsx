'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import Script from 'next/script'

interface AddressAutocompleteProps {
  onPlaceSelected?: (address: string) => void
  placeholder?: string
  className?: string
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  function AddressAutocomplete({ onPlaceSelected, placeholder = '123 Oak St, Springfield, IL', className }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [scriptLoaded, setScriptLoaded] = useState(false)
    useImperativeHandle(ref, () => inputRef.current!)

    useEffect(() => {
      if (!scriptLoaded || !inputRef.current) return
      if (!(window as any).google?.maps?.places) return
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
    }, [scriptLoaded])

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    return (
      <>
        {apiKey && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`}
            strategy="afterInteractive"
            onLoad={() => setScriptLoaded(true)}
          />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className={
            className ??
            'flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }
          autoComplete="off"
        />
      </>
    )
  }
)
