"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { QrCode, Download, Copy, CheckCircle2 } from "lucide-react"
import Image from "next/image"

interface StudentQRDisplayProps {
  studentId: number
}

export function StudentQRDisplay({ studentId }: StudentQRDisplayProps) {
  const [qrData, setQrData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const fetchQRCode = async () => {
      try {
        const response = await fetch(`/api/student/${studentId}/qr-code`)
        const data = await response.json()
        if (data.success) {
          setQrData(data)
        } else {
          setError(data.message || "Failed to load QR code")
        }
      } catch (err) {
        console.error("[MYT] Failed to fetch QR code:", err)
        setError("Failed to load QR code")
      } finally {
        setLoading(false)
      }
    }

    fetchQRCode()
  }, [studentId])

  const downloadQR = () => {
    if (qrData?.qrImageUrl) {
      const link = document.createElement("a")
      link.href = qrData.qrImageUrl
      link.download = `student-qr-${studentId}.png`
      link.click()
    }
  }

  const copyQRUrl = () => {
    if (qrData?.qrUrl) {
      navigator.clipboard.writeText(qrData.qrUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="bg-muted/50">
          <CardTitle className="flex items-center">
            <QrCode className="w-5 h-5 mr-2" />
            My QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Loading QR code...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="shadow-lg border-red-200">
        <CardHeader className="bg-red-50 dark:bg-red-950">
          <CardTitle className="flex items-center text-red-700 dark:text-red-300">
            <QrCode className="w-5 h-5 mr-2" />
            QR Code Error
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <QrCode className="w-5 h-5 mr-2" />
              My Permanent QR Code
            </CardTitle>
            <CardDescription>Use this QR code for attendance marking</CardDescription>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="flex justify-center p-6 bg-white rounded-lg border-2 border-dashed border-primary/20">
            {qrData?.qrImageUrl ? (
              <Image
                src={qrData.qrImageUrl || "/placeholder.svg"}
                alt="Student QR Code"
                width={256}
                height={256}
                priority
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <QrCode className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p>QR code not available</p>
              </div>
            )}
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Student ID</p>
              <p className="font-semibold">{qrData?.student?.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Enrollment</p>
              <p className="font-semibold">{qrData?.student?.enrollmentNumber}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground uppercase">Name</p>
              <p className="font-semibold">{qrData?.student?.name}</p>
            </div>
          </div>

          {/* QR URL */}
          <div className="space-y-2">
            <p className="text-sm font-medium">QR Code URL</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={qrData?.qrUrl || ""}
                readOnly
                className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted text-muted-foreground"
              />
              <Button size="sm" variant="outline" onClick={copyQRUrl}>
                <Copy className="w-4 h-4 mr-1" />
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={downloadQR} className="flex-1 bg-transparent" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </Button>
            <Button onClick={() => window.open(qrData?.qrUrl, "_blank")} className="flex-1">
              <QrCode className="w-4 h-4 mr-2" />
              Open QR Page
            </Button>
          </div>

          {/* Info */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> This QR code is permanent and unique to your account. Share it with the admin to
              mark attendance using the QR scanner.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
