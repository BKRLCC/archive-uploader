import React, { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import PopupOverlay from './PopupOverlay'
import './MapPickerModal.css'

interface MapPickerModalProps {
  isOpen: boolean
  initialLatitude: string
  initialLongitude: string
  onClose: () => void
  onConfirm: (latitude: string, longitude: string) => void
}

type Coordinates = {
  latitude: number
  longitude: number
}

const DEFAULT_CENTER: Coordinates = {
  latitude: -25.2744,
  longitude: 133.7751,
}

const DEFAULT_ZOOM = 4
const PIN_ZOOM = 12

function parseCoordinatePair(
  latitudeRaw: string,
  longitudeRaw: string,
): Coordinates | null {
  const latitude = Number(String(latitudeRaw ?? '').trim())
  const longitude = Number(String(longitudeRaw ?? '').trim())
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (latitude < -90 || latitude > 90) return null
  if (longitude < -180 || longitude > 180) return null
  return { latitude, longitude }
}

function formatCoordinate(value: number): string {
  return value.toFixed(6)
}

export default function MapPickerModal({
  isOpen,
  initialLatitude,
  initialLongitude,
  onClose,
  onConfirm,
}: MapPickerModalProps) {
  const [mapboxToken, setMapboxToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [latInput, setLatInput] = useState('')
  const [lonInput, setLonInput] = useState('')
  const [feedback, setFeedback] = useState<string>('')

  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)

  const parsedInitialCoordinates = useMemo(
    () => parseCoordinatePair(initialLatitude, initialLongitude),
    [initialLatitude, initialLongitude],
  )

  useEffect(() => {
    if (!isOpen) return

    setLatInput(String(initialLatitude ?? '').trim())
    setLonInput(String(initialLongitude ?? '').trim())
    setFeedback('')

    const loadToken = async () => {
      try {
        const token = await window.api.getMapboxToken()
        const cleaned = String(token ?? '').trim()
        if (!cleaned) {
          setMapboxToken(null)
          setTokenError(
            'Mapbox token is missing. Add MAPBOX_ACCESS_TOKEN (or VITE_MAPBOX_ACCESS_TOKEN) and restart the app.',
          )
          return
        }

        setMapboxToken(cleaned)
        setTokenError(null)
      } catch (error) {
        setMapboxToken(null)
        setTokenError(
          error instanceof Error
            ? error.message
            : 'Could not load the Mapbox token.',
        )
      }
    }

    void loadToken()
  }, [isOpen, initialLatitude, initialLongitude])

  useEffect(() => {
    if (!isOpen || !mapboxToken || !mapContainerRef.current) return

    const initialCenter = parsedInitialCoordinates ?? DEFAULT_CENTER

    mapboxgl.accessToken = mapboxToken

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: parsedInitialCoordinates ? PIN_ZOOM : DEFAULT_ZOOM,
    })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    mapRef.current = map

    const setMarker = (nextCoordinates: Coordinates) => {
      const nextLngLat: [number, number] = [
        nextCoordinates.longitude,
        nextCoordinates.latitude,
      ]

      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ draggable: true })
          .setLngLat(nextLngLat)
          .addTo(map)

        markerRef.current.on('dragend', () => {
          const marker = markerRef.current
          if (!marker) return
          const lngLat = marker.getLngLat()
          setLatInput(formatCoordinate(lngLat.lat))
          setLonInput(formatCoordinate(lngLat.lng))
        })
        return
      }

      markerRef.current.setLngLat(nextLngLat)
    }

    if (parsedInitialCoordinates) {
      setMarker(parsedInitialCoordinates)
    }

    map.on('click', (event) => {
      const nextCoordinates: Coordinates = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      }
      setMarker(nextCoordinates)
      setLatInput(formatCoordinate(nextCoordinates.latitude))
      setLonInput(formatCoordinate(nextCoordinates.longitude))
      setFeedback('')
    })

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [isOpen, mapboxToken, parsedInitialCoordinates])

  const centerOnManualCoordinates = () => {
    const parsed = parseCoordinatePair(latInput, lonInput)
    if (!parsed) {
      setFeedback('Enter valid latitude/longitude values before centering.')
      return
    }

    setFeedback('')
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [parsed.longitude, parsed.latitude],
        zoom: PIN_ZOOM,
      })
    }

    if (markerRef.current) {
      markerRef.current.setLngLat([parsed.longitude, parsed.latitude])
    }
  }

  const handleConfirm = () => {
    const parsed = parseCoordinatePair(latInput, lonInput)
    if (!parsed) {
      setFeedback('Latitude must be -90..90 and longitude must be -180..180.')
      return
    }

    onConfirm(formatCoordinate(parsed.latitude), formatCoordinate(parsed.longitude))
  }

  return (
    <PopupOverlay isOpen={isOpen} onClose={onClose}>
      <div className="map-picker-modal">
        <h2 className="map-picker-title">Pick coordinates</h2>
        {tokenError ? (
          <p className="map-picker-error">{tokenError}</p>
        ) : (
          <div className="map-picker-map" ref={mapContainerRef} />
        )}

        <div className="map-picker-manual-grid">
          <label>
            Latitude
            <input
              type="text"
              value={latInput}
              onChange={(event) => {
                setLatInput(event.target.value)
              }}
            />
          </label>
          <label>
            Longitude
            <input
              type="text"
              value={lonInput}
              onChange={(event) => {
                setLonInput(event.target.value)
              }}
            />
          </label>
        </div>

        <div className="map-picker-actions">
          <button type="button" onClick={centerOnManualCoordinates}>
            Center on typed coordinates
          </button>
          <button type="button" onClick={handleConfirm}>
            Use coordinates
          </button>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
        </div>

        {feedback && <p className="map-picker-feedback">{feedback}</p>}
      </div>
    </PopupOverlay>
  )
}
