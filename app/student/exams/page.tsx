"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Download, Loader2, AlertCircle, ArrowLeft, ChevronDown } from "lucide-react"

interface ExamSubject {
  subject_id: number
  subject_name: string
  total_marks: number
  exam_date: string
  exam_end_time?: string
}

interface SubjectQR {
  subject_id: number
  subject_name: string
  subject_code: string
  total_marks: number
  exam_date: string
  qr_code: string
  token: string
  attendance_status: string | null
}

interface StudentMarks {
  id: number
  exam_id: number
  subject_id: number
  marks_obtained: number | null
  total_marks: number
  status: string
  submission_date: string | null
}

interface Exam {
  id: number
  exam_name: string
  exam_date: string
  subjects: ExamSubject[]
}

interface ExamWithQR extends Exam {
  qr_code?: string
}

const getStatusIndicator = (attendanceStatus: string | null | undefined) => {
  const status = attendanceStatus?.toLowerCase()

  switch (status) {
    case "present":
      return { color: "bg-green-500", label: "Present" }
    case "absent":
      return { color: "bg-red-500", label: "Absent" }
    default:
      return { color: "bg-gray-400", label: "No Status" }
  }
}

export default function StudentExamsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [student, setStudent] = useState<any>(null)
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedExamId, setExpandedExamId] = useState<number | null>(null)
  const [expandedSubjectId, setExpandedSubjectId] = useState<number | null>(null)
  const [subjectQRCodes, setSubjectQRCodes] = useState<Map<number, SubjectQR[]>>(new Map())
  const [loadingQRs, setLoadingQRs] = useState<Set<number>>(new Set())
  const [studentMarks, setStudentMarks] = useState<Map<string, StudentMarks>>(new Map())
  const [loadingMarks, setLoadingMarks] = useState(false)
  const [completedExamsExpandedStates, setCompletedExamsExpandedStates] = useState<Map<number, boolean>>(new Map())
  const [pcRequestStates, setPcRequestStates] = useState<Map<string, boolean>>(new Map())

  const loadExams = async (studentId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/student/exams?studentId=${studentId}`)
      const data = await response.json()
      setExams(data.exams || [])
    } catch (error) {
      console.error("Error loading exams:", error)
      toast({
        title: "Error",
        description: "Failed to load exams",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStudentMarks = async (studentId: number) => {
    try {
      setLoadingMarks(true)
      const response = await fetch(`/api/student/exam-marks?studentId=${studentId}`)
      const data = await response.json()

      if (data.success) {
        const marksMap = new Map<string, StudentMarks>()
        data.marks.forEach((mark: StudentMarks) => {
          const key = `${mark.exam_id}-${mark.subject_id}`
          marksMap.set(key, mark)
        })
        setStudentMarks(marksMap)
      }
    } catch (error: any) {
      console.error("Error loading marks:", error)
    } finally {
      setLoadingMarks(false)
    }
  }

  const loadSubjectQRCodes = async (examId: number) => {
    if (subjectQRCodes.has(examId)) return

    setLoadingQRs((prev) => new Set([...prev, examId]))

    try {
      const response = await fetch(`/api/student/exams/${examId}/subjects-qr?studentId=${student.id}`)
      const data = await response.json()
      setSubjectQRCodes((prev) => new Map([...prev, [examId, data || []]]))
    } catch (error) {
      console.error("Error loading QR codes:", error)
      toast({
        title: "Error",
        description: "Failed to load QR codes",
        variant: "destructive",
      })
    } finally {
      setLoadingQRs((prev) => {
        const newSet = new Set(prev)
        newSet.delete(examId)
        return newSet
      })
    }
  }

  const downloadHallTicket = async (examId: number, examName: string) => {
    try {
      const response = await fetch(`/api/student/exams/${examId}/hall-ticket?studentId=${student.id}`)
      if (!response.ok) throw new Error("Failed to download")

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Hall_Ticket_${examName}_${student.enrollment_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error("Error downloading hall ticket:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to download hall ticket",
        variant: "destructive",
      })
    }
  }

  const downloadSubjectQR = async (name: string, qrCode: string) => {
    try {
      const response = await fetch(qrCode)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `QR_${name}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading QR:", error)
      toast({
        title: "Error",
        description: "Failed to download QR code",
        variant: "destructive",
      })
    }
  }

  const getMarksDisplay = (examId: number, subjectId: number, marks: StudentMarks | undefined) => {
    if (!marks) return null

    if (marks.marks_obtained !== null && marks.status === "submitted") {
      return (
        <span className="text-green-600 font-semibold">
          {marks.marks_obtained}/{marks.total_marks}
        </span>
      )
    } else if (marks.status === "pending") {
      return <span className="text-amber-600 font-semibold">Pending</span>
    }

    return null
  }

  const getTotalMarksDisplay = (subject: ExamSubject) => {
    return <span className="text-xs text-muted-foreground">Total: {subject.total_marks}</span>
  }

  const loadExistingPCRequests = async (studentId: number) => {
    try {
      const response = await fetch(`/api/student/exams/pc-requests?studentId=${studentId}`)
      if (response.ok) {
        const data = await response.json()
        const requestMap = new Map<string, boolean>()
        data.requests.forEach((req: any) => {
          requestMap.set(`${req.exam_id}-${req.subject_id}`, true)
        })
        setPcRequestStates(requestMap)
      }
    } catch (error) {
      console.error("Failed to load existing PC requests:", error)
    }
  }

  const handleRaisePCRequest = async (examId: number, subjectId: number, examDate: string) => {
    if (!canRaisePCRequest(examDate)) {
      toast({
        title: "Cannot Raise Request",
        description: "PC requests are closed. The deadline has passed (2 days before exam).",
        variant: "destructive",
      })
      return
    }

    const key = `${examId}-${subjectId}`

    if (pcRequestStates.get(key)) {
      toast({
        title: "Already Requested",
        description: "You have already submitted a PC request for this subject.",
      })
      return
    }

    setPcRequestStates((prev) => new Map(prev.set(key, true)))

    try {
      const response = await fetch("/api/student/exams/raise-pc-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          examId,
          subjectId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "PC request submitted successfully",
        })
      } else {
        // Revert state on error
        setPcRequestStates((prev) => {
          const newMap = new Map(prev)
          newMap.delete(key)
          return newMap
        })

        toast({
          title: "Failed",
          description: data.error || "Failed to submit PC request",
          variant: "destructive",
        })
      }
    } catch (error) {
      // Revert state on error
      setPcRequestStates((prev) => {
        const newMap = new Map(prev)
        newMap.delete(key)
        return newMap
      })

      toast({
        title: "Error",
        description: "Failed to submit PC request",
        variant: "destructive",
      })
    }
  }

  const canRaisePCRequest = (examDate: string) => {
    const now = new Date()
    const exam = new Date(examDate)

    const twoDaysBeforeExam = new Date(exam)
    twoDaysBeforeExam.setDate(twoDaysBeforeExam.getDate() - 2)

    return now < twoDaysBeforeExam
  }

  useEffect(() => {
    const studentAuth = localStorage.getItem("studentAuth")
    if (!studentAuth) {
      router.push("/student/login")
      return
    }

    try {
      const studentData = JSON.parse(studentAuth)
      setStudent(studentData)
      loadExams(studentData.id)
      loadStudentMarks(studentData.id)
      loadExistingPCRequests(studentData.id)
    } catch (error) {
      console.error("Failed to parse student auth:", error)
      localStorage.removeItem("studentAuth")
      router.push("/student/login")
    }
  }, [router])

  useEffect(() => {
    if (student) {
      exams.forEach((exam) => {
        if (!subjectQRCodes.has(exam.id)) {
          loadSubjectQRCodes(exam.id)
        }
      })
    }
  }, [student, exams])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-4 md:p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const upcomingExams = exams.filter((e) => new Date(e.exam_date) > new Date())
  const ongoingExams = exams.filter((e) => {
    const examDate = new Date(e.exam_date)
    const now = new Date()
    return examDate <= now && examDate.getTime() + 3 * 60 * 60 * 1000 > now.getTime()
  })
  const completedExams = exams.filter((e) => {
    const examDate = new Date(e.exam_date)
    const now = new Date()
    return examDate.getTime() + 3 * 60 * 60 * 1000 <= now.getTime()
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3 mb-1">
                <Calendar className="w-8 h-8 text-primary" />
                My Exams
              </h1>
              <p className="text-sm text-muted-foreground">View your upcoming exams and subject QR codes</p>
            </div>
          </div>
          <Button
            onClick={() => router.push("/student/dashboard")}
            variant="outline"
            className="hidden md:flex gap-2"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </Button>
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No exams scheduled for your course and semester</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {ongoingExams.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="destructive" className="text-xs">
                    Ongoing
                  </Badge>
                  <h2 className="font-semibold text-foreground">Exams in Progress</h2>
                </div>
                <div className="space-y-3">
                  {ongoingExams.map((exam) => {
                    const subjectQRList = subjectQRCodes.get(exam.id) || []
                    const statusIndicator = getStatusIndicator(null)

                    return (
                      <Card key={exam.id} className="border-amber-200 bg-amber-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">{exam.exam_name}</h3>
                                <Badge className="h-5 text-xs bg-amber-600 hover:bg-amber-700">Ongoing</Badge>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>Exam Date: {exam.exam_date}</p>
                                <p>{exam.subjects.length} subjects</p>
                              </div>
                            </div>
                          </div>

                          <p className="font-medium text-sm text-foreground mb-3">Subject QR Codes:</p>
                          {loadingQRs.has(exam.id) ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
                              <span className="text-sm text-muted-foreground">Loading QR codes...</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {exam.subjects.map((subject) => {
                                const subjectQR = subjectQRList.find((q) => q.subject_id === subject.subject_id)
                                const marks = studentMarks.get(`${exam.id}-${subject.subject_id}`)
                                const marksDisplay = getMarksDisplay(exam.id, subject.subject_id, marks)

                                return (
                                  <div
                                    key={subject.subject_id}
                                    className="bg-background border border-border rounded-lg p-3"
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-2.5 h-2.5 rounded-full ${statusIndicator.color}`}
                                          title={statusIndicator.label}
                                        />
                                        <p className="font-medium text-sm text-foreground">{subject.subject_name}</p>
                                      </div>
                                      {marksDisplay && (
                                        <span className="text-xs font-semibold text-foreground ml-2">
                                          {marksDisplay}
                                        </span>
                                      )}
                                    </div>
                                    {subjectQR ? (
                                      <div className="space-y-2">
                                        <img
                                          src={subjectQR.qr_code || "/placeholder.svg"}
                                          alt={`${subject.subject_name} QR`}
                                          className="w-full border border-border rounded"
                                        />
                                        <p className="text-xs text-muted-foreground text-center">
                                          Scan this QR for attendance
                                        </p>
                                        <Button
                                          onClick={() => downloadSubjectQR(subject.subject_name, subjectQR.qr_code)}
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                        >
                                          <Download className="w-3 h-3 mr-1" />
                                          Download QR
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="text-center py-3 text-xs text-muted-foreground">
                                        QR code not yet generated
                                      </p>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {upcomingExams.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="text-xs">
                    Upcoming
                  </Badge>
                  <h2 className="font-semibold text-foreground">Upcoming Exams</h2>
                </div>
                <div className="space-y-3">
                  {upcomingExams.map((exam) => {
                    const qrCodes = subjectQRCodes.get(exam.id) || []
                    const isLoadingQR = loadingQRs.has(exam.id)
                    const isExpanded = expandedExamId === exam.id

                    return (
                      <Card key={exam.id} className="border-2">
                        <CardContent className="p-4">
                          <div
                            className="flex items-start justify-between gap-3 cursor-pointer"
                            onClick={() => setExpandedExamId(isExpanded ? null : exam.id)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">{exam.exam_name}</h3>
                                <Badge variant="outline" className="h-5 text-xs">
                                  Upcoming
                                </Badge>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>Exam Date: {exam.exam_date}</p>
                                <p>{exam.subjects.length} subjects</p>
                              </div>
                            </div>
                            <ChevronDown
                              className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </div>

                          {isExpanded && (
                            <div className="pt-4 space-y-4">
                              <Button
                                onClick={() => downloadHallTicket(exam.id, exam.exam_name)}
                                size="sm"
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Download className="w-3 h-3 mr-2" />
                                Download Hall Ticket (PDF)
                              </Button>

                              <div className="space-y-3">
                                <p className="font-medium text-sm text-foreground">Subjects:</p>
                                {exam.subjects.map((subject) => {
                                  const qrData = qrCodes.find((qr) => qr.subject_id === subject.subject_id)
                                  const statusInfo = getStatusIndicator(qrData?.attendance_status)
                                  const marksKey = `${exam.id}-${subject.subject_id}`
                                  const marks = studentMarks.get(marksKey)
                                  const isExpandedSubject = expandedSubjectId === subject.subject_id
                                  const showPCRequestButton = canRaisePCRequest(subject.exam_date)
                                  const pcRequestKey = `${exam.id}-${subject.subject_id}`
                                  const isRaisingPCRequest = pcRequestStates.get(pcRequestKey)

                                  return (
                                    <div key={subject.subject_id} className="border rounded-lg p-4 space-y-3">
                                      <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() =>
                                          setExpandedSubjectId(isExpandedSubject ? null : subject.subject_id)
                                        }
                                      >
                                        <div className="flex items-center gap-2">
                                          <div
                                            className={`w-2.5 h-2.5 rounded-full ${statusInfo.color}`}
                                            title={statusInfo.label}
                                          />
                                          <p className="font-medium text-sm text-foreground">{subject.subject_name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {marks && (
                                            <span className="text-xs font-semibold text-foreground">
                                              {getMarksDisplay(exam.id, subject.subject_id, marks)}
                                            </span>
                                          )}
                                          <span className="text-xs text-muted-foreground">
                                            Total Marks: {subject.total_marks}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="space-y-2 pt-2 border-t">
                                        {showPCRequestButton && (
                                          <Button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleRaisePCRequest(exam.id, subject.subject_id, subject.exam_date)
                                            }}
                                            disabled={
                                              isRaisingPCRequest ||
                                              pcRequestStates.get(`${exam.id}-${subject.subject_id}`)
                                            }
                                            variant="outline"
                                            className="w-full gap-2 border-green-500 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/20"
                                            size="sm"
                                          >
                                            {isRaisingPCRequest ||
                                            pcRequestStates.get(`${exam.id}-${subject.subject_id}`)
                                              ? "PC Requested"
                                              : "Raise PC Request"}
                                          </Button>
                                        )}
                                        {!showPCRequestButton && (
                                          <p className="text-xs text-muted-foreground text-center py-2 bg-red-50 dark:bg-red-950/20 rounded border border-red-200">
                                            PC requests closed (deadline: 2 days before exam)
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}

            {completedExams.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Past Exams
                  </Badge>
                  <h2 className="font-semibold text-foreground">Past Exams</h2>
                </div>
                <div className="space-y-3">
                  {completedExams.map((exam) => {
                    const subjectQRList = subjectQRCodes.get(exam.id) || []
                    const isExpanded = completedExamsExpandedStates.get(exam.id) || false

                    return (
                      <Card key={exam.id} className="border-slate-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-foreground">{exam.exam_name}</h3>
                                <Badge variant="secondary" className="h-5 text-xs">
                                  Completed
                                </Badge>
                              </div>
                              <div className="space-y-1 text-xs text-muted-foreground">
                                <p>Exam Date: {exam.exam_date}</p>
                                <p>{exam.subjects.length} subjects</p>
                              </div>
                            </div>
                          </div>

                          <p className="font-medium text-sm text-foreground mb-3">Subjects:</p>
                          <div className="space-y-2">
                            {exam.subjects.map((subject) => {
                              const subjectQR = subjectQRList.find((q) => q.subject_id === subject.subject_id)
                              const marks = studentMarks.get(`${exam.id}-${subject.subject_id}`)
                              const marksDisplay = getMarksDisplay(exam.id, subject.subject_id, marks)
                              const statusIndicator = getStatusIndicator(subjectQR?.attendance_status || null)

                              return (
                                <div
                                  key={subject.subject_id}
                                  className="flex items-center justify-between p-2 bg-background rounded border border-border"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-2.5 h-2.5 rounded-full ${statusIndicator.color}`}
                                      title={statusIndicator.label}
                                    />
                                    <div className="flex flex-col gap-1">
                                      <p className="font-medium text-sm text-foreground">{subject.subject_name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Total Marks: {subject.total_marks}
                                      </p>
                                    </div>
                                  </div>
                                  {marksDisplay && (
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="text-xs font-semibold text-foreground">Marks</span>
                                      {marksDisplay}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {isExpanded && subjectQRList.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-border">
                              <p className="text-xs text-muted-foreground mb-3">Subject QR Codes:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {subjectQRList.map((qr) => (
                                  <div
                                    key={qr.subject_id}
                                    className="bg-background border border-border rounded-lg p-3"
                                  >
                                    <p className="font-medium text-xs text-foreground mb-2">{qr.subject_name}</p>
                                    <img
                                      src={qr.qr_code || "/placeholder.svg"}
                                      alt={`${qr.subject_name} QR`}
                                      className="w-full border border-border rounded mb-2"
                                    />
                                    <Button
                                      onClick={() => downloadSubjectQR(qr.subject_name, qr.qr_code)}
                                      size="sm"
                                      variant="outline"
                                      className="w-full"
                                    >
                                      <Download className="w-3 h-3 mr-1" />
                                      Download QR
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={async () => {
                              if (!isExpanded && subjectQRList.length === 0) {
                                setLoadingQRs((prev) => new Set(prev).add(exam.id))
                                try {
                                  const response = await fetch(
                                    `/api/student/exams/${exam.id}/subjects-qr?studentId=${student?.id}`,
                                  )
                                  if (response.ok) {
                                    const data = await response.json()
                                    setSubjectQRCodes((prev) => new Map(prev).set(exam.id, data))
                                  }
                                } catch (error) {
                                  console.error("Error loading QR codes:", error)
                                } finally {
                                  setLoadingQRs((prev) => {
                                    const newSet = new Set(prev)
                                    newSet.delete(exam.id)
                                    return newSet
                                  })
                                }
                              }
                              setCompletedExamsExpandedStates((prev) => new Map(prev).set(exam.id, !isExpanded))
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full mt-3"
                          >
                            {isExpanded ? "Hide Details" : "View QR Codes"}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
