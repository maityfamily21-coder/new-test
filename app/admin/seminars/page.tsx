"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // add DialogClose to use a footer Close button
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Users,
  Calendar,
  X,
  AlertTriangle,
  Presentation,
  Clock,
  BookOpen,
  Target,
  Sparkles,
  User,
  Star,
  BarChart3,
  QrCode,
  CheckCircle,
} from "lucide-react"
import Link from "next/link"
import type { Seminar, Interest, Course } from "@/lib/db"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import QRCodeLib from "qrcode"
// </CHANGE> import Tabs for tabbed insights modal
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AttendanceQRScanner } from "@/components/attendance-qr-scanner"
import { SearchableCourseSelect } from "@/components/searchable-course-select"

const INSIGHTS_PER_PAGE = 10

function paginate<T>(items: T[], page: number, perPage: number) {
  const start = (page - 1) * perPage
  return items.slice(start, start + perPage)
}
function genPageNumbers(current: number, totalPages: number) {
  const pages: Array<number | "ellipsis"> = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else if (current <= 4) {
    for (let i = 1; i <= 5; i++) pages.push(i)
    pages.push("ellipsis", totalPages)
  } else if (current >= totalPages - 3) {
    pages.push(1, "ellipsis")
    for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
    pages.push()
  } else {
    pages.push(1, "ellipsis", current - 1, current, current + 1, "ellipsis", totalPages)
  }
  return pages
}
// </CHANGE>

export default function SeminarsPage() {
  const [seminars, setSeminars] = useState<Seminar[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [upcomingCount, setUpcomingCount] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [interests, setInterests] = useState<Interest[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingSeminar, setEditingSeminar] = useState<Seminar | null>(null)
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false)
  const [selectedSeminar, setSelectedSeminar] = useState<Seminar | null>(null)
  const [attendanceList, setAttendanceList] = useState<any[]>([])
  const [courseSemesterSupported, setCourseSemesterSupported] = useState(true)
  const [ratingsDialogOpen, setRatingsDialogOpen] = useState(false)
  const [ratingsData, setRatingsData] = useState<any>({ ratings: [], statistics: null })
  const [loadingRatings, setLoadingRatings] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  // QR Dialog UI State
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null) // State for QR code
  const [qrStatusBySeminar, setQrStatusBySeminar] = useState<Record<number, "active" | "closed" | "unknown">>({})
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prefillApplied, setPrefillApplied] = useState(false)

  const [activeAttendanceTab, setActiveAttendanceTab] = useState<string | null>(null)
  const [courseSemesterTabs, setCourseSemesterTabs] = useState<
    Array<{ course_id: number; course_name: string; semester: number }>
  >([])
  const [courseSemesterTabsLoaded, setCourseSemesterTabsLoaded] = useState(false)

  const [targetCombosOpen, setTargetCombosOpen] = useState(false)
  const [targetCombos, setTargetCombos] = useState<{ course_id: number; course_name: string; semester: number }[]>([])
  const [targetCombosLoading, setTargetCombosLoading] = useState(false)

  // Add new state hooks inside the component, near other useState declarations
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [insightsOptions, setInsightsOptions] = useState<{
    courses: Array<{ id: number; name: string; total_semesters: number }>
    interests: Array<{ id: number; name: string }>
    speakers: string[]
  }>({ courses: [], interests: [], speakers: [] })
  const [insightsSummary, setInsightsSummary] = useState<{
    totalSeminars: number
    uniqueSpeakers: number
    totalCoursesCovered: number
    mostFrequentInterest: string | null
  } | null>(null)

  // Course–Semester filter state
  const [csCourseId, setCsCourseId] = useState<string>("")
  const [csSemester, setCsSemester] = useState<string>("")
  const [csCount, setCsCount] = useState<number>(0)
  const [csRows, setCsRows] = useState<any[]>([])
  const [csSort, setCsSort] = useState<{ key: "date" | "title" | "speaker" | "interest"; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  })
  // Course–Semester pagination
  const [csPage, setCsPage] = useState<number>(1)

  // Speaker filter state
  const [spSpeaker, setSpSpeaker] = useState<string>("")
  const [spCount, setSpCount] = useState<number>(0)
  const [spRows, setSpRows] = useState<any[]>([])
  const [spSort, setSpSort] = useState<{ key: "date" | "title" | "course"; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  })
  // Speaker pagination
  const [spPage, setSpPage] = useState<number>(1)

  // Interest filter state
  const [inInterestId, setInInterestId] = useState<string>("")
  const [inCount, setInCount] = useState<number>(0)
  const [inRows, setInRows] = useState<any[]>([])
  const [inSort, setInSort] = useState<{ key: "date" | "title" | "speaker" | "course"; dir: "asc" | "desc" }>({
    key: "date",
    dir: "desc",
  })
  // Interest pagination
  const [inPage, setInPage] = useState<number>(1)

  const [isSeminarRecipientsOpen, setIsSeminarRecipientsOpen] = useState(false)
  const [seminarRecipientsLoading, setSeminarRecipientsLoading] = useState(false)
  const [seminarRecipients, setSeminarRecipients] = useState<
    Array<{
      student_id: number
      student_name: string
      enrollment_number: string | null
      course_name: string | null
      current_semester: number | null
      status?: string | null
    }>
  >([])
  const [seminarRecipientsTitle, setSeminarRecipientsTitle] = useState("")
  // </CHANGE>

  const [attendanceType, setAttendanceType] = useState<"manual" | "qr">("manual")
  const [qrScannerOpen, setQrScannerOpen] = useState(false)
  const [markedAttendance, setMarkedAttendance] = useState<Set<number>>(new Set())

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    seminar_date: "",
    seminar_time: "",
    seminar_type: "interest",
    interest_ids: [] as string[],
    course_semesters: [] as { course_id: string; semester: string }[],
    speaker_name: "", // Added speaker_name to form data
    student_ids: [],
  })

  // Helpers
  function sortRows<T>(rows: T[], key: string, dir: "asc" | "desc") {
    const mult = dir === "asc" ? 1 : -1
    return [...rows].sort((a: any, b: any) => {
      let av = a[key]
      let bv = b[key]
      if (key === "date" || key === "seminar_date") {
        av = new Date(a.seminar_date).getTime()
        bv = new Date(b.seminar_date).getTime()
      } else {
        av = (av ?? "").toString().toLowerCase()
        bv = (bv ?? "").toString().toLowerCase()
      }
      if (av < bv) return -1 * mult
      if (av > bv) return 1 * mult
      return 0
    })
  }

  async function loadInsightsOptions() {
    try {
      setInsightsLoading(true)
      const res = await fetch("/api/admin/seminars/insights", { cache: "no-store" })
      const data = await res.json()
      if (data.success) {
        setInsightsOptions(data.options || { courses: [], interests: [], speakers: [] })
        setInsightsSummary(data.summary || null)
      }
    } finally {
      setInsightsLoading(false)
    }
  }

  async function runCsQuery(courseId: string, semester: string) {
    if (!courseId || !semester) return
    const res = await fetch(
      `/api/admin/seminars/insights?by=course_semester&course_id=${courseId}&semester=${semester}&page=${csPage}&limit=${INSIGHTS_PER_PAGE}`,
      { cache: "no-store" },
    )
    const data = await res.json()
    if (data.success) {
      setCsCount(data.meta?.total || 0)
      // Normalize keys for sorting helper
      const items = (data.items || []).map((r: any) => ({
        ...r,
        date: r.seminar_date,
        speaker: r.speaker_name,
        interest: r.interest_name,
      }))
      setCsRows(items) // Sorting handled by API now
    } else {
      setCsCount(0)
      setCsRows([])
    }
  }

  async function runSpeakerQuery(speaker: string) {
    if (!speaker) return
    const res = await fetch(
      `/api/admin/seminars/insights?by=speaker&speaker=${encodeURIComponent(speaker)}&page=${spPage}&limit=${INSIGHTS_PER_PAGE}`,
      {
        cache: "no-store",
      },
    )
    const data = await res.json()
    if (data.success) {
      setSpCount(data.meta?.total || 0)
      const items = (data.items || []).map((r: any) => ({
        ...r,
        date: r.seminar_date,
        course: r.course_semester,
      }))
      setSpRows(items) // Sorting handled by API now
    } else {
      setSpCount(0)
      setSpRows([])
    }
  }

  async function runInterestQuery(interestId: string) {
    if (!interestId) return
    const res = await fetch(
      `/api/admin/seminars/insights?by=interest&interest_id=${interestId}&page=${inPage}&limit=${INSIGHTS_PER_PAGE}`,
      { cache: "no-store" },
    )
    const data = await res.json()
    if (data.success) {
      setInCount(data.meta?.total || 0)
      const items = (data.items || []).map((r: any) => ({
        ...r,
        date: r.seminar_date,
        course: r.course_semester,
        speaker: r.speaker_name,
      }))
      setInRows(items) // Sorting handled by API now
    } else {
      setInCount(0)
      setInRows([])
    }
  }

  const openSeminarSelectedStudents = async (seminar: any) => {
    try {
      setSeminarRecipients([])
      setSeminarRecipientsTitle(seminar?.title || "Selected Students")
      setIsSeminarRecipientsOpen(true)
      setSeminarRecipientsLoading(true)
      const res = await fetch(`/api/admin/seminars/${seminar.id}/attendance`, { cache: "no-store" })
      if (!res.ok) throw new Error(`Failed to fetch selected students for seminar ${seminar.id}`)
      const data = await res.json()
      setSeminarRecipients(Array.isArray(data.attendance) ? data.attendance : [])
    } catch (e) {
      console.error("[MYT] Seminar selected students fetch error:", e)
      setSeminarRecipients([])
    } finally {
      setSeminarRecipientsLoading(false)
    }
  }
  // </CHANGE>

  const parseISTDateForDisplay = (value: string | Date) => {
    if (typeof value === "string") {
      // Normalize to "YYYY-MM-DDTHH:mm:ss" without any trailing Z or explicit offset,
      // then interpret as IST by appending +05:30 once.
      const s = value.replace(" ", "T")
      // Remove trailing 'Z' or any explicit offset like +05:30 / -03:00
      const sNoZone = s.replace(/Z$/i, "").replace(/([+-]\d{2}:\d{2})$/i, "")
      // Ensure seconds exist for stable parsing
      const hasTime = sNoZone.includes("T")
      const norm = hasTime ? (sNoZone.match(/T\d{2}:\d{2}:/) ? sNoZone : `${sNoZone}:00`) : `${sNoZone}T00:00:00`
      return new Date(`${norm}+05:30`)
    }
    return new Date(value)
  }

  const formatISTDisplay = (value: string | Date) => {
    const d = parseISTDateForDisplay(value)
    const dateText = d.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    })
    const timeText = d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Kolkata",
    })
    return { dateText, timeText }
  }

  const splitDateTimeParts = (value: string | Date) => {
    const d = parseISTDateForDisplay(value)
    const dateStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) // YYYY-MM-DD
    const timeStr = d
      .toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Kolkata",
      })
      .slice(0, 5) // HH:MM
    return { dateStr, timeStr }
  }

  const generateSeminarLink = (seminar: Seminar) => {
    // Construct the URL for the seminar, assuming a public seminar page exists
    // Example: /seminars/[seminar.id] or /seminars?id=[seminar.id]
    // You might need to adjust this based on your actual routing structure.
    return `${window.location.origin}/seminars/${seminar.id}`
  }

  // QR Dialog helper
  const handleShowQr = async (seminar: Seminar) => {
    try {
      setSelectedSeminar(seminar)
      setQrLoading(true)
      setQrDialogOpen(true)
      setQrUrl(null)
      setQrDataUrl(null)
      const res = await fetch(`/api/seminars/${seminar.id}/qr`)
      const data = await res.json()
      if (res.ok && data.success) {
        setQrUrl(data.url)
        const png = await QRCodeLib.toDataURL(data.url, { width: 280, margin: 2 })
        setQrDataUrl(png)
      } else {
        alert(data.message || "Failed to get QR code")
        setQrDialogOpen(false)
      }
    } catch (err) {
      console.error("QR open error:", err)
      alert("Failed to get QR code")
      setQrDialogOpen(false)
    } finally {
      setQrLoading(false)
    }
  }

  useEffect(() => {
    if (!qrDialogOpen || !selectedSeminar) return
    let cancelled = false
    const tick = async () => {
      try {
        const res = await fetch(`/api/seminars/${selectedSeminar.id}/qr`, { cache: "no-store" })
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.success) {
          setQrUrl(data.url)
          const png = await QRCodeLib.toDataURL(data.url, { width: 280, margin: 2 })
          if (!cancelled) setQrDataUrl(png)
        }
      } catch {
        // ignore single tick errors to keep rotating
      }
    }
    tick()
    const id = setInterval(tick, 6000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [qrDialogOpen, selectedSeminar])

  const probeQrStatus = async (seminarId: number) => {
    try {
      // First, get or ensure the QR token for the seminar (does not change active flag)
      const res = await fetch(`/api/seminars/${seminarId}/qr`, { method: "GET" })
      const data = await res.json()
      if (!res.ok || !data?.token) {
        setQrStatusBySeminar((prev) => ({ ...prev, [seminarId]: "unknown" }))
        return
      }
      const token = data.token as string
      // Next, call attend endpoint with dummy credentials to check if it's closed.
      // If closed, it returns 403 "Attendance Closed" before auth.
      const attendRes = await fetch(`/api/qr/${token}/attend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentNumber: "__probe__", password: "__probe__" }),
      })
      const status = attendRes.status === 403 ? "closed" : "active"
      setQrStatusBySeminar((prev) => ({ ...prev, [seminarId]: status }))
    } catch {
      setQrStatusBySeminar((prev) => ({ ...prev, [seminarId]: "unknown" }))
    }
  }

  const handleDeactivateQr = async (seminar: Seminar) => {
    if (!confirm("Deactivate QR for this seminar? This will block new attendance marks.")) return
    try {
      const res = await fetch(`/api/seminars/${seminar.id}/qr`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        alert("QR deactivated. New scans will show 'Attendance Closed'.")
        setQrStatusBySeminar((prev) => ({ ...prev, [seminar.id]: "closed" }))
      } else {
        alert(data.message || "Failed to deactivate QR")
      }
    } catch (e) {
      console.error("Deactivate QR error:", e)
      alert("Failed to deactivate QR")
    }
  }

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    fetchData()
  }, [router, page, perPage])

  useEffect(() => {
    if (!seminars || seminars.length === 0) return
    // Probe status only for those without a known status
    const toCheck = seminars
      .map((s) => s.id)
      .filter((id) => !(id in qrStatusBySeminar) || qrStatusBySeminar[id] === "unknown")
    if (toCheck.length === 0) return
    Promise.allSettled(toCheck.map((id) => probeQrStatus(id))).then(() => {
      // no-op; state is set inside probeQrStatus
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seminars])

  const fetchAttendanceList = async (seminarId: number) => {
    try {
      const response = await fetch(`/api/admin/seminars/${seminarId}/attendance`, { cache: "no-store" })
      const data = await response.json()
      if (data.success) {
        setAttendanceList(data.attendance)
      }
    } catch (e) {
      console.error("Failed to fetch attendance list:", e)
    }
  }

  useEffect(() => {
    if (!attendanceDialogOpen || !selectedSeminar) return
    const interval = setInterval(async () => {
      await fetchAttendanceList(selectedSeminar.id)
    }, 5000) // 5s polling
    return () => clearInterval(interval)
  }, [attendanceDialogOpen, selectedSeminar])

  useEffect(() => {
    if (prefillApplied) return
    try {
      const prefill = searchParams?.get("prefill")
      const csParam = searchParams?.get("cs")
      const idsParam = searchParams?.get("ids")
      if (prefill === "course_semester" && csParam) {
        const combos = csParam
          .split(",")
          .map((pair) => pair.trim())
          .filter(Boolean)
          .map((pair) => {
            const [c, s] = pair.split("-")
            const course_id = c?.trim()
            const semester = s?.trim()
            if (!course_id || !semester) return null
            return { course_id, semester }
          })
          .filter(Boolean) as { course_id: string; semester: string }[]

        if (combos.length > 0) {
          setFormData((prev) => ({
            ...prev,
            seminar_type: "course_semester",
            interest_ids: [],
            course_semesters: combos,
          }))
          setIsAddDialogOpen(true)
          setPrefillApplied(true)
        }
      }
      if (prefill === "students" && idsParam) {
        const ids = idsParam
          .split(",")
          .map((x) => Number.parseInt(x.trim(), 10))
          .filter((n) => Number.isFinite(n))
        if (ids.length > 0) {
          setFormData((prev) => ({
            ...prev,
            seminar_type: "students",
            interest_ids: [],
            course_semesters: [],
            student_ids: ids,
          }))
          setIsAddDialogOpen(true)
          setPrefillApplied(true)
        }
      }
    } catch {
      // ignore parse errors
    }
    // We intentionally do not depend on courses; we set string ids directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, prefillApplied])

  const fetchData = async () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const headers = {
        Authorization: `Bearer ${adminAuth}`,
      }

      const [seminarsRes, interestsRes, coursesRes] = await Promise.all([
        fetch(`/api/admin/seminars?page=${page}&limit=${perPage}`, { headers }),
        fetch("/api/admin/interests", { headers }),
        fetch("/api/admin/courses", { headers }),
      ])

      const [seminarsData, interestsData, coursesData] = await Promise.all([
        seminarsRes.json(),
        interestsRes.json(),
        coursesRes.json(),
      ])

      if (seminarsData.success) {
        setSeminars(Array.isArray(seminarsData.seminars) ? seminarsData.seminars : [])
        setTotal(seminarsData.meta?.total ?? seminarsData.seminars?.length ?? 0)
        setUpcomingCount(seminarsData.meta?.upcoming ?? 0)
        setCompletedCount(seminarsData.meta?.completed ?? 0)
        if (
          Array.isArray(seminarsData.seminars) &&
          seminarsData.seminars.length > 0 &&
          (seminarsData.seminars[0].course_id === undefined || seminarsData.seminars[0].semester === undefined)
        ) {
          setCourseSemesterSupported(false)
        } else {
          setCourseSemesterSupported(true)
        }
      } else {
        setSeminars([])
      }

      if (interestsData.success) {
        setInterests(Array.isArray(interestsData.interests) ? interestsData.interests : [])
      } else {
        setInterests([])
      }

      if (Array.isArray(coursesData)) {
        setCourses(coursesData)
      } else if (coursesData.success) {
        setCourses(Array.isArray(coursesData.courses) ? coursesData.courses : [])
      } else {
        setCourses([])
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setSeminars([])
      setInterests([])
      setCourses([])
      if (error instanceof Error && error.message.includes("column s.course_id does not exist")) {
        setCourseSemesterSupported(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    setIsSubmitting(true)

    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const url = editingSeminar ? `/api/admin/seminars/${editingSeminar.id}` : "/api/admin/seminars"
      const method = editingSeminar ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify(formData), // includes student_ids when seminar_type === "students"
      })

      const data = await response.json()

      if (data.success) {
        fetchData()
        resetForm()
        setIsAddDialogOpen(false)
        setEditingSeminar(null)
        alert(
          `${data.seminarsCreated || 1} seminar(s) created successfully! ${data.enrolledStudents || 0} students enrolled.`,
        )
      } else {
        if (data.message?.includes("database migration")) {
          setCourseSemesterSupported(false)
        }
        alert(data.message || "Operation failed")
      }
    } catch (error) {
      console.error("Submit error:", error)
      alert("Operation failed")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this seminar?")) return
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/seminars/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminAuth}` },
      })
      const data = await response.json()
      if (data.success) {
        if (seminars.length === 1 && page > 1) {
          setPage((p) => p - 1)
        } else {
          fetchData()
        }
      } else {
        alert(data.message || "Delete failed")
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Delete failed")
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      seminar_date: "",
      seminar_time: "",
      seminar_type: "interest",
      interest_ids: [],
      course_semesters: [],
      speaker_name: "", // Reset speaker_name field
      student_ids: [],
    })
  }

  const handleEdit = (seminar: Seminar) => {
    const { dateStr, timeStr } = splitDateTimeParts((seminar as any).seminar_date as any)

    setFormData({
      title: seminar.title,
      description: seminar.description || "",
      seminar_date: dateStr,
      seminar_time: timeStr,
      seminar_type: (seminar as any).course_id ? "course_semester" : "interest",
      interest_ids: seminar.interest_id ? [seminar.interest_id.toString()] : [],
      course_semesters: (seminar as any).course_id
        ? [{ course_id: (seminar as any).course_id.toString(), semester: (seminar as any).semester?.toString() || "" }]
        : [],
      speaker_name: (seminar as any).speaker_name || "",
    })
    setEditingSeminar(seminar)
    setIsAddDialogOpen(true)
  }

  const handleAttendanceDialogOpen = async (seminar: Seminar) => {
    setSelectedSeminar(seminar)
    setAttendanceDialogOpen(true)
    setAttendanceType("manual")
    setQrScannerOpen(false)
    setMarkedAttendance(new Set())
    setActiveAttendanceTab(null)
    setCourseSemesterTabsLoaded(false)
    await fetchCourseSemesterTabs(seminar.id)
    await fetchAttendanceList(seminar.id)
  }

  const updateAttendance = async (studentId: number, status: string) => {
    try {
      const response = await fetch(`/api/admin/seminars/${selectedSeminar?.id}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, status }),
      })

      const data = await response.json()
      if (data.success) {
        setAttendanceList((prev) => prev.map((item) => (item.student_id === studentId ? { ...item, status } : item)))
      } else {
        alert(data.message || "Failed to update attendance")
      }
    } catch (error) {
      console.error("Failed to update attendance:", error)
      alert("Failed to update attendance")
    }
  }

  const handleQRAttendanceMarked = (studentId: number, studentName: string) => {
    setMarkedAttendance((prev) => new Set([...prev, studentId]))
    if (selectedSeminar) {
      // Fetch updated attendance without resetting QR scanner state
      const refreshAttendance = async () => {
        try {
          const response = await fetch(`/api/admin/seminars/${selectedSeminar.id}/attendance`, { cache: "no-store" })
          const data = await response.json()
          if (data.success) {
            setAttendanceList(data.attendance)
            // Update attendanceDates based on new attendance data
            const keys = Array.from(
              new Set(
                data.attendance.map((item: any) => {
                  const date = new Date(item.created_at)
                  return date.toLocaleDateString()
                }),
              ),
            )
            // This part might need adjustment based on the new tab structure
            // setAttendanceDates(keys)
          }
        } catch (error) {
          console.error("Failed to refresh attendance:", error)
        }
      }
      refreshAttendance()
    }
  }

  const handleInterestChange = (interestId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        interest_ids: [...formData.interest_ids, interestId],
      })
    } else {
      setFormData({
        ...formData,
        interest_ids: formData.interest_ids.filter((id) => id !== interestId),
      })
    }
  }

  const addCourseSemester = () => {
    setFormData({
      ...formData,
      course_semesters: [...formData.course_semesters, { course_id: "", semester: "" }],
    })
  }

  const updateCourseSemester = (index: number, field: "course_id" | "semester", value: string) => {
    const updated = [...formData.course_semesters]
    updated[index][field] = value
    setFormData({ ...formData, course_semesters: updated })
  }

  const removeCourseSemester = (index: number) => {
    setFormData({
      ...formData,
      course_semesters: formData.course_semesters.filter((_, i) => i !== index),
    })
  }

  const getSelectedCourse = (courseId: string) => {
    return courses.find((course) => course.id.toString() === courseId)
  }

  const handleViewRatings = async (seminar: Seminar) => {
    setSelectedSeminar(seminar)
    setLoadingRatings(true)
    setRatingsDialogOpen(true)

    try {
      const response = await fetch(`/api/admin/seminars/${seminar.id}/ratings`)
      const data = await response.json()
      if (data.success) {
        setRatingsData(data)
      } else {
        alert(data.message || "Failed to fetch ratings")
      }
    } catch (error) {
      console.error("Failed to fetch ratings:", error)
      alert("Failed to fetch ratings")
    } finally {
      setLoadingRatings(false)
    }
  }

  const handleViewDetails = (seminar: Seminar) => {
    setSelectedSeminar(seminar)
    setDetailsDialogOpen(true)
  }

  const renderStarDisplay = (rating: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${star <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const generatePageNumbers = () => {
    const pages: Array<number | "ellipsis"> = []
    const current = page

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (current <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i)
      pages.push("ellipsis", totalPages)
    } else if (current >= totalPages - 3) {
      pages.push(1, "ellipsis")
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1, "ellipsis", current - 1, current, current + 1, "ellipsis", totalPages)
    }
    return pages
  }

  const handleGenerateQr = (seminar: Seminar) => {
    const seminarLink = generateSeminarLink(seminar)
    // generateQrCode(seminarLink) // Replaced by handleShowQr
    handleShowQr(seminar)
    setSelectedSeminar(seminar) // Set selected seminar for QR display context
  }

  const handleShowTargetCombos = async (seminar: Seminar) => {
    try {
      setSelectedSeminar(seminar)
      setTargetCombosOpen(true)
      setTargetCombosLoading(true)
      const res = await fetch(`/api/admin/seminars/${seminar.id}/course-semesters`, { cache: "no-store" })
      const data = await res.json()
      if (res.ok && data.success) {
        setTargetCombos(data.combos || [])
      } else {
        setTargetCombos([])
        alert(data.message || "Failed to load course-semesters")
      }
    } catch (e) {
      console.error("Load target combos error:", e)
      setTargetCombos([])
      alert("Failed to load course-semesters")
    } finally {
      setTargetCombosLoading(false)
    }
  }

  const fetchCourseSemesterTabs = async (seminarId: number) => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/seminars/${seminarId}/course-semesters`, {
        headers: { Authorization: `Bearer ${adminAuth}` },
      })
      const data = await response.json()
      if (data.success && Array.isArray(data.combos)) {
        setCourseSemesterTabs(data.combos)
        setCourseSemesterTabsLoaded(true)
        // Set the first tab as active if available
        if (data.combos.length > 0) {
          setActiveAttendanceTab("all")
        }
      }
    } catch (error) {
      console.error("[MYT] Failed to fetch course-semester tabs:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">Loading seminars...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard">
              <Button variant="ghost" size="sm" className="btn-3d">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                <Presentation className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold gradient-text">Seminar Management</h1>
                <p className="text-gray-600 dark:text-gray-400">Organize and manage educational seminars</p>
              </div>
            </div>
          </div>
          <div className="flex items-center">
            {/* Add new button to open insights */}
            <Button
              variant="outline"
              onClick={() => {
                setInsightsOpen(true)
                loadInsightsOptions()
              }}
              className="mr-2 btn-3d"
            >
              Seminar Insights
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="btn-3d bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Seminar
                  <Sparkles className="w-4 h-4 ml-2" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-effect border-0">
                <DialogHeader>
                  <DialogTitle className="text-2xl gradient-text">
                    {editingSeminar ? "Edit Seminar" : "Create New Seminar"}
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 dark:text-gray-300">
                    {editingSeminar
                      ? "Update seminar information and settings"
                      : "Create engaging seminars for students. Multiple selections will create separate seminars for each target."}
                  </DialogDescription>
                </DialogHeader>

                {!courseSemesterSupported && (
                  <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800 dark:text-orange-200">
                      Course-semester seminars require database migration. Please run the migration script to enable
                      this feature.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-semibold">
                      Seminar Title *
                    </Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Introduction to Machine Learning"
                      className="border-2 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="speaker_name" className="text-sm font-semibold flex items-center">
                      <User className="w-4 h-4 mr-2 text-indigo-500" />
                      Speaker Name
                    </Label>
                    <Input
                      id="speaker_name"
                      value={formData.speaker_name}
                      onChange={(e) => setFormData({ ...formData, speaker_name: e.target.value })}
                      placeholder="e.g., Dr. John Smith, Industry Expert"
                      className="border-2 focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="seminar_date" className="text-sm font-semibold flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                        Seminar Date *
                      </Label>
                      <Input
                        id="seminar_date"
                        type="date"
                        value={formData.seminar_date}
                        onChange={(e) => setFormData({ ...formData, seminar_date: e.target.value })}
                        className="border-2 focus:border-blue-500 transition-colors"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="seminar_time" className="text-sm font-semibold flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-purple-500" />
                        Seminar Time *
                      </Label>
                      <Input
                        id="seminar_time"
                        type="time"
                        value={formData.seminar_time}
                        onChange={(e) => setFormData({ ...formData, seminar_time: e.target.value })}
                        className="border-2 focus:border-purple-500 transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-sm font-semibold flex items-center">
                      <Target className="w-4 h-4 mr-2 text-green-500" />
                      Seminar Target *
                    </Label>
                    <RadioGroup
                      value={formData.seminar_type}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          seminar_type: value,
                          interest_ids: [],
                          course_semesters: [],
                          student_ids: [],
                        })
                      }
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 p-4 border-2 border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                        <RadioGroupItem value="interest" id="interest" className="text-blue-600" />
                        <Label htmlFor="interest" className="flex-1 cursor-pointer">
                          <div className="font-medium">Target by Interest</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Creates separate seminar for each selected interest
                          </div>
                        </Label>
                      </div>
                      <div
                        className={`flex items-center space-x-3 p-4 border-2 rounded-lg transition-colors ${
                          !courseSemesterSupported
                            ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                            : "border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        }`}
                      >
                        <RadioGroupItem
                          value="course_semester"
                          id="course_semester"
                          disabled={!courseSemesterSupported}
                          className="text-purple-600"
                        />
                        <Label
                          htmlFor="course_semester"
                          className={`flex-1 cursor-pointer ${!courseSemesterSupported ? "text-gray-400" : ""}`}
                        >
                          <div className="font-medium">Target by Course & Semester</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Creates separate seminar for each combination
                            {!courseSemesterSupported && " - Requires Migration"}
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 border-2 border-green-200 dark:border-green-800 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                        <RadioGroupItem value="students" id="students" className="text-green-600" />
                        <Label htmlFor="students" className="flex-1 cursor-pointer">
                          <div className="font-medium">Selected Students</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Creates a seminar for the specific selected students
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {formData.seminar_type === "interest" && (
                    <div className="space-y-4">
                      <Label className="text-sm font-semibold">
                        Select Interests * (Each will create a separate seminar)
                      </Label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 max-h-64 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {interests.map((interest) => (
                            <div
                              key={interest.id}
                              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <Checkbox
                                id={`interest-${interest.id}`}
                                checked={formData.interest_ids.includes(interest.id.toString())}
                                onCheckedChange={(checked) =>
                                  handleInterestChange(interest.id.toString(), checked as boolean)
                                }
                                className="border-2"
                              />
                              <Label htmlFor={`interest-${interest.id}`} className="text-sm font-medium cursor-pointer">
                                {interest.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                      {formData.interest_ids.length > 0 && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3">
                            Will create {formData.interest_ids.length} separate seminar(s):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {formData.interest_ids.map((interestId) => {
                              const interest = interests.find((i) => i.id.toString() === interestId)
                              return (
                                <Badge
                                  key={interestId}
                                  className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                                >
                                  {interest?.name}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.seminar_type === "course_semester" && courseSemesterSupported && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-semibold">Course & Semester Combinations *</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addCourseSemester}
                          className="btn-3d bg-transparent"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Combination
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {formData.course_semesters.map((combination, index) => (
                          <div
                            key={index}
                            className="flex gap-4 items-end p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
                          >
                            <div className="flex-1">
                              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Course</Label>
                              <SearchableCourseSelect
                                courses={courses}
                                value={combination.course_id}
                                onValueChange={(value) => updateCourseSemester(index, "course_id", value)}
                                placeholder="Search and select course"
                              />
                            </div>
                            <div className="flex-1">
                              <Label className="text-xs font-medium text-gray-600 dark:text-gray-400">Semester</Label>
                              <Select
                                value={combination.semester}
                                onValueChange={(value) => updateCourseSemester(index, "semester", value)}
                                disabled={!combination.course_id}
                              >
                                <SelectTrigger className="border-2 focus:border-purple-500">
                                  <SelectValue placeholder="Select semester" />
                                </SelectTrigger>
                                <SelectContent>
                                  {combination.course_id &&
                                    Array.from(
                                      { length: getSelectedCourse(combination.course_id)?.total_semesters || 8 },
                                      (_, i) => i + 1,
                                    ).map((sem) => (
                                      <SelectItem key={sem} value={sem.toString()}>
                                        Semester {sem}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeCourseSemester(index)}
                              className="btn-3d text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {formData.course_semesters.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-8">
                          Click "Add Combination" to add course-semester pairs
                        </p>
                      )}
                      {formData.course_semesters.length > 0 && (
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <p className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-3">
                            Will create {formData.course_semesters.filter((cs) => cs.course_id && cs.semester).length}{" "}
                            separate seminar(s):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {formData.course_semesters.map((combination, index) => {
                              const course = getSelectedCourse(combination.course_id)
                              if (!course || !combination.semester) return null
                              return (
                                <Badge
                                  key={index}
                                  className="bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100"
                                >
                                  {course.name} - Semester {combination.semester}
                                </Badge>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {formData.seminar_type === "students" && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        This seminar will be created for {formData.student_ids.length} selected student
                        {formData.student_ids.length === 1 ? "" : "s"}.
                      </p>
                      {formData.student_ids.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-1">No students selected in prefill.</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold flex items-center">
                      <BookOpen className="w-4 h-4 mr-2 text-green-500" />
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Enter seminar description, agenda, and other details..."
                      rows={4}
                      className="border-2 focus:border-green-500 transition-colors"
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-6 border-t">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" className="btn-3d bg-transparent">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      type="submit"
                      disabled={
                        isSubmitting ||
                        (formData.seminar_type === "interest" && formData.interest_ids.length === 0) ||
                        (formData.seminar_type === "course_semester" &&
                          (formData.course_semesters.length === 0 ||
                            formData.course_semesters.some((cs) => !cs.course_id || !cs.semester))) ||
                        (formData.seminar_type === "students" && formData.student_ids.length === 0)
                      }
                      className="btn-3d bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      {isSubmitting
                        ? editingSeminar
                          ? "Updating..."
                          : "Creating..."
                        : editingSeminar
                          ? "Update Seminar"
                          : "Create Seminar(s)"}
                      <Sparkles className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="card-3d border-0 glass-effect">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl gradient-text flex items-center">
                  <Presentation className="w-6 h-6 mr-3" />
                  Seminars ({total})
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage seminars for students based on their interests or course/semester
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                  {upcomingCount} Upcoming
                </Badge>
                <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100">
                  {completedCount} Completed
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                    <TableHead className="font-semibold">Title</TableHead>
                    <TableHead className="font-semibold">Speaker</TableHead> {/* Added Speaker column */}
                    <TableHead className="font-semibold">Target</TableHead>
                    <TableHead className="font-semibold">Date & Time</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Rating</TableHead> {/* Added Rating column */}
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seminars.map((seminar) => {
                    const d = parseISTDateForDisplay((seminar as any).seminar_date as any)
                    const isPast = d < new Date()
                    const { dateText, timeText } = formatISTDisplay((seminar as any).seminar_date as any)
                    return (
                      <TableRow
                        key={seminar.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                              <Presentation className="w-4 h-4 text-white" />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleViewDetails(seminar)}
                              className="text-left group"
                              aria-label="View seminar details"
                            >
                              <div className="font-semibold text-gray-900 dark:text-white underline-offset-2 group-hover:underline">
                                {seminar.title}
                              </div>
                              {seminar.description && (
                                <div className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs">
                                  {seminar.description}
                                </div>
                              )}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {(seminar as any).speaker_name || "Not specified"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* Target column: make "Selected Students" clickable to open modal; keep existing behavior for multiples */}
                          {((seminar as any).target_display || "").toLowerCase().includes("multiple") ? (
                            <button
                              type="button"
                              onClick={() => handleShowTargetCombos(seminar)}
                              className="inline-flex"
                              aria-label="View targeted courses and semesters"
                              title="View targeted courses and semesters"
                            >
                              <Badge
                                variant="outline"
                                className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700 hover:ring-2 hover:ring-indigo-300"
                              >
                                {(seminar as any).target_display}
                              </Badge>
                            </button>
                          ) : ((seminar as any).target_display || "").toLowerCase() === "selected students" ? (
                            <button
                              type="button"
                              onClick={() => openSeminarSelectedStudents(seminar)}
                              className="inline-flex"
                              aria-label="View targeted students"
                              title="View targeted students"
                            >
                              <Badge
                                variant="outline"
                                className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700 hover:ring-2 hover:ring-indigo-300"
                              >
                                Selected Students
                              </Badge>
                            </button>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-700"
                            >
                              {(seminar as any).target_display || (seminar as any).interest_name || "Interest Based"}
                            </Badge>
                          )}
                          {/* </CHANGE> */}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-blue-500" />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{dateText}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {timeText} IST
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isPast ? "secondary" : "default"}
                            className={
                              isPast
                                ? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
                                : "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 pulse-glow"
                            }
                          >
                            {isPast ? "Completed" : "Upcoming"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isPast ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewRatings(seminar)}
                              className="flex items-center space-x-1 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                            >
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="text-sm">View Ratings</span>
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not available</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(seminar)}
                              className="btn-3d hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAttendanceDialogOpen(seminar)}
                              className="btn-3d hover:bg-green-50 dark:hover:bg-green-900/20"
                            >
                              <Users className="w-4 h-4" />
                            </Button>
                            {isPast && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewRatings(seminar)}
                                className="btn-3d hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(seminar.id)}
                              className="btn-3d hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShowQr(seminar)}
                              className="btn-3d hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                            >
                              <QrCode className="w-4 h-4" />
                            </Button>
                            {/* In the Actions column, replace the existing Close button block: */}
                            {(() => {
                              const status = qrStatusBySeminar[seminar.id] || "unknown"
                              if (status === "closed") {
                                return (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled
                                    className="btn-3d text-muted-foreground cursor-not-allowed opacity-60 bg-transparent"
                                    aria-disabled="true"
                                    aria-label="QR is closed"
                                    title="QR is closed"
                                  >
                                    Closed
                                  </Button>
                                )
                              }
                              return (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeactivateQr(seminar)}
                                  className="btn-3d hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 hover:text-orange-700"
                                  aria-label="Deactivate QR"
                                  title="Deactivate QR"
                                >
                                  Close
                                </Button>
                              )
                            })()}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {seminars.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        {" "}
                        {/* Updated colSpan to 7 */}
                        <div className="flex flex-col items-center space-y-4">
                          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <Presentation className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-lg font-medium text-gray-900 dark:text-white">No seminars found</p>
                            <p className="text-gray-600 dark:text-gray-400">Create your first seminar to get started</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows per page:</span>
                <Select
                  value={String(perPage)}
                  onValueChange={(v) => {
                    setPerPage(Number(v))
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-[90px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Centered pagination block like Student Management */}
              {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (page > 1) setPage((p) => Math.max(1, p - 1))
                          }}
                          className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {generatePageNumbers().map((p, i) => (
                        <PaginationItem key={`${p}-${i}`}>
                          {p === "ellipsis" ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setPage(p as number)
                              }}
                              isActive={p === page}
                              className="cursor-pointer"
                            >
                              {p}
                            </PaginationLink>
                          )}
                        </PaginationItem>
                      ))}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            if (page < totalPages) setPage((p) => Math.min(totalPages, p + 1))
                          }}
                          className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance Dialog */}
        <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto glass-effect border-0">
            <DialogHeader>
              <DialogTitle className="text-2xl gradient-text flex items-center">
                <Users className="w-6 h-6 mr-3" />
                Attendance - {selectedSeminar?.title}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Mark attendance for students
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 mb-4">
              <Button
                variant={attendanceType === "manual" ? "default" : "outline"}
                onClick={() => {
                  setAttendanceType("manual")
                  setQrScannerOpen(false)
                }}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                Manual Entry
              </Button>
              <Button
                variant={attendanceType === "qr" ? "default" : "outline"}
                onClick={() => {
                  setAttendanceType("qr")
                  setQrScannerOpen(true)
                }}
                className="flex-1"
              >
                <QrCode className="w-4 h-4 mr-2" />
                QR Scanner
              </Button>
            </div>

            {attendanceType === "qr" && qrScannerOpen && selectedSeminar && (
              <div className="mb-4">
                <AttendanceQRScanner
                  seminarId={selectedSeminar.id}
                  onAttendanceMarked={handleQRAttendanceMarked}
                  onClose={() => setQrScannerOpen(false)}
                />
              </div>
            )}

            <div className="space-y-4">
              {(() => {
                // Filter attendance list by selected course-semester tab
                let filteredAttendance = attendanceList || []

                if (activeAttendanceTab && activeAttendanceTab !== "all") {
                  const [courseId, semester] = activeAttendanceTab.split("-")
                  filteredAttendance = filteredAttendance.filter(
                    (a) => a.course_id?.toString() === courseId && a.current_semester?.toString() === semester,
                  )
                }

                // Set default tab to "all" if not set
                if (!activeAttendanceTab && courseSemesterTabsLoaded) {
                  setActiveAttendanceTab("all")
                }

                return courseSemesterTabsLoaded ? (
                  <div className="flex flex-wrap gap-2 border-b pb-2 overflow-x-auto">
                    <button
                      onClick={() => setActiveAttendanceTab("all")}
                      className={`px-3 py-1.5 text-sm rounded-md border transition whitespace-nowrap ${
                        activeAttendanceTab === "all"
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      All
                    </button>

                    {courseSemesterTabs.map((tab) => {
                      const tabKey = `${tab.course_id}-${tab.semester}`
                      return (
                        <button
                          key={tabKey}
                          onClick={() => setActiveAttendanceTab(tabKey)}
                          className={`px-3 py-1.5 text-sm rounded-md border transition whitespace-nowrap ${
                            activeAttendanceTab === tabKey
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {tab.course_name} - Sem {tab.semester}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">Loading tabs...</p>
                )
              })()}

              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                    <TableHead className="font-semibold">Student Name</TableHead>
                    <TableHead className="font-semibold">Enrollment Number</TableHead>
                    <TableHead className="font-semibold">Course</TableHead>
                    <TableHead className="font-semibold">Semester</TableHead>
                    <TableHead className="font-semibold text-center">Attendance</TableHead>
                    <TableHead className="font-semibold text-center">QR Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    let displayAttendance = attendanceList || []

                    if (activeAttendanceTab && activeAttendanceTab !== "all") {
                      const [courseId, semester] = activeAttendanceTab.split("-")
                      displayAttendance = displayAttendance.filter(
                        (a) => a.course_id?.toString() === courseId && a.current_semester?.toString() === semester,
                      )
                    }

                    return displayAttendance.map((attendance) => (
                      <TableRow
                        key={attendance.student_id}
                        className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${
                          markedAttendance.has(attendance.student_id) ? "bg-green-50 dark:bg-green-950/20" : ""
                        }`}
                      >
                        <TableCell className="font-medium">{attendance.student_name}</TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {attendance.enrollment_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{attendance.course_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Sem {attendance.current_semester ?? "-"}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={attendance.status === "Present" ? "default" : "destructive"}
                            onClick={() =>
                              updateAttendance(
                                attendance.student_id,
                                attendance.status === "Present" ? "Absent" : "Present",
                              )
                            }
                            className={`btn-3d ${
                              attendance.status === "Present"
                                ? "bg-green-500 hover:bg-green-600 text-white"
                                : "bg-red-500 hover:bg-red-600 text-white"
                            }`}
                          >
                            {attendance.status}
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          {markedAttendance.has(attendance.student_id) && (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Scanned
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  })()}
                </TableBody>
              </Table>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={ratingsDialogOpen} onOpenChange={setRatingsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto glass-effect border-0">
            <DialogHeader>
              <DialogTitle className="text-2xl gradient-text flex items-center">
                <Star className="w-6 h-6 mr-3 text-yellow-500" />
                Seminar Ratings - {selectedSeminar?.title}
              </DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                View ratings and feedback from students who attended this seminar
              </DialogDescription>
            </DialogHeader>

            {loadingRatings ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading ratings...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Rating Statistics */}
                {ratingsData.statistics && ratingsData.statistics.total_ratings > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center">
                          <BarChart3 className="w-5 h-5 mr-2" />
                          Rating Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-yellow-600">
                              {ratingsData.statistics.average_rating.toFixed(1)}
                            </div>
                            <div className="flex justify-center mb-2">
                              {renderStarDisplay(Math.round(ratingsData.statistics.average_rating))}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Based on {ratingsData.statistics.total_ratings} rating(s)
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Rating Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {[5, 4, 3, 2, 1].map((stars) => (
                            <div key={stars} className="flex items-center space-x-2">
                              <span className="text-sm w-8">{stars}★</span>
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                  className="bg-yellow-400 h-2 rounded-full"
                                  style={{
                                    width: `${
                                      ratingsData.statistics.total_ratings > 0
                                        ? (
                                            ratingsData.statistics.distribution[stars] /
                                              ratingsData.statistics.total_ratings
                                          ) * 100
                                        : 0
                                    }%`,
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm w-8 text-right">
                                {ratingsData.statistics.distribution[stars]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No ratings yet</p>
                  </div>
                )}

                {/* Individual Ratings */}
                {ratingsData.ratings && ratingsData.ratings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Individual Ratings</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                            <TableHead>Student</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Rating</TableHead>
                            <TableHead>Comment</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ratingsData.ratings.map((rating: any) => (
                            <TableRow key={rating.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{rating.student_name}</div>
                                  <div className="text-sm text-muted-foreground">{rating.enrollment_number}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{rating.course_name}</Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  {renderStarDisplay(rating.rating)}
                                  <span className="text-sm font-medium">({rating.rating}/5)</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="max-w-xs">
                                  {rating.comment ? (
                                    <p className="text-sm text-muted-foreground truncate">{rating.comment}</p>
                                  ) : (
                                    <span className="text-sm text-muted-foreground italic">No comment</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {new Date(rating.created_at).toLocaleDateString()}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Seminar Details Dialog */}
        <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto glass-effect border-0">
            <DialogHeader>
              <DialogTitle className="text-2xl gradient-text">{selectedSeminar?.title}</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">Full seminar details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <p className="whitespace-pre-wrap text-foreground">
                  {selectedSeminar?.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <DialogClose asChild>
                <Button variant="outline" className="btn-3d bg-transparent">
                  Close
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog
          open={qrDialogOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setQrDialogOpen(false)
              setQrUrl(null)
              setQrDataUrl(null)
            }
          }}
        >
          <DialogContent className="max-w-xs max-h-[80vh] overflow-y-auto glass-effect border-0 text-center">
            <DialogHeader>
              <DialogTitle className="text-xl gradient-text">Seminar QR Code</DialogTitle>
              <DialogDescription>Scan to view seminar details</DialogDescription>
            </DialogHeader>
            {qrLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Generating QR code...</p>
              </div>
            ) : qrDataUrl ? (
              <>
                <img src={qrDataUrl || "/placeholder.svg"} alt="Seminar QR Code" className="mx-auto w-48 h-48" />
                <p className="mt-2 text-xs text-muted-foreground">Auto-refreshing every 6 seconds</p>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Failed to load QR code.</p>
              </div>
            )}
            {qrUrl && (
              <div className="text-center mt-4">
                <p className="text-xs text-gray-500 truncate">{qrUrl}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 bg-transparent"
                  onClick={() => navigator.clipboard.writeText(qrUrl)}
                >
                  Copy Link
                </Button>
              </div>
            )}
            <div className="pt-4">
              <DialogClose asChild>
                <Button variant="outline" className="btn-3d bg-transparent">
                  Close
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        {/* Multiple Courses Dialog */}
        <Dialog open={targetCombosOpen} onOpenChange={setTargetCombosOpen}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto glass-effect border-0">
            <DialogHeader>
              <DialogTitle className="text-2xl gradient-text">Seminar Targets — {selectedSeminar?.title}</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                All included Course & Semester combinations for this seminar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {targetCombosLoading ? (
                <div className="text-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p>Loading course-semesters...</p>
                </div>
              ) : targetCombos.length > 0 ? (
                <div className="space-y-2">
                  {targetCombos.map((cs) => (
                    <div
                      key={`${cs.course_id}-${cs.semester}`}
                      className="flex items-center justify-between p-3 rounded-md border bg-card"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{cs.course_name}</Badge>
                        <Badge variant="outline">Sem {cs.semester}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground py-4">No course–semester combinations found.</div>
              )}
            </div>
            <div className="pt-4">
              <DialogClose asChild>
                <Button variant="outline" className="btn-3d bg-transparent">
                  Close
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        {/* Insights Dialog */}
        <Dialog open={insightsOpen} onOpenChange={setInsightsOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto glass-effect border-0">
            <DialogHeader>
              <DialogTitle className="text-2xl gradient-text">Filter Insights</DialogTitle>
              <DialogDescription className="text-gray-600 dark:text-gray-300">
                Analyze seminars by Course–Semester, Speaker, and Interest
              </DialogDescription>
            </DialogHeader>

            {insightsLoading ? (
              <div className="py-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading insights...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Summary boxes */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Seminars</CardDescription>
                      <CardTitle className="text-2xl">{insightsSummary?.totalSeminars ?? 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Unique Speakers</CardDescription>
                      <CardTitle className="text-2xl">{insightsSummary?.uniqueSpeakers ?? 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total Courses Covered</CardDescription>
                      <CardTitle className="text-2xl">{insightsSummary?.totalCoursesCovered ?? 0}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Most Frequent Interest</CardDescription>
                      <CardTitle className="text-xl">{insightsSummary?.mostFrequentInterest ?? "—"}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {/* Tabs wrapper */}
                <Tabs defaultValue="by-course" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="by-course">Course–Semester</TabsTrigger>
                    <TabsTrigger value="by-speaker">Speaker</TabsTrigger>
                    <TabsTrigger value="by-interest">Interest</TabsTrigger>
                  </TabsList>

                  {/* Tab: Course–Semester */}
                  <TabsContent value="by-course" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Filter by Course–Semester</h3>
                      <span className="text-sm text-muted-foreground">Total Results: {csCount}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium">Course</Label>
                        <Select
                          value={csCourseId}
                          onValueChange={(v) => {
                            setCsCourseId(v)
                            setCsSemester("")
                            setCsRows([])
                            setCsCount(0)
                            setCsPage(1)
                          }}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue placeholder="Select course" />
                          </SelectTrigger>
                          <SelectContent>
                            {insightsOptions.courses.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs font-medium">Semester</Label>
                        <Select
                          value={csSemester}
                          onValueChange={(v) => {
                            setCsSemester(v)
                            setCsPage(1)
                            runCsQuery(csCourseId, v)
                          }}
                          disabled={!csCourseId}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue placeholder="Select semester" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const c = insightsOptions.courses.find((x) => String(x.id) === csCourseId)
                              const n = c?.total_semesters ?? 0
                              return Array.from({ length: n }, (_, i) => i + 1).map((s) => (
                                <SelectItem key={s} value={String(s)}>
                                  Semester {s}
                                </SelectItem>
                              ))
                            })()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(csRows.length / INSIGHTS_PER_PAGE))
                      const pageSafe = Math.min(csPage, totalPages)
                      const visible = paginate(csRows, pageSafe, INSIGHTS_PER_PAGE)
                      const from = csRows.length === 0 ? 0 : (pageSafe - 1) * INSIGHTS_PER_PAGE + 1
                      const to = Math.min(pageSafe * INSIGHTS_PER_PAGE, csRows.length)
                      return (
                        <>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = csSort.key === "date" && csSort.dir === "desc" ? "asc" : "desc"
                                      setCsSort({ key: "date", dir })
                                      setCsRows(sortRows(csRows, "seminar_date", dir))
                                      setCsPage(1)
                                    }}
                                  >
                                    Date
                                  </TableHead>
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = csSort.key === "title" && csSort.dir === "asc" ? "desc" : "asc"
                                      setCsSort({ key: "title", dir })
                                      setCsRows(sortRows(csRows, "title", dir))
                                      setCsPage(1)
                                    }}
                                  >
                                    Seminar Title
                                  </TableHead>
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = csSort.key === "speaker" && csSort.dir === "asc" ? "desc" : "asc"
                                      setCsSort({ key: "speaker", dir })
                                      setCsRows(sortRows(csRows, "speaker", dir))
                                      setCsPage(1)
                                    }}
                                  >
                                    Speaker
                                  </TableHead>
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = csSort.key === "interest" && csSort.dir === "asc" ? "desc" : "asc"
                                      setCsSort({ key: "interest", dir })
                                      setCsRows(sortRows(csRows, "interest", dir))
                                      setCsPage(1)
                                    }}
                                  >
                                    Interest
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {visible.map((r) => {
                                  const { dateText } = formatISTDisplay(r.seminar_date)
                                  return (
                                    <TableRow key={r.id}>
                                      <TableCell>{dateText}</TableCell>
                                      <TableCell className="font-medium">{r.title}</TableCell>
                                      <TableCell>{r.speaker_name || "—"}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{r.interest_name || "—"}</Badge>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-muted-foreground">
                              Showing {from}–{to} of {csCount}
                            </span>
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setCsPage((p) => Math.max(1, p - 1))
                                    }}
                                    className={pageSafe <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                  />
                                </PaginationItem>
                                {genPageNumbers(pageSafe, totalPages).map((p, i) => (
                                  <PaginationItem key={`${p}-${i}`}>
                                    {p === "ellipsis" ? (
                                      <PaginationEllipsis />
                                    ) : (
                                      <PaginationLink
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setCsPage(p as number)
                                        }}
                                        isActive={p === pageSafe}
                                        className="cursor-pointer"
                                      >
                                        {p}
                                      </PaginationLink>
                                    )}
                                  </PaginationItem>
                                ))}
                                <PaginationItem>
                                  <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setCsPage((p) => Math.min(totalPages, p + 1))
                                    }}
                                    className={
                                      pageSafe >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                    }
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        </>
                      )
                    })()}
                  </TabsContent>

                  {/* Tab: Speaker */}
                  <TabsContent value="by-speaker" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Filter by Speaker</h3>
                      <span className="text-sm text-muted-foreground">Total Results: {spCount}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium">Speaker</Label>
                        <Select
                          value={spSpeaker}
                          onValueChange={(v) => {
                            setSpSpeaker(v)
                            setSpPage(1)
                            runSpeakerQuery(v)
                          }}
                          disabled={insightsOptions.speakers.length === 0}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue
                              placeholder={insightsOptions.speakers.length ? "Select speaker" : "No speakers found"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {insightsOptions.speakers.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(spRows.length / INSIGHTS_PER_PAGE))
                      const pageSafe = Math.min(spPage, totalPages)
                      const visible = paginate(spRows, pageSafe, INSIGHTS_PER_PAGE)
                      const from = spRows.length === 0 ? 0 : (pageSafe - 1) * INSIGHTS_PER_PAGE + 1
                      const to = Math.min(pageSafe * INSIGHTS_PER_PAGE, spRows.length)
                      return (
                        <>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = spSort.key === "title" && spSort.dir === "asc" ? "desc" : "asc"
                                      setSpSort({ key: "title", dir })
                                      setSpRows(sortRows(spRows, "title", dir))
                                      setSpPage(1)
                                    }}
                                  >
                                    Title
                                  </TableHead>
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = spSort.key === "course" && spSort.dir === "asc" ? "desc" : "asc"
                                      setSpSort({ key: "course", dir })
                                      setSpRows(sortRows(spRows, "course", dir))
                                      setSpPage(1)
                                    }}
                                  >
                                    Course–Semester
                                  </TableHead>
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = spSort.key === "date" && spSort.dir === "desc" ? "asc" : "desc"
                                      setSpSort({ key: "date", dir })
                                      setSpRows(sortRows(spRows, "seminar_date", dir))
                                      setSpPage(1)
                                    }}
                                  >
                                    Date
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {visible.map((r) => {
                                  const { dateText } = formatISTDisplay(r.seminar_date)
                                  return (
                                    <TableRow key={r.id}>
                                      <TableCell className="font-medium">{r.title}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{r.course_semester || "—"}</Badge>
                                      </TableCell>
                                      <TableCell>{dateText}</TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-muted-foreground">
                              Showing {from}–{to} of {spCount}
                            </span>
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setSpPage((p) => Math.max(1, p - 1))
                                    }}
                                    className={pageSafe <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                  />
                                </PaginationItem>
                                {genPageNumbers(pageSafe, totalPages).map((p, i) => (
                                  <PaginationItem key={`${p}-${i}`}>
                                    {p === "ellipsis" ? (
                                      <PaginationEllipsis />
                                    ) : (
                                      <PaginationLink
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setSpPage(p as number)
                                        }}
                                        isActive={p === pageSafe}
                                        className="cursor-pointer"
                                      >
                                        {p}
                                      </PaginationLink>
                                    )}
                                  </PaginationItem>
                                ))}
                                <PaginationItem>
                                  <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setSpPage((p) => Math.min(totalPages, p + 1))
                                    }}
                                    className={
                                      pageSafe >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                    }
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        </>
                      )
                    })()}
                  </TabsContent>

                  {/* Tab: Interest */}
                  <TabsContent value="by-interest" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Filter by Interest</h3>
                      <span className="text-sm text-muted-foreground">Total Results: {inCount}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs font-medium">Interest Area</Label>
                        <Select
                          value={inInterestId}
                          onValueChange={(v) => {
                            setInInterestId(v)
                            setInPage(1)
                            runInterestQuery(v)
                          }}
                        >
                          <SelectTrigger className="border-2">
                            <SelectValue placeholder="Select interest" />
                          </SelectTrigger>
                          <SelectContent>
                            {insightsOptions.interests.map((i) => (
                              <SelectItem key={i.id} value={String(i.id)}>
                                {i.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {(() => {
                      const totalPages = Math.max(1, Math.ceil(inRows.length / INSIGHTS_PER_PAGE))
                      const pageSafe = Math.min(inPage, totalPages)
                      const visible = paginate(inRows, pageSafe, INSIGHTS_PER_PAGE)
                      const from = inRows.length === 0 ? 0 : (pageSafe - 1) * INSIGHTS_PER_PAGE + 1
                      const to = Math.min(pageSafe * INSIGHTS_PER_PAGE, inRows.length)
                      return (
                        <>
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = inSort.key === "date" && inSort.dir === "desc" ? "asc" : "desc"
                                      setInSort({ key: "date", dir })
                                      setInRows(sortRows(inRows, "seminar_date", dir))
                                      setInPage(1)
                                    }}
                                  >
                                    Date
                                  </TableHead>
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = inSort.key === "title" && inSort.dir === "asc" ? "desc" : "asc"
                                      setInSort({ key: "title", dir })
                                      setInRows(sortRows(inRows, "title", dir))
                                      setInPage(1)
                                    }}
                                  >
                                    Title
                                  </TableHead>
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = inSort.key === "speaker" && inSort.dir === "asc" ? "desc" : "asc"
                                      setInSort({ key: "speaker", dir })
                                      setInRows(sortRows(inRows, "speaker", dir))
                                      setInPage(1)
                                    }}
                                  >
                                    Speaker
                                  </TableHead>
                                  <TableHead
                                    className="font-semibold cursor-pointer"
                                    onClick={() => {
                                      const dir = inSort.key === "course" && inSort.dir === "asc" ? "desc" : "asc"
                                      setInSort({ key: "course", dir })
                                      setInRows(sortRows(inRows, "course", dir))
                                      setInPage(1)
                                    }}
                                  >
                                    Course–Semester
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {visible.map((r) => {
                                  const { dateText } = formatISTDisplay(r.seminar_date)
                                  return (
                                    <TableRow key={r.id}>
                                      <TableCell>{dateText}</TableCell>
                                      <TableCell className="font-medium">{r.title}</TableCell>
                                      <TableCell>{r.speaker_name || "—"}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline">{r.course || "—"}</Badge>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-muted-foreground">
                              Showing {from}–{to} of {inCount}
                            </span>
                            <Pagination>
                              <PaginationContent>
                                <PaginationItem>
                                  <PaginationPrevious
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setInPage((p) => Math.max(1, p - 1))
                                    }}
                                    className={pageSafe <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                  />
                                </PaginationItem>
                                {genPageNumbers(pageSafe, totalPages).map((p, i) => (
                                  <PaginationItem key={`${p}-${i}`}>
                                    {p === "ellipsis" ? (
                                      <PaginationEllipsis />
                                    ) : (
                                      <PaginationLink
                                        href="#"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          setInPage(p as number)
                                        }}
                                        isActive={p === pageSafe}
                                        className="cursor-pointer"
                                      >
                                        {p}
                                      </PaginationLink>
                                    )}
                                  </PaginationItem>
                                ))}
                                <PaginationItem>
                                  <PaginationNext
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setInPage((p) => Math.min(totalPages, p + 1))
                                    }}
                                    className={
                                      pageSafe >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                                    }
                                  />
                                </PaginationItem>
                              </PaginationContent>
                            </Pagination>
                          </div>
                        </>
                      )
                    })()}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
