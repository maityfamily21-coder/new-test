"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Building2,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  ArrowRight,
  Eye,
  ExternalLink,
  Star,
  QrCode,
  TrendingUp,
  Bell,
  Camera,
  DollarSign,
} from "lucide-react"
import Link from "next/link"
import type { Student } from "@/lib/db"
import { StudentAuthManager } from "@/lib/student-auth"
import { parseISTDate } from "@/lib/time"
import { StudentQRDownload } from "@/components/student-qr-download"
import { AnimatedAssistants } from "@/components/animated-assistants"
import { AnnouncementsModal } from "@/components/announcements-modal"
import { StudentLectureProgress } from "@/components/student-lecture-progress"
import { LectureQRScanner } from "@/components/lecture-qr-scanner"

export default function StudentDashboard() {
  const [student, setStudent] = useState<Student | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [seminars, setSeminars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applying, setApplying] = useState<number | null>(null)
  const [ratingDialog, setRatingDialog] = useState<{ open: boolean; seminar: any | null }>({
    open: false,
    seminar: null,
  })
  const [ratingData, setRatingData] = useState({ rating: 0, comment: "" })
  const [submittingRating, setSubmittingRating] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null)
  const [selectedSeminar, setSelectedSeminar] = useState<any | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null)
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState<Set<number>>(new Set())
  const [announcementsModalOpen, setAnnouncementsModalOpen] = useState(false)

  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [attendanceRefresh, setAttendanceRefresh] = useState(0)

  // ✅ Profile completion modal state
  const [showProfileCompletionModal, setShowProfileCompletionModal] = useState(false)
  const [caste, setCaste] = useState("")
  const [gender, setGender] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)

  const router = useRouter()

  useEffect(() => {
    const authData = StudentAuthManager.getAuth()
    if (!authData) {
      router.push("/student/login")
      return
    }

    setStudent(authData.student)
    fetchStudentData(authData.student.id)
  }, [router])

  // ✅ Check profile completion
  // ✅ Check profile completion using caste and gender (FINAL FIX)
  useEffect(() => {

    if (!student) return

    console.log("Student caste:", student.caste)
    console.log("Student gender:", student.gender)

    if (!student.caste || !student.gender) {

      console.log("Opening profile completion modal")

      setShowProfileCompletionModal(true)

    } else {

      console.log("Profile complete, closing modal")

      setShowProfileCompletionModal(false)

    }

  }, [student])

  const fetchStudentData = async (studentId: number) => {
    try {
      const headers = StudentAuthManager.getAuthHeaders()

      try {
        // --- FIX: CHANGED FROM /api/admin/students TO /api/student ---
        // Students cannot access Admin APIs.
        const studentRes = await fetch(`/api/student/${studentId}`, { headers })

        if (studentRes.ok) {
          const studentData = await studentRes.json()
          if (studentData.success) {
            setStudent(studentData.student)
            const authData = StudentAuthManager.getAuth()
            if (authData) {
              StudentAuthManager.setAuth(
                studentData.student,
                authData.credentials.enrollment,
                authData.credentials.password
              )
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch updated student data:", err)
      }

      try {
        const messagesRes = await fetch(`/api/student/${studentId}/messages`, { headers })
        if (messagesRes.ok) {
          const messagesData = await messagesRes.json()
          if (messagesData.success) setMessages(messagesData.messages)
        } else if (messagesRes.status === 401) {
          StudentAuthManager.clearAuth()
          router.push("/student/login")
          return
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err)
      }

      try {
        const companiesRes = await fetch(`/api/student/${studentId}/companies`, { headers })
        if (companiesRes.ok) {
          const companiesData = await companiesRes.json()
          if (companiesData.success) setCompanies(companiesData.companies)
        } else if (companiesRes.status === 401) {
          StudentAuthManager.clearAuth()
          router.push("/student/login")
          return
        }
      } catch (err) {
        console.error("Failed to fetch companies:", err)
      }

      try {
        const seminarsRes = await fetch(`/api/student/${studentId}/seminars`, { headers })
        if (seminarsRes.ok) {
          const seminarsData = await seminarsRes.json()
          if (seminarsData.success) setSeminars(seminarsData.seminars)
        } else if (seminarsRes.status === 401) {
          StudentAuthManager.clearAuth()
          router.push("/student/login")
          return
        }
      } catch (err) {
        console.error("Failed to fetch seminars:", err)
      }

      try {
        const broadcastRes = await fetch(`/api/student/${studentId}/broadcast`, { headers })
        if (broadcastRes.ok) {
          const broadcastData = await broadcastRes.json()
          if (broadcastData.success) setBroadcasts(broadcastData.broadcasts)
        }
      } catch (err) {
        console.error("Failed to fetch broadcasts:", err)
      }
    } catch (error) {
      console.error("Failed to fetch student data:", error)
      setError("Failed to load student data. Please try again later.")
    } finally {
      setLoading(false)
    }
  }

  // ✅ Save caste & gender
  const handleProfileCompletionSave = async () => {

    if (!caste || !gender) {
      alert("Please select caste and gender")
      return
    }

    setSavingProfile(true)

    try {

      const headers = StudentAuthManager.getAuthHeaders()

      const response = await fetch("/api/student/profile", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          studentId: student?.id,
          caste,
          gender
        })
      })

      const data = await response.json()

      if (data.success) {

        // ✅ fetch fresh data from database
        await fetchStudentData(student!.id)

        // close modal
        setShowProfileCompletionModal(false)


      } else {
        alert("Failed to save profile")
      }

    } catch (error) {
      console.error(error)
      alert("Error saving profile")
    }

    setSavingProfile(false)
  }

  const handleDismissBroadcast = (id: number) => {
    setDismissedBroadcasts((prev) => new Set([...prev, id]))
  }

  // Helper function to determine deadline status and styling
  const getDeadlineStatus = (company: any) => {
    if (company.is_expired) {
      return { status: "Expired", variant: "destructive" as const, canApply: false }
    }
    if (company.days_remaining <= 7) {
      return { status: "Closing Soon", variant: "destructive" as const, canApply: true }
    }
    return { status: "Active", variant: "default" as const, canApply: true }
  }

  const handleApply = async (companyId: number) => {
    if (!student) return

    const company = companies.find((c) => c.id === companyId)
    if (company?.is_expired) {
      alert("This job opening has expired and is no longer accepting applications.")
      return
    }

    setApplying(companyId)
    try {
      const headers = StudentAuthManager.getAuthHeaders()

      const response = await fetch(`/api/student/${student.id}/companies/apply`, {
        method: "POST",
        headers,
        body: JSON.stringify({ company_id: companyId }),
      })

      if (!response.ok) {
        if (response.status === 401) {
          StudentAuthManager.clearAuth()
          router.push("/student/login")
          return
        }
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        alert("Application submitted successfully!")
        fetchStudentData(student.id)
      } else {
        alert(data.message || "Failed to apply")
      }
    } catch (error) {
      console.error("Application error:", error)
      alert("Failed to apply to company. Please try again.")
    } finally {
      setApplying(null)
    }
  }

  const handleRatingSubmit = async () => {
    if (!ratingDialog.seminar || !student || ratingData.rating === 0) return

    setSubmittingRating(true)
    try {
      const headers = StudentAuthManager.getAuthHeaders()
      const response = await fetch(`/api/student/${student.id}/seminars/${ratingDialog.seminar.id}/rating`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(ratingData),
      })

      const data = await response.json()
      if (data.success) {
        alert("Rating submitted successfully!")
        setRatingDialog({ open: false, seminar: null })
        setRatingData({ rating: 0, comment: "" })
        fetchStudentData(student.id)
      } else {
        alert(data.message || "Failed to submit rating")
      }
    } catch (error) {
      console.error("Rating submission error:", error)
      alert("Failed to submit rating. Please try again.")
    } finally {
      setSubmittingRating(false)
    }
  }

  const openRatingDialog = (seminar: any) => {
    setRatingDialog({ open: true, seminar })
    setRatingData({ rating: seminar.my_rating || 0, comment: seminar.my_comment || "" })
  }

  const renderStarRating = (rating: number, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-6 h-6 cursor-pointer transition-colors ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300"
              }`}
            onClick={() => onRatingChange?.(star)}
          />
        ))}
      </div>
    )
  }

  const openLink = (url: string) => {
    if (!url) return
    window.open(url, "_blank", "noopener,noreferrer")
  }

  const truncateContent = (content: string, maxLength = 60) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }

  const truncateText = (text: string, maxLength = 80) => {
    if (!text) return ""
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }

  const formatDescription = (text: string) => {
    if (!text) return []
    // Split by double newlines first (explicit paragraph breaks)
    const paragraphs = text.split(/\n\n+/)
    // If no explicit breaks, split into chunks of ~300 characters for readability
    if (paragraphs.length === 1) {
      const chunk = paragraphs[0]
      if (chunk.length > 300) {
        return chunk.split(/(?<=[.!?])\s+/).reduce((acc: string[], sentence: string) => {
          if (acc.length === 0) return [sentence]
          const lastPara = acc[acc.length - 1]
          if ((lastPara + " " + sentence).length > 300) {
            acc.push(sentence)
          } else {
            acc[acc.length - 1] = lastPara + " " + sentence
          }
          return acc
        }, [])
      }
    }
    return paragraphs.filter((p) => p.trim().length > 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="max-w-md shadow-xl">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()}>Try Again</Button>
              <Button variant="outline" onClick={() => router.push("/")}>
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="max-w-md shadow-xl">
          <CardContent className="text-center p-8">
            <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">Unable to load student data</p>
            <Link href="/student/login">
              <Button>Return to Login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stats = [
    {
      label: "Job Openings",
      value: `${companies.length} / ${companies.filter((c) => c.has_applied).length}`,
      icon: Building2,
      color: "blue",
      sublabel: "Applied",
    },
    {
      label: "Seminars",
      value: `${seminars.length} / ${seminars.filter((s) => s.attendance_status === "Present").length}`,
      icon: Calendar,
      color: "green",
      sublabel: "Attended",
    },
    { label: "Current Semester", value: student.current_semester, icon: BookOpen, color: "purple" },
    { label: "Messages", value: messages.length, icon: MessageSquare, color: "orange" },
  ]

  const quickActions = [
    { label: "View Messages", icon: MessageSquare, id: "messages", color: "blue" },
    { label: "Browse Companies", icon: Building2, id: "companies", color: "green" },
    { label: "Seminars", icon: Calendar, id: "seminars", color: "purple" },
    { label: "My Profile", icon: User, id: "profile", color: "orange" },
    { label: "Documents", icon: FileText, id: "documents", color: "red" },
    { label: "QR Code", icon: QrCode, id: "qr", color: "indigo" },
    { label: "My Exams", icon: Calendar, id: "exams", color: "cyan" },
    { label: "Academics", icon: BookOpen, id: "academics", color: "cyan" },
    { label: "My Fees", icon: DollarSign, id: "fees", color: "emerald" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {student && (
        <AnimatedAssistants
          data={{
            messages,
            companies,
            seminars,
          }}
        />
      )}

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div className="space-y-2 animate-fade-in-up flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent">
              Student Dashboard
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground">
              Welcome back, {student.full_name || student.name}!{" "}
              {(student as any).unique_code && (
                <span className="text-red-600 font-bold">({(student as any).unique_code})</span>
              )}{" "}
              Here's your ERP Everything you need, all in one place .
            </p>
          </div>
          {broadcasts.length > 0 && (
            <button
              onClick={() => setAnnouncementsModalOpen(true)}
              className="relative p-2 hover:bg-muted rounded-lg transition-colors group"
              title="View announcements"
            >
              <Bell className="w-6 h-6 text-blue-500 group-hover:text-blue-600 transition-colors" />
              {broadcasts.filter((b) => !dismissedBroadcasts.has(b.id)).length > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          )}
        </div>

        {/* Lecture QR Scanner Section */}
        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800 animate-fade-in-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Mark Lecture Attendance
            </CardTitle>
            <CardDescription>
              Scan the QR code displayed by your tutor during class to mark your attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {student && <LectureQRScanner studentId={student.id} onSuccess={() => setAttendanceRefresh(prev => prev + 1)} />}
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6 animate-fade-in-up">
          {stats.map((stat, index) => (
            <Card key={index} className="stat-card group">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                    <p className="metric-label text-xs sm:text-sm">{stat.label}</p>
                    <div className="flex items-baseline gap-1">
                      <p className="metric-value text-xl sm:text-3xl">{stat.value}</p>
                      {stat.sublabel && (
                        <p className="text-xs text-muted-foreground hidden sm:inline">{stat.sublabel}</p>
                      )}
                    </div>
                  </div>
                  <div
                    className={`p-2 sm:p-3 bg-${stat.color}-500/10 rounded-lg sm:rounded-xl group-hover:bg-${stat.color}-500/20 transition-colors flex-shrink-0`}
                  >
                    <stat.icon className={`w-4 h-4 sm:w-6 sm:h-6 text-${stat.color}-500`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 animate-slide-in-right">
          {student && (
            <StudentLectureProgress studentId={student.id} authHeaders={StudentAuthManager.getAuthHeaders()} />
          )}

          <div className="space-y-4 sm:space-y-6 flex flex-col">
            {/* Placement Progress Card */}
            <Card className="admin-card">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Placement Progress</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="text-center space-y-1 p-3 sm:p-4 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-950/10">
                  <p className="text-lg sm:text-2xl font-bold text-green-500">{companies.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Job Openings</p>
                  <p className="text-xs sm:text-sm font-semibold text-green-600">
                    {companies.filter((c) => c.has_applied).length} Applied
                  </p>
                </div>
                <div className="text-center space-y-1 p-3 sm:p-4 border rounded-lg bg-gradient-to-br from-purple-50 to-purple-50/50 dark:from-purple-950/30 dark:to-purple-950/10">
                  <p className="text-lg sm:text-2xl font-bold text-blue-500">{seminars.length}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Seminars</p>
                  <p className="text-xs sm:text-sm font-semibold text-blue-600">
                    {seminars.filter((s) => s.attendance_status === "Present").length} Attended
                  </p>
                </div>
                <div className="text-center space-y-1 p-3 sm:p-4 border rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-50/50 dark:from-emerald-950/30 dark:to-emerald-950/10">
                  <p className="text-lg sm:text-2xl font-bold text-purple-500">
                    {student.placement_status === "Placed" ? "✓" : "—"}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                  <p className="text-xs sm:text-sm font-semibold text-purple-600">{student.placement_status}</p>
                </div>
                {student.placement_status === "Placed" && (
                  <div className="p-3 sm:p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium text-green-700">
                        Congratulations! You are placed.
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="admin-card flex-1">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>Quick Actions</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Quick access to features</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    className="w-full admin-button justify-start text-xs sm:text-sm h-8 sm:h-10"
                    onClick={() => {
                      if (action.id === "exams") {
                        router.push("/student/exams")
                      } else if (action.id === "academics") {
                        router.push("/student/academics")
                      } else if (action.id === "fees") {
                        router.push("/student/fees")
                      } else if (action.id === "contact") {
                        window.location.href = "/student/contact"
                      } else {
                        setActiveModal(action.id)
                      }
                    }}
                  >
                    <action.icon className="w-3 h-3 sm:w-4 sm:h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{action.label}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Messages Modal */}
        <Dialog open={activeModal === "messages"} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Messages ({messages.length})
              </DialogTitle>
              <DialogDescription>Important announcements and updates from the placement office</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {messages.length > 0 ? (
                <div className="divide-y">
                  {messages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => setSelectedMessage(message)}
                      className="w-full text-left py-3 px-4 hover:bg-muted/50 transition-colors rounded-lg group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <MessageSquare className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                            {message.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {truncateContent(message.content, 80)}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(message.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No messages yet</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Full Message Detail Modal */}
        <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedMessage && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl font-bold mb-2">{selectedMessage.title}</DialogTitle>
                      <DialogDescription className="text-xs">
                        {new Date(selectedMessage.created_at).toLocaleDateString("en-IN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedMessage.image_url && (
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img
                        src={selectedMessage.image_url || "/placeholder.svg"}
                        alt="Message attachment"
                        className="w-full max-h-64 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                      {selectedMessage.content}
                    </p>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={() => setSelectedMessage(null)} variant="outline">
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Companies Modal */}
        <Dialog open={activeModal === "companies"} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Available Companies ({companies.length})
              </DialogTitle>
              <DialogDescription>Click on a company name to view full details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {companies.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Company</TableHead>
                        <TableHead className="font-semibold">Position</TableHead>
                        <TableHead className="font-semibold">Deadline</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companies.map((company) => {
                        const deadlineInfo = getDeadlineStatus(company)
                        return (
                          <TableRow key={company.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                              <button
                                onClick={() => setSelectedCompany(company)}
                                className="flex items-center space-x-3 hover:text-primary transition-colors"
                              >
                                <div className="p-2 bg-primary rounded-lg">
                                  <Building2 className="w-4 h-4 text-primary-foreground" />
                                </div>
                                <div className="text-left">
                                  <div className="font-semibold hover:underline">{company.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {company.targeting_mode === "course_semester" &&
                                      company.course_name &&
                                      company.semester
                                      ? `${company.course_name} • Semester ${company.semester}`
                                      : company.interest_name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {company.opening_type === "internship"
                                      ? `Internship${company.tenure_days ? ` • ${company.tenure_days} days` : ""}`
                                      : "Job"}
                                  </div>
                                </div>
                              </button>
                            </TableCell>
                            <TableCell className="font-medium">{company.position}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(company.application_deadline).toLocaleDateString("en-IN")}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {company.is_expired ? "Expired" : `${company.days_remaining} days left`}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={deadlineInfo.variant}>{deadlineInfo.status}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-row gap-2 items-center justify-center flex-nowrap">
                                <Button
                                  size="sm"
                                  onClick={() => handleApply(company.id)}
                                  disabled={applying === company.id || company.has_applied || !deadlineInfo.canApply}
                                  variant={
                                    company.has_applied ? "secondary" : deadlineInfo.canApply ? "default" : "secondary"
                                  }
                                >
                                  {applying === company.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                      Applying...
                                    </>
                                  ) : company.has_applied ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Applied
                                    </>
                                  ) : !deadlineInfo.canApply ? (
                                    <>
                                      <Clock className="w-4 h-4 mr-2" />
                                      Expired
                                    </>
                                  ) : (
                                    <>
                                      Apply Now
                                      <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                  )}
                                </Button>
                                {company.has_applied && company.custom_link && (
                                  <Button
                                    size="sm"
                                    onClick={() => window.open(company.custom_link, "_blank", "noopener,noreferrer")}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Fill Details
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No companies available at the moment</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Company Detail Modal */}
        <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedCompany && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-2xl font-bold mb-2">{selectedCompany.name}</DialogTitle>
                      <DialogDescription className="text-sm">
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline">{selectedCompany.position}</Badge>
                          <Badge variant="outline">
                            {selectedCompany.opening_type === "internship" ? "Internship" : "Job"}
                          </Badge>
                          {selectedCompany.tenure_days && (
                            <Badge variant="outline">{selectedCompany.tenure_days} days</Badge>
                          )}
                          <Badge variant={getDeadlineStatus(selectedCompany).variant}>
                            {getDeadlineStatus(selectedCompany).status}
                          </Badge>
                        </div>
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-6">
                  {selectedCompany.image_url && (
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <img
                        src={selectedCompany.image_url || "/placeholder.svg"}
                        alt="Company opening attachment"
                        className="w-full max-h-64 object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                  )}

                  {selectedCompany.description && (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center">
                          <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                          About the Company
                        </h3>
                        <div className="space-y-3">
                          {formatDescription(selectedCompany.description).map((paragraph, idx) => (
                            <p key={idx} className="text-sm leading-relaxed text-foreground/90 text-justify">
                              {paragraph.trim()}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg border border-border/50">
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold mb-1">Position</p>
                      <p className="font-medium text-sm">{selectedCompany.position}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold mb-1">Type</p>
                      <p className="font-medium text-sm">
                        {selectedCompany.opening_type === "internship" ? "Internship" : "Job"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold mb-1">Application Deadline</p>
                      <p className="font-medium text-sm">
                        {new Date(selectedCompany.last_date_to_apply).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold mb-1">Status</p>
                      <Badge variant={getDeadlineStatus(selectedCompany).variant}>
                        {getDeadlineStatus(selectedCompany).status}
                      </Badge>
                    </div>
                  </div>

                  {selectedCompany.is_expired && (
                    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm text-destructive mb-1">Application Deadline Expired</p>
                          <p className="text-sm text-destructive/80">
                            This job opening is no longer accepting applications. You can view the details for
                            reference, but cannot apply.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedCompany.eligibility_criteria && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-foreground flex items-center">
                        <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                        Eligibility Criteria
                      </h3>
                      <div className="space-y-2">
                        {formatDescription(selectedCompany.eligibility_criteria).map((paragraph, idx) => (
                          <p
                            key={idx}
                            className="text-sm leading-relaxed text-foreground/90 text-justify p-2 bg-muted/30 rounded border-l-2 border-primary/50"
                          >
                            {paragraph.trim()}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCompany.targeting_mode === "course_semester" && selectedCompany.course_name && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs uppercase text-blue-700 dark:text-blue-300 font-semibold mb-1">
                        Targeted For
                      </p>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {selectedCompany.course_name} • Semester {selectedCompany.semester}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      onClick={() => handleApply(selectedCompany.id)}
                      disabled={
                        applying === selectedCompany.id || selectedCompany.has_applied || selectedCompany.is_expired
                      }
                      className="flex-1"
                      size="lg"
                      variant={
                        selectedCompany.has_applied ? "secondary" : selectedCompany.is_expired ? "secondary" : "default"
                      }
                    >
                      {applying === selectedCompany.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                          Applying...
                        </>
                      ) : selectedCompany.has_applied ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Already Applied
                        </>
                      ) : selectedCompany.is_expired ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          Application Closed
                        </>
                      ) : (
                        <>
                          Apply Now
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                    {selectedCompany.has_applied && selectedCompany.custom_link && (
                      <Button
                        onClick={() => window.open(selectedCompany.custom_link, "_blank", "noopener,noreferrer")}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        size="lg"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Fill Details
                      </Button>
                    )}
                    <Button onClick={() => setSelectedCompany(null)} variant="outline" size="lg" className="px-6">
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Seminars Modal */}
        <Dialog open={activeModal === "seminars"} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Seminars
              </DialogTitle>
              <DialogDescription>Seminars related to your interests and course</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {(() => {
                const total = seminars?.length || 0
                const attended = (seminars || []).filter(
                  (s: any) => (s.attendance_status ?? "Absent") === "Present",
                ).length
                const pct = total > 0 ? Math.round((attended / total) * 100) : 0
                return (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="p-3 border rounded-md text-center">
                      <p className="text-xs uppercase text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{total}</p>
                    </div>
                    <div className="p-3 border rounded-md text-center">
                      <p className="text-xs uppercase text-muted-foreground">Attended</p>
                      <p className="text-xl font-bold">{attended}</p>
                    </div>
                    <div className="p-3 border rounded-md text-center">
                      <p className="text-xs uppercase text-muted-foreground">%</p>
                      <p className="text-xl font-bold">{pct}%</p>
                    </div>
                  </div>
                )
              })()}
              {seminars && seminars.length > 0 ? (
                <div className="divide-y">
                  {seminars.map((seminar) => {
                    const seminarDate = parseISTDate(seminar.seminar_date)
                    return (
                      <button
                        key={seminar.id}
                        onClick={() => setSelectedSeminar(seminar)}
                        className="w-full text-left py-3 px-4 hover:bg-muted/50 transition-colors rounded-lg group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <Calendar className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                              {seminar.title}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                              {truncateText(seminar.description, 80)}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {seminarDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                              {seminar.speaker_name && (
                                <>
                                  <span>•</span>
                                  <span>{seminar.speaker_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={seminar.attendance_status === "Present" ? "default" : "outline"}
                            className="flex-shrink-0"
                          >
                            {seminar.attendance_status || "Absent"}
                          </Badge>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No seminars available</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Full Seminar Detail Modal */}
        <Dialog open={!!selectedSeminar} onOpenChange={(open) => !open && setSelectedSeminar(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            {selectedSeminar && (
              <>
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-primary/10 rounded-lg flex-shrink-0">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl font-bold mb-2">{selectedSeminar.title}</DialogTitle>
                      <DialogDescription className="text-xs">
                        {parseISTDate(selectedSeminar.seminar_date).toLocaleDateString("en-IN", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                      {selectedSeminar.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    {selectedSeminar.speaker_name && (
                      <div>
                        <p className="text-xs uppercase text-muted-foreground font-semibold">Speaker</p>
                        <p className="font-medium">{selectedSeminar.speaker_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase text-muted-foreground font-semibold">Attendance</p>
                      <Badge variant={selectedSeminar.attendance_status === "Present" ? "default" : "outline"}>
                        {selectedSeminar.attendance_status || "Absent"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={() => setSelectedSeminar(null)} variant="outline">
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Profile Modal */}
        <Dialog open={activeModal === "profile"} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                My Profile
              </DialogTitle>
              <DialogDescription>Your personal and academic information</DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Name</p>
                  <p className="font-medium">{student.full_name || student.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Email</p>
                  <p className="font-medium">{student.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Phone</p>
                  <p className="font-medium">{student.phone_number || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Parent Phone</p>
                  <p className="font-medium">{student.parent_phone_number || "Not provided"}</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Enrollment Number</p>
                  <p className="font-medium">{student.enrollment_number}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Course</p>
                  <p className="font-medium">{student.course_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Current Semester</p>
                  <p className="font-medium">Semester {student.current_semester}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Placement Status</p>
                  <Badge variant={student.placement_status === "Placed" ? "default" : "secondary"}>
                    {student.placement_status}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Documents Modal */}
        <Dialog open={activeModal === "documents"} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Documents
              </DialogTitle>
              <DialogDescription>Access your resume and placement agreement</DialogDescription>
            </DialogHeader>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 border-2 border-dashed border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
                <div className="text-center">
                  <div className="p-3 bg-primary rounded-full w-fit mx-auto mb-3">
                    <FileText className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">Resume</h3>
                  <p className="text-sm text-muted-foreground mb-4">Your current resume document</p>
                  <div className="flex gap-2">
                    {student.resume_link && student.resume_link.trim() !== "" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openLink(student.resume_link)}
                          className="flex-1 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openLink(student.resume_link)}
                          className="flex-1 text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No resume uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-2 border-dashed border-secondary/20 rounded-lg hover:bg-secondary/5 transition-colors">
                <div className="text-center">
                  <div className="p-3 bg-secondary rounded-full w-fit mx-auto mb-3">
                    <FileText className="w-5 h-5 text-secondary-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2 text-sm">Placement Agreement</h3>
                  <p className="text-sm text-muted-foreground mb-4">Your placement agreement document</p>
                  <div className="flex gap-2">
                    {student.agreement_link && student.agreement_link.trim() !== "" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openLink(student.agreement_link)}
                          className="flex-1 text-xs"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openLink(student.agreement_link)}
                          className="flex-1 text-xs"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Open
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">No agreement uploaded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Code Modal */}
        <Dialog open={activeModal === "qr"} onOpenChange={(open) => !open && setActiveModal(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <QrCode className="w-5 h-5 mr-2" />
                My QR Code
              </DialogTitle>
              <DialogDescription>Your permanent QR code for attendance marking</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <StudentQRDownload studentId={student.id} />
            </div>
          </DialogContent>
        </Dialog>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center space-x-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Companies</span>
            </TabsTrigger>
            <TabsTrigger value="seminars" className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Seminars</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="shadow-lg">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{student.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{student.phone_number || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Parent Phone</p>
                      <p className="font-medium">{student.parent_phone_number || "Not provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Admission Semester</p>
                      <p className="font-medium">Semester {student.admission_semester || "Not provided"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader className="bg-muted/50">
                  <CardTitle className="flex items-center">
                    <BookOpen className="w-5 h-5 mr-2" />
                    Academic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center space-x-3">
                    <Target className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Enrollment Number</p>
                      <p className="font-medium">{student.enrollment_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Course</p>
                      <p className="font-medium">{student.course_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Semester</p>
                      <p className="font-medium">Semester {student.current_semester}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Building2 className="w-5 h-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Placement Status</p>
                      <Badge variant={student.placement_status === "Placed" ? "default" : "secondary"}>
                        {student.placement_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg md:col-span-2">
                <CardHeader className="bg-muted/50">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <QrCode className="w-5 h-5 mr-2" />
                      My QR Code
                    </CardTitle>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <CardDescription>Download your permanent QR code for attendance marking</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <StudentQRDownload studentId={student.id} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="messages">
            <Card className="shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Recent Messages ({messages.length})
                </CardTitle>
                <CardDescription>Important announcements and updates from the placement office</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {messages.length > 0 ? (
                  <div className="divide-y">
                    {messages.map((message) => (
                      <button
                        key={message.id}
                        onClick={() => setSelectedMessage(message)}
                        className="w-full text-left p-6 hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                            <MessageSquare className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                              {message.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{message.content}</p>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Clock className="w-4 h-4 mr-1" />
                              {new Date(message.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 group-hover:text-primary transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No messages yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="companies">
            <Card className="shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Available Companies ({companies.length})
                </CardTitle>
                <CardDescription>Apply to companies that match your profile and interests</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {companies.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Company</TableHead>
                          <TableHead className="font-semibold">Position</TableHead>
                          <TableHead className="font-semibold">Deadline</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.map((company) => {
                          const deadlineInfo = getDeadlineStatus(company)
                          return (
                            <TableRow key={company.id} className="hover:bg-muted/50 transition-colors">
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-primary rounded-lg">
                                    <Building2 className="w-4 h-4 text-primary-foreground" />
                                  </div>
                                  <div>
                                    <button
                                      onClick={() => setSelectedCompany(company)}
                                      className="font-semibold hover:text-primary hover:underline cursor-pointer text-left transition-colors"
                                    >
                                      {company.name}
                                    </button>
                                    <div className="text-sm text-muted-foreground">
                                      {company.targeting_mode === "course_semester" &&
                                        company.course_name &&
                                        company.semester
                                        ? `${company.course_name} • Semester ${company.semester}`
                                        : company.interest_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {company.opening_type === "internship"
                                        ? `Internship${company.tenure_days ? ` • ${company.tenure_days} days` : ""}`
                                        : "Job"}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{company.position}</TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {new Date(company.application_deadline).toLocaleDateString("en-IN")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {company.is_expired ? "Expired" : `${company.days_remaining} days left`}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={deadlineInfo.variant}>{deadlineInfo.status}</Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-row gap-2 items-center justify-center flex-nowrap">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApply(company.id)}
                                    disabled={applying === company.id || company.has_applied || !deadlineInfo.canApply}
                                    variant={
                                      company.has_applied
                                        ? "secondary"
                                        : deadlineInfo.canApply
                                          ? "default"
                                          : "secondary"
                                    }
                                  >
                                    {applying === company.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                                        Applying...
                                      </>
                                    ) : company.has_applied ? (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Applied
                                      </>
                                    ) : !deadlineInfo.canApply ? (
                                      <>
                                        <Clock className="w-4 h-4 mr-2" />
                                        Expired
                                      </>
                                    ) : (
                                      <>
                                        Apply Now
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                      </>
                                    )}
                                  </Button>
                                  {company.has_applied && company.custom_link && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        window.open(company.custom_link, "_blank", "noopener,noreferrer")
                                      }
                                      className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Fill Details
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No companies available at the moment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seminars">
            <Card className="mb-6 shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Seminar Attendance Summary
                </CardTitle>
                <CardDescription>Your attendance across all relevant seminars</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {(() => {
                  const total = seminars?.length || 0
                  const attended = (seminars || []).filter(
                    (s: any) => (s.attendance_status ?? "Absent") === "Present",
                  ).length
                  const pct = total > 0 ? Math.round((attended / total) * 100) : 0
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border rounded-md">
                        <p className="text-xs uppercase text-muted-foreground">Total Seminars</p>
                        <p className="text-2xl font-bold">{total}</p>
                      </div>
                      <div className="p-4 border rounded-md">
                        <p className="text-xs uppercase text-muted-foreground">Attended</p>
                        <p className="text-2xl font-bold">{attended}</p>
                      </div>
                      <div className="p-4 border rounded-md">
                        <p className="text-xs uppercase text-muted-foreground">Attendance %</p>
                        <p className="text-2xl font-bold">{pct}%</p>
                      </div>
                    </div>
                  )
                })()}
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  Seminars & Ratings
                </CardTitle>
                <CardDescription>
                  Seminars related to your interests and course. Rate attended seminars!
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {seminars && seminars.length > 0 ? (
                  <div className="divide-y">
                    {seminars.map((seminar) => {
                      const seminarDate = parseISTDate(seminar.seminar_date)
                      const isPast = seminarDate < new Date()
                      const hasRated = typeof seminar.my_rating === "number" && seminar.my_rating > 0
                      const canRate = isPast && seminar.attendance_status === "Present" && !hasRated

                      return (
                        <div
                          key={seminar.id}
                          className="p-6 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedSeminar(seminar)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-4 flex-1">
                              <div className="p-2 bg-primary rounded-lg flex-shrink-0">
                                <Calendar className="w-5 h-5 text-primary-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold mb-1 hover:text-primary transition-colors">
                                  {seminar.title}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                                  {truncateText(seminar.description, 100)}
                                </p>
                                <div className="flex items-center text-sm text-muted-foreground gap-3">
                                  <div className="flex items-center">
                                    <Clock className="w-4 h-4 mr-1" />
                                    {seminarDate.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                                  </div>
                                  {seminar.speaker_name && (
                                    <div className="flex items-center">
                                      <User className="w-4 h-4 mr-1" />
                                      {seminar.speaker_name}
                                    </div>
                                  )}
                                </div>
                                {hasRated && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">Your Rating:</span>
                                    <div className="flex items-center">{renderStarRating(seminar.my_rating)}</div>
                                    <span className="text-xs text-muted-foreground">({seminar.my_rating}/5)</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-2 flex-shrink-0">
                              <Badge variant={seminar.attendance_status === "Present" ? "default" : "outline"}>
                                {seminar.attendance_status || "Not Attended"}
                              </Badge>
                              {canRate ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    openRatingDialog(seminar)
                                  }}
                                  className="flex items-center space-x-1"
                                >
                                  <Star className="w-4 h-4" />
                                  <span>Rate</span>
                                </Button>
                              ) : hasRated ? (
                                <Button size="sm" variant="secondary" disabled className="flex items-center space-x-1">
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Rated</span>
                                </Button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No seminars available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="shadow-lg">
              <CardHeader className="bg-muted/50">
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Important Documents
                </CardTitle>
                <CardDescription>Access your resume and placement agreement</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 border-2 border-dashed border-primary/20 rounded-lg hover:bg-primary/5 transition-colors">
                    <div className="text-center">
                      <div className="p-3 bg-primary rounded-full w-fit mx-auto mb-4">
                        <FileText className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <h3 className="font-semibold mb-2">Resume</h3>
                      <p className="text-sm text-muted-foreground mb-4">Your current resume document</p>
                      <div className="flex space-x-2">
                        {student.resume_link && student.resume_link.trim() !== "" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openLink(student.resume_link)}
                              className="flex-1"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openLink(student.resume_link)}
                              className="flex-1"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No resume uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-2 border-dashed border-secondary/20 rounded-lg hover:bg-secondary/5 transition-colors">
                    <div className="text-center">
                      <div className="p-3 bg-secondary rounded-full w-fit mx-auto mb-4">
                        <FileText className="w-6 h-6 text-secondary-foreground" />
                      </div>
                      <h3 className="font-semibold mb-2">Placement Agreement</h3>
                      <p className="text-sm text-muted-foreground mb-4">Your placement agreement document</p>
                      <div className="flex space-x-2">
                        {student.agreement_link && student.agreement_link.trim() !== "" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openLink(student.agreement_link)}
                              className="flex-1"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openLink(student.agreement_link)}
                              className="flex-1"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Open
                            </Button>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">No agreement uploaded</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Rating Dialog */}
        <Dialog open={ratingDialog.open} onOpenChange={(open) => setRatingDialog({ open, seminar: null })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Rate Seminar
              </DialogTitle>
              <DialogDescription>How would you rate "{ratingDialog.seminar?.title}"?</DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Rating (1-5 stars)</Label>
                <div className="flex justify-center">
                  {renderStarRating(ratingData.rating, (rating) => setRatingData({ ...ratingData, rating }))}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {ratingData.rating === 0 && "Click a star to rate"}
                  {ratingData.rating === 1 && "Poor"}
                  {ratingData.rating === 2 && "Fair"}
                  {ratingData.rating === 3 && "Good"}
                  {ratingData.rating === 4 && "Very Good"}
                  {ratingData.rating === 5 && "Excellent"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment">Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="Share your thoughts about the seminar..."
                  value={ratingData.comment}
                  onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setRatingDialog({ open: false, seminar: null })}>
                  Cancel
                </Button>
                <Button onClick={handleRatingSubmit} disabled={ratingData.rating === 0 || submittingRating}>
                  {submittingRating ? "Submitting..." : "Submit Rating"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AnnouncementsModal
          open={announcementsModalOpen}
          onOpenChange={setAnnouncementsModalOpen}
          announcements={broadcasts.filter((b) => !dismissedBroadcasts.has(b.id))}
        />

        {/* ✅ Profile Completion Mandatory Modal */}

        <Dialog open={showProfileCompletionModal}>

          <DialogContent className="max-w-md">

            <DialogHeader>
              <DialogTitle>Complete Your Profile</DialogTitle>
              <DialogDescription>
                Please select your caste and gender to continue
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">

              <div>
                <Label>Caste</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={caste}
                  onChange={(e) => setCaste(e.target.value)}
                >
                  <option value="">Select caste</option>
                  <option value="ST">ST</option>
                  <option value="SC">SC</option>
                  <option value="OBC">OBC</option>
                  <option value="GENERAL">GENERAL</option>
                </select>
              </div>

              <div>
                <Label>Gender</Label>
                <select
                  className="w-full border rounded-md p-2"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Transgender">Transgender</option>
                </select>
              </div>

              <Button
                onClick={handleProfileCompletionSave}
                disabled={savingProfile}
                className="w-full"
              >
                {savingProfile ? "Saving..." : "Save & Continue"}
              </Button>

            </div>

          </DialogContent>

        </Dialog>
      </div>
    </div>
  )
}
