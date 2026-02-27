"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ExamQRScanner } from "@/components/exam-qr-scanner"
import { ExamManualAttendance } from "@/components/exam-manual-attendance"
import { ArrowLeft, Camera, Check, Home, AlertCircle, Calendar, Layers, ScanLine, Users, ListFilter } from "lucide-react"
import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BulkExamQRScanner } from "@/components/bulk-exam-qr-scanner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AttendanceSummaryStats } from "@/components/attendance-summary-stats"
import { ExamAttendanceTable } from "@/components/exam-attendance-table"
import { Input } from "@/components/ui/input"
import { DateBasedExamQRScanner } from "@/components/date-based-exam-qr-scanner"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface Course {
  id: number
  name: string
  total_semesters: number
}

interface Exam {
  id: number
  exam_name: string
  exam_date: string
}

interface Subject {
  id: number
  name: string
}

interface Student {
  id: number
  full_name: string
  enrollment_number: string
  attendance_status: string
  scanned_at?: string
}

interface SelectedCombination {
  courseId: number
  semester: number
  examId: number
  subjectId: number
}

interface StudentTab {
  courseId: number
  semester: number
  examId: number
  subjectId: number
  label: string
  students: Student[]
}

// --- Animation Variants ---
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

export default function TutorExamAttendancePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tutor, setTutor] = useState<any>(null)
  const [scanMode, setScanMode] = useState<"single" | "bulk" | "byDate">("single")

  const [courses, setCourses] = useState<Course[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])

  // Single mode state
  const [selectedCourse, setSelectedCourse] = useState("")
  const [selectedSemester, setSelectedSemester] = useState("")
  const [selectedExam, setSelectedExam] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [students, setStudents] = useState<Student[]>([])
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Bulk mode state
  const [bulkQrScannerOpen, setBulkQrScannerOpen] = useState(false)
  const [bulkSelectedCourses, setBulkSelectedCourses] = useState<Set<string>>(new Set())
  const [bulkSelectedSemesters, setBulkSelectedSemesters] = useState<Set<string>>(new Set())
  const [bulkAvailableExams, setBulkAvailableExams] = useState<
    Array<{ examId: number; examName: string; subjects: Subject[]; courseId: number; semester: number }>
  >([])
  const [bulkSelectedCombinations, setBulkSelectedCombinations] = useState<SelectedCombination[]>([])
  const [bulkStudentTabs, setBulkStudentTabs] = useState<StudentTab[]>([])

  // By Date mode state
  const [dateQrScannerOpen, setDateQrScannerOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState("")
  const [dateExamTabs, setDateExamTabs] = useState<
    Array<{
      label: string
      examId: number
      subjectId: number
      courseId: number
      semester: number
      examName: string
      students: Student[]
    }>
  >([])
  const [loadingDateExams, setLoadingDateExams] = useState(false)
  const [dateExamsRawData, setDateExamsRawData] = useState<any[]>([])

  useEffect(() => {
    const checkAuth = () => {
      const tutorAuth = localStorage.getItem("tutorAuth")
      if (!tutorAuth) {
        router.push("/tutor/login")
        return
      }

      try {
        const tutorData = JSON.parse(tutorAuth)
        setTutor(tutorData)
        setIsAuthenticated(true)
        loadCourses()
      } catch (error) {
        console.error("Failed to parse tutor auth:", error)
        localStorage.removeItem("tutorAuth")
        router.push("/tutor/login")
      }
    }
    checkAuth()
  }, [router])

  const loadCourses = async () => {
    try {
      const response = await fetch("/api/admin/courses")
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error("Error loading courses:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadExams = async (courseId: string, semester: string) => {
    if (!courseId || !semester) return
    try {
      const response = await fetch(`/api/admin/exams?courseId=${courseId}&semester=${semester}`)
      if (response.ok) {
        const data = await response.json()
        setExams(data)
      }
    } catch (error) {
      console.error("Error loading exams:", error)
    }
  }

  const loadSubjects = async (examId: string) => {
    if (!examId) return
    try {
      setSubjects([])
      const response = await fetch(`/api/admin/exams/${examId}/subjects`)
      const data = await response.json()

      if (!response.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }
      setSubjects(data)
    } catch (error) {
      toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" })
    }
  }

  const loadStudents = async (courseId: string, semester: string, examId: string, subjectId: string) => {
    if (!courseId || !semester || !examId || !subjectId) return
    try {
      const response = await fetch(
        `/api/admin/exams/${examId}/students-by-subject?courseId=${courseId}&semester=${semester}&subjectId=${subjectId}`,
      )
      if (response.ok) {
        const data = await response.json()
        setStudents(data)
      } else {
        const errorData = await response.json()
        toast({ title: "Error", description: errorData.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" })
    }
  }

  // ... (Keep existing handlers: handleCourseChange, handleSemesterChange, handleExamChange, handleSubjectChange, handleQRAttendanceMarked)
  // Simplified for brevity, assume logic remains the same

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId); setSelectedSemester(""); setSelectedExam(""); setSelectedSubject("");
    setExams([]); setSubjects([]); setStudents([]);
  }
  const handleSemesterChange = (semester: string) => {
    setSelectedSemester(semester); setSelectedExam(""); setSelectedSubject("");
    loadExams(selectedCourse, semester);
  }
  const handleExamChange = (examId: string) => {
    setSelectedExam(examId); setSelectedSubject("");
    loadSubjects(examId);
  }
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    loadStudents(selectedCourse, selectedSemester, selectedExam, subjectId);
  }
  const handleQRAttendanceMarked = (studentId: number, studentName: string) => {
    loadStudents(selectedCourse, selectedSemester, selectedExam, selectedSubject);
    toast({ title: "Success", description: `Attendance marked for ${studentName}` });
  }

  // ... (Bulk and Date Logic - exactly as provided)
  const loadBulkExams = async (courseIds: string[], semesters: string[]) => {
    if (courseIds.length === 0 || semesters.length === 0) return
    try {
      const allExams: any[] = []
      for (const courseId of courseIds) {
        for (const semester of semesters) {
          const res = await fetch(`/api/admin/exams?courseId=${courseId}&semester=${semester}`)
          if (res.ok) {
            const examsData = await res.json()
            for (const exam of examsData) {
              const subjectsRes = await fetch(`/api/admin/exams/${exam.id}/subjects`)
              if (subjectsRes.ok) {
                const subjectsData = await subjectsRes.json()
                allExams.push({ examId: exam.id, examName: exam.exam_name, subjects: subjectsData || [], courseId: Number(courseId), semester: Number(semester) })
              }
            }
          }
        }
      }
      setBulkAvailableExams(allExams)
    } catch (error) { console.error(error) }
  }

  const handleBulkCourseToggle = (courseId: string) => {
    const newCourses = new Set(bulkSelectedCourses)
    newCourses.has(courseId) ? newCourses.delete(courseId) : newCourses.add(courseId)
    setBulkSelectedCourses(newCourses)
    loadBulkExams(Array.from(newCourses), Array.from(bulkSelectedSemesters))
  }

  const handleBulkSemesterToggle = (semester: string) => {
    const newSemesters = new Set(bulkSelectedSemesters)
    newSemesters.has(semester) ? newSemesters.delete(semester) : newSemesters.add(semester)
    setBulkSelectedSemesters(newSemesters)
    loadBulkExams(Array.from(bulkSelectedCourses), Array.from(newSemesters))
  }

  const handleBulkSubjectToggle = (examId: number, subjectId: number, courseId: number, semester: number) => {
    const combination = { courseId, semester, examId, subjectId }
    const exists = bulkSelectedCombinations.some(c => c.examId === examId && c.subjectId === subjectId && c.courseId === courseId && c.semester === semester)
    if (exists) {
        setBulkSelectedCombinations(bulkSelectedCombinations.filter(c => !(c.examId === examId && c.subjectId === subjectId)))
    } else {
        setBulkSelectedCombinations([...bulkSelectedCombinations, combination])
    }
  }

  const loadBulkStudentTabs = async () => {
    const tabs: StudentTab[] = []
    for (const combo of bulkSelectedCombinations) {
      try {
        const response = await fetch(`/api/admin/exams/${combo.examId}/students-by-subject?courseId=${combo.courseId}&semester=${combo.semester}&subjectId=${combo.subjectId}`)
        if (response.ok) {
          const studentsData = await response.json()
          tabs.push({ ...combo, label: `C${combo.courseId} S${combo.semester} E${combo.examId} Sub${combo.subjectId}`, students: studentsData })
        }
      } catch (error) { console.error(error) }
    }
    setBulkStudentTabs(tabs)
  }

  useEffect(() => {
    if (bulkSelectedCombinations.length > 0 && scanMode === "bulk") loadBulkStudentTabs()
  }, [bulkSelectedCombinations, scanMode])

  const handleBulkQRAttendanceMarked = (studentId: number, studentName: string) => {
    toast({ title: "Success", description: `Marked: ${studentName}` })
    loadBulkStudentTabs()
  }

  const handleDateAttendanceMarked = (studentId: number, studentName: string, examName: string) => {
    loadExamsByDate(selectedDate)
    toast({ title: "Success", description: `${studentName} - ${examName}` })
  }

  const loadExamsByDate = async (date: string) => {
    if (!date) { setDateExamTabs([]); setDateExamsRawData([]); return }
    setLoadingDateExams(true)
    try {
      const examsResponse = await fetch(`/api/admin/exams/by-date?date=${date}`)
      if (!examsResponse.ok) { setDateExamTabs([]); return }
      const examsData = await examsResponse.json()
      const tabs = await Promise.all(examsData.map(async (exam: any) => {
        try {
          const studentsRes = await fetch(`/api/admin/exams/${exam.exam_id}/students-by-subject?courseId=${exam.course_id}&semester=${exam.semester}&subjectId=${exam.subject_id}`)
          const students = studentsRes.ok ? await studentsRes.json() : []
          return { label: `${exam.exam_name}`, examId: exam.exam_id, subjectId: exam.subject_id, courseId: exam.course_id, semester: exam.semester, examName: exam.exam_name, students: students }
        } catch { return { label: "Error", examId: 0, subjectId: 0, courseId: 0, semester: 0, examName: "", students: [] } }
      }))
      setDateExamTabs(tabs)
      setDateExamsRawData(examsData)
    } catch { setDateExamTabs([]) } finally { setLoadingDateExams(false) }
  }

  useEffect(() => { loadExamsByDate(selectedDate) }, [selectedDate])

  if (!isAuthenticated) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-violet-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-50/50 via-white to-fuchsia-50/50 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-900/20 blur-[150px]" />
      </div>

      <motion.div 
        className="container relative z-10 mx-auto px-4 sm:px-6 py-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* --- Header Section --- */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-2">
                 <Button 
                    onClick={() => router.push("/tutor/dashboard")} 
                    variant="ghost" 
                    size="sm" 
                    className="pl-0 hover:bg-transparent hover:text-violet-600 dark:hover:text-violet-400"
                 >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                 </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-300 bg-clip-text text-transparent flex items-center gap-3">
              <ScanLine className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              Exam Attendance
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Scan QR codes to mark student attendance
            </p>
          </div>
          <Link href="/tutor/dashboard">
            <Button variant="outline" className="gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-slate-200 dark:border-white/10">
                <Home className="w-4 h-4" /> Dashboard
            </Button>
          </Link>
        </motion.div>

        {/* --- Main Content Tabs --- */}
        <Tabs
          value={scanMode}
          onValueChange={(value) => setScanMode(value as "single" | "bulk" | "byDate")}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto md:mx-0 bg-slate-100 dark:bg-zinc-900">
            <TabsTrigger value="single">Single Mode</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Mode</TabsTrigger>
            <TabsTrigger value="byDate">By Date</TabsTrigger>
          </TabsList>

          {/* Single Mode Tab */}
          <TabsContent value="single" className="space-y-6 mt-6">
            <motion.div variants={itemVariants}>
                <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-violet-500" /> Configuration</CardTitle>
                        <CardDescription>Select specific exam details to start scanning</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Course</label>
                                <Select value={selectedCourse} onValueChange={handleCourseChange}>
                                    <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                                    <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            {selectedCourse && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Semester</label>
                                    <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                                        <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: courses.find(c => c.id.toString() === selectedCourse)?.total_semesters || 0 }).map((_, i) => (
                                                <SelectItem key={i+1} value={(i+1).toString()}>Semester {i+1}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                            {selectedSemester && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Exam</label>
                                    <Select value={selectedExam} onValueChange={handleExamChange}>
                                        <SelectTrigger><SelectValue placeholder="Select exam" /></SelectTrigger>
                                        <SelectContent>{exams.map(e => <SelectItem key={e.id} value={e.id.toString()}>{e.exam_name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                            {selectedExam && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Subject</label>
                                    <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                                        <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                                        <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {selectedSubject && (
                <motion.div variants={itemVariants} className="space-y-6">
                    <AttendanceSummaryStats students={students} />
                    
                    <div className="flex justify-center md:justify-start">
                        <Button
                            onClick={() => setQrScannerOpen(!qrScannerOpen)}
                            className={cn("gap-2 w-full md:w-auto", qrScannerOpen ? "bg-fuchsia-600 hover:bg-fuchsia-700" : "bg-violet-600 hover:bg-violet-700")}
                            size="lg"
                        >
                            <Camera className="w-4 h-4" />
                            {qrScannerOpen ? "Close Scanner" : "Open QR Scanner"}
                        </Button>
                    </div>

                    {qrScannerOpen && (
                        <div className="border rounded-xl overflow-hidden shadow-lg">
                            <ExamQRScanner
                                examId={Number.parseInt(selectedExam)}
                                subjectId={Number.parseInt(selectedSubject)}
                                onAttendanceMarked={handleQRAttendanceMarked}
                                onClose={() => setQrScannerOpen(false)}
                                markedByPersonnelId={tutor?.id}
                            />
                        </div>
                    )}

                    <ExamManualAttendance
                        examId={Number.parseInt(selectedExam)}
                        subjectId={Number.parseInt(selectedSubject)}
                        students={students}
                        onAttendanceMarked={handleQRAttendanceMarked}
                        markedByPersonnelId={tutor?.id}
                    />

                    <ExamAttendanceTable
                        students={students}
                        examId={Number.parseInt(selectedExam)}
                        subjectId={Number.parseInt(selectedSubject)}
                        courseId={Number.parseInt(selectedCourse)}
                        semester={Number.parseInt(selectedSemester)}
                        searchQuery={searchQuery}
                        onAttendanceMarked={handleQRAttendanceMarked}
                        isBulkMode={false}
                    />
                </motion.div>
            )}
          </TabsContent>

          {/* Bulk Mode Tab */}
          <TabsContent value="bulk" className="space-y-6 mt-6">
             <motion.div variants={itemVariants}>
                <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle>Bulk Selection</CardTitle>
                        <CardDescription>Select multiple combinations to scan for simultaneously</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Simplified Bulk UI Logic matching Admin */}
                        <div className="space-y-4">
                            <label className="text-sm font-medium">1. Select Courses</label>
                            <div className="flex flex-wrap gap-2">
                                {courses.map(c => (
                                    <Button 
                                        key={c.id} 
                                        variant={bulkSelectedCourses.has(c.id.toString()) ? "default" : "outline"}
                                        onClick={() => handleBulkCourseToggle(c.id.toString())}
                                        size="sm"
                                        className={cn(bulkSelectedCourses.has(c.id.toString()) && "bg-violet-600 hover:bg-violet-700")}
                                    >
                                        {bulkSelectedCourses.has(c.id.toString()) && <Check className="w-3 h-3 mr-1" />}
                                        {c.name}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        
                        {bulkSelectedCourses.size > 0 && (
                            <div className="space-y-4">
                                <label className="text-sm font-medium">2. Select Semesters</label>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from({ length: 8 }).map((_, i) => (
                                        <Button
                                            key={i+1}
                                            variant={bulkSelectedSemesters.has((i+1).toString()) ? "default" : "outline"}
                                            onClick={() => handleBulkSemesterToggle((i+1).toString())}
                                            size="sm"
                                            className={cn(bulkSelectedSemesters.has((i+1).toString()) && "bg-violet-600 hover:bg-violet-700")}
                                        >
                                            Sem {i+1}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {bulkAvailableExams.length > 0 && (
                            <div className="space-y-4">
                                <label className="text-sm font-medium">3. Select Exams & Subjects</label>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-1">
                                    {bulkAvailableExams.map(exam => (
                                        <Card key={`${exam.examId}-${exam.courseId}`} className="border-slate-200 dark:border-white/10">
                                            <CardHeader className="p-3 pb-0"><CardTitle className="text-sm">{exam.examName}</CardTitle></CardHeader>
                                            <CardContent className="p-3 grid grid-cols-2 gap-2">
                                                {exam.subjects.map(sub => (
                                                    <Button
                                                        key={sub.id}
                                                        variant="outline"
                                                        size="sm"
                                                        className={cn(
                                                            "justify-start h-auto py-2 px-3 text-xs whitespace-normal text-left",
                                                            bulkSelectedCombinations.some(c => c.examId === exam.examId && c.subjectId === sub.id) 
                                                            && "border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300"
                                                        )}
                                                        onClick={() => handleBulkSubjectToggle(exam.examId, sub.id, exam.courseId, exam.semester)}
                                                    >
                                                        {sub.name}
                                                    </Button>
                                                ))}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
             </motion.div>

             {/* Bulk Scanner & Results */}
             {bulkSelectedCombinations.length > 0 && (
                 <motion.div variants={itemVariants} className="space-y-6">
                     <Button onClick={() => setBulkQrScannerOpen(!bulkQrScannerOpen)} className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white gap-2">
                         <Camera className="w-4 h-4" /> {bulkQrScannerOpen ? "Close Bulk Scanner" : "Start Bulk Scan"}
                     </Button>
                     
                     {bulkQrScannerOpen && (
                         <BulkExamQRScanner 
                            selectedCombinations={bulkSelectedCombinations}
                            onAttendanceMarked={handleBulkQRAttendanceMarked}
                            onClose={() => setBulkQrScannerOpen(false)}
                            markedByPersonnelId={tutor?.id}
                         />
                     )}

                     {bulkStudentTabs.length > 0 && (
                         <ExamAttendanceTable
                            students={[]}
                            examId={0}
                            subjectId={0}
                            searchQuery={searchQuery}
                            onAttendanceMarked={handleBulkQRAttendanceMarked}
                            isBulkMode={true}
                            bulkTabs={bulkStudentTabs}
                         />
                     )}
                 </motion.div>
             )}
          </TabsContent>

          {/* Date Mode Tab */}
          <TabsContent value="byDate" className="space-y-6 mt-6">
             <motion.div variants={itemVariants}>
                <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-orange-500" /> Date Selection</CardTitle>
                        <CardDescription>View exams scheduled for a specific day</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-xs">
                            <label className="text-sm font-medium mb-2 block">Select Date</label>
                            <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                        </div>
                        
                        {selectedDate && (
                            <div className="mt-4">
                                {loadingDateExams ? (
                                    <p className="text-sm text-muted-foreground">Loading...</p>
                                ) : dateExamTabs.length > 0 ? (
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm">
                                        Found {dateExamTabs.length} exams for this date.
                                    </div>
                                ) : (
                                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-300 text-sm flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> No exams found.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
             </motion.div>

             {selectedDate && dateExamTabs.length > 0 && (
                 <motion.div variants={itemVariants} className="space-y-6">
                     <Button onClick={() => setDateQrScannerOpen(!dateQrScannerOpen)} className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white gap-2">
                         <Camera className="w-4 h-4" /> {dateQrScannerOpen ? "Close Scanner" : "Scan for this Date"}
                     </Button>

                     {dateQrScannerOpen && (
                         <DateBasedExamQRScanner
                            examDate={selectedDate}
                            onAttendanceMarked={handleDateAttendanceMarked}
                            onClose={() => setDateQrScannerOpen(false)}
                            dateExamTabs={dateExamTabs}
                            examsData={dateExamsRawData}
                            coursesData={courses}
                            markedByPersonnelId={tutor?.id}
                         />
                     )}

                     <ExamAttendanceTable
                        students={[]}
                        examId={0}
                        subjectId={0}
                        courseId={0}
                        semester={0}
                        searchQuery={searchQuery}
                        onAttendanceMarked={handleDateAttendanceMarked}
                        isBulkMode={true}
                        bulkTabs={dateExamTabs}
                     />
                 </motion.div>
             )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
