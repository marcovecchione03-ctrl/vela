"use client"

import * as React from "react"
import { Input, InputProps } from "@/components/ui/input"

let isScriptLoaded = false
let isScriptLoading = false
let googleMapsPromise: Promise<void> | null = null

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve()
  if (isScriptLoaded) return Promise.resolve()
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    isScriptLoading = true
    const script = document.createElement("script")
    // Use the dynamic library import architecture recommended by Google
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`
    script.async = true
    script.defer = true
    script.onload = () => {
      isScriptLoaded = true
      isScriptLoading = false
      resolve()
    }
    script.onerror = (err) => {
      isScriptLoading = false
      reject(err)
    }
    document.head.appendChild(script)
  })
  return googleMapsPromise
}

export interface AddressAutocompleteProps extends Omit<InputProps, "onChange"> {
  onChange?: (value: string) => void
}

export function AddressAutocomplete({ defaultValue, value, onChange, name, required, className, ...props }: AddressAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  
  const [inputValue, setInputValue] = React.useState((value || defaultValue || "") as string)
  const [predictions, setPredictions] = React.useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isReady, setIsReady] = React.useState(false)
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  
  // Use the new AutocompleteSessionToken architecture
  const sessionToken = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null)
  const debounceTimeout = React.useRef<NodeJS.Timeout | null>(null)
  
  const wrapperRef = React.useRef<HTMLDivElement>(null)

  const resetSessionToken = () => {
    if (window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken()
    }
  }

  React.useEffect(() => {
    if (!apiKey) return

    loadGoogleMapsScript(apiKey)
      .then(async () => {
        // Import the "places" library asynchronously per Places API (New) specs
        await window.google.maps.importLibrary("places")
        resetSessionToken()
        setIsReady(true)
      })
      .catch((err) => {
        console.error("Failed to load Google Maps API", err)
      })
  }, [apiKey])

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchPredictions = React.useCallback(async (input: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current)
    }
    
    debounceTimeout.current = setTimeout(async () => {
      if (!isReady || !window.google?.maps?.places?.AutocompleteSuggestion || input.trim().length < 3) {
        setPredictions([])
        setIsOpen(false)
        return
      }

      try {
        const request: google.maps.places.AutocompleteRequest = {
          input,
          sessionToken: sessionToken.current || undefined,
          includedPrimaryTypes: [
            "street_address",
            "premise",
            "subpremise",
            "route",
            "intersection"
          ]
        }
        
        const { suggestions } = await window.google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        
        if (suggestions && suggestions.length > 0) {
          setPredictions(suggestions)
          setIsOpen(true)
          setSelectedIndex(-1)
        } else {
          setPredictions([])
          setIsOpen(false)
        }
      } catch (err) {
        console.error("Error fetching places predictions", err)
        setPredictions([])
        setIsOpen(false)
      }
    }, 300)
  }, [isReady])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    if (onChange) onChange(val)

    if (isReady && apiKey) {
      fetchPredictions(val)
    }
  }

  const handleSelect = async (prediction: google.maps.places.AutocompleteSuggestion) => {
    setPredictions([])
    setIsOpen(false)

    let addressString = prediction.placePrediction?.text?.text || ""

    try {
      if (prediction.placePrediction) {
        const place = (prediction.placePrediction as any).toPlace()
        await place.fetchFields({ fields: ["formattedAddress"] })
        if (place.formattedAddress) {
          addressString = place.formattedAddress
        }
      }
    } catch (err) {
      console.error("Error fetching place details", err)
    }

    setInputValue(addressString)
    if (onChange) onChange(addressString)
    resetSessionToken() // Reset session after selection flow completes
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
    } else if (e.key === "Enter") {
      if (selectedIndex >= 0 && selectedIndex < predictions.length) {
        e.preventDefault()
        handleSelect(predictions[selectedIndex])
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
      setSelectedIndex(-1)
      resetSessionToken() // Reset session after cancellation
    }
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Input
        name={name}
        required={required}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={className}
        autoComplete="off"
        {...props}
      />
      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {predictions.map((p, index) => {
              const mainText = p.placePrediction?.mainText?.text || p.placePrediction?.text?.text
              const secondaryText = p.placePrediction?.secondaryText?.text
              return (
                <li
                  key={p.placePrediction?.placeId || index}
                  className={`px-4 py-2 cursor-pointer text-sm transition-colors ${
                    index === selectedIndex ? "bg-neutral-100" : "hover:bg-neutral-50"
                  }`}
                  onClick={() => handleSelect(p)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="font-medium text-neutral-900">
                    {mainText}
                  </div>
                  {secondaryText && (
                    <div className="text-neutral-500 text-xs mt-0.5">
                      {secondaryText}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
