"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Calendar, Monitor, Users, Loader2, AlertCircle, RefreshCw, ChevronRight, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface PCRequest {
  exam_id: number
  exam_name: string
  exam_date: string
  course_name: string
  semester: number
  subjects: {
    subject_id: number
    subject_name: string
    request_count: number
  }[]
}

interface StudentDetail {
  student_id: number
  enrollment_number: string
  name: string
  requested_at: string
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

export default function PCRequestsPage() {
  const [requests, setRequests] = useState<PCRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [selectedSubject, setSelectedSubject] = useState<{
    exam_name: string
    subject_name: string
    exam_id: number
    subject_id: number
  } | null>(null)
  const [studentDetails, setStudentDetails] = useState<StudentDetail[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("technicalTeamAuth")
    const data = localStorage.getItem("technicalTeamData")

    if (!token || !data) {
      router.push("/technical/login")
      return
    }

    try {
      setUserData(JSON.parse(data))
      fetchPCRequests()
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/technical/login")
    }

    const interval = setInterval(() => {
      fetchPCRequests(true)
    }, 30000)

    return () => clearInterval(interval)
  }, [router])

  const fetchPCRequests = async (silent = false) => {
    if (!silent) {
      setIsRefreshing(true)
    }
    try {
      const response = await fetch(`/api/technical/pc-requests?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      })
      const data = await response.json()

      if (data.success) {
        setRequests(data.requests || [])
      }
    } catch (error) {
      console.error("Error fetching PC requests:", error)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  const fetchStudentDetails = async (examId: number, subjectId: number) => {
    setLoadingStudents(true)
    try {
      const response = await fetch(
        `/api/technical/pc-requests/students?examId=${examId}&subjectId=${subjectId}&t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
          },
        },
      )
      const data = await response.json()

      if (data.success) {
        setStudentDetails(data.students || [])
      }
    } catch (error) {
      console.error("Error fetching student details:", error)
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleViewStudents = (examId: number, examName: string, subjectId: number, subjectName: string) => {
    setSelectedSubject({ exam_name: examName, subject_name: subjectName, exam_id: examId, subject_id: subjectId })
    fetchStudentDetails(examId, subjectId)
  }

  const handleCloseModal = () => {
    setSelectedSubject(null)
    setStudentDetails([])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-emerald-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Light Mode Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50 dark:hidden" />
        
        {/* Dark Mode: The Void & Grid */}
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[150px]" />
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
                    onClick={() => router.push("/technical/dashboard")} 
                    variant="ghost" 
                    size="sm" 
                    className="pl-0 hover:bg-transparent hover:text-emerald-600 dark:hover:text-emerald-400"
                 >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                 </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent flex items-center gap-3">
              <Monitor className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              PC Setup Requests
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Manage infrastructure requirements for upcoming examinations
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
                onClick={() => fetchPCRequests()} 
                variant="outline" 
                className="gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-slate-200 dark:border-white/10"
                disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* --- Requests Grid --- */}
        <div className="space-y-6">
          {requests.length === 0 ? (
             <motion.div variants={itemVariants}>
                <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                    <CardContent className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="h-16 w-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <AlertCircle className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-muted-foreground">No active requests</h3>
                        <p className="text-sm text-muted-foreground/80 mt-1">There are no PC setup requests from students at this time.</p>
                    </CardContent>
                </Card>
             </motion.div>
          ) : (
            requests.map((request) => (
              <motion.div variants={itemVariants} key={request.exam_id}>
                <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden">
                    <CardHeader className="pb-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2 text-foreground dark:text-white">
                                    <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                    {request.exam_name}
                                </CardTitle>
                                <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground dark:text-gray-400">
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                        <GraduationCap className="w-3.5 h-3.5" />
                                        <span>{request.course_name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                        <span>Sem {request.semester}</span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">
                                        <span>{new Date(request.exam_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <Badge variant="outline" className="self-start text-sm py-1 px-3 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300">
                                {request.subjects.reduce((sum, s) => sum + s.request_count, 0)} Total Requests
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100 dark:border-white/5 hover:bg-transparent">
                                    <TableHead className="pl-6 w-[60%]">Subject Name</TableHead>
                                    <TableHead className="text-right pr-6">PC Requests</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {request.subjects.map((subject) => (
                                    <TableRow key={subject.subject_id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                                        <TableCell className="pl-6 font-medium text-foreground dark:text-gray-200">
                                            {subject.subject_name}
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    handleViewStudents(
                                                        request.exam_id,
                                                        request.exam_name,
                                                        subject.subject_id,
                                                        subject.subject_name
                                                    )
                                                }
                                                className="gap-2 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors h-8"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                                <span>{subject.request_count}</span>
                                                <span className="hidden sm:inline">Students</span>
                                                <ChevronRight className="w-3 h-3 opacity-50" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        <Dialog open={selectedSubject !== null} onOpenChange={handleCloseModal}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0 bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
            <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Students Requesting PC
              </DialogTitle>
              <DialogDescription>
                {selectedSubject && (
                  <div className="flex flex-col gap-1 mt-2 text-sm">
                    <div className="flex gap-2">
                        <span className="font-semibold text-foreground dark:text-white">Exam:</span>
                        <span>{selectedSubject.exam_name}</span>
                    </div>
                    <div className="flex gap-2">
                        <span className="font-semibold text-foreground dark:text-white">Subject:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">{selectedSubject.subject_name}</span>
                    </div>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-0">
                {loadingStudents ? (
                <div className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading student details...</p>
                </div>
                ) : studentDetails.length === 0 ? (
                <div className="py-12 text-center">
                    <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">No student details found.</p>
                </div>
                ) : (
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-zinc-900 sticky top-0 z-10">
                        <TableRow className="border-b border-slate-100 dark:border-white/5">
                            <TableHead className="pl-6">Enrollment Number</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead className="text-right pr-6">Requested On</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {studentDetails.map((student) => (
                        <TableRow key={student.student_id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                            <TableCell className="pl-6 font-mono text-xs md:text-sm text-muted-foreground">
                                {student.enrollment_number}
                            </TableCell>
                            <TableCell className="font-medium text-foreground dark:text-white">
                                {student.name}
                            </TableCell>
                            <TableCell className="text-right pr-6 text-muted-foreground text-xs md:text-sm">
                                {new Date(student.requested_at).toLocaleString()}
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                )}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex justify-end">
              <Button variant="outline" onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}
