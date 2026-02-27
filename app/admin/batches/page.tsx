"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit2, Trash2, Users, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Course {
  id: number
  name: string
  total_semesters: number
}

interface Batch {
  id: number
  batch_name: string
  description?: string
  batch_number: number
  course_id: number
  semester: number
  total_students: number
  assigned_students: number
  created_at: string
}

export default function BatchesPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [courses, setCourses] = useState<Course[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [selectedSemester, setSelectedSemester] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [adminAuth, setAdminAuth] = useState<string>("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const [formData, setFormData] = useState({
    batchName: "",
    description: "",
    batchNumber: "",
  })

  useEffect(() => {
    const token = localStorage.getItem("adminAuth")
    if (!token) {
      router.push("/admin/login")
      return
    }
    setAdminAuth(token)
    setIsAuthenticated(true)
  }, [router])

  useEffect(() => {
    if (isAuthenticated && adminAuth) {
      fetchCourses()
    }
  }, [isAuthenticated, adminAuth])

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/admin/courses", {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        localStorage.removeItem("adminData")
        router.push("/admin/login")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to fetch courses")
      }

      const data = await response.json()
      const courseList = Array.isArray(data) ? data : data.courses || []
      setCourses(courseList)
    } catch (error) {
      console.error("Error fetching courses:", error)
      setCourses([])
      toast({
        title: "Error",
        description: "Failed to load courses",
        variant: "destructive",
      })
    }
  }

  const fetchBatches = async (courseId: string, semester: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/batches?courseId=${courseId}&semester=${semester}`, {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        localStorage.removeItem("adminData")
        router.push("/admin/login")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to fetch batches")
      }

      const data = await response.json()
      if (data.success) {
        setBatches(data.batches || [])
      }
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({ title: "Error", description: "Failed to fetch batches", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId)
    setSelectedSemester("")
    setBatches([])
  }

  const handleSemesterChange = (semester: string) => {
    setSelectedSemester(semester)
    if (selectedCourse) {
      fetchBatches(selectedCourse, semester)
    }
  }

  const handleCreateBatch = async () => {
    if (!formData.batchName || !formData.batchNumber || !selectedCourse || !selectedSemester) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }

    try {
      const response = await fetch("/api/admin/batches", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminAuth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId: Number(selectedCourse),
          semester: Number(selectedSemester),
          batchName: formData.batchName,
          description: formData.description,
          batchNumber: Number(formData.batchNumber),
        }),
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        localStorage.removeItem("adminData")
        router.push("/admin/login")
        return
      }

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Batch created successfully" })
        setFormData({ batchName: "", description: "", batchNumber: "" })
        setIsDialogOpen(false)
        fetchBatches(selectedCourse, selectedSemester)
      } else {
        toast({ title: "Error", description: data.error || "Failed to create batch", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error creating batch:", error)
      toast({ title: "Error", description: "Failed to create batch", variant: "destructive" })
    }
  }

  const handleDeleteBatch = async (batchId: number) => {
    if (!confirm("Are you sure you want to delete this batch?")) return

    try {
      const response = await fetch(`/api/admin/batches/${batchId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        localStorage.removeItem("adminData")
        router.push("/admin/login")
        return
      }

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Batch deleted successfully" })
        fetchBatches(selectedCourse, selectedSemester)
      }
    } catch (error) {
      console.error("Error deleting batch:", error)
      toast({ title: "Error", description: "Failed to delete batch", variant: "destructive" })
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/30 border-t-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    )
  }

  const selectedCourseObj = courses.find((c) => c.id.toString() === selectedCourse)
  const semesterOptions = selectedCourseObj
    ? Array.from({ length: selectedCourseObj.total_semesters }, (_, i) => i + 1)
    : []

  const filteredBatches = batches.filter((batch) => batch.batch_name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/admin/dashboard">
              <Button variant="outline" size="icon" className="rounded-lg bg-transparent">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Batch Management</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Create and manage student batches for course-semesters
              </p>
            </div>
          </div>
        </div>

        {/* Course & Semester Selection */}
        <Card className="rounded-lg border border-blue-100 dark:border-blue-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Select Course & Semester</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Course</label>
                <Select value={selectedCourse} onValueChange={handleCourseChange}>
                  <SelectTrigger className="rounded-lg mt-1">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Semester</label>
                <Select value={selectedSemester} onValueChange={handleSemesterChange} disabled={!selectedCourse}>
                  <SelectTrigger className="rounded-lg mt-1">
                    <SelectValue placeholder="Select a semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesterOptions.map((sem) => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Batches List */}
        {selectedCourse && selectedSemester && (
          <Card className="rounded-lg border border-blue-100 dark:border-blue-900/30">
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 gap-4">
              <div>
                <CardTitle>Batches</CardTitle>
                <CardDescription>{filteredBatches.length} batch(es) found</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2 rounded-lg">
                    <Plus className="w-4 h-4" />
                    Create Batch
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-lg">
                  <DialogHeader>
                    <DialogTitle>Create New Batch</DialogTitle>
                    <DialogDescription>
                      Create a new batch for {selectedCourseObj?.name} - Semester {selectedSemester}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Batch Number</label>
                      <Input
                        type="number"
                        placeholder="1"
                        value={formData.batchNumber}
                        onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                        className="rounded-lg mt-1"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Batch Name</label>
                      <Input
                        placeholder="e.g., Batch A, Morning Batch"
                        value={formData.batchName}
                        onChange={(e) => setFormData({ ...formData, batchName: e.target.value })}
                        className="rounded-lg mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Description (Optional)</label>
                      <Input
                        placeholder="Additional details about this batch"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="rounded-lg mt-1"
                      />
                    </div>
                    <Button onClick={handleCreateBatch} className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg">
                      Create Batch
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary/30 border-t-primary mx-auto mb-3"></div>
                  <p className="text-muted-foreground">Loading batches...</p>
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No batches found. Create one to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBatches.map((batch) => (
                        <TableRow key={batch.id}>
                          <TableCell className="font-medium">{batch.batch_number}</TableCell>
                          <TableCell>{batch.batch_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{batch.description || "—"}</TableCell>
                          <TableCell>
                            <Link href={`/admin/batches/${batch.id}/students`}>
                              <Button variant="outline" size="sm" className="gap-1 text-xs rounded-lg bg-transparent">
                                <Users className="w-3 h-3" />
                                {batch.assigned_students}
                              </Button>
                            </Link>
                          </TableCell>
                          <TableCell className="space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1 text-xs rounded-lg bg-transparent"
                              disabled
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteBatch(batch.id)}
                              className="gap-1 text-xs rounded-lg"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
