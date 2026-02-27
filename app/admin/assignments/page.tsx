"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Search } from "lucide-react"

interface Assignment {
  id: number
  title: string
  description?: string
  subject_name: string
  subject_code: string
  course_name: string
  semester: number
  tutor_name: string
  total_marks: number
  status: string
  marks_submitted: number
  total_students: number
  created_at: string
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

function AdminAssignmentsContent() {
  const router = useRouter()
  const { toast } = useToast()

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }

    fetchAssignments()
  }, [router])

  const fetchAssignments = async () => {
    try {
      setLoading(true)
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch("/api/admin/assignments", {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        router.push("/admin/login")
        return
      }

      const data = await response.json()
      if (data.success) {
        setAssignments(data.assignments)
      }
    } catch (error) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch assignments",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredAssignments = assignments.filter(
    (a) =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.tutor_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="icon" className="rounded-lg bg-transparent">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold">Assignment Records</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                View all assignments across courses (Read-only)
              </p>
            </div>
          </div>
        </motion.div>

        {/* Search Card */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-lg border border-blue-100 dark:border-blue-900/30">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search assignments, subjects, or tutors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Assignments Table */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-lg border border-blue-100 dark:border-blue-900/30">
            <CardHeader>
              <CardTitle>Assignments ({filteredAssignments.length})</CardTitle>
              <CardDescription>Complete list of assignments created across the system</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No assignments found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Tutor</TableHead>
                        <TableHead>Course-Semester</TableHead>
                        <TableHead>Total Marks</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Marks Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAssignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{assignment.title}</TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">{assignment.subject_code}</span>
                            <br />
                            <span className="text-xs text-muted-foreground">{assignment.subject_name}</span>
                          </TableCell>
                          <TableCell>{assignment.tutor_name}</TableCell>
                          <TableCell>
                            {assignment.course_name} - Sem {assignment.semester}
                          </TableCell>
                          <TableCell className="text-right font-mono">{assignment.total_marks}</TableCell>
                          <TableCell>
                            <Badge
                              className={
                                assignment.status === "Active"
                                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                  : "bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300"
                              }
                            >
                              {assignment.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 max-w-xs">
                                <div
                                  className="bg-emerald-500 h-2 rounded-full"
                                  style={{
                                    width: `${
                                      assignment.total_students > 0
                                        ? (assignment.marks_submitted / assignment.total_students) * 100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono">
                                {assignment.marks_submitted}/{assignment.total_students}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

export default function AdminAssignmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
        </div>
      }
    >
      <AdminAssignmentsContent />
    </Suspense>
  )
}
