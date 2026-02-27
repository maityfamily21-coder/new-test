"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Calendar, Plus, Loader2, CheckCircle2, AlertCircle, Trash2, ArrowLeft, Users, CheckCheck, BookOpen, Clock, FileText, Filter } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import Link from "next/link"
import { AssignTutorMarksDialog } from "@/components/assign-tutor-marks-dialog"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface Course {
  id: number
  name: string
  total_semesters: number
}

interface Subject {
  id: number
  name: string
  code: string
  semester: number
}

interface SubjectExamData {
  subject_id: number
  subject_name: string
  total_marks: number
  exam_date: string
  exam_end_time: string
}

interface ExamSubject {
  subject_id: number
  subject_name: string
  total_marks: number
}

interface Exam {
  id: number
  exam_name: string
  exam_date: string
  course_id: number
  course_name: string
  semester: number
  subjects: ExamSubject[]
}

interface ExamSubjectDetails {
  subject_id: number
  subject_name: string
  total_marks: number
  total_students: number
  scanned_count: number
  students: Array<{
    id: number
    full_name: string
    enrollment_number: string
    attendance_status: string
  }>
}

interface PCRequestSubject {
  subject_id: number
  subject_name: string
  subject_code: string
  request_count: number
  students: Array<{
    student_id: number
    student_name: string
    enrollment_number: string
    requested_at: string
  }>
}

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 10 },
  },
}

export default function ExamsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [filterCourse, setFilterCourse] = useState("all")
  const [filterSemester, setFilterSemester] = useState("all")
  const [examName, setExamName] = useState("")
  const [subjectExamData, setSubjectExamData] = useState<Map<number, SubjectExamData>>(new Map())
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState("create")
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    exam: Exam | null
    courseId?: number
    semester?: number
  }>({ open: false, exam: null })
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteExamName, setDeleteExamName] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<ExamSubjectDetails | null>(null)
  const [subjectDetailsLoading, setSubjectDetailsLoading] = useState(false)
  const [downloadingExamId, setDownloadingExamId] = useState<number | null>(null)
  const [marksAssignmentDialog, setMarksAssignmentDialog] = useState<{
    open: boolean
    exam: Exam | null
  }>({ open: false, exam: null })

  const [pcRequestsDialog, setPcRequestsDialog] = useState<{
    open: boolean
    exam: Exam | null
    pcRequests: PCRequestSubject[]
    loading: boolean
    selectedSubject: PCRequestSubject | null
  }>({ open: false, exam: null, pcRequests: [], loading: false, selectedSubject: null })

  useEffect(() => {
    const checkAuth = () => {
      const adminAuth = localStorage.getItem("adminAuth")
      if (!adminAuth) {
        router.push("/admin/login")
        return
      }
      setIsAuthenticated(true)
      loadCourses()
      loadExams()
    }
    checkAuth()
  }, [router])

  const loadCourses = async () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch("/api/admin/courses", {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        // Handle both response formats: { success, courses } or array
        const coursesList = data.success ? data.courses : Array.isArray(data) ? data : []
        setCourses(coursesList)
      }
    } catch (error) {
      console.error("Error loading courses:", error)
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      })
    }
  }

  const loadSubjects = async (courseId: string, semester: string) => {
    if (!courseId || !semester) return
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/subjects?courseId=${courseId}&semester=${semester}`, {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setSubjects(Array.isArray(data) ? data : [])
        setSubjectExamData(new Map())
      }
    } catch (error) {
      console.error("Error loading subjects:", error)
      toast({
        title: "Error",
        description: "Failed to load subjects",
        variant: "destructive",
      })
    }
  }

  const loadExams = async () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch("/api/admin/exams", {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setExams(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error("Error loading exams:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId)
    setSelectedSemester("")
    setSubjects([])
    setSubjectExamData(new Map())
  }

  const handleSemesterChange = (semester: string) => {
    setSelectedSemester(semester)
    setSubjectExamData(new Map())
    loadSubjects(selectedCourse, semester)
  }

  const handleSubjectDataChange = (subjectId: number, subject: Subject, field: string, value: string) => {
    const newMap = new Map(subjectExamData)
    const existing = newMap.get(subjectId) || {
      subject_id: subjectId,
      subject_name: subject.name,
      total_marks: 0,
      exam_date: "",
      exam_end_time: "",
    }

    if (field === "marks") {
      existing.total_marks = value ? Number.parseInt(value) : 0
    } else if (field === "start_time") {
      if (value) {
        existing.exam_date = value
      } else {
        existing.exam_date = ""
      }
    } else if (field === "end_time") {
      if (value) {
        existing.exam_end_time = value
      } else {
        existing.exam_end_time = ""
      }
    }

    newMap.set(subjectId, existing)
    setSubjectExamData(newMap)
  }

  const removeSubject = (subjectId: number) => {
    const newMap = new Map(subjectExamData)
    newMap.delete(subjectId)
    setSubjectExamData(newMap)
  }

  const handleCreateExam = async () => {
    if (!selectedCourse || !selectedSemester || !examName || subjectExamData.size === 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all fields and select at least one subject with marks, start time, and end time",
        variant: "destructive",
      })
      return
    }

    const incompleteSubjects = Array.from(subjectExamData.values()).filter(
      (data) => !data.total_marks || !data.exam_date || !data.exam_end_time,
    )

    if (incompleteSubjects.length > 0) {
      toast({
        title: "Validation Error",
        description: "All selected subjects must have marks, start time, and end time",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const examPayload = {
        course_id: Number.parseInt(selectedCourse),
        semester: Number.parseInt(selectedSemester),
        exam_name: examName,
        subjects: Array.from(subjectExamData.values()).map((data) => ({
          subject_id: data.subject_id,
          total_marks: data.total_marks,
          exam_date: data.exam_date,
          exam_end_time: data.exam_end_time,
        })),
      }

      console.log("[MYT] Sending exam payload:", JSON.stringify(examPayload, null, 2))

      const adminToken = localStorage.getItem("adminAuth")
      console.log("[MYT] Admin token present:", !!adminToken)
      console.log("[MYT] Token length:", adminToken?.length)

      if (!adminToken) {
        toast({
          title: "Authentication Error",
          description: "Admin token not found. Please login again.",
          variant: "destructive",
        })
        setIsCreating(false)
        return
      }

      const response = await fetch("/api/admin/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(examPayload),
      })

      const responseData = await response.json()
      console.log("[MYT] Response status:", response.status)
      console.log("[MYT] Response:", responseData)

      if (response.ok) {
        toast({
          title: "Success",
          description: "Exam Created Successfully",
          variant: "default",
        })
        setExamName("")
        setSelectedCourse("")
        setSelectedSemester("")
        setSubjectExamData(new Map())
        loadExams()
      } else {
        toast({
          title: "Error",
          description: responseData.message || `Failed to create exam: ${response.statusText}`,
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[MYT] Create exam error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create exam",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteExam = async () => {
    if (!deleteDialog.exam) return
    if (deleteExamName !== deleteDialog.exam.exam_name) {
      toast({
        title: "Error",
        description: "Exam name does not match. Please type the exact exam name.",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/exams/${deleteDialog.exam.id}/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: data.message || "Exam deleted successfully along with all related data",
          variant: "default",
        })
        setDeleteDialog({ open: false, exam: null })
        setDeleteExamName("")
        loadExams()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete exam",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exam",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const loadSubjectDetails = async (examId: number, subjectId: number, courseId: number, semester: number) => {
    setSubjectDetailsLoading(true)
    try {
      const response = await fetch(
        `/api/admin/exams/${examId}/students-by-subject?courseId=${courseId}&semester=${semester}&subjectId=${subjectId}`,
      )
      if (response.ok) {
        const students = await response.json()
        const scannedCount = students.filter((s: any) => s.attendance_status === "present").length
        const absentCount = students.length - scannedCount

        setSelectedSubject({
          subject_id: subjectId,
          subject_name: "",
          total_marks: 0,
          total_students: students.length,
          scanned_count: scannedCount,
          students: students,
        })
      }
    } catch (error) {
      console.error("[MYT] Error loading subject details:", error)
      toast({
        title: "Error",
        description: "Failed to load subject details",
        variant: "destructive",
      })
    } finally {
      setSubjectDetailsLoading(false)
    }
  }

  const handleDownloadAllHallTickets = async (exam: Exam) => {
    setDownloadingExamId(exam.id)
    try {
      const response = await fetch(`/api/admin/exams/${exam.id}/hall-tickets-all`)
      if (!response.ok) {
        throw new Error("Failed to download hall tickets")
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Hall_Tickets_${exam.exam_name}_${exam.course_name}_Sem${exam.semester}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      toast({
        title: "Success",
        description: "Hall tickets downloaded successfully",
        variant: "default",
      })
    } catch (error: any) {
      console.error("Error downloading hall tickets:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to download hall tickets",
        variant: "destructive",
      })
    } finally {
      setDownloadingExamId(null)
    }
  }

  const loadPCRequests = async (exam: Exam) => {
    setPcRequestsDialog({ open: true, exam, pcRequests: [], loading: true, selectedSubject: null })

    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/exams/${exam.id}/pc-requests`, {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPcRequestsDialog((prev) => ({ ...prev, pcRequests: data, loading: false }))
      } else {
        toast({
          title: "Error",
          description: "Failed to load PC requests",
          variant: "destructive",
        })
        setPcRequestsDialog((prev) => ({ ...prev, loading: false }))
      }
    } catch (error) {
      console.error("Error loading PC requests:", error)
      toast({
        title: "Error",
        description: "Failed to load PC requests",
        variant: "destructive",
      })
      setPcRequestsDialog((prev) => ({ ...prev, loading: false }))
    }
  }

  if (!isAuthenticated) {
    return null
  }

  const selectedCourseData = courses.find((c) => c.id === Number.parseInt(selectedCourse || "0"))
  const filterCourseData = courses.find((c) => c.id === Number.parseInt(filterCourse || "0"))
  const filteredExams = exams.filter((exam) => {
    if (filterCourse !== "all" && exam.course_id !== Number.parseInt(filterCourse)) return false
    if (filterSemester !== "all" && exam.semester !== Number.parseInt(filterSemester)) return false
    return true
  })

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[150px]" />
      </div>

      <motion.div 
        className="container relative z-10 mx-auto px-4 sm:px-6 py-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:text-indigo-600 dark:hover:text-indigo-400">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-gray-200 dark:to-gray-500 bg-clip-text text-transparent flex items-center gap-3">
                <Calendar className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                Exam Management
              </h1>
              <p className="text-sm text-muted-foreground dark:text-gray-400 mt-1">Create and manage exams for courses and semesters</p>
            </div>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 dark:bg-zinc-900 grid w-full grid-cols-3 max-w-[600px] mb-6">
            <TabsTrigger value="create">Create Exam</TabsTrigger>
            <TabsTrigger value="list">View Exams</TabsTrigger>
            <TabsTrigger value="delete">Delete Exam</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6 mt-6">
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5 text-indigo-500" /> Create New Exam</CardTitle>
                <CardDescription>Set up an exam with subjects, marks, and dates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Course Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="course-select" className="text-xs font-semibold uppercase text-muted-foreground">Course</Label>
                    <Select value={selectedCourse} onValueChange={handleCourseChange}>
                      <SelectTrigger id="course-select" className="bg-white dark:bg-zinc-900">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Semester Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="semester-select" className="text-xs font-semibold uppercase text-muted-foreground">Semester</Label>
                    <Select value={selectedSemester} onValueChange={handleSemesterChange} disabled={!selectedCourse}>
                      <SelectTrigger id="semester-select" className="bg-white dark:bg-zinc-900">
                        <SelectValue placeholder="Select a semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: selectedCourseData?.total_semesters || 0 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            Semester {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Exam Name */}
                  <div className="space-y-2">
                    <Label htmlFor="exam-name" className="text-xs font-semibold uppercase text-muted-foreground">Exam Name</Label>
                    <Input
                      id="exam-name"
                      placeholder="e.g., Mid-term, Final"
                      value={examName}
                      onChange={(e) => setExamName(e.target.value)}
                      disabled={!selectedSemester}
                      className="bg-white dark:bg-zinc-900"
                    />
                  </div>
                </div>

                {/* Subject Selection with Marks and Date/Time */}
                {subjects.length > 0 && (
                  <div className="space-y-3">
                    <Label className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500" /> Subjects - Enter Marks, Start Time & End Time</Label>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                      {subjects.map((subject) => {
                        const data = subjectExamData.get(subject.id)
                        return (
                          <div key={subject.id} className={cn(
                            "bg-slate-50/50 dark:bg-white/5 p-4 rounded-lg border border-slate-200 dark:border-white/10 transition-all",
                            data && "border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-400/20"
                          )}>
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-medium text-foreground">{subject.name}</p>
                                <p className="text-xs text-muted-foreground">{subject.code}</p>
                              </div>
                              {data && (
                                <button
                                  type="button"
                                  onClick={() => removeSubject(subject.id)}
                                  className="text-destructive hover:text-destructive/80 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div>
                                <Label className="text-xs text-muted-foreground">Total Marks</Label>
                                <Input
                                  type="number"
                                  placeholder="100"
                                  min="0"
                                  value={data?.total_marks || ""}
                                  onChange={(e) =>
                                    handleSubjectDataChange(subject.id, subject, "marks", e.target.value)
                                  }
                                  className="mt-1 text-sm h-8 bg-white dark:bg-zinc-900"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Start Time</Label>
                                <Input
                                  type="datetime-local"
                                  value={data?.exam_date || ""}
                                  onChange={(e) =>
                                    handleSubjectDataChange(subject.id, subject, "start_time", e.target.value)
                                  }
                                  className="mt-1 text-sm h-8 bg-white dark:bg-zinc-900"
                                />
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">End Time</Label>
                                <Input
                                  type="datetime-local"
                                  value={data?.exam_end_time || ""}
                                  onChange={(e) =>
                                    handleSubjectDataChange(subject.id, subject, "end_time", e.target.value)
                                  }
                                  className="mt-1 text-sm h-8 bg-white dark:bg-zinc-900"
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Selected Subjects Summary */}
                {subjectExamData.size > 0 && (
                  <Card className="bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900">
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                        SELECTED SUBJECTS ({subjectExamData.size})
                      </p>
                      <div className="space-y-1">
                        {Array.from(subjectExamData.values()).map((data) => (
                          <p key={data.subject_id} className="text-sm text-indigo-900 dark:text-indigo-200">
                            {data.subject_name} — {data.total_marks} marks •{" "}
                            {data.exam_date && (
                              <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                                {new Date(data.exam_date).toLocaleString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                            {data.exam_end_time && (
                              <span className="text-muted-foreground">
                                {" "}
                                to{" "}
                                {new Date(data.exam_end_time).toLocaleString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Button
                  onClick={handleCreateExam}
                  disabled={isCreating || subjectExamData.size === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                  size="sm"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Exam
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="list" className="space-y-4 mt-6">
            {/* Filter Section */}
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Filter className="w-4 h-4" /> Filter Exams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Course Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-course" className="text-xs font-semibold uppercase text-muted-foreground">Course</Label>
                    <Select
                      value={filterCourse}
                      onValueChange={(value) => {
                        setFilterCourse(value)
                        setFilterSemester("all")
                      }}
                    >
                      <SelectTrigger id="filter-course" className="bg-white dark:bg-zinc-900">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Semester Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="filter-semester" className="text-xs font-semibold uppercase text-muted-foreground">Semester</Label>
                    <Select value={filterSemester} onValueChange={setFilterSemester} disabled={filterCourse === "all"}>
                      <SelectTrigger id="filter-semester" className="bg-white dark:bg-zinc-900">
                        <SelectValue placeholder="Select a semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {filterCourse !== "all" &&
                          filterCourseData &&
                          Array.from({ length: filterCourseData.total_semesters }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              Semester {i + 1}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Filter Summary */}
                {(filterCourse !== "all" || filterSemester !== "all") && (
                  <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900 rounded-lg">
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                      Showing {filteredExams.length} exam{filteredExams.length !== 1 ? "s" : ""}
                      {filterCourse !== "all" && ` in ${filterCourseData?.name}`}
                      {filterSemester !== "all" && ` - Semester ${filterSemester}`}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Exams List */}
            {loading ? (
              <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardContent className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                </CardContent>
              </Card>
            ) : filteredExams.length === 0 ? (
              <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {exams.length === 0 ? "No exams created yet" : "No exams match your filter criteria"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredExams.map((exam) => (
                  <Card key={exam.id} className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-indigo-950 dark:text-indigo-100 mb-2">{exam.exam_name}</h3>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <p>Course: {exam.course_name || `Course ${exam.course_id}`}</p>
                            <p>Semester: {exam.semester}</p>
                            <p className="font-medium text-indigo-600 dark:text-indigo-400">Subjects:</p>
                            <div className="ml-3 space-y-1">
                              {exam.subjects.map((s) => (
                                <p key={s.subject_id} className="text-foreground">
                                  {s.subject_name} ({s.total_marks}M){" "}
                                  {s.exam_date && (
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                                      Start:{" "}
                                      {new Date(s.exam_date).toLocaleString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      {s.exam_end_time && (
                                        <>
                                          {" "}
                                          End:{" "}
                                          {new Date(s.exam_end_time).toLocaleString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </>
                                      )}
                                    </span>
                                  )}
                                </p>
                              ))}
                            </div>
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              onClick={() => handleDownloadAllHallTickets(exam)}
                              disabled={downloadingExamId === exam.id}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            >
                              {downloadingExamId === exam.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <FileText className="w-4 h-4 mr-2" />
                                  Download All Hall Tickets
                                </>
                              )}
                            </Button>
                            {/* Assign Tutor Button for Marks Entry */}
                            <Button
                              onClick={() => setMarksAssignmentDialog({ open: true, exam })}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Assign Tutor for Marks
                            </Button>
                            {/* View PC Requests button */}
                            <Button
                              onClick={() => loadPCRequests(exam)}
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              View PC Requests
                            </Button>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {exam.subjects.map((subject) => (
                              <button
                                key={subject.subject_id}
                                onClick={() => {
                                  const examSubject = { ...subject, subject_name: subject.subject_name }
                                  setSelectedSubject(examSubject as any)
                                  loadSubjectDetails(exam.id, subject.subject_id, exam.course_id, exam.semester)
                                }}
                                className="text-xs bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded transition-colors"
                              >
                                {subject.subject_name}
                                {subject.exam_date && (
                                  <span className="ml-1 text-muted-foreground text-xs">
                                    (
                                    {new Date(subject.exam_date).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                    )
                                  </span>
                                )}
                                {subject.exam_end_time && (
                                  <span className="ml-1 text-muted-foreground text-xs">
                                    {" "}
                                    to{" "}
                                    {new Date(subject.exam_end_time).toLocaleString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="delete" className="space-y-6 mt-6">
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-red-200 dark:border-red-900/30 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5"/> Delete Exam</CardTitle>
                <CardDescription>
                  Select and delete an exam. This will permanently remove the exam and all related data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Course Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="delete-course" className="text-xs font-semibold uppercase text-muted-foreground">Course</Label>
                    <Select value={selectedCourse} onValueChange={handleCourseChange}>
                      <SelectTrigger id="delete-course" className="bg-white dark:bg-zinc-900">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Semester Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="delete-semester" className="text-xs font-semibold uppercase text-muted-foreground">Semester</Label>
                    <Select value={selectedSemester} onValueChange={handleSemesterChange} disabled={!selectedCourse}>
                      <SelectTrigger id="delete-semester" className="bg-white dark:bg-zinc-900">
                        <SelectValue placeholder="Select a semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: selectedCourseData?.total_semesters || 0 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            Semester {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Exams for deletion */}
                {selectedSemester && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Select Exam to Delete</Label>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {exams
                        .filter(
                          (e) =>
                            e.course_id === Number.parseInt(selectedCourse) &&
                            e.semester === Number.parseInt(selectedSemester),
                        )
                        .map((exam) => (
                          <div
                            key={exam.id}
                            className="bg-slate-50/50 dark:bg-white/5 p-3 rounded-lg border border-slate-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-800 transition-colors cursor-pointer"
                            onClick={() =>
                              setDeleteDialog({
                                open: true,
                                exam,
                                courseId: exam.course_id,
                                semester: exam.semester,
                              })
                            }
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground text-sm">{exam.exam_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(exam.exam_date).toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {exam.subjects.map((s) => s.subject_name).join(", ")}
                                </p>
                              </div>
                              <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-1" />
                            </div>
                          </div>
                        ))}
                      {exams.filter(
                        (e) =>
                          e.course_id === Number.parseInt(selectedCourse) &&
                          e.semester === Number.parseInt(selectedSemester),
                      ).length === 0 && (
                        <div className="text-center py-6">
                          <p className="text-sm text-muted-foreground">No exams found for this course and semester</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, exam: null })}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              Delete Exam
            </DialogTitle>
            <DialogDescription>Are you sure you want to delete "{deleteDialog.exam?.exam_name}"?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 dark:text-red-300">This will permanently remove:</p>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 ml-4 list-disc">
                <li>All exam subjects and marks</li>
                <li>All student QR codes</li>
                <li>All attendance records</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="delete-confirm">Type exam name to confirm:</Label>
              <Input
                id="delete-confirm"
                placeholder={`Type "${deleteDialog.exam?.exam_name}"`}
                value={deleteExamName}
                onChange={(e) => setDeleteExamName(e.target.value)}
                className="bg-white dark:bg-zinc-900"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialog({ open: false, exam: null })
                  setDeleteExamName("")
                }}
                size="sm"
                className="border-slate-200 dark:border-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteExam}
                disabled={isDeleting || deleteExamName !== deleteDialog.exam?.exam_name}
                variant="destructive"
                size="sm"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subject Details Modal showing attendance information */}
      <Dialog
        open={selectedSubject !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSubject(null)
        }}
      >
        <DialogContent className="max-w-2xl max-h-96 overflow-y-auto bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Attendance Details
            </DialogTitle>
            <DialogDescription>
              {selectedSubject?.subject_name} - Total: {selectedSubject?.total_students} students
            </DialogDescription>
          </DialogHeader>

          {subjectDetailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mr-2" />
              <span>Loading attendance data...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-bold">Total Students</p>
                    <p className="text-lg font-bold text-foreground">{selectedSubject?.total_students}</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CardContent className="p-3">
                    <p className="text-xs text-green-700 dark:text-green-300 uppercase tracking-wide font-bold">Scanned</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      {selectedSubject?.scanned_count}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                  <CardContent className="p-3">
                    <p className="text-xs text-red-700 dark:text-red-300 uppercase tracking-wide font-bold">Absent</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {(selectedSubject?.total_students || 0) - (selectedSubject?.scanned_count || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Student List */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Student Attendance</p>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {selectedSubject?.students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-2 bg-slate-50/50 dark:bg-zinc-900 rounded text-xs border border-slate-100 dark:border-white/5">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{student.full_name}</p>
                        <p className="text-muted-foreground">{student.enrollment_number}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {student.attendance_status === "present" ? (
                          <>
                            <CheckCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-green-600 dark:text-green-400 font-medium">Scanned</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-red-600 dark:text-red-400 font-medium">Absent</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PC Requests Dialog */}
      <Dialog
        open={pcRequestsDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setPcRequestsDialog({ open: false, exam: null, pcRequests: [], loading: false, selectedSubject: null })
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              PC Requests for Exam
            </DialogTitle>
            <DialogDescription>
              {pcRequestsDialog.exam && `View PC setup requests for ${pcRequestsDialog.exam.exam_name}`}
            </DialogDescription>
          </DialogHeader>

          {pcRequestsDialog.loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mr-2" />
              <span>Loading PC requests...</span>
            </div>
          ) : pcRequestsDialog.selectedSubject ? (
            // Show student details for selected subject
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{pcRequestsDialog.selectedSubject.subject_name}</h3>
                  <p className="text-sm text-muted-foreground">Code: {pcRequestsDialog.selectedSubject.subject_code}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPcRequestsDialog((prev) => ({ ...prev, selectedSubject: null }))}
                  className="border-slate-200 dark:border-white/10"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>

              <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-100 dark:bg-zinc-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Student Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Enrollment Number</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Requested On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {pcRequestsDialog.selectedSubject.students.map((student, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-zinc-900">
                        <td className="px-4 py-3 text-sm">{student.student_name}</td>
                        <td className="px-4 py-3 text-sm font-mono">{student.enrollment_number}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {new Date(student.requested_at).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : pcRequestsDialog.pcRequests.length > 0 ? (
            // Show subject-wise PC requests
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Click on a subject to view student details</p>
              <div className="grid gap-3">
                {pcRequestsDialog.pcRequests.map((subject) => (
                  <button
                    key={subject.subject_id}
                    onClick={() => setPcRequestsDialog((prev) => ({ ...prev, selectedSubject: subject }))}
                    className="flex items-center justify-between p-4 border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-900 transition-colors text-left"
                  >
                    <div>
                      <h3 className="font-medium">{subject.subject_name}</h3>
                      <p className="text-sm text-muted-foreground">Code: {subject.subject_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full text-sm font-medium">
                        {subject.request_count} {subject.request_count === 1 ? "request" : "requests"}
                      </div>
                      <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No PC setup requests found for this exam</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Marks Assignment Dialog */}
      {marksAssignmentDialog.exam && (
        <AssignTutorMarksDialog
          open={marksAssignmentDialog.open}
          onOpenChange={(open) => setMarksAssignmentDialog({ open, exam: marksAssignmentDialog.exam })}
          exam={marksAssignmentDialog.exam}
          onSuccess={() => {
            setMarksAssignmentDialog({ open: false, exam: null })
            loadExams()
            toast({
              title: "Success",
              description: "Tutor assigned successfully for marks entry",
            })
          }}
        />
      )}
    </div>
  )
}
