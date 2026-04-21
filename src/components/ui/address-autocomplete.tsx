'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'

interface AddressAutocompleteProps {
  placeholder?: string
  className?: string
}

export const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  function AddressAutocomplete({ placeholder = '123 Oak St, Springfield, IL', className }, ref) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [suggestions, setSuggestions] = useState<string[]>([])
    const [open, setOpen] = useState(false)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const wrapperRef = useRef<HTMLDivElement>(null)

    useImperativeHandle(ref, () => inputRef.current!)

    // Close on outside click
    useEffect(() => {
      function onClickOutside(e: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', onClickOutside)
      return () => document.removeEventListener('mousedown', onClickOutside)
    }, [])

    function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
      const val = e.target.value
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!val || val.length < 2) { setSuggestions([]); setOpen(false); return }
      debounceRef.current = setTimeout(async () => {
        const res = await fetch(`/api/places-autocomplete?input=${encodeURIComponent(val)}`)
        const data = await res.json()
        if (data.error) return
        const preds: string[] = (data.predictions ?? []).map((p: any) => p.description)
        setSuggestions(preds)
        setOpen(preds.length > 0)
      }, 250)
    }

    function selectSuggestion(desc: string) {
      if (inputRef.current) inputRef.current.value = desc
      setSuggestions([])
      setOpen(false)
    }

    return (
      <div ref={wrapperRef} className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          className={
            className ??
            'flex h-10 w-full rounded-lg border border-white/20 bg-[#1e2433] text-gray-200 px-3 py-2 text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }
          autoComplete="off"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-[#1e2433] shadow-xl overflow-hidden">
            {suggestions.map((s, i) => (
              <li
                key={i}
                onMouseDown={() => selectSuggestion(s)}
                className="px-3 py-2.5 text-sm text-gray-200 cursor-pointer hover:bg-white/10 border-b border-white/5 last:border-0"
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }
)
