"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft } from "lucide-react"

interface Assignment {
  id: number
  title: string
  description?: string
  total_marks: number
  status: "Active" | "Ended"
  created_at: string
  course_id: number
  semester: number
}

interface Student {
  id: number
  full_name: string
  enrollment_number: string
  marks_obtained?: number
  submitted_at?: string
}

export default function AssignmentDetailPage({
  params,
}: {
  params: { subjectId: string; assignmentId: string }
}) {
  const { toast } = useToast()
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentMarks, setStudentMarks] = useState<Record<number, string>>({})
  const [savedMarks, setSavedMarks] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const assignmentId = Number.parseInt(params.assignmentId)
  const subjectId = Number.parseInt(params.subjectId)

  useEffect(() => {
    const fetchData = async () => {
      const tutorToken = localStorage.getItem("tutorToken")
      if (!tutorToken) {
        toast({
          title: "Error",
          description: "Authentication token not found",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      try {
        const assignmentResponse = await fetch(`/api/tutor/assignments/${assignmentId}`, {
          headers: {
            Authorization: `Bearer ${tutorToken}`,
          },
        })

        const assignmentData = await assignmentResponse.json()
        if (assignmentData.success) {
          setAssignment(assignmentData.assignment)
        }

        const marksResponse = await fetch(`/api/tutor/assignments/${assignmentId}/marks`, {
          headers: {
            Authorization: `Bearer ${tutorToken}`,
          },
        })

        const marksData = await marksResponse.json()
        if (marksData.success) {
          setStudents(marksData.students)

          // Initialize marks from fetched data
          const initialMarks: Record<number, string> = {}
          const saved = new Set<number>()
          marksData.students.forEach((student: Student) => {
            if (student.marks_obtained !== null && student.marks_obtained !== undefined) {
              initialMarks[student.id] = String(student.marks_obtained)
              saved.add(student.id)
            }
          })
          setStudentMarks(initialMarks)
          setSavedMarks(saved)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load assignment data",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [assignmentId, toast])

  const handleSaveAllMarks = async () => {
    const tutorToken = localStorage.getItem("tutorToken")
    if (!tutorToken) {
      toast({
        title: "Error",
        description: "Authentication token not found",
        variant: "destructive",
      })
      return
    }

    // Validate all marks
    for (const student of students) {
      const marks = studentMarks[student.id]
      if (!marks || isNaN(Number(marks))) {
        toast({
          title: "Error",
          description: `Please enter valid marks for ${student.full_name}`,
          variant: "destructive",
        })
        return
      }

      const marksValue = Number(marks)
      const assignment_info = assignment as Assignment

      if (marksValue < 0 || marksValue > assignment_info.total_marks) {
        toast({
          title: "Error",
          description: `Marks for ${student.full_name} must be between 0 and ${assignment_info.total_marks}`,
          variant: "destructive",
        })
        return
      }
    }

    try {
      setIsSaving(true)

      // Submit marks for all students
      const promises = students.map((student) => {
        const marks = studentMarks[student.id]
        if (!marks || savedMarks.has(student.id)) {
          return Promise.resolve({ success: true })
        }

        return fetch(`/api/tutor/assignments/${assignmentId}/marks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${tutorToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            studentId: student.id,
            marks: Number(marks),
          }),
        }).then((res) => res.json())
      })

      const results = await Promise.all(promises)

      // Check if all submissions were successful
      const allSuccessful = results.every((result) => result.success)

      if (allSuccessful) {
        setSavedMarks(new Set(students.map((s) => s.id)))
        toast({
          title: "Success",
          description: "All marks saved successfully",
        })
      } else {
        toast({
          title: "Error",
          description: "Some marks failed to save. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error saving marks:", error)
      toast({
        title: "Error",
        description: "Failed to save marks",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleEndAssignment = async () => {
    const tutorToken = localStorage.getItem("tutorToken")
    if (!tutorToken) {
      toast({
        title: "Error",
        description: "Authentication token not found",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)

      const response = await fetch(`/api/tutor/assignments/${assignmentId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${tutorToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "Ended" }),
      })

      const data = await response.json()

      if (data.success) {
        setAssignment((prev) => (prev ? { ...prev, status: "Ended" } : null))
        toast({
          title: "Success",
          description: "Assignment ended successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to end assignment",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error ending assignment:", error)
      toast({
        title: "Error",
        description: "Failed to end assignment",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-12 w-12 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  if (!assignment) {
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
              <p className="text-muted-foreground">Assignment not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{assignment.title}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Data{subjectId} (d{subjectId})
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-violet-500/20 text-violet-600 dark:text-violet-400">
              {assignment.status}
            </span>
            {assignment.status === "Active" && (
              <Button onClick={handleEndAssignment} variant="destructive">
                End Assignment
              </Button>
            )}
          </div>
        </div>

        {/* Assignment Details Card */}
        <Card className="bg-slate-900/50 dark:bg-slate-900/80 border-slate-700">
          <CardHeader>
            <CardTitle>Assignment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Marks</p>
                <p className="text-2xl font-bold">{assignment.total_marks}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold capitalize">{assignment.status}</p>
              </div>
            </div>
            {assignment.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-2">{assignment.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enter Student Marks Section */}
        {assignment.status === "Ended" && (
          <Card className="bg-slate-900/50 dark:bg-slate-900/80 border-slate-700">
            <CardHeader>
              <CardTitle>Enter Student Marks</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">{students.length} students in this course-semester</p>
            </CardHeader>
            <CardContent>
              {students.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-sm font-semibold">Enrollment #</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Student Name</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">
                            Marks (out of {assignment.total_marks})
                          </th>
                          <th className="text-left py-3 px-4 text-sm font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((student) => (
                          <tr key={student.id} className="border-b border-slate-700">
                            <td className="py-3 px-4">{student.enrollment_number}</td>
                            <td className="py-3 px-4">{student.full_name}</td>
                            <td className="py-3 px-4">
                              <Input
                                type="number"
                                min="0"
                                max={assignment.total_marks}
                                value={studentMarks[student.id] ?? ""}
                                onChange={(e) =>
                                  setStudentMarks((prev) => ({
                                    ...prev,
                                    [student.id]: e.target.value,
                                  }))
                                }
                                className="w-full max-w-xs bg-slate-800 border-slate-600"
                                disabled={isSaving}
                              />
                            </td>
                            <td className="py-3 px-4">
                              {savedMarks.has(student.id) ? (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
                                  Saved
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6">
                    <Button
                      onClick={handleSaveAllMarks}
                      disabled={isSaving || students.length === 0}
                      className="bg-violet-600 hover:bg-violet-700"
                    >
                      {isSaving ? "Saving..." : "Save All Marks"}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-center py-6">No students in this course-semester</p>
              )}
            </CardContent>
          </Card>
        )}

        {assignment.status === "Active" && (
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-6">
              <p className="text-sm text-blue-400">End the assignment to start entering student marks</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
