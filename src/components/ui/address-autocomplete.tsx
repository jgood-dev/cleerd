'use client'

import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react'
import Script from 'next/script'

interface AddressAutocompleteProps {
  onPlaceSelected?: (address: string) => void
  placeholder?: string
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  function AddressAutocomplete({ onPlaceSelected, placeholder = '123 Oak St, Springfield, IL' }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const hiddenRef = useRef<HTMLInputElement>(null)
    const [scriptLoaded, setScriptLoaded] = useState(false)

    // Expose hidden input value to parent via ref
    useImperativeHandle(ref, () => hiddenRef.current!)

    useEffect(() => {
      if (!scriptLoaded || !containerRef.current) return

      async function init() {
        const { PlaceAutocompleteElement } = await (window as any).google.maps.importLibrary('places') as any
        if (!containerRef.current) return
        containerRef.current.innerHTML = ''

        const el = new PlaceAutocompleteElement({
          types: ['address'],
          componentRestrictions: { country: 'us' },
        })
        el.setAttribute('placeholder', placeholder)
        containerRef.current.appendChild(el)

        // When user selects a suggestion
        el.addEventListener('gmp-placeselect', async ({ place }: any) => {
          await place.fetchFields({ fields: ['formattedAddress'] })
          const addr = place.formattedAddress ?? ''
          if (hiddenRef.current) hiddenRef.current.value = addr
          if (onPlaceSelected) onPlaceSelected(addr)
        })

        // Sync manual typing so validation works even without selecting
        el.addEventListener('input', (e: any) => {
          if (hiddenRef.current) hiddenRef.current.value = e.target?.value ?? ''
        })
      }

      init()
    }, [scriptLoaded])

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    return (
      <>
        {apiKey && (
          <Script
            src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async`}
            strategy="afterInteractive"
            onLoad={() => setScriptLoaded(true)}
          />
        )}
        <div ref={containerRef} className="gmp-autocomplete-wrapper w-full" />
        <input ref={hiddenRef} type="hidden" />
      </>
    )
  }
)
