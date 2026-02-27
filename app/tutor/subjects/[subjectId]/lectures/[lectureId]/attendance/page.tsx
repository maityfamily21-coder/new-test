"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Save, Users, Check, X, Search, UserCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { TutorQRScanner } from "@/components/tutor-qr-scanner"
import { Input } from "@/components/ui/input"

interface Student {
  id: number
  full_name: string
  enrollment_number: string
  attendance_status: string
  marked_by_name?: string
}

export default function AttendancePage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const lectureId = params.lectureId as string
  const subjectId = params.subjectId as string
  const [students, setStudents] = useState<Student[]>([])
  const [tutor, setTutor] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [attendance, setAttendance] = useState<{ [key: number]: string }>({})
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const tutorAuth = localStorage.getItem("tutorAuth")
    if (!tutorAuth) {
      router.push("/tutor/login")
      return
    }

    try {
      const tutorData = JSON.parse(tutorAuth)
      setTutor(tutorData)
    } catch (e) {
      console.error("Failed to parse tutor auth")
    }

    fetchAttendance()
  }, [router, lectureId])

  const fetchAttendance = async () => {
    try {
      const response = await fetch(`/api/tutor/lectures/${lectureId}/attendance`)
      const data = await response.json()
      if (data.success) {
        setStudents(data.students)
        const attendanceMap: { [key: number]: string } = {}
        data.students.forEach((student: Student) => {
          attendanceMap[student.id] = student.attendance_status === "Not Marked" ? "" : student.attendance_status
        })
        setAttendance(attendanceMap)
      }
    } catch (error) {
      console.error("Error fetching attendance:", error)
      toast({ title: "Error", description: "Failed to fetch attendance", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceChange = (studentId: number, status: string) => {
    setAttendance({
      ...attendance,
      [studentId]: attendance[studentId] === status ? "" : status,
    })
  }

  const handleQRAttendanceMarked = (studentId: number, studentName: string) => {
    setAttendance({
      ...attendance,
      [studentId]: "Present",
    })
    toast({ title: "Success", description: `Attendance marked for ${studentName}` })
  }

  const markAll = (status: "Present" | "Absent") => {
    const newAttendance = { ...attendance };
    students.forEach((student) => {
      newAttendance[student.id] = status;
    });
    setAttendance(newAttendance);
    toast({ title: "Success", description: `All students marked as ${status}` });
  };

  const handleSaveAttendance = async () => {
    setSaving(true)

    try {
      const attendanceData = Object.entries(attendance)
        .filter(([_, status]) => status !== "")
        .map(([studentId, status]) => ({
          studentId: Number.parseInt(studentId),
          status,
        }))

      const response = await fetch(`/api/tutor/lectures/${lectureId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance: attendanceData,
          tutorId: tutor?.id, // Pass current tutor ID to track who marked attendance
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Attendance saved successfully" })
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error saving attendance:", error)
      toast({ title: "Error", description: "Failed to save attendance", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const presentCount = Object.values(attendance).filter((s) => s === "Present").length
  const absentCount = Object.values(attendance).filter((s) => s === "Absent").length
  const notMarkedCount = students.length - presentCount - absentCount

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.enrollment_number.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/30 border-t-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading attendance...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href={`/tutor/subjects/${subjectId}/lectures`}>
              <Button variant="outline" size="icon" className="rounded-lg bg-transparent">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Mark Attendance</h1>
              <p className="text-sm md:text-base text-muted-foreground">Mark attendance for students in this lecture</p>
            </div>
          </div>
          <Button
            onClick={handleSaveAttendance}
            disabled={saving}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white rounded-lg gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Attendance"}
          </Button>
        </div>

        {/* QR Scanner */}
        {qrScannerOpen && (
          <TutorQRScanner
            lectureId={Number.parseInt(lectureId)}
            onAttendanceMarked={handleQRAttendanceMarked}
            onClose={() => setQrScannerOpen(false)}
          />
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-900/50 rounded-lg">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Students</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{students.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20 rounded-lg">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300">Present</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{presentCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 rounded-lg">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-red-700 dark:text-red-300">Absent</p>
                <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">{absentCount}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg">
            <CardContent className="p-4">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-300">Not Marked</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400">{notMarkedCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Scanner Button */}
        <Button
          onClick={() => setQrScannerOpen(!qrScannerOpen)}
          variant={qrScannerOpen ? "default" : "outline"}
          className="w-full md:w-auto gap-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
        >
          📱 {qrScannerOpen ? "Close QR Scanner" : "Open QR Scanner"}
        </Button>
        <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
          <Button
            type="button"
            onClick={() => markAll("Present")}
            variant="outline"
            className="flex-1 md:w-auto gap-2 rounded-lg border-green-600 text-green-600 hover:bg-green-50"
          >
            <Check className="w-4 h-4" /> Present All
          </Button>
          <Button
            type="button"
            onClick={() => markAll("Absent")}
            variant="outline"
            className="flex-1 md:w-auto gap-2 rounded-lg border-red-600 text-red-600 hover:bg-red-50"
          >
            <X className="w-4 h-4" /> Absent All
          </Button>
        </div>

        {/* Student Attendance List */}
        <Card className="border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-900/50 rounded-lg overflow-hidden">
          <CardHeader className="pb-4 pt-4 px-4 md:px-6">
            <div className="space-y-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Student Attendance
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Click Present or Absent to mark attendance
                </CardDescription>
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
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-6 pb-4">
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No students found</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm md:text-base truncate">{student.full_name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs md:text-sm text-muted-foreground truncate">{student.enrollment_number}</p>
                        {student.marked_by_name && (
                          <div className="flex items-center gap-1 text-[10px] md:text-xs text-blue-600 dark:text-blue-400 font-medium">
                            <UserCheck className="w-3 h-3" />
                            <span>Marked by {student.marked_by_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant={attendance[student.id] === "Present" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAttendanceChange(student.id, "Present")}
                        className={`flex-1 sm:flex-none gap-1 text-xs md:text-sm rounded-lg transition-all ${
                          attendance[student.id] === "Present"
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span className="hidden sm:inline">Present</span>
                        <span className="sm:hidden">P</span>
                      </Button>
                      <Button
                        variant={attendance[student.id] === "Absent" ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAttendanceChange(student.id, "Absent")}
                        className={`flex-1 sm:flex-none gap-1 text-xs md:text-sm rounded-lg transition-all ${
                          attendance[student.id] === "Absent"
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                      >
                        <X className="w-3 h-3" />
                        <span className="hidden sm:inline">Absent</span>
                        <span className="sm:hidden">A</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
