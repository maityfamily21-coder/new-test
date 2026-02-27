"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Plus, Pencil, Trash2 } from "lucide-react"

interface Course {
  id: number
  name: string
  total_semesters: number
}

interface FeeStructure {
  id: number
  course_id: number
  semester: number
  semester_fee: string
  exam_fee: string
  course_name: string
  total_semesters: number
}

export default function FeeStructurePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>("")
  const [semester, setSemester] = useState<string>("")
  const [semesterFee, setSemesterFee] = useState<string>("")
  const [examFee, setExamFee] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchCourses()
    fetchFeeStructures()
  }, [])

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      
      if (!token) {
        console.error("[v0] Admin token not found")
        return
      }

      const response = await fetch("/api/admin/fees/courses", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        console.error("[v0] Failed to fetch courses:", response.status)
        return
      }

      const data = await response.json()
      if (data.success && data.courses) {
        setCourses(data.courses)
      }
    } catch (error) {
      console.error("[v0] Error fetching courses:", error)
    }
  }

  const fetchFeeStructures = async (courseId?: string) => {
    try {
      const token = localStorage.getItem("adminToken")
      const url = courseId
        ? `/api/admin/fees/structure?courseId=${courseId}`
        : "/api/admin/fees/structure"
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        setFeeStructures(data.feeStructures)
      }
    } catch (error) {
      console.error("Error fetching fee structures:", error)
    }
  }

  const handleSave = async () => {
    if (!selectedCourse || !semester || !semesterFee || !examFee) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch("/api/admin/fees/structure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: parseInt(selectedCourse),
          semester: parseInt(semester),
          semesterFee: parseFloat(semesterFee),
          examFee: parseFloat(examFee),
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: isEditing
            ? "Fee structure updated successfully"
            : "Fee structure created successfully",
        })
        resetForm()
        fetchFeeStructures()
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save fee structure",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (fs: FeeStructure) => {
    setSelectedCourse(fs.course_id.toString())
    setSemester(fs.semester.toString())
    setSemesterFee(fs.semester_fee)
    setExamFee(fs.exam_fee)
    setIsEditing(true)
    setEditingId(fs.id)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this fee structure?")) {
      return
    }

    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch(`/api/admin/fees/structure?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: "Fee structure deleted successfully",
        })
        fetchFeeStructures()
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete fee structure",
        variant: "destructive",
      })
    }
  }

  const resetForm = () => {
    setSelectedCourse("")
    setSemester("")
    setSemesterFee("")
    setExamFee("")
    setIsEditing(false)
    setEditingId(null)
  }

  const selectedCourseData = courses.find((c) => c.id.toString() === selectedCourse)

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Structure Management</h1>
          <p className="text-muted-foreground">Define semester and examination fees for each course</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <DollarSign className="w-5 h-5 mr-2" />
          Total Structures: {feeStructures.length}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Fee Structure" : "Add Fee Structure"}</CardTitle>
          <CardDescription>
            Set the semester and examination fees for each course and semester
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course">Course *</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger id="course">
                  <SelectValue placeholder="Select course" />
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

            <div className="space-y-2">
              <Label htmlFor="semester">Semester *</Label>
              <Select value={semester} onValueChange={setSemester} disabled={!selectedCourse}>
                <SelectTrigger id="semester">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCourseData &&
                    Array.from({ length: selectedCourseData.total_semesters }, (_, i) => i + 1).map(
                      (sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      )
                    )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="semesterFee">Semester Fee *</Label>
              <Input
                id="semesterFee"
                type="number"
                placeholder="0.00"
                value={semesterFee}
                onChange={(e) => setSemesterFee(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="examFee">Exam Fee *</Label>
              <Input
                id="examFee"
                type="number"
                placeholder="0.00"
                value={examFee}
                onChange={(e) => setExamFee(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <Button onClick={handleSave} disabled={loading}>
              {isEditing ? (
                <>
                  <Pencil className="w-4 h-4 mr-2" />
                  Update Fee Structure
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Fee Structure
                </>
              )}
            </Button>
            {isEditing && (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fee Structures</CardTitle>
          <CardDescription>View and manage all fee structures</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select
              value={selectedCourse}
              onValueChange={(value) => {
                setSelectedCourse(value)
                fetchFeeStructures(value)
              }}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Filter by course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id.toString()}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-right">Semester Fee</TableHead>
                  <TableHead className="text-right">Exam Fee</TableHead>
                  <TableHead className="text-right">Total Fee</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStructures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No fee structures found. Add one above to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  feeStructures.map((fs) => (
                    <TableRow key={fs.id}>
                      <TableCell className="font-medium">{fs.course_name}</TableCell>
                      <TableCell>Semester {fs.semester}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(fs.semester_fee).toFixed(2)}</TableCell>
                      <TableCell className="text-right">₹{parseFloat(fs.exam_fee).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{(parseFloat(fs.semester_fee) + parseFloat(fs.exam_fee)).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(fs)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(fs.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
