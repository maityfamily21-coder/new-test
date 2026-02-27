"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Users, Search, Check, X, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Student {
  id: number
  full_name: string
  enrollment_number: string
  attendance_status: string
  scanned_at?: string
}

interface StudentTab {
  courseId: number
  semester: number
  examId: number
  subjectId: number
  label: string
  students: Student[]
}

interface ExamAttendanceTableProps {
  students: Student[]
  examId: number
  subjectId: number
  courseId?: number
  semester?: number
  searchQuery?: string
  onAttendanceMarked?: (studentId: number, studentName: string) => void
  isBulkMode?: boolean
  bulkTabs?: StudentTab[]
}

export function ExamAttendanceTable({
  students,
  examId,
  subjectId,
  courseId,
  semester,
  searchQuery = "",
  onAttendanceMarked,
  isBulkMode = false,
  bulkTabs = [],
}: ExamAttendanceTableProps) {
  const { toast } = useToast()
  const [localStudents, setLocalStudents] = useState<Student[]>(students)
  const [searchInput, setSearchInput] = useState(searchQuery)
  const [activeTab, setActiveTab] = useState<string>(isBulkMode && bulkTabs.length > 0 ? "0" : "main")
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    setLocalStudents(students)
  }, [students])

  const filteredStudents = localStudents.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchInput.toLowerCase()) ||
      student.enrollment_number.toLowerCase().includes(searchInput.toLowerCase()),
  )

  const handleManualMarking = async (studentId: number, currentStatus: string) => {
    let newStatus: string
    if (currentStatus === "present") {
      newStatus = "absent"
    } else if (currentStatus === "absent") {
      newStatus = "pending"
    } else {
      newStatus = "present"
    }

    setIsUpdating(true)
    try {
      const response = await fetch("/api/admin/exams/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: examId,
          student_id: studentId,
          subject_id: subjectId,
          course_id: courseId || 0,
          semester: semester || 0,
          status: newStatus,
        }),
      })

      if (response.ok) {
        const student = localStudents.find((s) => s.id === studentId)
        if (student) {
          const updatedStudents = localStudents.map((s) =>
            s.id === studentId ? { ...s, attendance_status: newStatus, scanned_at: new Date().toISOString() } : s,
          )
          setLocalStudents(updatedStudents)

          const statusText =
            newStatus === "present" ? "marked Present" : newStatus === "absent" ? "marked Absent" : "marked Pending"
          toast({
            title: "Success",
            description: `${student.full_name} ${statusText}`,
          })

          onAttendanceMarked?.(studentId, student.full_name)
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to update attendance",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[MYT] Marking error:", error)
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
      case "absent":
        return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
      case "pending":
      default:
        return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
      case "absent":
        return <X className="w-4 h-4 text-red-600 dark:text-red-400" />
      case "pending":
      default:
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "present":
        return "Present"
      case "absent":
        return "Absent"
      case "pending":
      default:
        return "Pending"
    }
  }

  const renderStudentList = (studentsToRender: Student[]) => {
    const filteredList = studentsToRender.filter(
      (student) =>
        student.full_name.toLowerCase().includes(searchInput.toLowerCase()) ||
        student.enrollment_number.toLowerCase().includes(searchInput.toLowerCase()),
    )

    if (filteredList.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No students found</div>
    }

    return (
      <div className="space-y-2 max-h-[70vh] overflow-y-auto">
        {filteredList.map((student) => (
          <div
            key={student.id}
            onClick={() => handleManualMarking(student.id, student.attendance_status)}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 border rounded-lg transition-all cursor-pointer hover:shadow-md ${getStatusColor(student.attendance_status)}`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm md:text-base truncate">{student.full_name}</p>
              <p className="text-xs md:text-sm text-muted-foreground truncate">{student.enrollment_number}</p>
              {student.scanned_at && (
                <p className="text-xs text-muted-foreground">{new Date(student.scanned_at).toLocaleTimeString()}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                  student.attendance_status === "present"
                    ? "bg-green-100 dark:bg-green-900/30"
                    : student.attendance_status === "absent"
                      ? "bg-red-100 dark:bg-red-900/30"
                      : "bg-amber-100 dark:bg-amber-900/30"
                }`}
              >
                {getStatusIcon(student.attendance_status)}
                <span className="text-xs md:text-sm font-medium">{getStatusLabel(student.attendance_status)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Card className="border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-900/50 overflow-hidden">
      <CardHeader className="pb-4 pt-4 px-4 md:px-6">
        <div className="space-y-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Live Attendance Status
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Click on a student to cycle: Pending → Present → Absent → Pending. Instant saves.
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or enrollment..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 rounded-lg text-sm"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 md:px-6 pb-4">
        {isBulkMode && bulkTabs.length > 0 ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6 mb-4">
              <TabsList className="inline-flex gap-2 w-max">
                {bulkTabs.map((tab, index) => (
                  <TabsTrigger
                    key={index}
                    value={index.toString()}
                    className="text-xs md:text-sm py-1 whitespace-nowrap flex-shrink-0"
                  >
                    <div className="flex flex-col items-center gap-0">
                      <span className="truncate max-w-[100px]">{tab.label}</span>
                      <span className="text-xs opacity-75">
                        {tab.students.filter((s) => s.attendance_status === "present").length}/{tab.students.length}
                      </span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {bulkTabs.map((tab, index) => (
              <TabsContent key={index} value={index.toString()} className="mt-4">
                {renderStudentList(tab.students)}
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          renderStudentList(filteredStudents)
        )}
      </CardContent>
    </Card>
  )
}
