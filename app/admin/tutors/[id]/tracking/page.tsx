"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, BookOpen, Users, BarChart3, Calendar } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Subject {
  id: number
  name: string
  code: string
  course_name: string
  semester: number
  lecture_count: number
  total_attendance_records: number
}

interface Lecture {
  id: number
  title: string
  description: string
  lecture_date: string
  subject_name: string
  subject_code: string
  course_name: string
  semester: number
  total_students: number
  present_count: number
  absent_count: number
  not_marked_count: number
}

interface Tutor {
  id: number
  name: string
  department: string
}

export default function TutorTrackingPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const tutorId = Number.parseInt(params.id as string)

  const [tutor, setTutor] = useState<Tutor | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [allLectures, setAllLectures] = useState<Lecture[]>([])
  const [selectedSubjectLectures, setSelectedSubjectLectures] = useState<Lecture[]>([])
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("subjects")

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    fetchTutorData()
  }, [router])

  const fetchTutorData = async () => {
    try {
      setLoading(true)
      // Fetch tutor info
      const tutorResponse = await fetch(`/api/admin/tutors`)
      const tutorData = await tutorResponse.json()
      const currentTutor = tutorData.tutors?.find((t: Tutor) => t.id === tutorId)
      setTutor(currentTutor)

      // Fetch subjects
      const subjectsResponse = await fetch(`/api/admin/tutors/${tutorId}/tracking?view=subjects`)
      const subjectsData = await subjectsResponse.json()
      if (subjectsData.success) {
        setSubjects(subjectsData.subjects)
      }

      // Fetch all lectures
      const lecturesResponse = await fetch(`/api/admin/tutors/${tutorId}/tracking?view=all-lectures`)
      const lecturesData = await lecturesResponse.json()
      if (lecturesData.success) {
        setAllLectures(lecturesData.lectures)
      }
    } catch (error) {
      console.error("Error fetching tutor data:", error)
      toast({ title: "Error", description: "Failed to fetch tutor data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSubject = async (subject: Subject) => {
    setSelectedSubject(subject)
    try {
      const response = await fetch(
        `/api/admin/tutors/${tutorId}/tracking?view=subject-lectures&subjectId=${subject.id}`,
      )
      const data = await response.json()
      if (data.success) {
        setSelectedSubjectLectures(data.lectures)
      }
    } catch (error) {
      console.error("Error fetching subject lectures:", error)
      toast({ title: "Error", description: "Failed to fetch lectures", variant: "destructive" })
    }
  }

  const calculateAttendancePercentage = (lecture: Lecture) => {
    if (lecture.total_students === 0) return 0
    return Math.round((lecture.present_count / lecture.total_students) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/30 border-t-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading faculty data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              {tutor?.name} - Faculty Tracking
            </h1>
            <p className="text-lg text-muted-foreground">{tutor?.department}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Subjects</p>
                  <p className="text-3xl font-bold">{subjects.length}</p>
                </div>
                <BookOpen className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Lectures</p>
                  <p className="text-3xl font-bold">{allLectures.length}</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                  <p className="text-3xl font-bold">
                    {allLectures.length > 0
                      ? Math.round(
                          allLectures.reduce((sum, l) => sum + calculateAttendancePercentage(l), 0) /
                            allLectures.length,
                        )
                      : 0}
                    %
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="admin-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Attendance Records</p>
                  <p className="text-3xl font-bold">
                    {subjects.reduce((sum, s) => sum + s.total_attendance_records, 0)}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subjects">Subjects & Lectures</TabsTrigger>
            <TabsTrigger value="all-lectures">All Lectures</TabsTrigger>
          </TabsList>

          {/* Tab 1: Subjects */}
          <TabsContent value="subjects" className="space-y-6">
            {subjects.length === 0 ? (
              <Card className="admin-card">
                <CardContent className="p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No subjects assigned to this faculty.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Subjects List */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Assigned Subjects</h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {subjects.map((subject) => (
                      <Card
                        key={subject.id}
                        className={`admin-card cursor-pointer transition-all ${
                          selectedSubject?.id === subject.id ? "ring-2 ring-primary" : ""
                        }`}
                        onClick={() => handleSelectSubject(subject)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{subject.name}</h3>
                                <p className="text-sm text-muted-foreground">{subject.code}</p>
                              </div>
                              <Badge variant="secondary">{subject.course_name}</Badge>
                            </div>
                            <div className="flex gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Semester:</span>
                                <span className="ml-2 font-medium">{subject.semester}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Lectures:</span>
                                <span className="ml-2 font-medium">{subject.lecture_count}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Subject Lectures */}
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">
                    {selectedSubject ? `${selectedSubject.name} - Lectures` : "Select a subject"}
                  </h2>
                  {selectedSubject ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {selectedSubjectLectures.length === 0 ? (
                        <Card className="admin-card">
                          <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">No lectures created for this subject.</p>
                          </CardContent>
                        </Card>
                      ) : (
                        selectedSubjectLectures.map((lecture) => (
                          <Card key={lecture.id} className="admin-card">
                            <CardContent className="p-4">
                              <div className="space-y-2">
                                <div>
                                  <h4 className="font-semibold">{lecture.title}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(lecture.lecture_date).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                                    <p className="text-muted-foreground">Total Students</p>
                                    <p className="font-bold text-blue-600 dark:text-blue-400">
                                      {lecture.total_students}
                                    </p>
                                  </div>
                                  <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
                                    <p className="text-muted-foreground">Present</p>
                                    <p className="font-bold text-green-600 dark:text-green-400">
                                      {lecture.present_count}
                                    </p>
                                  </div>
                                  <div className="bg-red-50 dark:bg-red-950 p-2 rounded">
                                    <p className="text-muted-foreground">Absent</p>
                                    <p className="font-bold text-red-600 dark:text-red-400">{lecture.absent_count}</p>
                                  </div>
                                  <div className="bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
                                    <p className="text-muted-foreground">Not Marked</p>
                                    <p className="font-bold text-yellow-600 dark:text-yellow-400">
                                      {lecture.not_marked_count}
                                    </p>
                                  </div>
                                </div>
                                <div className="pt-2 border-t">
                                  <p className="text-sm">
                                    <span className="text-muted-foreground">Attendance Rate:</span>
                                    <span className="ml-2 font-bold text-primary">
                                      {calculateAttendancePercentage(lecture)}%
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  ) : (
                    <Card className="admin-card">
                      <CardContent className="p-8 text-center">
                        <p className="text-muted-foreground">Click on a subject to view its lectures</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 2: All Lectures */}
          <TabsContent value="all-lectures" className="space-y-6">
            {allLectures.length === 0 ? (
              <Card className="admin-card">
                <CardContent className="p-12 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No lectures created yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Date</th>
                        <th className="text-left p-3 font-semibold">Subject</th>
                        <th className="text-left p-3 font-semibold">Course</th>
                        <th className="text-center p-3 font-semibold">Total</th>
                        <th className="text-center p-3 font-semibold">Present</th>
                        <th className="text-center p-3 font-semibold">Absent</th>
                        <th className="text-center p-3 font-semibold">Not Marked</th>
                        <th className="text-center p-3 font-semibold">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLectures.map((lecture) => (
                        <tr key={lecture.id} className="border-b hover:bg-accent/50 transition-colors">
                          <td className="p-3">{new Date(lecture.lecture_date).toLocaleDateString()}</td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{lecture.subject_name}</p>
                              <p className="text-xs text-muted-foreground">{lecture.subject_code}</p>
                            </div>
                          </td>
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{lecture.course_name}</p>
                              <p className="text-xs text-muted-foreground">Sem {lecture.semester}</p>
                            </div>
                          </td>
                          <td className="p-3 text-center font-medium">{lecture.total_students}</td>
                          <td className="p-3 text-center">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                              {lecture.present_count}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                              {lecture.absent_count}
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                              {lecture.not_marked_count}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-bold text-primary">
                            {calculateAttendancePercentage(lecture)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
