"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Slider } from "@/components/ui/slider"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Activity, BarChart3, Users, Star, TrendingUp, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function AdminFeedbackPage() {
  const [adminData, setAdminData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [tutorwise, setTutorwise] = useState<any[]>([])
  const [studentwise, setStudentwise] = useState<any[]>([])
  const [attendanceFiltered, setAttendanceFiltered] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [attendanceThreshold, setAttendanceThreshold] = useState(0)
  const [managingFeedback, setManagingFeedback] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }

    try {
      const admin = JSON.parse(localStorage.getItem("adminData") || "{}")
      setAdminData(admin)
      fetchFeedbackData()
    } catch (error) {
      console.error("Failed to parse admin data:", error)
      localStorage.removeItem("adminAuth")
      router.push("/admin/login")
    }
  }, [router])

  useEffect(() => {
    if (attendanceThreshold >= 0) {
      fetchAttendanceFilteredData()
    }
  }, [attendanceThreshold])

  const fetchFeedbackData = async () => {
    try {
      setLoading(true)

      // Fetch settings
      const settingsRes = await fetch("/api/feedback?action=settings")
      const settingsData = await settingsRes.json()
      setSettings(settingsData.settings)

      // Fetch summary
      const summaryRes = await fetch("/api/admin/feedback?action=summary")
      const summaryData = await summaryRes.json()
      setSummary(summaryData.summary)

      // Fetch tutor-wise
      const tutorRes = await fetch("/api/admin/feedback?action=tutorwise")
      const tutorData = await tutorRes.json()
      setTutorwise(tutorData.tutorwise || [])

      // Fetch student-wise
      const studentRes = await fetch("/api/admin/feedback?action=studentwise")
      const studentData = await studentRes.json()
      setStudentwise(studentData.studentwise || [])
    } catch (error) {
      console.error("Error fetching feedback data:", error)
      toast.error("Failed to load feedback data")
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendanceFilteredData = async () => {
    try {
      const res = await fetch(`/api/admin/feedback?action=withattendance&attendanceThreshold=${attendanceThreshold}`)
      const data = await res.json()
      setAttendanceFiltered(data.feedbackWithAttendance || [])
    } catch (error) {
      console.error("Error fetching attendance filtered data:", error)
    }
  }

  const handleStartFeedback = async () => {
    try {
      setManagingFeedback(true)
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          adminId: adminData?.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Feedback period started!")
        setSettings(data.settings)
      } else {
        toast.error("Failed to start feedback period")
      }
    } catch (error) {
      toast.error("Error starting feedback period")
    } finally {
      setManagingFeedback(false)
    }
  }

  const handleEndFeedback = async () => {
    try {
      setManagingFeedback(true)
      const res = await fetch("/api/admin/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "end",
          adminId: adminData?.id,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("Feedback period ended!")
        setSettings(data.settings)
      } else {
        toast.error("Failed to end feedback period")
      }
    } catch (error) {
      toast.error("Error ending feedback period")
    } finally {
      setManagingFeedback(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading feedback analytics...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tutor Feedback Analytics</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage and analyze student feedback for tutors</p>
          </div>
          <div className="flex gap-2">
            {settings?.is_active ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={managingFeedback}>
                    End Feedback Period
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>End Feedback Period?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disable feedback submission. Historical data will remain accessible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleEndFeedback}>End Period</AlertDialogAction>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <Button onClick={handleStartFeedback} disabled={managingFeedback}>
                Start Feedback Period
              </Button>
            )}
          </div>
        </div>

        {/* Feedback Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Feedback Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current Status</p>
                <Badge className={settings?.is_active ? "bg-green-600" : "bg-gray-600"}>
                  {settings?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              {settings?.started_at && (
                <p className="text-sm text-gray-500">
                  Started: {new Date(settings.started_at).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Eligible Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.total_eligible_students}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Feedback Submitted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.total_submitted}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Completion Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{summary.completion_percentage}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Average Rating
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <p className="text-2xl font-bold">{Number(summary.overall_avg_rating || 0).toFixed(2)}</p>
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Analytics */}
        <Tabs defaultValue="tutorwise" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tutorwise">Tutor-wise Breakdown</TabsTrigger>
            <TabsTrigger value="studentwise">Student Tracking</TabsTrigger>
            <TabsTrigger value="attendance">Attendance Filter</TabsTrigger>
          </TabsList>

          {/* Tutor-wise Tab */}
          <TabsContent value="tutorwise">
            <Card>
              <CardHeader>
                <CardTitle>Tutor-wise Feedback Summary</CardTitle>
                <CardDescription>Average ratings and feedback counts by tutor</CardDescription>
              </CardHeader>
              <CardContent>
                {tutorwise.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No feedback data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tutor Name</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-right">Feedback Count</TableHead>
                          <TableHead className="text-right">Avg Rating</TableHead>
                          <TableHead className="text-right">Positive</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tutorwise.map((tutor, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{tutor.name}</TableCell>
                            <TableCell>{tutor.subject_name}</TableCell>
                            <TableCell className="text-right">{tutor.feedback_count}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">
                                {tutor.average_rating || "N/A"} ⭐
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {tutor.positive_count || 0}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student-wise Tab */}
          <TabsContent value="studentwise">
            <Card>
              <CardHeader>
                <CardTitle>Student Feedback Tracking</CardTitle>
                <CardDescription>See which students have submitted feedback</CardDescription>
              </CardHeader>
              <CardContent>
                {studentwise.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No student data available</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Enrollment</TableHead>
                          <TableHead className="text-right">Submitted</TableHead>
                          <TableHead className="text-right">Eligible</TableHead>
                          <TableHead>Pending Subjects</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentwise.map((student, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.enrollment_number}</TableCell>
                            <TableCell className="text-right">
                              <Badge className="bg-green-600">{student.submitted_count}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{student.eligible_count}</TableCell>
                            <TableCell>
                              {student.pending_subjects?.length > 0 ? (
                                <span className="text-sm text-red-600">
                                  {student.pending_subjects.join(", ")}
                                </span>
                              ) : (
                                <Badge className="bg-green-600">Complete</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendance Filter Tab */}
          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance-based Feedback Filter</CardTitle>
                <CardDescription>Filter feedback results by minimum student attendance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label>Minimum Attendance Threshold</Label>
                    <span className="text-lg font-semibold text-blue-600">{attendanceThreshold}%</span>
                  </div>
                  <Slider
                    value={[attendanceThreshold]}
                    onValueChange={(value) => setAttendanceThreshold(value[0])}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Showing feedback only from students with ≥{attendanceThreshold}% attendance
                  </p>
                </div>

                {attendanceFiltered.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No data matching this attendance threshold</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="text-right">Attendance %</TableHead>
                          <TableHead className="text-right">Submitted</TableHead>
                          <TableHead>Tutors Rated</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceFiltered.map((student, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell className="text-right">
                              <Badge
                                className={
                                  student.attendance_percentage >= 75
                                    ? "bg-green-600"
                                    : student.attendance_percentage >= 50
                                      ? "bg-yellow-600"
                                      : "bg-red-600"
                                }
                              >
                                {student.attendance_percentage}%
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{student.submitted_count}</TableCell>
                            <TableCell className="text-sm">
                              {student.tutors_rated?.length > 0
                                ? student.tutors_rated.join(", ")
                                : "None"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
