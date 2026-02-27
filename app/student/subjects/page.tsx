"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ArrowRight, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Subject {
  id: number
  name: string
  code: string
  course_name: string
  semester: number
  tutor_name: string
  tutor_department: string
}

interface Student {
  id: number
  full_name: string
  enrollment_number: string
}

export default function StudentSubjectsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [student, setStudent] = useState<Student | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const studentAuth = localStorage.getItem("studentAuth")
    if (!studentAuth) {
      router.push("/student/login")
      return
    }

    try {
      const studentData = JSON.parse(studentAuth)
      setStudent(studentData)
      fetchSubjects(studentData.id)
    } catch (error) {
      console.error("Failed to parse student auth:", error)
      localStorage.removeItem("studentAuth")
      router.push("/student/login")
    }
  }, [router])

  const fetchSubjects = async (studentId: number) => {
    try {
      const response = await fetch(`/api/student/subjects?studentId=${studentId}`)
      const data = await response.json()
      if (data.success) {
        setSubjects(data.subjects)
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      toast({ title: "Error", description: "Failed to fetch subjects", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("studentAuth")
    toast({ title: "Success", description: "Logged out successfully" })
    router.push("/student/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/30 border-t-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading subjects...</p>
        </div>
      </div>
    )
  }

  if (!student) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              My Subjects
            </h1>
            <p className="text-lg text-muted-foreground">
              {student.full_name} ({student.enrollment_number})
            </p>
          </div>
          <Button variant="destructive" onClick={handleLogout} className="gap-2">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6">
          {subjects.length === 0 ? (
            <Card className="admin-card">
              <CardContent className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No subjects found for your current semester.</p>
              </CardContent>
            </Card>
          ) : (
            subjects.map((subject) => (
              <Card key={subject.id} className="admin-card hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl">{subject.name}</CardTitle>
                      <CardDescription>
                        {subject.course_name} - Semester {subject.semester}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{subject.code}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-accent/50 rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground">Assigned Tutor</p>
                      <p className="text-lg font-semibold">{subject.tutor_name}</p>
                      <p className="text-sm text-muted-foreground">{subject.tutor_department}</p>
                    </div>
                    <Link href={`/student/subjects/${subject.id}/attendance`}>
                      <Button className="w-full admin-button gap-2">
                        View Attendance
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
