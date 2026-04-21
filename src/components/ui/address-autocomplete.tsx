'use client'

import { useEffect, useRef } from 'react'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

declare global {
  interface Window {
    google: any
    _initGooglePlaces: () => void
  }
}

let scriptLoaded = false
let scriptLoading = false
const pendingCallbacks: (() => void)[] = []

function loadGoogleScript(apiKey: string, onReady: () => void) {
  if (scriptLoaded) { onReady(); return }
  pendingCallbacks.push(onReady)
  if (scriptLoading) return
  scriptLoading = true
  window._initGooglePlaces = () => {
    scriptLoaded = true
    pendingCallbacks.forEach(cb => cb())
    pendingCallbacks.length = 0
  }
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=_initGooglePlaces`
  script.async = true
  script.defer = true
  document.head.appendChild(script)
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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey || !inputRef.current) return

    loadGoogleScript(apiKey, () => {
      if (autocompleteRef.current || !inputRef.current) return
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      })
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace()
        if (place?.formatted_address) {
          onChange(place.formatted_address)
        }
      })
    })
  }, [])

  // Only sync when parent clears the value (e.g. after form submit)
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
