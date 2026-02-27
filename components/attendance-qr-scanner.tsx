"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, X, AlertCircle } from "lucide-react"

interface AttendanceQRScannerProps {
  seminarId: number
  onAttendanceMarked?: (studentId: number, studentName: string) => void
  onClose?: () => void
}

export function AttendanceQRScanner({ seminarId, onAttendanceMarked, onClose }: AttendanceQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastScannedRef = useRef<string>("")
  const flashRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)
  const streamRef = useRef<MediaStream | null>(null)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && videoRef.current?.srcObject) {
        // Pause video when tab is hidden
        videoRef.current.pause()
      } else if (!document.hidden && videoRef.current?.srcObject && scanning) {
        // Resume video when tab becomes visible
        videoRef.current.play().catch((err) => {
          console.log("[MYT] Failed to resume video:", err)
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [scanning])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.value = 800
      oscillator.type = "sine"

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.1)
    } catch (err) {
      console.log("[MYT] Beep sound failed:", err)
    }
  }

  const showFlash = () => {
    if (flashRef.current) {
      flashRef.current.style.opacity = "1"
      setTimeout(() => {
        if (flashRef.current) {
          flashRef.current.style.opacity = "0"
        }
      }, 200)
    }
  }

  const decodeQRCode = async (canvas: HTMLCanvasElement): Promise<string | null> => {
    try {
      const ctx = canvas.getContext("2d")
      if (!ctx || !videoRef.current) return null

      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      if (typeof (window as any).jsQR === "undefined") {
        console.log("[MYT] jsQR library not loaded yet")
        return null
      }

      const code = (window as any).jsQR(imageData.data, imageData.width, imageData.height)
      return code?.data || null
    } catch (err) {
      console.log("[MYT] QR decode error:", err)
      return null
    }
  }

  const processQRCode = async (qrData: string) => {
    if (!qrData || qrData === lastScannedRef.current) return

    lastScannedRef.current = qrData
    setProcessing(true)
    setMessage(null)

    try {
      let token = qrData
      if (qrData.includes("/")) {
        token = qrData.split("/").pop() || ""
      }

      if (!token) {
        if (isMountedRef.current) {
          setMessage({ type: "error", text: "Invalid QR code format" })
          setProcessing(false)
        }
        return
      }

      const studentRes = await fetch(`/api/student-qr/${token}/data`)
      const studentData = await studentRes.json()

      if (!studentData.success) {
        if (isMountedRef.current) {
          setMessage({ type: "error", text: "Invalid QR code" })
          setProcessing(false)
        }
        return
      }

      const student = studentData.student

      const seminarRes = await fetch(`/api/admin/seminars/${seminarId}/students`)
      const seminarData = await seminarRes.json()

      if (!seminarData.students || !seminarData.students.find((s: any) => s.id === student.id)) {
        playBeep()
        if (isMountedRef.current) {
          setMessage({ type: "warning", text: `Not part of this seminar: ${student.name}` })
          setProcessing(false)
        }
        setTimeout(() => {
          lastScannedRef.current = ""
        }, 2000)
        return
      }

      const attendanceRes = await fetch(`/api/admin/seminars/${seminarId}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: student.id,
          status: "Present",
        }),
      })

      const attendanceData = await attendanceRes.json()

      if (attendanceData.success) {
        playBeep()
        showFlash()
        if (isMountedRef.current) {
          setMessage({
            type: "success",
            text: `Marked: ${student.name}`,
          })
          setScannedCount((prev) => prev + 1)
        }
        onAttendanceMarked?.(student.id, student.name)

        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current)
        }
        messageTimeoutRef.current = setTimeout(() => {
          lastScannedRef.current = ""
          if (isMountedRef.current) {
            setMessage(null)
          }
        }, 1500)
      } else if (attendanceData.message?.includes("already")) {
        playBeep()
        if (isMountedRef.current) {
          setMessage({ type: "warning", text: `Already marked: ${student.name}` })
        }
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current)
        }
        messageTimeoutRef.current = setTimeout(() => {
          lastScannedRef.current = ""
        }, 1500)
      } else {
        if (isMountedRef.current) {
          setMessage({ type: "error", text: attendanceData.message || "Failed to mark attendance" })
        }
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current)
        }
        messageTimeoutRef.current = setTimeout(() => {
          lastScannedRef.current = ""
        }, 1500)
      }
    } catch (err) {
      console.error("[MYT] QR processing error:", err)
      if (isMountedRef.current) {
        setMessage({ type: "error", text: "Failed to process QR code" })
      }
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
      messageTimeoutRef.current = setTimeout(() => {
        lastScannedRef.current = ""
      }, 1500)
    } finally {
      if (isMountedRef.current) {
        setProcessing(false)
      }
    }
  }

  useEffect(() => {
    if (!scanning) return

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream

        if (videoRef.current && isMountedRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute("playsinline", "true")
          videoRef.current.setAttribute("webkit-playsinline", "true")
          videoRef.current.setAttribute("autoplay", "true")
          videoRef.current.setAttribute("muted", "true")

          try {
            await videoRef.current.play()
          } catch (playErr) {
            console.log("[MYT] Video play error:", playErr)
          }
        }

        scanIntervalRef.current = setInterval(async () => {
          if (
            canvasRef.current &&
            videoRef.current &&
            videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
            isMountedRef.current &&
            !document.hidden
          ) {
            const qrData = await decodeQRCode(canvasRef.current)
            if (qrData && !processing) {
              await processQRCode(qrData)
            }
          }
        }, 300)
      } catch (err) {
        console.error("[MYT] Camera error:", err)
        if (isMountedRef.current) {
          const errorMsg =
            err instanceof DOMException && err.name === "NotAllowedError"
              ? "Camera permission denied. Please enable camera access in settings."
              : "Unable to access camera. Please check permissions."
          setError(errorMsg)
          setScanning(false)
        }
      }
    }

    startCamera()

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current)
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop()
        })
        streamRef.current = null
      }

      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach((track) => track.stop())
        videoRef.current.srcObject = null
      }

      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
    }
  }, [scanning, processing])

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-muted/50 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            QR Attendance Scanner
          </CardTitle>
          <CardDescription>Scan student QR codes to mark attendance instantly</CardDescription>
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

          {message && (
            <Alert
              className={
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
                  : message.type === "warning"
                    ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                    : "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
              }
            >
              <AlertCircle
                className={`h-4 w-4 ${
                  message.type === "success"
                    ? "text-green-600 dark:text-green-400"
                    : message.type === "warning"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              />
              <AlertDescription
                className={
                  message.type === "success"
                    ? "text-green-800 dark:text-green-200"
                    : message.type === "warning"
                      ? "text-yellow-800 dark:text-yellow-200"
                      : "text-red-800 dark:text-red-200"
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {scanning ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline autoPlay muted />
                <canvas ref={canvasRef} className="hidden" />
                <div
                  ref={flashRef}
                  className="absolute inset-0 bg-green-500 opacity-0 transition-opacity duration-200 pointer-events-none"
                />
                <div className="absolute inset-0 border-2 border-primary/50 rounded-lg pointer-events-none">
                  <div className="absolute inset-4 border-2 border-dashed border-primary/30 rounded-lg" />
                </div>
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
                  Scanned: {scannedCount}
                </div>
              </div>
              <Button onClick={() => setScanning(false)} variant="destructive" className="w-full">
                <X className="w-4 h-4 mr-2" />
                Stop Scanning
              </Button>
            </div>
          ) : (
            <Button onClick={() => setScanning(true)} className="w-full" size="lg">
              <Camera className="w-4 h-4 mr-2" />
              Open Camera
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
