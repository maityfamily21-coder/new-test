"use client"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, ArrowLeft, AlertTriangle, X } from "lucide-react"
import Link from "next/link"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Message, Interest, Course } from "@/lib/db"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { SearchableCourseSelect } from "@/components/searchable-course-select"

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)
  const [courseSemesterSupported, setCourseSemesterSupported] = useState(true) // Assume true initially, check on error
  const [viewMessage, setViewMessage] = useState<Message | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prefillApplied, setPrefillApplied] = useState(false)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)
  const [recipientsOpen, setRecipientsOpen] = useState(false) // recipients modal open
  const [recipientsLoading, setRecipientsLoading] = useState(false) // loading state for recipients
  const [recipients, setRecipients] = useState<
    { id: number; enrollment_number: string; full_name: string; course_name: string | null; current_semester: number }[]
  >([]) // recipients data
  const [recipientsForMessageId, setRecipientsForMessageId] = useState<number | null>(null) //

  const [targetsOpen, setTargetsOpen] = useState(false)
  const [targetsLoading, setTargetsLoading] = useState(false)
  const [targetsForMessageId, setTargetsForMessageId] = useState<number | null>(null)
  const [targets, setTargets] = useState<{ course_id: number; course_name: string; semester: number }[]>([])

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    message_type: "interest",
    interest_ids: [] as string[],
    course_semesters: [] as { course_id: string; semester: string }[],
    image_url: "",
  })

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    fetchData()
  }, [router, page, perPage])

  useEffect(() => {
    if (prefillApplied) return
    try {
      const prefill = searchParams?.get("prefill")
      const csParam = searchParams?.get("cs")
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
            message_type: "course_semester",
            interest_ids: [],
            course_semesters: combos,
          }))
          setIsAddDialogOpen(true)
          setPrefillApplied(true)
        }
      }
    } catch {
      // ignore parse errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, prefillApplied])

  const fetchData = async () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const headers = {
        Authorization: `Bearer ${adminAuth}`,
      }

      const [messagesRes, interestsRes, coursesRes] = await Promise.all([
        fetch(`/api/admin/messages?page=${page}&limit=${perPage}`, { headers }),
        fetch("/api/admin/interests", { headers }),
        fetch("/api/admin/courses", { headers }),
      ])

      const [messagesData, interestsData, coursesData] = await Promise.all([
        messagesRes.json(),
        interestsRes.json(),
        coursesRes.json(),
      ])

      if (messagesData.success) {
        setMessages(Array.isArray(messagesData.messages) ? messagesData.messages : [])
        setTotal(messagesData.meta?.total ?? messagesData.messages?.length ?? 0)
        if (
          Array.isArray(messagesData.messages) &&
          messagesData.messages.length > 0 &&
          (messagesData.messages[0].course_id === undefined || messagesData.messages[0].semester === undefined)
        ) {
          setCourseSemesterSupported(false)
        } else {
          setCourseSemesterSupported(true)
        }
      } else {
        setMessages([])
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
      setMessages([])
      setInterests([])
      setCourses([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const url = editingMessage ? `/api/admin/messages/${editingMessage.id}` : "/api/admin/messages"
      const method = editingMessage ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify({
          ...formData,
          interest_ids: formData.interest_ids.map((id) => Number(id)),
          course_semesters: formData.course_semesters.map((cs) => ({
            course_id: Number(cs.course_id),
            semester: Number(cs.semester),
          })),
        }),
      })

      const data = await response.json()

      if (data.success) {
        fetchData()
        resetForm()
        setIsAddDialogOpen(false)
        setEditingMessage(null)
        alert(`${data.messagesSent} message(s) sent successfully to ${data.recipientsCount} recipients!`)
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
    if (!confirm("Are you sure you want to delete this message?")) return
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminAuth}` },
      })
      const data = await response.json()
      if (data.success) {
        if (messages.length === 1 && page > 1) {
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
      content: "",
      message_type: "interest",
      interest_ids: [],
      course_semesters: [],
      image_url: "",
    })
  }

  const handleEdit = (message: Message) => {
    setFormData({
      title: message.title,
      content: message.content,
      message_type: message.interest_id ? "interest" : "course_semester",
      interest_ids: message.interest_id ? [message.interest_id.toString()] : [],
      course_semesters: (message as any).course_id
        ? [{ course_id: (message as any).course_id.toString(), semester: (message as any).semester?.toString() || "" }]
        : [],
      image_url: (message as any).image_url || "",
    })
    setEditingMessage(message)
    setIsAddDialogOpen(true)
  }

  const openView = (message: Message) => {
    setViewMessage(message)
    setIsViewDialogOpen(true)
  }

  const closeView = () => {
    setIsViewDialogOpen(false)
    setViewMessage(null)
  }

  const handleView = (message: Message) => {
    openView(message)
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

  const openTargets = async (messageId: number) => {
    try {
      setTargetsForMessageId(messageId)
      setTargetsOpen(true)
      setTargetsLoading(true)
      const adminAuth = localStorage.getItem("adminAuth")
      const res = await fetch(`/api/admin/messages/${messageId}/targets`, {
        headers: { Authorization: `Bearer ${adminAuth}` },
      })
      const data = await res.json()
      if (data.success) {
        setTargets(data.targets || [])
      } else {
        setTargets([])
      }
    } catch (e) {
      console.error("[MYT] targets fetch error:", e)
      setTargets([])
    } finally {
      setTargetsLoading(false)
    }
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

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const openRecipients = async (messageId: number) => {
    try {
      setRecipientsForMessageId(messageId)
      setRecipientsOpen(true)
      setRecipientsLoading(true)
      const adminAuth = localStorage.getItem("adminAuth")
      const res = await fetch(`/api/admin/messages/${messageId}/recipients`, {
        headers: { Authorization: `Bearer ${adminAuth}` },
      })
      const data = await res.json()
      if (data.success) {
        setRecipients(data.recipients || [])
      } else {
        setRecipients([])
      }
    } catch (e) {
      console.error("Recipients fetch error:", e)
      setRecipients([])
    } finally {
      setRecipientsLoading(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground ml-4">Message Management</h1>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Send Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingMessage ? "Edit Message" : "Send New Message"}</DialogTitle>
              <DialogDescription>
                {editingMessage
                  ? "Update message content"
                  : "Send a new message to students. Multiple selections will send separate messages for each target."}
              </DialogDescription>
            </DialogHeader>

            {!courseSemesterSupported && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Course-semester messages require database migration. Please run the migration script to enable this
                  feature.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Message Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Important Placement Drive Update"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Message Content *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter your message here..."
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">Image URL (Optional)</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="e.g., https://example.com/image.jpg"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a direct image URL to display with the message. Leave empty for text-only messages.
                </p>
                {formData.image_url && (
                  <div className="mt-2 p-2 border rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                    <img
                      src={formData.image_url || "/placeholder.svg"}
                      alt="Message preview"
                      className="max-h-32 rounded object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Message Target *</Label>
                <RadioGroup
                  value={formData.message_type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, message_type: value, interest_ids: [], course_semesters: [] })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="interest" id="interest" />
                    <Label htmlFor="interest">Target by Interest (Sends separate message for each interest)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="course_semester" id="course_semester" disabled={!courseSemesterSupported} />
                    <Label htmlFor="course_semester" className={!courseSemesterSupported ? "text-gray-400" : ""}>
                      Target by Course & Semester (Sends separate message for each combination)
                      {!courseSemesterSupported && " - Requires Migration"}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.message_type === "interest" && (
                <div className="space-y-2">
                  <Label>Select Interests * (Each will send a separate message)</Label>
                  <div className="border rounded-md p-4 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {interests.map((interest) => (
                        <div key={interest.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`interest-${interest.id}`}
                            checked={formData.interest_ids.includes(interest.id.toString())}
                            onCheckedChange={(checked) =>
                              handleInterestChange(interest.id.toString(), checked as boolean)
                            }
                          />
                          <Label htmlFor={`interest-${interest.id}`} className="text-sm">
                            {interest.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  {formData.interest_ids.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-blue-600">
                        Will send {formData.interest_ids.length} separate message(s):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.interest_ids.map((interestId) => {
                          const interest = interests.find((i) => i.id.toString() === interestId)
                          return (
                            <Badge key={interestId} variant="secondary">
                              {interest?.name}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formData.message_type === "course_semester" && courseSemesterSupported && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Course & Semester Combinations * (Each will send a separate message)</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addCourseSemester}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Combination
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {formData.course_semesters.map((combination, index) => (
                      <div key={index} className="flex gap-2 items-end">
                        <div className="flex-1">
                          <Label className="text-xs">Course</Label>
                          <SearchableCourseSelect
                            courses={courses}
                            value={combination.course_id}
                            onValueChange={(value) => updateCourseSemester(index, "course_id", value)}
                            placeholder="Search and select course"
                          />
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs">Semester</Label>
                          <Select
                            value={combination.semester}
                            onValueChange={(value) => updateCourseSemester(index, "semester", value)}
                            disabled={!combination.course_id}
                          >
                            <SelectTrigger>
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
                        <Button type="button" variant="outline" size="sm" onClick={() => removeCourseSemester(index)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  {formData.course_semesters.length === 0 && (
                    <p className="text-sm text-gray-500">Click "Add Combination" to add course-semester pairs</p>
                  )}
                  {formData.course_semesters.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-blue-600">
                        Will send {formData.course_semesters.filter((cs) => cs.course_id && cs.semester).length}{" "}
                        separate message(s):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {formData.course_semesters.map((combination, index) => {
                          const course = getSelectedCourse(combination.course_id)
                          if (!course || !combination.semester) return null
                          return (
                            <Badge key={index} variant="secondary">
                              {course.name} - Semester {combination.semester}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setEditingMessage(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (formData.message_type === "interest" && formData.interest_ids.length === 0) ||
                    (formData.message_type === "course_semester" &&
                      (formData.course_semesters.length === 0 ||
                        formData.course_semesters.some((cs) => !cs.course_id || !cs.semester)))
                  }
                >
                  {isSubmitting
                    ? editingMessage
                      ? "Updating..."
                      : "Sending..."
                    : editingMessage
                      ? "Update Message"
                      : "Send Message(s)"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Messages ({total})</CardTitle>
            <CardDescription>
              Manage messages sent to students based on their interests or course/semester
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((message) => (
                    <TableRow key={message.id}>
                      <TableCell className="font-medium">{message.title}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <button
                          type="button"
                          onClick={() => openView(message)}
                          className="w-full text-left truncate hover:underline text-blue-600"
                          title="Click to view full message"
                          aria-label="View full message"
                        >
                          {message.content}
                        </button>
                      </TableCell>
                      <TableCell>
                        {(message as any).message_type === "students" ? (
                          <button
                            type="button"
                            onClick={() => openRecipients(message.id)}
                            className="inline-flex items-center px-2 py-1 rounded border hover:underline text-blue-600"
                            aria-label="View personal recipients"
                          >
                            Personal
                          </button>
                        ) : (message as any).message_type === "course_semester" &&
                          (message as any).mapping_count > 1 ? (
                          <button
                            type="button"
                            onClick={() => openTargets(message.id)}
                            className="inline-flex items-center px-2 py-1 rounded border hover:underline text-blue-600"
                            aria-label="View course-semester targets"
                          >
                            {`Multiple Courses (${(message as any).mapping_count})`}
                          </button>
                        ) : (
                          <Badge variant="outline">
                            {(message as any).target_display || (message as any).interest_name || "Unknown Target"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{new Date(message.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(message)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openView(message)}>
                            View
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(message.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex items-center justify-between">
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

                      {generatePageNumbers().map((pg, index) => (
                        <PaginationItem key={index}>
                          {pg === "ellipsis" ? (
                            <PaginationEllipsis />
                          ) : (
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault()
                                setPage(pg as number)
                              }}
                              isActive={pg === page}
                              className="cursor-pointer"
                            >
                              {pg}
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
      </div>

      {/* View Message Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={(open) => (open ? setIsViewDialogOpen(true) : closeView())}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-pretty">{viewMessage?.title ?? "Message"}</DialogTitle>
            <DialogDescription>
              {viewMessage ? `Created on ${new Date(viewMessage.created_at).toLocaleString()}` : "Full message content"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium">Target: </span>
              <Badge variant="secondary">
                {(viewMessage as any)?.target_display || (viewMessage as any)?.interest_name || "Unknown Target"}
              </Badge>
            </div>

            <div className="rounded-md border p-4 bg-background text-foreground">
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{viewMessage?.content}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={recipientsOpen} onOpenChange={(open) => setRecipientsOpen(open)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Personal Message Recipients</DialogTitle>
            <DialogDescription>
              {recipientsForMessageId ? `Message ID: ${recipientsForMessageId}` : "Selected recipients"}
            </DialogDescription>
          </DialogHeader>

          {recipientsLoading ? (
            <div className="p-6 text-sm">Loading recipients...</div>
          ) : recipients.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No recipients recorded for this message.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Enrollment No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Current Semester</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.enrollment_number}</TableCell>
                      <TableCell>{r.full_name}</TableCell>
                      <TableCell>{r.course_name ?? "-"}</TableCell>
                      <TableCell>{r.current_semester}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Targets Dialog */}
      <Dialog open={targetsOpen} onOpenChange={setTargetsOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Targets {targetsForMessageId ? `— #${targetsForMessageId}` : ""}</DialogTitle>
            <DialogDescription>All included Course & Semester combinations for this message</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {targetsLoading ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading course–semesters...</p>
              </div>
            ) : targets.length > 0 ? (
              <div className="space-y-2">
                {targets.map((cs) => (
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
