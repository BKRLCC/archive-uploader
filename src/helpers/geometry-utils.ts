export type ParsedCoordinates = {
  latitude: number
  longitude: number
}

function parseCoordinate(rawValue: string): number {
  const trimmed = String(rawValue ?? '').trim()
  if (!trimmed) {
    throw new Error('Latitude and longitude are required')
  }

  const value = Number(trimmed)
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid coordinate value: ${trimmed}`)
  }

  return value
}

export function parseCoordinates(
  latitudeRaw: string,
  longitudeRaw: string,
): ParsedCoordinates {
  const latitude = parseCoordinate(latitudeRaw)
  const longitude = parseCoordinate(longitudeRaw)

  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90')
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180')
  }

  return {
    latitude,
    longitude,
  }
}

export function coordinatesToWKTPoint(
  latitude: number,
  longitude: number,
): string {
  return `POINT(${longitude} ${latitude})`
}

export function deriveWKTFromRawCoordinates(
  latitudeRaw: string,
  longitudeRaw: string,
): string {
  const { latitude, longitude } = parseCoordinates(latitudeRaw, longitudeRaw)
  return coordinatesToWKTPoint(latitude, longitude)
}
