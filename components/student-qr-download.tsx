"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import Image from "next/image"

interface StudentQRDownloadProps {
  studentId: number
}

export function StudentQRDownload({ studentId }: StudentQRDownloadProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const response = await fetch(`/api/student/${studentId}/qr-code`, {
          credentials: "include", // Ensure cookies are sent
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error("[v0] QR code error response:", errorText)
          setError(`Failed to load QR code: ${response.status}`)
          setLoading(false)
          return
        }

        const data = await response.json()

        if (data.success) {
          setQrImageUrl(data.qrImageUrl)
        } else {
          setError(data.message || "Failed to load QR code")
        }
      } catch (err) {
        console.error("[v0] Failed to fetch QR code:", err)
        setError("Failed to load QR code")
      } finally {
        setLoading(false)
      }
    }

    fetchQRCode()
  }, [studentId])

  const downloadQR = () => {
    if (qrImageUrl) {
      const link = document.createElement("a")
      link.href = qrImageUrl
      link.download = `student-qr-${studentId}.png`
      link.click()
    }
  }

  if (loading) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-sm text-muted-foreground">Loading QR code...</p>
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {qrImageUrl && (
        <div className="p-4 bg-white rounded-lg border-2 border-primary/20">
          <Image
            src={qrImageUrl || "/placeholder.svg"}
            alt="Student QR Code"
            width={200}
            height={200}
            className="w-48 h-48"
          />
        </div>
      )}

      <Button onClick={downloadQR} className="w-full sm:w-auto">
        <Download className="w-4 h-4 mr-2" />
        Download QR Code
      </Button>
    </div>
  )
}
