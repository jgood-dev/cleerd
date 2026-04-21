'use client'

import { useEffect, useRef, useState } from 'react'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

declare global {
  interface Window {
    google: any
    initGooglePlaces: () => void
  }
}

let scriptLoaded = false
let scriptLoading = false
const callbacks: (() => void)[] = []

function loadGoogleScript(apiKey: string, onLoad: () => void) {
  if (scriptLoaded) { onLoad(); return }
  callbacks.push(onLoad)
  if (scriptLoading) return
  scriptLoading = true
  window.initGooglePlaces = () => {
    scriptLoaded = true
    callbacks.forEach(cb => cb())
    callbacks.length = 0
  }
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGooglePlaces`
  script.async = true
  script.defer = true
  document.head.appendChild(script)
}

export function AddressAutocomplete({ value, onChange, placeholder = '123 Oak St, Springfield, IL', className }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) { setReady(true); return }
    loadGoogleScript(apiKey, () => setReady(true))
  }, [])

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return
    if (!window.google?.maps?.places) return
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    })
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace()
      if (place?.formatted_address) onChange(place.formatted_address)
    })
  }, [ready])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={className ?? 'flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'}
      autoComplete="off"
    />
  )
}
