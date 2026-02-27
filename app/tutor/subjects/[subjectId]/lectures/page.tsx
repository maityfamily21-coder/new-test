"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, Edit2, Trash2, ArrowLeft, Users, Clock, BookOpen, UserCheck, Loader2, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Lecture {
  id: number
  title: string
  description: string | null
  lecture_date: string
  subject_name: string
  attendance_count: number
  creator_name: string | null
}

interface Batch {
  id: number
  batch_name: string
  batch_number: number
}

// STRICT SLOT CONFIGURATION
// The 'hour' and 'minute' define when the slot STARTS.
// The slot remains open for 55 minutes from this start time.
const STRICT_SLOTS = [
  { label: "08:15", hour: 8, minute: 15 },
  { label: "09:15", hour: 9, minute: 15 },
  { label: "10:30", hour: 10, minute: 30 },
  { label: "11:30", hour: 11, minute: 30 },
  { label: "12:30", hour: 12, minute: 30 },
  { label: "14:00", hour: 14, minute: 0 },
  { label: "15:00", hour: 15, minute: 0 },
  { label: "16:15", hour: 16, minute: 15 },
  { label: "17:15", hour: 17, minute: 15 },
]

export default function LecturesPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const subjectId = params.subjectId as string
  const [tutor, setTutor] = useState<any>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    lectureDate: new Date().toISOString().split("T")[0],
    selectedSlot: null as string | null,
  })

  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null)
  const [hasBatches, setHasBatches] = useState(false)

  // Tracks which slot is currently valid based on real-time
  const [availableSlotLabel, setAvailableSlotLabel] = useState<string | null>(null)
  const [currentIstTimeStr, setCurrentIstTimeStr] = useState<string>("")
  const [slotError, setSlotError] = useState<string>("")

  // Report generation states
  const [reportFromDate, setReportFromDate] = useState("")
  const [reportToDate, setReportToDate] = useState("")
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)

  // QR attendance states
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false)
  const [selectedQRLecture, setSelectedQRLecture] = useState<Lecture | null>(null)
  const [qrCode, setQRCode] = useState<string | null>(null)
  const [isQRLoading, setIsQRLoading] = useState(false)
  const [qrRefreshInterval, setQRRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // This function calculates strictly based on IST time
    const updateAvailableSlots = () => {
      const now = new Date()
      const utcHours = now.getUTCHours()
      const utcMinutes = now.getUTCMinutes()

      // Convert Current UTC to IST Minutes (UTC + 5:30)
      const totalMinutesUTC = utcHours * 60 + utcMinutes
      const totalMinutesIST = (totalMinutesUTC + 330) % 1440

      // Calculate current IST HH:MM for display
      const istHour = Math.floor(totalMinutesIST / 60)
      const istMinute = totalMinutesIST % 60
      const timeString = `${String(istHour).padStart(2, '0')}:${String(istMinute).padStart(2, '0')}`

      setCurrentIstTimeStr(timeString)

      let activeSlotFound = null;

      // STRICT CHECK: Is current time within [SlotTime, SlotTime + 55 mins)?
      for (const slot of STRICT_SLOTS) {
        const slotStartMinutes = slot.hour * 60 + slot.minute
        const slotEndMinutes = slotStartMinutes + 55

        if (totalMinutesIST >= slotStartMinutes && totalMinutesIST < slotEndMinutes) {
          activeSlotFound = slot.label
          break // Found the one active slot, stop looking
        }
      }

      if (activeSlotFound) {
        setAvailableSlotLabel(activeSlotFound)
        setSlotError("")
        // FORCE SELECT: Automatically set the form data to this slot
        setFormData((prev) => {
          // Only update if it's different to avoid re-renders
          if (prev.selectedSlot !== activeSlotFound) {
            return { ...prev, selectedSlot: activeSlotFound }
          }
          return prev
        })
      } else {
        setAvailableSlotLabel(null)
        setFormData((prev) => ({ ...prev, selectedSlot: null }))
        setSlotError(`No active lecture slots at ${timeString}. Slots open for 55 mins from start time.`)
      }
    }

    updateAvailableSlots()
    // Run every 5 seconds to ensure strict timing
    const interval = setInterval(updateAvailableSlots, 5000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const tutorAuth = localStorage.getItem("tutorAuth")
    if (!tutorAuth) {
      router.push("/tutor/login")
      return
    }

    try {
      const tutorData = JSON.parse(tutorAuth)
      setTutor(tutorData)
      fetchLectures(tutorData.id)
    } catch (error) {
      console.error("Failed to parse tutor auth:", error)
      localStorage.removeItem("tutorAuth")
      router.push("/tutor/login")
    }
  }, [router, subjectId])

  useEffect(() => {
    const checkBatches = async () => {
      try {
        const response = await fetch(`/api/tutor/lectures-batch-check?subjectId=${subjectId}`)
        const data = await response.json()
        if (data.success && data.hasBatches) {
          setHasBatches(true)
          setBatches(data.batches)
        }
      } catch (error) {
        console.error("Error checking batches:", error)
      }
    }

    checkBatches()
  }, [subjectId])

  const fetchLectures = async (tutorId: number) => {
    try {
      const response = await fetch(`/api/tutor/lectures?subjectId=${subjectId}&tutorId=${tutorId}`)
      const data = await response.json()
      if (data.success) {
        setLectures(data.lectures)
      }
    } catch (error) {
      console.error("Error fetching lectures:", error)
      toast({ title: "Error", description: "Failed to fetch lectures", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddLecture = async () => {
    if (isSubmitting) return

    if (!formData.title || !formData.lectureDate || !tutor || formData.selectedSlot === null) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    if (hasBatches && !selectedBatch) {
      toast({ title: "Error", description: "Please select a batch for this lecture", variant: "destructive" })
      return
    }

    setIsSubmitting(true)

    try {
      // The backend will receive the SLOT time (e.g. "08:15") even if real time is 08:30
      console.log("[v0] Sending lecture data:", {
        subjectId: Number.parseInt(subjectId),
        tutorId: tutor.id,
        title: formData.title,
        description: formData.description,
        lectureDate: formData.lectureDate,
        lectureSlot: formData.selectedSlot,
        batchId: selectedBatch || null,
      })

      const response = await fetch("/api/tutor/lectures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: Number.parseInt(subjectId),
          tutorId: tutor.id,
          title: formData.title,
          description: formData.description,
          lectureDate: formData.lectureDate,
          lectureSlot: formData.selectedSlot,
          batchId: selectedBatch || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        toast({
          title: "Error",
          description: errorData.error || "Failed to create lecture",
          variant: "destructive",
        })
        return
      }

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Lecture created successfully" })
        setFormData({
          title: "",
          description: "",
          lectureDate: new Date().toISOString().split("T")[0],
          selectedSlot: null,
        })
        setSelectedBatch(null)
        setIsAddDialogOpen(false)
        fetchLectures(tutor.id)
      } else {
        toast({ title: "Error", description: data.error || "Failed to create lecture", variant: "destructive" })
      }
    } catch (error) {
      console.error("[v0] Error adding lecture:", error)
      toast({ title: "Error", description: "Failed to create lecture - check browser console", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditLecture = async () => {
    if (!selectedLecture || !formData.title || !formData.lectureDate) {
      toast({ title: "Error", description: "Please fill required fields", variant: "destructive" })
      return
    }

    try {
      const response = await fetch(`/api/tutor/lectures/${selectedLecture.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          lectureDate: formData.lectureDate,
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Lecture updated successfully" })
        setIsEditDialogOpen(false)
        fetchLectures(tutor.id)
      }
    } catch (error) {
      console.error("Error updating lecture:", error)
      toast({ title: "Error", description: "Failed to update lecture", variant: "destructive" })
    }
  }

  const handleDeleteLecture = async (lectureId: number) => {
    if (!confirm("Are you sure you want to delete this lecture?")) return

    try {
      const response = await fetch(`/api/tutor/lectures/${lectureId}`, { method: "DELETE" })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Lecture deleted successfully" })
        fetchLectures(tutor.id)
      }
    } catch (error) {
      console.error("Error deleting lecture:", error)
      toast({ title: "Error", description: "Failed to delete lecture", variant: "destructive" })
    }
  }

  const handleGenerateReport = async () => {
    if (!reportFromDate || !reportToDate) {
      toast({ title: "Error", description: "Please select both from and to dates", variant: "destructive" })
      return
    }

    if (!tutor) {
      toast({ title: "Error", description: "Tutor information not found", variant: "destructive" })
      return
    }

    setIsGeneratingReport(true)
    try {
      const response = await fetch("/api/tutor/lectures/attendance-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: Number(subjectId),
          tutorId: tutor.id,
          fromDate: reportFromDate,
          toDate: reportToDate,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate report")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `Attendance_Report_${reportFromDate}_to_${reportToDate}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({ title: "Success", description: "Report downloaded successfully" })
      setIsReportDialogOpen(false)
      setReportFromDate("")
      setReportToDate("")
    } catch (error) {
      console.error("Error generating report:", error)
      toast({ title: "Error", description: "Failed to generate report", variant: "destructive" })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const openEditDialog = (lecture: Lecture) => {
    setSelectedLecture(lecture)
    setFormData({
      title: lecture.title,
      description: lecture.description || "",
      lectureDate: lecture.lecture_date.split("T")[0],
      selectedSlot: null,
    })
    setIsEditDialogOpen(true)
  }

  const fetchQRCode = async (lectureId: number) => {
    try {
      setIsQRLoading(true)
      const response = await fetch(`/api/tutor/lectures/${lectureId}/qr`, {
        method: "GET",
      })
      const data = await response.json()
      if (data.success) {
        setQRCode(data.qrCode)
      } else {
        toast({ title: "Error", description: data.error || "Failed to generate QR code", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error fetching QR code:", error)
      toast({ title: "Error", description: "Failed to fetch QR code", variant: "destructive" })
    } finally {
      setIsQRLoading(false)
    }
  }

  const openQRDialog = async (lecture: Lecture) => {
    setSelectedQRLecture(lecture)
    setIsQRDialogOpen(true)
    await fetchQRCode(lecture.id)

    // Auto-refresh QR code every 4 seconds
    const interval = setInterval(() => {
      fetchQRCode(lecture.id)
    }, 4000)
    setQRRefreshInterval(interval)
  }

  const closeQRDialog = () => {
    if (qrRefreshInterval) {
      clearInterval(qrRefreshInterval)
      setQRRefreshInterval(null)
    }
    setIsQRDialogOpen(false)
    setSelectedQRLecture(null)
    setQRCode(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    })
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    const hour12 = hours % 12 || 12
    const ampm = hours >= 12 ? "PM" : "AM"
    return `${String(hour12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/30 border-t-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading lectures...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/tutor/dashboard">
              <Button variant="outline" size="icon" className="rounded-lg bg-transparent">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Lecture Management</h1>
              <p className="text-sm md:text-base text-muted-foreground">Create and manage lectures for this subject</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Download Report Button */}
            <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto bg-green-50 hover:bg-green-100 dark:bg-green-950/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 rounded-lg gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Download Report</span>
                  <span className="sm:hidden">Report</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-lg max-w-md">
                <DialogHeader>
                  <DialogTitle>Generate Attendance Report</DialogTitle>
                  <DialogDescription>
                    Select date range to generate attendance summary PDF
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">From Date *</label>
                    <Input
                      type="date"
                      value={reportFromDate}
                      onChange={(e) => setReportFromDate(e.target.value)}
                      className="rounded-lg mt-1"
                      max={reportToDate || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">To Date *</label>
                    <Input
                      type="date"
                      value={reportToDate}
                      onChange={(e) => setReportToDate(e.target.value)}
                      className="rounded-lg mt-1"
                      min={reportFromDate}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={!reportFromDate || !reportToDate || isGeneratingReport}
                    className="w-full bg-green-600 hover:bg-green-700 rounded-lg"
                  >
                    {isGeneratingReport ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate PDF Report"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Create Lecture Button */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg gap-2">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Lecture</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-lg max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Lecture</DialogTitle>
                  <DialogDescription>
                    {availableSlotLabel ? (
                      <span className="text-blue-600 font-medium">
                        Current Time: {currentIstTimeStr}. <br />
                        Active Slot: <strong>{availableSlotLabel}</strong> (Open for 55 mins)
                      </span>
                    ) : (
                      <span className="text-amber-600">
                        Current Time: {currentIstTimeStr}. <br />
                        No active lecture slot found.
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Lecture Date</label>
                    <Input
                      type="date"
                      value={formData.lectureDate}
                      disabled
                      className="rounded-lg mt-1 bg-gray-100 dark:bg-gray-800"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Defaults to today - cannot be changed</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Available Time Slot {availableSlotLabel && <span className="text-blue-600">*</span>}
                    </label>

                    {/* SLOT SELECTION GRID */}
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {STRICT_SLOTS.map((slot) => {
                        // STRICT LOGIC: Button is ONLY valid if it matches the calculated availableSlotLabel
                        const isActive = availableSlotLabel === slot.label

                        return (
                          <button
                            key={slot.label}
                            disabled={true} // ALWAYS DISABLED so users can't manually deselect or change
                            className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all border ${isActive
                                ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-400 ring-offset-1 opacity-100"
                                : "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600 border-gray-200 dark:border-gray-800 cursor-not-allowed opacity-50"
                              }`}
                          >
                            {slot.label}
                            {isActive && " (Active)"}
                          </button>
                        )
                      })}
                    </div>

                    {slotError ? (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">{slotError}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        ✓ Slot {availableSlotLabel} automatically selected based on current time.
                      </p>
                    )}
                  </div>

                  {hasBatches && (
                    <div>
                      <label className="text-sm font-medium">Select Batch *</label>
                      <select
                        value={selectedBatch || ""}
                        onChange={(e) => setSelectedBatch(e.target.value ? Number(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-input rounded-lg mt-1 bg-background"
                      >
                        <option value="">-- Select a batch --</option>
                        {batches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.batch_name} (Batch {batch.batch_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Lecture Title</label>
                    <Input
                      placeholder="e.g., Introduction to Data Structures"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Input
                      placeholder="Brief description of the lecture"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="rounded-lg mt-1"
                    />
                  </div>

                  <Button
                    onClick={handleAddLecture}
                    className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg"
                    // Button is disabled if no slot is active (null) or if submitting
                    disabled={formData.selectedSlot === null || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Lecture"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Lectures Grid */}
        <div className="space-y-4">
          {lectures.length === 0 ? (
            <Card className="border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg">
              <CardContent className="p-8 md:p-12 text-center">
                <BookOpen className="w-12 h-12 text-blue-300 dark:text-blue-700 mx-auto mb-4" />
                <p className="text-muted-foreground">No lectures created yet. Create one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lectures.map((lecture) => (
                <Card
                  key={lecture.id}
                  className="border border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-900/50 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 rounded-lg overflow-hidden group"
                >
                  <CardHeader className="pb-3 pt-4 px-4">
                    <div className="space-y-2">
                      <CardTitle className="text-base md:text-lg line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {lecture.title}
                      </CardTitle>
                      {lecture.description && (
                        <CardDescription className="text-xs md:text-sm line-clamp-1">
                          {lecture.description}
                        </CardDescription>
                      )}
                      {lecture.creator_name && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <UserCheck className="w-3 h-3" />
                          <span>Created by {lecture.creator_name}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 px-4 pb-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(lecture.lecture_date)}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        {formatTime(lecture.lecture_date)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span>{lecture.attendance_count} attendance records</span>
                    </div>

                    <div className="flex gap-2 pt-2 flex-wrap">
                      <Link href={`/tutor/subjects/${subjectId}/lectures/${lecture.id}/attendance`} className="flex-1 min-w-[80px]">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full gap-1 text-xs md:text-sm bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg"
                        >
                          <Users className="w-3 h-3" />
                          <span className="hidden sm:inline">Attendance</span>
                          <span className="sm:hidden">Mark</span>
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openQRDialog(lecture)}
                        className="gap-1 text-xs md:text-sm bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg"
                      >
                        <span className="text-base">📱</span>
                        <span className="hidden sm:inline">QR</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(lecture)}
                        className="gap-1 text-xs md:text-sm rounded-lg"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteLecture(lecture.id)}
                        className="gap-1 text-xs md:text-sm rounded-lg"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* QR Dialog */}
        <Dialog open={isQRDialogOpen} onOpenChange={(open) => {
          if (!open) closeQRDialog()
          setIsQRDialogOpen(open)
        }}>
          <DialogContent className="rounded-lg max-w-md">
            <DialogHeader>
              <DialogTitle>Lecture QR Code</DialogTitle>
              <DialogDescription>
                {selectedQRLecture ? `${selectedQRLecture.title}` : "Display QR code for students to scan"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {isQRLoading ? (
                <div className="w-64 h-64 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
                    <p className="text-sm text-muted-foreground">Generating QR code...</p>
                  </div>
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                    <img 
                      src={qrCode || "/placeholder.svg"} 
                      alt="Lecture QR Code" 
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    QR code refreshes every 4 seconds for security
                  </p>
                </div>
              ) : (
                <div className="w-64 h-64 flex items-center justify-center bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-600 dark:text-red-400 text-center">Failed to load QR code</p>
                </div>
              )}
              <div className="w-full space-y-2 text-sm text-muted-foreground">
                <p><strong>Lecture:</strong> {selectedQRLecture?.title}</p>
                <p><strong>Date:</strong> {selectedQRLecture && formatDate(selectedQRLecture.lecture_date)}</p>
                <p><strong>Time:</strong> {selectedQRLecture && formatTime(selectedQRLecture.lecture_date)}</p>
              </div>
            </div>
            <Button 
              onClick={closeQRDialog} 
              className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg"
            >
              Close
            </Button>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="rounded-lg">
            <DialogHeader>
              <DialogTitle>Edit Lecture</DialogTitle>
              <DialogDescription>Update lecture information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Lecture Title</label>
                <Input
                  placeholder="e.g., Introduction to Data Structures"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-lg mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  placeholder="Brief description of the lecture"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-lg mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={formData.lectureDate}
                  onChange={(e) => setFormData({ ...formData, lectureDate: e.target.value })}
                  className="rounded-lg mt-1"
                />
              </div>
              <Button onClick={handleEditLecture} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                Update Lecture
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
