"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Search, AlertCircle, CheckCircle2, XCircle, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: number
  full_name: string
  enrollment_number: string
  attendance_status: string
  scanned_at?: string
}

interface ExamManualAttendanceProps {
  examId: number
  subjectId: number
  students: Student[]
  onAttendanceMarked?: (studentId: number, newStatus: string) => void
  markedByPersonnelId?: number
}

type ManualStatus = "pending" | "present" | "absent"

export function ExamManualAttendance({
  examId,
  subjectId,
  students,
  onAttendanceMarked,
  markedByPersonnelId,
}: ExamManualAttendanceProps) {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [manualAttendance, setManualAttendance] = useState<Record<number, ManualStatus>>({})
  const [loading, setLoading] = useState<number | null>(null)

  // Initialize manual attendance status from existing data
  useEffect(() => {
    const attendance: Record<number, ManualStatus> = {}
    students.forEach((student) => {
      if (student.attendance_status === "present") {
        attendance[student.id] = "present"
      } else if (student.attendance_status === "absent") {
        attendance[student.id] = "absent"
      } else {
        attendance[student.id] = "pending"
      }
    })
    setManualAttendance(attendance)
  }, [students])

  const handleToggleAttendance = async (studentId: number, currentStatus: ManualStatus) => {
    const student = students.find((s) => s.id === studentId)
    if (!student) return

    // Determine the next status in the cycle: pending → present → absent → pending
    const statusCycle: Record<ManualStatus, ManualStatus> = {
      pending: "present",
      present: "absent",
      absent: "pending",
    }

    const nextStatus = statusCycle[currentStatus]

    setLoading(studentId)

    try {
      // Only make API call if changing from pending to present/absent or between present/absent
      if (nextStatus === "pending") {
        // Just update local state when cycling back to pending
        setManualAttendance((prev) => ({
          ...prev,
          [studentId]: nextStatus,
        }))
        toast({
          title: "Status Updated",
          description: `${student.full_name} attendance reset to pending`,
        })
      } else {
        // Call API to mark attendance
        const response = await fetch("/api/admin/exams/attendance/mark-manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            exam_id: examId,
            student_id: studentId,
            subject_id: subjectId,
            attendance_status: nextStatus === "present" ? "present" : "absent",
            markedByPersonnelId: markedByPersonnelId || null,
          }),
        })

        const data = await response.json()

        if (response.ok && data.success) {
          setManualAttendance((prev) => ({
            ...prev,
            [studentId]: nextStatus,
          }))

          toast({
            title: "Attendance Updated",
            description: `${student.full_name} marked as ${nextStatus}`,
          })

          onAttendanceMarked?.(studentId, nextStatus)
        } else {
          toast({
            title: "Error",
            description: data.message || "Failed to update attendance",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.error("[MYT] Error updating attendance:", error)
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.enrollment_number.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const stats = {
    present: Object.values(manualAttendance).filter((s) => s === "present").length,
    absent: Object.values(manualAttendance).filter((s) => s === "absent").length,
    pending: Object.values(manualAttendance).filter((s) => s === "pending").length,
  }

  const getStatusIcon = (status: ManualStatus) => {
    switch (status) {
      case "present":
        return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
      case "absent":
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      default:
        return <Clock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status: ManualStatus) => {
    switch (status) {
      case "present":
        return "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30"
      case "absent":
        return "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30"
      default:
        return "border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
    }
  }

  const getStatusLabel = (status: ManualStatus) => {
    switch (status) {
      case "present":
        return "Present"
      case "absent":
        return "Absent"
      default:
        return "Pending"
    }
  }

  return (
    <Card className="border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-900/50 overflow-hidden">
      <CardHeader className="pb-4 pt-4 px-4 md:px-6">
        <div className="space-y-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Manual Attendance Marking
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Click on a student to toggle attendance status: Pending → Present → Absent → Pending
            </CardDescription>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg md:text-xl font-bold text-slate-700 dark:text-slate-300">{stats.pending}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
              <p className="text-xs text-green-700 dark:text-green-300">Present</p>
              <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400">{stats.present}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
              <p className="text-xs text-red-700 dark:text-red-300">Absent</p>
              <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400">{stats.absent}</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or enrollment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-lg text-sm"
            />
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200 text-xs md:text-sm">
              Manual marking will be recorded if QR attendance hasn't been marked. Once QR is scanned, manual changes
              will be locked.
            </AlertDescription>
          </Alert>
        </div>
      </CardHeader>

      <CardContent className="px-4 md:px-6 pb-4">
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No students found</p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const status = manualAttendance[student.id] || "pending"
              const isQRScanned = student.attendance_status === "present" && student.scanned_at

              return (
                <button
                  key={student.id}
                  onClick={() => !isQRScanned && handleToggleAttendance(student.id, status)}
                  disabled={loading === student.id || isQRScanned}
                  className={`w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 border rounded-lg transition-colors ${getStatusColor(status)} ${
                    isQRScanned ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-sm md:text-base truncate">{student.full_name}</p>
                    <p className="text-xs md:text-sm text-muted-foreground truncate">{student.enrollment_number}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isQRScanned && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs">
                        <AlertCircle className="w-3 h-3 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-yellow-700 dark:text-yellow-300">QR Locked</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/50 dark:bg-slate-800/50">
                      {getStatusIcon(status)}
                      <span className="text-xs md:text-sm font-medium">{getStatusLabel(status)}</span>
                    </div>

                    {loading === student.id && (
                      <div className="ml-2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
