/**
 * Multi-campus configuration for tutor attendance
 * Defines authorized campus locations with GPS coordinates and verification radius
 */

export interface CampusLocation {
  id: number
  name: string
  latitude: number
  longitude: number
  radius: number // meters
  timezone: string
}

// Campus locations with 100m verification radius
export const CAMPUS_LOCATIONS: CampusLocation[] = [
  {
    id: 1,
    name: "Centre For Professional Courses",
    latitude: 23.03879697655531,
    longitude: 72.5454418137245,
    radius: 100, // meters
    timezone: "Asia/Kolkata",
  },
  {
    id: 2,
    name: "School of Design",
    latitude: 23.03952248793422,
    longitude: 72.54354638344735,
    radius: 100, // meters
    timezone: "Asia/Kolkata",
  },
  {
    id: 3,
    name: "Chemistry Dep",
    latitude: 23.03885602091884,
    longitude: 72.54334190855627,
    radius: 100, // meters
    timezone: "Asia/Kolkata",
  },
  {
    id: 4,
    name: "Home",
    latitude: 23.006211356262977,
    longitude: 72.58883124876891,
    radius: 500, // meters
    timezone: "Asia/Kolkata",
  },
]

// Attendance limits
export const ATTENDANCE_LIMITS = {
  MAX_PER_DAY: 2, // Maximum marks per tutor per day
  MAX_PER_DEVICE_PER_DAY: 1, // Only 1 mark per device per day
  MIN_INTERVAL_MINUTES: 5, // Minimum 5 minutes between marks
  LOCATION_ACCURACY_THRESHOLD: 50, // meters - acceptable GPS accuracy
}

// Time-based rules
export const ATTENDANCE_TIME_RULES = {
  ENTRY_CUTOFF: "09:00", // Latest time to mark entry
  EXIT_CUTOFF: "18:00", // Latest time to mark exit
  TIMEZONE: "Asia/Kolkata",
}

// API rate limiting
export const RATE_LIMITS = {
  MARK_ATTENDANCE: {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
  },
  GET_STATUS: {
    maxRequests: 20,
    windowMs: 60000, // 1 minute
  },
  VERIFY_LOCATION: {
    maxRequests: 30,
    windowMs: 60000, // 1 minute
  },
}

/**
 * Find campus by coordinates using Haversine distance
 * Returns the closest campus if within acceptable radius
 */
export function findNearestCampus(latitude: number, longitude: number) {
  const distances = CAMPUS_LOCATIONS.map((campus) => {
    const distance = calculateDistance(latitude, longitude, campus.latitude, campus.longitude)
    return {
      ...campus,
      distance,
      isInside: distance <= campus.radius,
    }
  })

  distances.sort((a, b) => a.distance - b.distance)
  return distances
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth radius in meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Check if location is within any authorized campus
 */
export function isInsideAuthorizedArea(latitude: number, longitude: number): boolean {
  const nearest = findNearestCampus(latitude, longitude)
  return nearest.length > 0 && nearest[0].isInside
}

/**
 * Get campus name by coordinates
 */
export function getCampusName(latitude: number, longitude: number): string | null {
  const nearest = findNearestCampus(latitude, longitude)
  if (nearest.length > 0 && nearest[0].isInside) {
    return nearest[0].name
  }
  return null
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }
  return `${(meters / 1000).toFixed(2)}km`
}
