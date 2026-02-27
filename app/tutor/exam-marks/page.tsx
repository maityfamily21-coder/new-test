"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, BookOpen, AlertCircle, Loader2, Check, CheckCircle, ClipboardCheck, Save } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface AssignedSubject {
  assignment_id: number
  exam_id: number
  exam_name: string
  exam_date: string
  subject_id: number
  subject_name: string
  code: string
  course_name: string
  semester: number
  total_marks: number
  student_count: number
  submitted_count: number
  is_completed: boolean
}

interface Student {
  id: number
  full_name: string
  enrollment_number: string
  attendance_status: string
  marks_obtained: number | null
  marks_status: string
  submission_date: string | null
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

export default function TutorExamMarksPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [tutor, setTutor] = useState<any>(null)
  const [subjects, setSubjects] = useState<AssignedSubject[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<AssignedSubject | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [studentMarks, setStudentMarks] = useState<{ [key: number]: number | null }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedSubjects, setSubmittedSubjects] = useState<Set<number>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const tutorAuth = localStorage.getItem("tutorAuth")
    if (!tutorAuth) {
      router.push("/tutor/login")
      return
    }

    try {
      const tutorData = JSON.parse(tutorAuth)
      setTutor(tutorData)
      loadAssignedSubjects(tutorData.id)
    } catch (error) {
      console.error("Failed to parse tutor auth:", error)
      localStorage.removeItem("tutorAuth")
      router.push("/tutor/login")
    }
  }, [router])

  const loadAssignedSubjects = async (tutorId: number) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tutor/exam-marks/subjects?tutorId=${tutorId}`)
      const data = await response.json()

      if (data.success) {
        setSubjects(data.subjects || [])
      } else {
        toast({ title: "Error", description: data.message || "Failed to load subjects", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load subjects", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const loadStudents = async (subject: AssignedSubject) => {
    try {
      setStudentsLoading(true)
      setSelectedSubject(subject)
      setStudentMarks({})

      const response = await fetch(
        `/api/tutor/exam-marks/${subject.exam_id}/${subject.subject_id}/students?tutorId=${tutor.id}`,
      )
      const data = await response.json()

      if (data.success) {
        setStudents(data.students || [])
        const storageKey = `marks_${subject.exam_id}_${subject.subject_id}_${tutor.id}`
        const savedMarks = localStorage.getItem(storageKey)

        const marksMap: { [key: number]: number | null } = {}

        if (savedMarks) {
          try {
            const parsedMarks = JSON.parse(savedMarks)
            data.students.forEach((student: Student) => {
              marksMap[student.id] =
                parsedMarks[student.id] !== undefined ? parsedMarks[student.id] : student.marks_obtained || null
            })
          } catch (e) {
            data.students.forEach((student: Student) => {
              marksMap[student.id] = student.marks_obtained || null
            })
          }
        } else {
          data.students.forEach((student: Student) => {
            marksMap[student.id] = student.marks_obtained || null
          })
        }

        setStudentMarks(marksMap)
      } else {
        toast({ title: "Error", description: data.message || "Failed to load students", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load students", variant: "destructive" })
    } finally {
      setStudentsLoading(false)
    }
  }

  const autoSaveMark = async (studentId: number, marks: number | null) => {
    if (!selectedSubject || !tutor) return

    try {
      setIsSaving(true)
      const response = await fetch("/api/tutor/exam-marks/auto-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: selectedSubject.exam_id,
          subject_id: selectedSubject.subject_id,
          tutor_id: tutor.id,
          student_id: studentId,
          marks_obtained: marks,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setLastSaved(new Date())
        const storageKey = `marks_${selectedSubject.exam_id}_${selectedSubject.subject_id}_${tutor.id}`
        localStorage.setItem(storageKey, JSON.stringify(studentMarks))
      }
    } catch (error) {
      console.error("Auto-save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleMarkChange = (studentId: number, marks: string) => {
    const marksNum = marks === "" ? null : Number(marks)
    setStudentMarks((prev) => {
      const updated = { ...prev, [studentId]: marksNum }
      setTimeout(() => autoSaveMark(studentId, marksNum), 500)
      return updated
    })
  }

  const allMarksEntered = () => {
    return students.every((student) => {
      const marks = studentMarks[student.id]
      return marks !== null && marks !== undefined && marks !== ""
    })
  }

  const handlePreviewMarks = () => {
    if (!selectedSubject) return

    for (const [studentId, marks] of Object.entries(studentMarks)) {
      if (marks !== null && marks !== "") {
        const marksNum = Number(marks)
        if (isNaN(marksNum) || marksNum < 0 || marksNum > selectedSubject.total_marks) {
          toast({
            title: "Validation Error",
            description: `Marks must be between 0 and ${selectedSubject.total_marks}`,
            variant: "destructive",
          })
          return
        }
      }
    }
    setShowPreview(true)
  }

  const handleSubmitMarks = async () => {
    if (!selectedSubject) return

    setIsSubmitting(true)
    setShowPreview(false)

    try {
      const marksData = students.map((student) => ({
        student_id: student.id,
        marks_obtained: studentMarks[student.id],
      }))

      const response = await fetch("/api/tutor/exam-marks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_id: selectedSubject.exam_id,
          subject_id: selectedSubject.subject_id,
          tutor_id: tutor.id,
          marks_data: marksData,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({ title: "Success", description: data.message })
        const storageKey = `marks_${selectedSubject.exam_id}_${selectedSubject.subject_id}_${tutor.id}`
        localStorage.removeItem(storageKey)

        setSubmittedSubjects((prev) => new Set([...prev, selectedSubject.assignment_id]))
        loadAssignedSubjects(tutor.id)
        setSelectedSubject(null)
      } else {
        toast({ title: "Error", description: data.message || "Failed to submit marks", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit marks", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-violet-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!tutor) return null

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
              <ClipboardCheck className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              Exam Marks Entry
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Input and submit scores for assigned examinations
            </p>
          </div>
        </motion.div>

        {selectedSubject ? (
          <motion.div variants={itemVariants} className="space-y-6">
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
              <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                            {selectedSubject.subject_name}
                            <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">{selectedSubject.code}</Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                            {selectedSubject.exam_name} • {selectedSubject.course_name} • Semester {selectedSubject.semester}
                        </CardDescription>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                        {isSaving && <span className="flex items-center text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin mr-1"/> Saving...</span>}
                        {lastSaved && !isSaving && (
                            <span className="flex items-center text-xs text-emerald-600 dark:text-emerald-400"><Save className="w-3 h-3 mr-1"/> Saved: {lastSaved.toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>
              </CardHeader>
            </Card>

            {studentsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-violet-600 dark:text-violet-400" />
              </div>
            ) : students.length === 0 ? (
              <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                <CardContent className="p-12 text-center">
                  <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No present students found for this exam/subject.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-base">Student List</CardTitle>
                        <Badge variant="outline" className="text-xs">Max Marks: {selectedSubject.total_marks}</Badge>
                    </div>
                    <CardDescription>
                      {selectedSubject.submitted_count} of {selectedSubject.student_count} marks submitted
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {students.map((student) => (
                        <div key={student.id} className="flex items-center gap-4 p-3 bg-white/50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5 rounded-lg hover:border-violet-200 dark:hover:border-violet-800 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-foreground dark:text-white">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{student.enrollment_number}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={selectedSubject.total_marks}
                              placeholder="-"
                              value={studentMarks[student.id] ?? ""}
                              onChange={(e) => handleMarkChange(student.id, e.target.value)}
                              className="w-20 px-3 py-2 text-sm text-center border rounded-md bg-white dark:bg-black focus:ring-2 focus:ring-violet-500 focus:outline-none"
                            />
                            <span className="text-xs text-muted-foreground w-8 text-center">
                              / {selectedSubject.total_marks}
                            </span>
                            <div className="w-6 flex justify-center">
                                {student.marks_status === "submitted" && <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedSubject(null)
                      setStudents([])
                    }}
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  {allMarksEntered() && (
                    <Button
                      onClick={handlePreviewMarks}
                      disabled={isSubmitting || isSaving}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                    >
                      Preview & Submit
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div variants={itemVariants}>
            {subjects.length === 0 ? (
              <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No exams assigned for marks entry yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject) => (
                  <Card key={subject.assignment_id} className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-violet-300 dark:hover:border-violet-700 transition-all group overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
                        <div className="flex justify-between items-start">
                            <Badge variant="outline" className="bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200">{subject.code}</Badge>
                            {subject.is_completed && <Badge className="bg-green-600 hover:bg-green-700"><Check className="w-3 h-3 mr-1" /> Done</Badge>}
                        </div>
                        <CardTitle className="text-lg mt-2 line-clamp-2 min-h-[3.5rem]">{subject.subject_name}</CardTitle>
                        <CardDescription>{subject.exam_name}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex justify-between">
                                <span>Course:</span>
                                <span className="font-medium text-foreground dark:text-gray-300">{subject.course_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Semester:</span>
                                <span className="font-medium text-foreground dark:text-gray-300">{subject.semester}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Exam Date:</span>
                                <span className="font-medium text-foreground dark:text-gray-300">{new Date(subject.exam_date).toLocaleDateString()}</span>
                            </div>
                            <div className="pt-2 flex justify-between items-center">
                                <span>Progress:</span>
                                <span className="text-violet-600 dark:text-violet-400 font-bold">{subject.submitted_count} / {subject.student_count}</span>
                            </div>
                        </div>
                        <Button
                            onClick={() => loadStudents(subject)}
                            disabled={subject.is_completed}
                            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                        >
                            {subject.is_completed ? "Completed" : "Enter Marks"}
                        </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
          <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-white/5">
            <DialogTitle>Confirm Marks Submission</DialogTitle>
            <DialogDescription>
              Review marks for <strong>{selectedSubject?.subject_name}</strong>. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-0">
            <div className="w-full">
                <div className="grid grid-cols-[1fr_100px_80px] gap-4 px-6 py-3 bg-slate-50 dark:bg-zinc-900 border-b border-slate-100 dark:border-white/5 font-semibold text-sm sticky top-0">
                    <div>Student</div>
                    <div className="text-center">Marks</div>
                    <div className="text-right">Max</div>
                </div>
                <div className="px-6 py-2">
                    {students.map((student) => (
                    <div key={student.id} className="grid grid-cols-[1fr_100px_80px] gap-4 py-3 border-b border-slate-100 dark:border-white/5 text-sm items-center last:border-0">
                        <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{student.enrollment_number}</p>
                        </div>
                        <div className="text-center font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 py-1 rounded">
                            {studentMarks[student.id] ?? 0}
                        </div>
                        <div className="text-right text-muted-foreground">{selectedSubject?.total_marks}</div>
                    </div>
                    ))}
                </div>
            </div>
          </div>

          <DialogFooter className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={isSubmitting}>
              Back to Edit
            </Button>
            <Button onClick={handleSubmitMarks} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {isSubmitting ? "Submitting..." : "Confirm Submission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
