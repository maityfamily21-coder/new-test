"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Camera, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

interface LectureQRScannerProps {
  studentId: number
  onSuccess?: () => void
}

export function LectureQRScanner({ studentId, onSuccess }: LectureQRScannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<any>(null)
  const [processing, setProcessing] = useState(false)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    if (!scanning) return

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        streamRef.current = stream
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }
    }
  }, [scanning])

  const startScanning = () => {
    scanIntervalRef.current = setInterval(async () => {
      if (videoRef.current && canvasRef.current && !processing) {
        const context = canvasRef.current.getContext("2d")
        if (context) {
          canvasRef.current.width = videoRef.current.videoWidth
          canvasRef.current.height = videoRef.current.videoHeight
          context.drawImage(videoRef.current, 0, 0)

          try {
            // Try to use jsQR library if available
            const jsQR = (window as any).jsQR
            if (jsQR) {
              const imageData = context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)
              const qrCode = jsQR(imageData.data, imageData.width, imageData.height)
              
              if (qrCode) {
                setProcessing(true)
                await handleQRData(qrCode.data)
              }
            }
          } catch (err) {
            // Continue scanning
          }
        }
      }
    }, 300)
  }

  const handleQRData = async (qrUrl: string) => {
    try {
      console.log("[v0] QR URL received:", qrUrl)
      
      // Check if it's a lecture attendance URL
      if (!qrUrl.includes("/lectures/qr/")) {
        setError("Invalid QR code. Please scan a lecture QR code.")
        setProcessing(false)
        return
      }

      // Extract token from URL - supports both /lectures/qr/TOKEN/attend and /lectures/qr/TOKEN
      let token: string | null = null
      
      // Try to match /lectures/qr/{token}/attend
      const match1 = qrUrl.match(/\/lectures\/qr\/([a-f0-9-]+)(?:\/attend)?/)
      if (match1 && match1[1]) {
        token = match1[1]
      }

      if (!token) {
        console.error("[v0] Failed to extract token from QR URL:", qrUrl)
        setError("Invalid QR code format")
        setProcessing(false)
        return
      }

      console.log("[v0] Extracted token:", token)

      // Submit attendance
      console.log("[v0] Submitting QR attendance with token:", token, "studentId:", studentId)
      
      const response = await fetch(`/api/student/lectures/qr/${token}/attend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          deviceInfo: getDeviceInfo(),
        }),
      })

      console.log("[v0] Response status:", response.status)
      const data = await response.json()
      console.log("[v0] Response data:", data)

      if (data.success) {
        setSuccess(data)
        setError(null)
        setScanning(false)
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }
        onSuccess?.()
      } else {
        setError(data.error || "Failed to mark attendance")
        setProcessing(false)
      }
    } catch (err: any) {
      console.error("[v0] Error processing QR:", err?.message || err)
      setError(err?.message || "Failed to process QR code")
      setProcessing(false)
    }
  }

  const handleManualInput = async (input: string) => {
    if (!input.trim()) return
    setProcessing(true)
    await handleQRData(input)
  }

  const getDeviceInfo = () => {
    const ua = navigator.userAgent
    const screen = window.screen
    return {
      userAgent: ua,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
    }
  }

  const closeModal = () => {
    if (scanning) {
      setScanning(false)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
    setError(null)
    setSuccess(null)
    setIsOpen(false)
  }

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="w-full bg-purple-600 hover:bg-purple-700"
        size="lg"
      >
        <Camera className="w-4 h-4 mr-2" />
        Scan Lecture QR
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="rounded-lg max-w-lg">
          <DialogHeader>
            <DialogTitle>Scan Lecture QR Code</DialogTitle>
            <DialogDescription>Point your camera at the lecture QR code to mark attendance</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-green-900 dark:text-green-100">Attendance Marked!</p>
                      <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                        Lecture: {success.lectureName}
                      </p>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Subject: {success.subjectName}
                      </p>
                    </div>
                  </div>
                </div>
                <Button onClick={closeModal} className="w-full">
                  Close
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {scanning ? (
                  <div className="space-y-4">
                    <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        autoPlay
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-2 border-purple-500/50 rounded-lg pointer-events-none">
                        <div className="absolute inset-4 border-2 border-dashed border-purple-500/30 rounded-lg" />
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="text-white text-sm font-medium">Point camera at QR code</div>
                        </div>
                      </div>
                    </div>
                    {processing && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </div>
                    )}
                    <Button
                      onClick={() => {
                        setScanning(false)
                        if (streamRef.current) {
                          streamRef.current.getTracks().forEach((track) => track.stop())
                        }
                      }}
                      variant="destructive"
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Stop Scanning
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Button
                      onClick={() => setScanning(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
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
                      <label className="text-sm font-medium">Paste QR Code URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Paste lecture QR code URL..."
                          className="flex-1 px-3 py-2 text-sm border rounded-md bg-background"
                          onKeyPress={(e) => {
                            if (e.key === "Enter" && !processing) {
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
                          {processing ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin mr-1" />
                              Processing...
                            </>
                          ) : (
                            "Scan"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
