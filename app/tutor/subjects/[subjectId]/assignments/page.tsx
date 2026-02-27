"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Trash2, CheckCircle, Clock, BookOpen } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

interface Assignment {
  id: number
  title: string
  description?: string
  total_marks: number
  status: string
  created_at: string
  total_students: number
  marks_submitted: number
}

interface Subject {
  id: number
  name: string
  code: string
  course_name: string
  semester: number
}

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

export default function AssignmentsPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const subjectId = Number.parseInt(params.subjectId as string)

  const [subject, setSubject] = useState<Subject | null>(null)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    totalMarks: "100",
  })

  useEffect(() => {
    const tutorAuth = localStorage.getItem("tutorAuth")
    if (!tutorAuth) {
      router.push("/tutor/login")
      return
    }

    try {
      const tutorData = JSON.parse(tutorAuth)
      fetchSubjectAndAssignments(tutorData.id)
    } catch (error) {
      console.error("Failed to parse tutor auth:", error)
      router.push("/tutor/login")
    }
  }, [router])

  const fetchSubjectAndAssignments = async (tutorId: number) => {
    try {
      setLoading(true)

      // Fetch subject details
      const subjectsRes = await fetch(`/api/tutor/${tutorId}/subjects`)
      const subjectsData = await subjectsRes.json()

      if (subjectsData.success) {
        const foundSubject = subjectsData.subjects.find((s: Subject) => s.id === subjectId)
        setSubject(foundSubject || null)
      }

      const tutorToken = localStorage.getItem("tutorToken")
      const assignmentsRes = await fetch("/api/tutor/assignments", {
        headers: {
          Authorization: `Bearer ${tutorToken}`,
        },
      })
      const assignmentsData = await assignmentsRes.json()

      if (assignmentsData.success) {
        const filtered = assignmentsData.assignments.filter((a: Assignment) => a.subject_id === subjectId)
        setAssignments(filtered)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAssignment = async () => {
    if (!formData.title.trim() || !formData.totalMarks) {
      toast({
        title: "Error",
        description: "Please fill in required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const tutorToken = localStorage.getItem("tutorToken")
      const tutorAuth = localStorage.getItem("tutorAuth")

      if (!tutorAuth) {
        router.push("/tutor/login")
        return
      }

      const tutorData = JSON.parse(tutorAuth)

      const response = await fetch("/api/tutor/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tutorToken}`,
        },
        body: JSON.stringify({
          subjectId,
          title: formData.title,
          description: formData.description || null,
          totalMarks: Number.parseInt(formData.totalMarks),
        }),
      })

      if (!response.ok) {
        console.error("[v0] API response error:", response.status, response.statusText)
        toast({
          title: "Error",
          description: `Failed to create assignment (${response.status})`,
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Assignment created successfully",
        })
        setFormData({ title: "", description: "", totalMarks: "100" })
        setIsDialogOpen(false)

        await fetchSubjectAndAssignments(tutorData.id)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating assignment:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create assignment",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return

    try {
      const tutorToken = localStorage.getItem("tutorToken")
      const response = await fetch(`/api/tutor/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tutorToken}`,
        },
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Assignment deleted successfully",
        })

        const tutorData = JSON.parse(tutorToken || "{}")
        fetchSubjectAndAssignments(tutorData.id)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive",
      })
    }
  }

  const handleEndAssignment = async (assignmentId: number) => {
    try {
      const tutorToken = localStorage.getItem("tutorToken")
      const response = await fetch(`/api/tutor/assignments/${assignmentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tutorToken}`,
        },
        body: JSON.stringify({ status: "Ended" }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: "Assignment ended. You can now enter marks.",
        })

        const tutorData = JSON.parse(tutorToken || "{}")
        fetchSubjectAndAssignments(tutorData.id)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end assignment",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-12 w-12 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  if (!subject) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black p-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/tutor/dashboard">
            <Button variant="outline" className="mb-6 bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Subject not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-50/50 via-white to-emerald-50/50 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <motion.div
        className="container relative z-10 mx-auto px-4 sm:px-6 py-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6"
        >
          <div className="flex items-center gap-4">
            <Link href="/tutor/dashboard">
              <Button variant="outline" size="icon" className="rounded-lg bg-transparent">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground dark:text-white">{subject.name}</h1>
              <p className="text-muted-foreground dark:text-gray-400 flex items-center gap-2">
                <Badge variant="secondary">{subject.code}</Badge>
                <span>Semester {subject.semester}</span>
              </p>
            </div>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2 rounded-lg">
                <Plus className="w-4 h-4" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-lg">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>Add a new assignment for {subject.name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Assignment Title *</label>
                  <Input
                    placeholder="e.g., Quiz 1, Homework Assignment"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    placeholder="Optional assignment details or instructions"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1 min-h-24"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Total Marks *</label>
                  <Input
                    type="number"
                    placeholder="100"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                    className="mt-1"
                    min="1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreateAssignment}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  {isSubmitting ? "Creating..." : "Create Assignment"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="bg-white/50 dark:bg-white/5 border-dashed">
                <CardContent className="p-12 text-center flex flex-col items-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">No assignments yet</h3>
                  <p className="text-sm text-muted-foreground/80 mt-1">Create an assignment to get started</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((assignment) => (
                <motion.div key={assignment.id} variants={itemVariants}>
                  <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 hover:border-emerald-400 dark:hover:border-white/30 transition-all overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold line-clamp-2">{assignment.title}</CardTitle>
                          <CardDescription className="mt-1">Total Marks: {assignment.total_marks}</CardDescription>
                        </div>
                        <Badge
                          className={
                            assignment.status === "Active"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300"
                          }
                        >
                          {assignment.status === "Active" ? (
                            <>
                              <Clock className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Ended
                            </>
                          )}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{assignment.description}</p>
                      )}

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded">
                          <p className="text-xs text-muted-foreground">Total Students</p>
                          <p className="font-semibold">{assignment.total_students}</p>
                        </div>
                        <div className="p-2 bg-slate-100 dark:bg-white/5 rounded">
                          <p className="text-xs text-muted-foreground">Marks Entered</p>
                          <p className="font-semibold">{assignment.marks_submitted}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Link href={`/tutor/subjects/${subjectId}/assignments/${assignment.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full rounded-lg bg-transparent">
                            {assignment.status === "Ended" ? "Enter Marks" : "View Details"}
                          </Button>
                        </Link>

                        {assignment.status === "Active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEndAssignment(assignment.id)}
                            className="rounded-lg"
                          >
                            End
                          </Button>
                        )}

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
