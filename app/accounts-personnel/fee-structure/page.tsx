"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, Edit2 } from "lucide-react"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Course {
  id: number
  name: string
  total_semesters: number
}

interface FeeStructure {
  id: number
  course_id: number
  course_name: string
  semester: number
  semester_fee: number
  exam_fee: number
}

export default function FeeStructurePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([])
  const [selectedCourse, setSelectedCourse] = useState("")
  const [loading, setLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null)
  const [formData, setFormData] = useState({
    courseId: "",
    semester: "",
    semesterFee: "",
    examFee: "",
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchCourses()
    fetchFeeStructures()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/admin/courses")
      if (response.ok) {
        const data = await response.json()
        setCourses(data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch courses:", error)
    }
  }

  const fetchFeeStructures = async () => {
    try {
      const response = await fetch("/api/admin/fees/structure")
      if (response.ok) {
        const data = await response.json()
        setFeeStructures(data)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch fee structures:", error)
    }
  }

  const handleSubmit = async () => {
    if (!formData.courseId || !formData.semester || !formData.semesterFee || !formData.examFee) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/fees/structure", {
        method: editingFee ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingFee?.id,
          courseId: formData.courseId,
          semester: formData.semester,
          semesterFee: formData.semesterFee,
          examFee: formData.examFee,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: editingFee ? "Fee structure updated" : "Fee structure created",
        })
        fetchFeeStructures()
        setIsDialogOpen(false)
        resetForm()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to save fee structure",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      courseId: "",
      semester: "",
      semesterFee: "",
      examFee: "",
    })
    setEditingFee(null)
  }

  const handleEdit = (fee: FeeStructure) => {
    setEditingFee(fee)
    setFormData({
      courseId: fee.course_id.toString(),
      semester: fee.semester.toString(),
      semesterFee: fee.semester_fee.toString(),
      examFee: fee.exam_fee.toString(),
    })
    setIsDialogOpen(true)
  }

  const filteredFees = selectedCourse
    ? feeStructures.filter((fee) => fee.course_id === parseInt(selectedCourse))
    : feeStructures

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/accounts-personnel/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold">Fee Structure</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage semester and exam fees</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Structure
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingFee ? "Edit Fee Structure" : "Add Fee Structure"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Course</Label>
                  <Select value={formData.courseId} onValueChange={(value) => setFormData({ ...formData, courseId: value })}>
                    <SelectTrigger>
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
                  <Label>Semester</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter semester"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Semester Fee (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Enter semester fee"
                    value={formData.semesterFee}
                    onChange={(e) => setFormData({ ...formData, semesterFee: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Exam Fee (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Enter exam fee"
                    value={formData.examFee}
                    onChange={(e) => setFormData({ ...formData, examFee: e.target.value })}
                  />
                </div>

                <Button onClick={handleSubmit} disabled={loading} className="w-full">
                  {loading ? "Saving..." : editingFee ? "Update" : "Create"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Filter by Course</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="All courses" />
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
              {selectedCourse && selectedCourse !== "all" && (
                <Button variant="outline" onClick={() => setSelectedCourse("")}>
                  Clear Filter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fee Structures Table */}
        <Card>
          <CardHeader>
            <CardTitle>Fee Structures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Course</th>
                    <th className="text-center p-3">Semester</th>
                    <th className="text-right p-3">Semester Fee</th>
                    <th className="text-right p-3">Exam Fee</th>
                    <th className="text-right p-3">Total</th>
                    <th className="text-center p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFees.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-500">
                        No fee structures found
                      </td>
                    </tr>
                  ) : (
                    filteredFees.map((fee) => (
                      <tr key={fee.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">{fee.course_name}</td>
                        <td className="text-center p-3">{fee.semester}</td>
                        <td className="text-right p-3">₹{fee.semester_fee.toLocaleString()}</td>
                        <td className="text-right p-3">₹{fee.exam_fee.toLocaleString()}</td>
                        <td className="text-right p-3 font-semibold">
                          ₹{(fee.semester_fee + fee.exam_fee).toLocaleString()}
                        </td>
                        <td className="text-center p-3">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(fee)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
