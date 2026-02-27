"use client"

import type React from "react"
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
  DialogFooter, // Import DialogFooter
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, ArrowLeft, Users, X, Eye } from "lucide-react"
import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import type { Company, Interest, Course } from "@/lib/db"
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

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [interests, setInterests] = useState<Interest[]>([])
  const [courses, setCourses] = useState<Course[]>([]) // courses for course+semester targeting
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [isApplicantsDialogOpen, setIsApplicantsDialogOpen] = useState(false)
  const [selectedCompanyApplicants, setSelectedCompanyApplicants] = useState<any[]>([]) // allow enriched payload
  const [selectedCompanyName, setSelectedCompanyName] = useState("")
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<Company | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false) // Declare the variable
  const [isTargetsDialogOpen, setIsTargetsDialogOpen] = useState(false)
  const [selectedTargets, setSelectedTargets] = useState<
    { course_id: number; semester: number; course_name: string | null }[]
  >([])
  const [selectedTargetsCompanyName, setSelectedTargetsCompanyName] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const [prefillApplied, setPrefillApplied] = useState(false)

  const [isRecipientsDialogOpen, setIsRecipientsDialogOpen] = useState(false)
  const [selectedRecipients, setSelectedRecipients] = useState<
    {
      student_id: number
      student_name: string
      enrollment_number: string
      course_name: string | null
      from_semester: number | null
    }[]
  >([])
  const [selectedRecipientsCompanyName, setSelectedRecipientsCompanyName] = useState("")
  // </CHANGE>

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [total, setTotal] = useState(0)

  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    position: "",
    description: "",
    interest_ids: [] as string[],
    application_deadline: "",
    targeting_mode: "interest" as "interest" | "course_semester" | "students",
    course_semesters: [] as { course_id: string; semester: string }[],
    opening_type: "job" as "job" | "internship",
    tenure_days: "",
    custom_link: "",
    image_url: "",
  })
  const [prefilledStudentIds, setPrefilledStudentIds] = useState<number[]>([])

  const [selectedApplicantsTargets, setSelectedApplicantsTargets] = useState<
    { course_id: number; semester: number; course_name: string | null }[]
  >([])
  const [selectedApplicantsMode, setSelectedApplicantsMode] = useState<"interest" | "course_semester" | "students">(
    "interest",
  )
  const [applicantsActiveTab, setApplicantsActiveTab] = useState<string | null>(null)

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
      const idsParam = searchParams?.get("ids") // support students prefill
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
            targeting_mode: "course_semester",
            interest_ids: [],
            course_semesters: combos,
          }))
          setIsAddDialogOpen(true)
          setPrefillApplied(true)
        }
      } else if (prefill === "students" && idsParam) {
        const ids = idsParam
          .split(",")
          .map((n) => Number(n.trim()))
          .filter((n) => Number.isFinite(n) && n > 0)
        if (ids.length > 0) {
          setPrefilledStudentIds(ids)
          setFormData((prev) => ({
            ...prev,
            targeting_mode: "students",
            interest_ids: [],
            course_semesters: [],
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
        "Content-Type": "application/json",
      }

      const [companiesRes, interestsRes, coursesRes] = await Promise.all([
        fetch(`/api/admin/companies?page=${page}&limit=${perPage}`, { headers }),
        fetch("/api/admin/interests", { headers }),
        fetch("/api/admin/courses", { headers }),
      ])

      const [companiesData, interestsData, coursesData] = await Promise.all([
        companiesRes.json(),
        interestsRes.json(),
        coursesRes.json(),
      ])

      if (companiesData.success) {
        setCompanies(companiesData.companies)
        setTotal(companiesData.meta?.total ?? companiesData.companies?.length ?? 0)
      }
      if (interestsData.success) setInterests(interestsData.interests)
      if (Array.isArray(coursesData)) {
        setCourses(coursesData)
      } else if (coursesData.success) {
        setCourses(coursesData.courses)
      } else {
        setCourses([])
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    if (formData.targeting_mode === "interest" && formData.interest_ids.length === 0) {
      alert("Please select at least one interest category.")
      return
    }
    if (
      formData.targeting_mode === "course_semester" &&
      (formData.course_semesters.length === 0 || formData.course_semesters.some((cs) => !cs.course_id || !cs.semester))
    ) {
      alert("Please add at least one complete course-semester combination.")
      return
    }
    if (formData.targeting_mode === "students" && prefilledStudentIds.length === 0) {
      alert("No students selected to target.")
      return
    }

    if (formData.opening_type === "internship") {
      const tenure = Number(formData.tenure_days)
      if (!tenure || tenure <= 0) {
        alert("Please provide a valid Tenure (in days) for Internship.")
        return
      }
    }

    try {
      setIsSubmitting(true)

      const adminAuth = localStorage.getItem("adminAuth")
      const url = editingCompany ? `/api/admin/companies/${editingCompany.id}` : "/api/admin/companies"
      const method = editingCompany ? "PUT" : "POST"

      const payload: any = {
        name: formData.name,
        position: formData.position,
        description: formData.description,
        application_deadline: formData.application_deadline,
        targeting_mode: formData.targeting_mode,
        opening_type: formData.opening_type,
        tenure_days: formData.opening_type === "internship" ? Number(formData.tenure_days) : null,
        custom_link: formData.custom_link || null,
        image_url: formData.image_url || null,
      }

      if (formData.targeting_mode === "interest") {
        payload.interest_ids = formData.interest_ids.map((id) => Number(id))
      } else if (formData.targeting_mode === "course_semester") {
        payload.course_semesters = formData.course_semesters.map((cs) => ({
          course_id: Number(cs.course_id),
          semester: Number(cs.semester),
        }))
      } else if (formData.targeting_mode === "students") {
        payload.student_ids = prefilledStudentIds
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (data.success) {
        fetchData()
        resetForm()
        setPrefilledStudentIds([])
        setIsAddDialogOpen(false)
        setEditingCompany(null)
        alert(
          `${data.openingsCreated || 1} opening(s) created successfully! ${data.studentsNotified || 0} students notified.`,
        )
      } else {
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
    if (!confirm("Are you sure you want to delete this company opening?")) return
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/companies/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminAuth}`,
          "Content-Type": "application/json",
        },
      })
      const data = await response.json()
      if (data.success) {
        if (companies.length === 1 && page > 1) {
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
      name: "",
      position: "",
      description: "",
      interest_ids: [],
      application_deadline: "",
      targeting_mode: "interest",
      course_semesters: [],
      opening_type: "job",
      tenure_days: "",
      custom_link: "",
      image_url: "",
    })
    setPrefilledStudentIds([])
  }

  const handleEdit = (company: Company) => {
    setFormData({
      name: company.name,
      position: company.position,
      description: company.description || "",
      interest_ids: company.interest_id ? [company.interest_id.toString()] : [],
      application_deadline: company.application_deadline.split("T")[0],
      targeting_mode: (company.targeting_mode as "interest" | "course_semester") || "interest",
      course_semesters: company.course_id
        ? [
            {
              course_id: company.course_id.toString(),
              semester: company.semester ? company.semester.toString() : "",
            },
          ]
        : [],
      opening_type: (company.opening_type as "job" | "internship") || "job",
      tenure_days: company.tenure_days ? company.tenure_days.toString() : "",
      custom_link: (company as any).custom_link || "",
      image_url: (company as any).image_url || "",
    })
    setEditingCompany(company)
    setIsAddDialogOpen(true)
  }

  const getDaysRemaining = (deadline: string) => {
    const today = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleViewApplicants = (company: Company) => {
    setSelectedCompanyName(company.name)
    setSelectedCompanyApplicants(company.applications || [])

    if (company.targeting_mode === "course_semester") {
      const targets = (
        company.course_targets && company.course_targets.length > 0
          ? company.course_targets
          : company.course_id && company.semester
            ? [{ course_id: company.course_id, semester: company.semester, course_name: company.course_name ?? null }]
            : []
      ) as { course_id: number; semester: number; course_name: string | null }[]

      setSelectedApplicantsTargets(targets)
      setSelectedApplicantsMode("course_semester")
      setApplicantsActiveTab(null) // let the modal set the first tab, like seminar attendance
    } else {
      setSelectedApplicantsTargets([])
      setSelectedApplicantsMode(company.targeting_mode)
      setApplicantsActiveTab(null) // consistent with seminar pattern
    }

    setIsApplicantsDialogOpen(true)
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

  const handleViewDetails = (company: Company) => {
    setSelectedCompanyDetails(company)
    setIsDetailsDialogOpen(true)
  }

  const getTargetingModeDisplay = (company: Company) => {
    if (company.targeting_mode === "course_semester" && company.course_name && company.semester) {
      return `Course & Semester: ${company.course_name} - Semester ${company.semester}`
    } else if (company.interest_name) {
      return `Interest: ${company.interest_name}`
    } else if (company.targeting_mode === "students" && company.students && company.students.length > 0) {
      return `Targeting ${company.students.length} specific student(s)`
    }
    return "Not specified"
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] text-muted-foreground">Loading...</div>
    )
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
          <h1 className="text-2xl font-bold text-foreground ml-4">Company Management</h1>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                resetForm()
                setEditingCompany(null)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Company Opening
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingCompany ? "Edit Company Opening" : "Add New Company Opening"}</DialogTitle>
              <DialogDescription>
                {editingCompany ? "Update opening information" : "Create a new opening for students to apply"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Google"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g., Software Engineer"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="targeting_mode">Targeting Mode *</Label>
                    <Select
                      value={formData.targeting_mode}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          targeting_mode: value as "interest" | "course_semester" | "students",
                          interest_ids: [],
                          course_semesters: [],
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select targeting mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="interest">By Interests</SelectItem>
                        <SelectItem value="course_semester">By Course & Semester</SelectItem>
                        <SelectItem value="students">Selected Students</SelectItem>
                        {/* </CHANGE> */}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="opening_type">Opening Type *</Label>
                    <Select
                      value={formData.opening_type}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, opening_type: value as "job" | "internship" }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select opening type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="job">Job</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.opening_type === "internship" && (
                    <div className="space-y-2">
                      <Label htmlFor="tenure_days">Tenure (in days) *</Label>
                      <Input
                        id="tenure_days"
                        type="number"
                        min={1}
                        value={formData.tenure_days}
                        onChange={(e) => setFormData({ ...formData, tenure_days: e.target.value })}
                        placeholder="e.g., 90"
                        required={formData.opening_type === "internship"}
                      />
                    </div>
                  )}
                </div>

                {formData.targeting_mode === "students" && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      This opening will target {prefilledStudentIds.length} selected student(s).
                    </p>
                    {/* add button to view selected recipients for students targeting */}
                    <Button
                      variant="link"
                      className="text-sm p-0 h-auto"
                      onClick={(e) => {
                        e.preventDefault()
                        // Fetch student details for prefilledStudentIds
                        const fetchStudentDetails = async () => {
                          try {
                            const adminAuth = localStorage.getItem("adminAuth")
                            const response = await fetch("/api/admin/students/details", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${adminAuth}`,
                              },
                              body: JSON.stringify({ student_ids: prefilledStudentIds }),
                            })
                            const data = await response.json()
                            if (data.success) {
                              setSelectedRecipients(data.students)
                              setSelectedRecipientsCompanyName(formData.name || "Selected Students")
                              setIsRecipientsDialogOpen(true)
                            } else {
                              alert(data.message || "Failed to fetch student details.")
                            }
                          } catch (error) {
                            console.error("Error fetching student details:", error)
                            alert("An error occurred while fetching student details.")
                          }
                        }
                        if (prefilledStudentIds.length > 0) {
                          fetchStudentDetails()
                        }
                      }}
                    >
                      View selected students ({prefilledStudentIds.length})
                    </Button>
                    {/* </CHANGE> */}
                  </div>
                )}
                {/* </CHANGE> */}

                {formData.targeting_mode === "interest" && (
                  <div className="space-y-4">
                    <Label className="text-sm font-semibold">
                      Select Interests * (Each will create a separate opening)
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
                          Will create {formData.interest_ids.length} separate opening(s):
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

                {formData.targeting_mode === "course_semester" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-sm font-semibold">Course & Semester Combinations *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCourseSemester}
                        className="bg-transparent"
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
                            className="text-red-600 hover:text-red-700"
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
                          Will target {formData.course_semesters.filter((cs) => cs.course_id && cs.semester).length}{" "}
                          course-semester(s) in one opening:
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

                <div className="space-y-2">
                  <Label htmlFor="application_deadline">Application Deadline *</Label>
                  <Input
                    id="application_deadline"
                    type="date"
                    value={formData.application_deadline}
                    onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter job description, requirements, and other details..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL (Optional)</Label>
                  <Input
                    id="image_url"
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="e.g., https://example.com/company-logo.jpg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste a direct image URL to display with the job opening. Leave empty for text-only openings.
                  </p>
                  {formData.image_url && (
                    <div className="mt-2 p-2 border rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                      <img
                        src={formData.image_url || "/placeholder.svg"}
                        alt="Job opening preview"
                        className="max-h-32 rounded object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none"
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom_link">Custom Link (Optional)</Label>
                  <Input
                    id="custom_link"
                    type="url"
                    value={formData.custom_link}
                    onChange={(e) => setFormData({ ...formData, custom_link: e.target.value })}
                    placeholder="e.g., https://example.com/apply"
                  />
                  <p className="text-xs text-muted-foreground">
                    Students who apply will see a "Click the Link" button that redirects to this URL
                  </p>
                </div>
                {/* </CHANGE> */}
              </form>
            </div>
            <div className="flex-shrink-0 flex justify-end space-x-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false)
                  setEditingCompany(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={
                  isSubmitting || // Disable button if submitting
                  (formData.targeting_mode === "interest" && formData.interest_ids.length === 0) ||
                  (formData.targeting_mode === "course_semester" &&
                    (formData.course_semesters.length === 0 ||
                      formData.course_semesters.some((cs) => !cs.course_id || !cs.semester))) ||
                  (formData.targeting_mode === "students" && prefilledStudentIds.length === 0) //
                }
                aria-busy={isSubmitting} // accessibility: indicate busy state
              >
                {
                  isSubmitting
                    ? editingCompany
                      ? "Updating..."
                      : "Creating..."
                    : editingCompany
                      ? "Update Opening"
                      : "Create Opening" /* singular */
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Company Openings ({total})</CardTitle>
            <CardDescription>Manage job openings for students to apply based on their interests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company & Type</TableHead> {/* Updated header */}
                    <TableHead>Position</TableHead>
                    <TableHead>Targeting Info</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applicants</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => {
                    const daysRemaining = getDaysRemaining(company.application_deadline)
                    return (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <button
                              onClick={() => handleViewDetails(company)}
                              className="font-bold text-white hover:text-gray-300 cursor-pointer text-left transition-colors"
                            >
                              {company.name}
                            </button>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={company.opening_type === "job" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {company.opening_type === "job" ? "Job" : "Internship"}
                              </Badge>
                              {company.opening_type === "internship" && company.tenure_days && (
                                <span className="text-xs text-muted-foreground">{company.tenure_days} days</span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{company.position}</TableCell>
                        <TableCell>
                          {company.targeting_mode === "course_semester" ? (
                            (() => {
                              const targets = (company as any).course_targets as Company["course_targets"] | undefined
                              const normalizedTargets =
                                targets && targets.length > 0
                                  ? targets
                                  : company.course_id && company.semester
                                    ? [
                                        {
                                          course_id: company.course_id!,
                                          semester: company.semester!,
                                          course_name: company.course_name || null,
                                        },
                                      ]
                                    : []
                              if (normalizedTargets.length > 1) {
                                return (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTargets(normalizedTargets as any)
                                      setSelectedTargetsCompanyName(company.name)
                                      setIsTargetsDialogOpen(true)
                                    }}
                                  >
                                    Multiple Courses ({normalizedTargets.length})
                                  </Button>
                                )
                              }
                              if (normalizedTargets.length === 1) {
                                const t = normalizedTargets[0]
                                return (
                                  <Badge variant="outline">{`${t.course_name ?? "Course"} • Sem ${t.semester}`}</Badge>
                                )
                              }
                              return <Badge variant="secondary">No targets</Badge>
                            })()
                          ) : company.targeting_mode === "students" &&
                            (company as any).students &&
                            (company as any).students.length > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Ensure to fetch details before setting state if needed,
                                // but for now, assume `(company as any).students` is the enriched payload.
                                // If it's just IDs, a fetch call would be needed here similar to the form's prefill logic.
                                // For this update, we'll assume it's the full student array.
                                setSelectedRecipients((company as any).students)
                                setSelectedRecipientsCompanyName(company.name)
                                setIsRecipientsDialogOpen(true)
                              }}
                            >
                              Selected Students
                            </Button>
                          ) : (
                            <Badge variant="outline">{company.interest_name}</Badge>
                          )}
                        </TableCell>
                        <TableCell>{new Date(company.application_deadline).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={daysRemaining > 7 ? "default" : daysRemaining > 0 ? "secondary" : "destructive"}
                          >
                            {daysRemaining > 0 ? `${daysRemaining} days` : "Expired"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={daysRemaining > 0 ? "default" : "secondary"}>
                            {daysRemaining > 0 ? "Active" : "Closed"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {company.applications && company.applications.length > 0 ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewApplicants(company)} // pass full company
                            >
                              <Users className="w-4 h-4 mr-2" />
                              {company.applications.length}
                            </Button>
                          ) : (
                            <Badge variant="secondary">0</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewDetails(company)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(company)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(company.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
              {/* remove inline Pagination from this block and keep only the range summary */}
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {total === 0 ? "0–0" : `${(page - 1) * perPage + 1}–${Math.min(page * perPage, total)}`} of {total}
                </span>
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

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Company Opening Details</DialogTitle>
              <DialogDescription>Complete information about this opening</DialogDescription>
            </DialogHeader>
            {selectedCompanyDetails && (
              <div className="space-y-6">
                {/* Company Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Company Name</Label>
                      <p className="text-lg font-medium">{selectedCompanyDetails.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Position</Label>
                      <p className="text-lg font-medium">{selectedCompanyDetails.position}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Opening Type</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={selectedCompanyDetails.opening_type === "job" ? "default" : "secondary"}>
                          {selectedCompanyDetails.opening_type === "job" ? "Job" : "Internship"}
                        </Badge>
                        {selectedCompanyDetails.opening_type === "internship" && selectedCompanyDetails.tenure_days && (
                          <span className="text-sm text-muted-foreground">
                            ({selectedCompanyDetails.tenure_days} days tenure)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-muted-foreground">Application Deadline</Label>
                      <p className="text-lg font-medium">
                        {new Date(selectedCompanyDetails.application_deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Targeting Information */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-muted-foreground">Targeting Mode</Label>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="font-medium">{getTargetingModeDisplay(selectedCompanyDetails)}</p>
                  </div>
                </div>

                {/* Job Description */}
                {selectedCompanyDetails.description && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-muted-foreground">Job Description</Label>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedCompanyDetails.description}</p>
                    </div>
                  </div>
                )}

                {/* Status Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          getDaysRemaining(selectedCompanyDetails.application_deadline) > 0 ? "default" : "secondary"
                        }
                      >
                        {getDaysRemaining(selectedCompanyDetails.application_deadline) > 0 ? "Active" : "Closed"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Days Remaining</Label>
                    <div className="mt-1">
                      <Badge
                        variant={
                          getDaysRemaining(selectedCompanyDetails.application_deadline) > 7
                            ? "default"
                            : getDaysRemaining(selectedCompanyDetails.application_deadline) > 0
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {getDaysRemaining(selectedCompanyDetails.application_deadline) > 0
                          ? `${getDaysRemaining(selectedCompanyDetails.application_deadline)} days`
                          : "Expired"}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-muted-foreground">Total Applicants</Label>
                    <p className="text-lg font-medium mt-1">{selectedCompanyDetails.applications?.length || 0}</p>
                  </div>
                </div>

                {/* Created Date */}
                <div>
                  <Label className="text-sm font-semibold text-muted-foreground">Created On</Label>
                  <p className="text-sm">{new Date(selectedCompanyDetails.created_at).toLocaleString()}</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Applicants Dialog */}
        <Dialog open={isApplicantsDialogOpen} onOpenChange={setIsApplicantsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Applicants for {selectedCompanyName}</DialogTitle>
              <DialogDescription>List of students who have applied to this opening.</DialogDescription>
            </DialogHeader>

            {selectedApplicantsMode === "course_semester" && selectedApplicantsTargets.length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  const tabs = selectedApplicantsTargets.map((t) => {
                    const key = `${t.course_id}::${t.semester}`
                    const label = `${t.course_name ?? "Course"} — Sem ${t.semester}`
                    // Count applicants for this course-semester
                    const count = (selectedCompanyApplicants || []).filter((a: any) => {
                      const matchesCourse =
                        a.student_course_id === t.course_id || (t.course_name && a.course_name === t.course_name)
                      const matchesSem = a.from_semester === t.semester
                      return matchesCourse && matchesSem
                    }).length
                    return {
                      key,
                      label,
                      course_id: t.course_id,
                      semester: t.semester,
                      course_name: t.course_name,
                      count,
                    }
                  })

                  // Add "All" tab at the beginning
                  const allTabs = [{ key: "all", label: "All", count: selectedCompanyApplicants?.length || 0 }, ...tabs]

                  if (
                    allTabs.length > 0 &&
                    (!applicantsActiveTab || !allTabs.some((tb) => tb.key === applicantsActiveTab))
                  ) {
                    setApplicantsActiveTab(allTabs[0].key)
                  }

                  return allTabs.length > 0 ? (
                    <div className="flex flex-wrap gap-2 border-b pb-2">
                      {allTabs.map((t) => (
                        <button
                          key={t.key}
                          onClick={() => setApplicantsActiveTab(t.key)}
                          className={`px-3 py-1.5 text-sm rounded-md border transition flex items-center gap-2 ${
                            applicantsActiveTab === t.key
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                          }`}
                        >
                          {t.label}
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold ${
                              applicantsActiveTab === t.key ? "bg-white text-indigo-600" : "bg-red-500 text-white"
                            }`}
                          >
                            {t.count}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null
                })()}

                {(() => {
                  const tabs = selectedApplicantsTargets.map((t) => ({
                    key: `${t.course_id}::${t.semester}`,
                    course_id: t.course_id,
                    semester: t.semester,
                    course_name: t.course_name,
                  }))
                  const activeTabObj = tabs.find((tb) => tb.key === applicantsActiveTab) || null

                  const filteredApplicants = (selectedCompanyApplicants || []).filter((a: any) => {
                    // If "All" tab is active, show all applicants
                    if (applicantsActiveTab === "all") return true

                    if (!activeTabObj) return true
                    // Prefer ID match; fall back to course_name if needed
                    const matchesCourse =
                      a.student_course_id === activeTabObj.course_id ||
                      (activeTabObj.course_name && a.course_name === activeTabObj.course_name)
                    const matchesSem = a.from_semester === activeTabObj.semester
                    return matchesCourse && matchesSem
                  })

                  return filteredApplicants.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50/50 dark:bg-gray-800/50">
                          <TableHead className="font-semibold">Student Name</TableHead>
                          <TableHead className="font-semibold">Enrollment No.</TableHead>
                          <TableHead className="font-semibold">Course</TableHead>
                          <TableHead className="font-semibold">Semester</TableHead>
                          <TableHead className="font-semibold">Interest Areas</TableHead>
                          <TableHead className="font-semibold">Resume</TableHead>
                          <TableHead className="font-semibold">Applied At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApplicants.map((applicant: any, index: number) => (
                          <TableRow
                            key={`${applicantsActiveTab ?? "all"}-${index}`}
                            className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <TableCell className="font-medium">{applicant.student_name}</TableCell>
                            <TableCell className="text-gray-600 dark:text-gray-400">
                              {applicant.enrollment_number}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{applicant.course_name}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Sem {applicant.from_semester ?? "-"}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {Array.isArray(applicant.interest_areas) && applicant.interest_areas.length > 0 ? (
                                  applicant.interest_areas.map((ia: any) => (
                                    <Badge
                                      key={`${applicant.enrollment_number}-${ia.id}`}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {ia.name}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge variant="secondary">None</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {applicant.resume_link ? (
                                <a
                                  href={applicant.resume_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline underline-offset-2"
                                >
                                  Open
                                </a>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>{new Date(applicant.applied_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No applicants for the selected tab yet.</p>
                  )
                })()}
              </div>
            ) : (
              // Fallback: original single-table view for interest/students
              <div className="space-y-4">
                {selectedCompanyApplicants.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Enrollment No.</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>From Semester</TableHead>
                        <TableHead>Interest Areas</TableHead>
                        <TableHead>Resume</TableHead>
                        <TableHead>Applied At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCompanyApplicants.map((applicant, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{applicant.student_name}</TableCell>
                          <TableCell>{applicant.enrollment_number}</TableCell>
                          <TableCell>{applicant.course_name}</TableCell>
                          <TableCell>{applicant.from_semester ?? "-"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(applicant.interest_areas) && applicant.interest_areas.length > 0 ? (
                                applicant.interest_areas.map((ia: any) => (
                                  <Badge
                                    key={`${applicant.enrollment_number}-${ia.id}`}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {ia.name}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="secondary">None</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {applicant.resume_link ? (
                              <a
                                href={applicant.resume_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2"
                              >
                                Open
                              </a>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{new Date(applicant.applied_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">No students have applied to this opening yet.</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={isTargetsDialogOpen} onOpenChange={setIsTargetsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Targeted Course–Semesters — {selectedTargetsCompanyName}</DialogTitle>
              <DialogDescription>List of all targeted Course–Semester combinations.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              {selectedTargets.length > 0 ? (
                <ul className="list-disc pl-6">
                  {selectedTargets.map((t, idx) => (
                    <li key={`${t.course_id}-${t.semester}-${idx}`} className="text-sm">
                      {t.course_name ?? "Course"} — Sem {t.semester}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No course-semester targets found.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* New Dialog for Targeted Students */}
        <Dialog open={isRecipientsDialogOpen} onOpenChange={setIsRecipientsDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Targeted Students — {selectedRecipientsCompanyName}</DialogTitle>
              <DialogDescription>Students who are explicitly targeted for this opening.</DialogDescription>
            </DialogHeader>
            {selectedRecipients.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Enrollment Number</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Semester</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecipients.map((r) => (
                      <TableRow key={r.student_id}>
                        <TableCell className="font-medium">{r.student_name}</TableCell>
                        <TableCell>{r.enrollment_number}</TableCell>
                        <TableCell>{r.course_name || "—"}</TableCell>
                        <TableCell>{r.from_semester ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No targeted students found for this opening.</p>
            )}
            <DialogFooter>
              <Button onClick={() => setIsRecipientsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* </CHANGE> */}
      </div>
    </div>
  )
}
