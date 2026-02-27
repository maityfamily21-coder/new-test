"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Camera, X, AlertCircle } from "lucide-react"

interface DateExamTab {
  label: string
  examId: number
  subjectId: number
  courseId: number
  semester: number
  examName: string
  courseId?: number
  courseName?: string
  subjectName?: string
}

interface DateBasedQRScannerProps {
  examDate: string
  dateExamTabs?: DateExamTab[]
  onAttendanceMarked?: (studentId: number, studentName: string, examName: string) => void
  onClose?: () => void
  markedByPersonnelId?: number
  examsData?: Array<{
    exam_id: number
    exam_name: string
    course_id: number
    semester: number
    subject_id: number
    subject_name: string
    exam_date: string
    exam_end_time: string
  }>
  coursesData?: Array<{ id: number; name: string }>
}

interface ScannedRecord {
  studentName: string
  examName: string
  time: string
}

export function DateBasedExamQRScanner({
  examDate,
  dateExamTabs = [],
  onAttendanceMarked,
  onClose,
  markedByPersonnelId,
  examsData = [],
  coursesData = [],
}: DateBasedQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null)
  const [processing, setProcessing] = useState(false)
  const [scannedCount, setScannedCount] = useState(0)
  const [scannedRecords, setScannedRecords] = useState<ScannedRecord[]>([])
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastScannedRef = useRef<string>("")
  const flashRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)
  const streamRef = useRef<MediaStream | null>(null)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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
      const token = qrData.trim()
      const encodedToken = encodeURIComponent(token)

      if (!token || token.length === 0) {
        if (isMountedRef.current) {
          setMessage({ type: "error", text: "Invalid QR code format - empty token" })
          setProcessing(false)
        }
        return
      }

      const studentRes = await fetch(`/api/student-qr/${encodedToken}/data`)

      if (!studentRes.ok) {
        if (isMountedRef.current) {
          setMessage({
            type: "error",
            text:
              studentRes.status === 404
                ? "Invalid QR - not found in system (404)"
                : `Invalid QR - API error (${studentRes.status})`,
          })
          setProcessing(false)
        }
        return
      }

      const studentData = await studentRes.json()

      if (!studentData.success) {
        if (isMountedRef.current) {
          setMessage({ type: "error", text: studentData.message || "Invalid QR code" })
          setProcessing(false)
        }
        return
      }

      if (studentData.type !== "exam") {
        if (isMountedRef.current) {
          setMessage({ type: "error", text: "This is not an exam attendance QR. Please use the exam subject QR." })
          setProcessing(false)
        }
        return
      }

      const student = studentData.student
      const scannedExamId = Number(student.examId)
      const scannedSubjectId = Number(student.subjectId)

      const matchingTab = dateExamTabs.find((tab) => tab.examId === scannedExamId && tab.subjectId === scannedSubjectId)

      if (!matchingTab) {
        if (isMountedRef.current) {
          setMessage({
            type: "error",
            text: `❌ QR combination not in loaded exams. Please verify the QR and selected date.`,
          })
          setProcessing(false)
        }
        return
      }

      const attendanceRes = await fetch("/api/admin/exams/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: matchingTab.examId,
          student_id: Number(student.id),
          subject_id: matchingTab.subjectId,
          course_id: matchingTab.courseId,
          semester: matchingTab.semester,
          markedByPersonnelId: markedByPersonnelId || null,
        }),
      })

      const attendanceData = await attendanceRes.json()

      if (attendanceData.success || attendanceRes.ok) {
        playBeep()
        showFlash()

        const recordTime = new Date().toLocaleTimeString()
        const newRecord: ScannedRecord = {
          studentName: student.name,
          examName: student.examName,
          time: recordTime,
        }

        if (isMountedRef.current) {
          setMessage({
            type: "success",
            text: `✅ ${student.name} - ${student.examName}`,
          })
          setScannedCount((prev) => prev + 1)
          setScannedRecords((prev) => [newRecord, ...prev.slice(0, 9)])
        }

        onAttendanceMarked?.(student.id, student.name, student.examName)

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
          setMessage({ type: "warning", text: `⚠️ Already marked: ${student.name}` })
        }
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current)
        }
        messageTimeoutRef.current = setTimeout(() => {
          lastScannedRef.current = ""
        }, 1500)
      } else {
        if (isMountedRef.current) {
          setMessage({
            type: "error",
            text: `❌ Failed to mark attendance: ${attendanceData.message || "Unknown error"}`,
          })
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
        setMessage({
          type: "error",
          text: "Error processing QR - " + (err instanceof Error ? err.message : "Unknown error"),
        })
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
    if (!examDate) {
      setError("Error: Exam date must be selected before scanning")
      return
    }

    if (dateExamTabs.length === 0) {
      setError("Error: No exams found for this date")
      return
    }

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
  }, [scanning, processing, examDate, dateExamTabs])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const getCourseName = (courseId: number): string => {
    const course = coursesData.find((c) => c.id === courseId)
    return course ? course.name : `Course ${courseId}`
  }

  return (
    <div className="space-y-4">
      {examsData && examsData.length > 0 && (
        <Card className="border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Exams Preview</CardTitle>
            <CardDescription>Exams loaded for scanning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {examsData.map((exam, idx) => (
                <div
                  key={idx}
                  className="p-2 sm:p-3 rounded-lg bg-white dark:bg-slate-800 border border-blue-100 dark:border-blue-900 text-xs sm:text-sm"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 truncate">{exam.exam_name}</p>
                    <p className="text-muted-foreground">
                      <span className="font-medium">{getCourseName(exam.course_id)}</span>
                    </p>
                    <p className="text-muted-foreground">
                      Semester: <span className="font-medium">{exam.semester}</span>
                    </p>
                    <p className="text-muted-foreground truncate">
                      Subject: <span className="font-medium">{exam.subject_name}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-lg">
        <CardHeader className="bg-muted/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Camera className="w-5 h-5 mr-2" />
              Date-Based Attendance Scanner
            </CardTitle>
            <CardDescription>Scan QR codes for all exams on {new Date(examDate).toLocaleDateString()}</CardDescription>
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

            {dateExamTabs && dateExamTabs.length > 0 && (
              <div className="bg-orange-500 dark:bg-orange-600 rounded-lg p-2 sm:p-3 inline-block">
                <p className="text-white font-semibold text-sm sm:text-base">
                  {dateExamTabs.length} Exam{dateExamTabs.length !== 1 ? "s" : ""} Loaded
                </p>
              </div>
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

                {scannedRecords.length > 0 && (
                  <div className="bg-muted rounded-lg p-3 max-h-40 overflow-y-auto">
                    <h3 className="text-sm font-semibold mb-2">Recent Scans:</h3>
                    <div className="space-y-1">
                      {scannedRecords.map((record, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground flex justify-between">
                          <span>
                            {record.studentName} - {record.examName}
                          </span>
                          <span className="text-right">{record.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={() => setScanning(false)} variant="destructive" className="w-full">
                  <X className="w-4 h-4 mr-2" />
                  Stop Scanning
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setScanning(true)}
                className="w-full"
                size="lg"
                disabled={dateExamTabs.length === 0}
              >
                <Camera className="w-4 h-4 mr-2" />
                Start Scanning
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
