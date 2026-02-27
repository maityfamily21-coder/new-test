"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { MapPin, MapPinOff, Loader2 } from "lucide-react"

interface LocationData {
  isInside: boolean
  distance: number
  campusName: string
}

export function LocationStatusBadge({ tutorId }: { tutorId: number }) {
  const [location, setLocation] = useState<LocationData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get initial position
    if (!navigator.geolocation) return

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          try {
            const response = await fetch("/api/tutor/attendance/verify-location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tutorId, latitude, longitude }),
            })

            const data = await response.json()
            if (data.success) {
              setLocation({
                isInside: data.locationStatus.isInside,
                distance: data.nearestCampus.distance,
                campusName: data.nearestCampus.name,
              })
            }
          } catch (err) {
            console.error("[v0] Error updating location:", err)
          }
        },
        () => {
          // Silent error
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
    }

    updateLocation()
    const interval = setInterval(updateLocation, 5000)
    return () => clearInterval(interval)
  }, [tutorId])

  if (!location) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading location...
      </Badge>
    )
  }

  return (
    <Badge
      className={`flex items-center gap-1 ${
        location.isInside
          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-100"
          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-100"
      }`}
    >
      {location.isInside ? (
        <MapPin className="h-3 w-3" />
      ) : (
        <MapPinOff className="h-3 w-3" />
      )}
      <span className="text-xs">
        {location.isInside
          ? `In ${location.campusName}`
          : `${location.distance}m away`}
      </span>
    </Badge>
  )
}
