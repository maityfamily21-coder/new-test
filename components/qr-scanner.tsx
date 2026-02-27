"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, X, CheckCircle2, AlertCircle } from "lucide-react"

interface QRScannerProps {
  onScan?: (data: any) => void
  onClose?: () => void
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scannedData, setScannedData] = useState<any>(null)
  const [processing, setProcessing] = useState(false)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!scanning) return

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          startScanning()
        }
      } catch (err) {
        setError("Unable to access camera. Please check permissions.")
        setScanning(false)
      }
    }

    startCamera()

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [scanning])

  const startScanning = () => {
    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext("2d")
        if (context) {
          canvasRef.current.width = videoRef.current.videoWidth
          canvasRef.current.height = videoRef.current.videoHeight
          context.drawImage(videoRef.current, 0, 0)

          // Simple QR detection - look for URL patterns in canvas
          try {
            const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
            // In production, use a proper QR library like jsQR
            // For now, we'll use a simple approach
            detectQRFromCanvas(canvasRef.current)
          } catch (err) {
            // Silently continue scanning
          }
        }
      }
    }, 500)
  }

  const detectQRFromCanvas = async (canvas: HTMLCanvasElement) => {
    try {
      // This is a placeholder - in production use jsQR or similar library
      // For now, we'll simulate QR detection
      const dataUrl = canvas.toDataURL("image/png")
      // You would pass this to a QR decoding library here
    } catch (err) {
      // Continue scanning
    }
  }

  const handleManualInput = async (qrUrl: string) => {
    if (!qrUrl.trim()) return

    setProcessing(true)
    try {
      // Extract token from URL
      const urlObj = new URL(qrUrl)
      const token = urlObj.pathname.split("/").pop()

      if (!token) {
        setError("Invalid QR URL format")
        return
      }

      // Fetch student data from QR token
      const response = await fetch(`/api/student-qr/${token}/data`)
      const data = await response.json()

      if (data.success) {
        setScannedData(data)
        onScan?.(data)
      } else {
        setError(data.message || "Invalid QR code")
      }
    } catch (err) {
      setError("Failed to process QR code")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-muted/50 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            QR Code Scanner
          </CardTitle>
          <CardDescription>Scan student QR codes to mark attendance</CardDescription>
        </div>
        {onClose && (
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {scannedData ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">QR Code Scanned</p>
                    <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                      Student: {scannedData.student?.name}
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Enrollment: {scannedData.student?.enrollmentNumber}
                    </p>
                  </div>
                </div>
              </div>
              <Button onClick={() => setScannedData(null)} className="w-full">
                Scan Another
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {scanning ? (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none">
                      <div className="absolute inset-4 border-2 border-dashed border-primary/30 rounded-lg" />
                    </div>
                  </div>
                  <Button onClick={() => setScanning(false)} variant="destructive" className="w-full">
                    <X className="w-4 h-4 mr-2" />
                    Stop Scanning
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Button onClick={() => setScanning(true)} className="w-full" size="lg">
                    <Camera className="w-4 h-4 mr-2" />
                    Open Camera
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-muted-foreground/20" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-background text-muted-foreground">or</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Paste QR URL</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste QR code URL here..."
                        className="flex-1 px-3 py-2 text-sm border rounded-md"
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleManualInput(e.currentTarget.value)
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement
                          handleManualInput(input.value)
                        }}
                        disabled={processing}
                      >
                        {processing ? "Processing..." : "Scan"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
