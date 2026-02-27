"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
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
  DialogFooter
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Plus, Edit2, Trash2, ArrowLeft, GraduationCap, Library, Loader2, Sparkles, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Label } from "@/components/ui/label"

// --- Interfaces ---
interface Course {
  id: number
  name: string
  total_semesters: number
}

interface Subject {
  id: number
  name: string
  code: string
  semester: number
}

// --- Animation Variants ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 10 },
  },
}

export default function SubjectsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    semester: "",
  })

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    fetchCourses()
  }, [router])

  const fetchCourses = async () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch("/api/admin/courses", {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })
      const data = await response.json()

      const coursesList = data.success ? data.courses : Array.isArray(data) ? data : []
      setCourses(coursesList)
      if (coursesList.length > 0) {
        setSelectedCourse(coursesList[0])
        fetchSubjects(coursesList[0].id)
      }
    } catch (error) {
      console.error("Error fetching courses:", error)
      toast({ title: "Error", description: "Failed to fetch courses", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchSubjects = async (courseId: number) => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/subjects?courseId=${courseId}`, {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })
      const data = await response.json()
      setSubjects(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching subjects:", error)
    }
  }

  const handleCourseChange = (courseId: string) => {
    const course = courses.find((c) => c.id === Number.parseInt(courseId))
    if (course) {
      setSelectedCourse(course)
      fetchSubjects(course.id)
    }
  }

  const handleAddSubject = async () => {
    if (!selectedCourse || !formData.name || !formData.code || !formData.semester) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify({
          course_id: selectedCourse.id,
          name: formData.name,
          code: formData.code,
          semester: Number.parseInt(formData.semester),
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Subject added successfully" })
        setFormData({ name: "", code: "", semester: "" })
        setIsAddDialogOpen(false)
        fetchSubjects(selectedCourse.id)
      } else {
        toast({ title: "Error", description: data.error || "Failed to add subject", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add subject", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubject = async () => {
    if (!selectedCourse || !selectedSubject || !formData.name || !formData.code || !formData.semester) {
      toast({ title: "Error", description: "Please fill all fields", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/subjects/${selectedSubject.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify({
          name: formData.name,
          code: formData.code,
          semester: Number.parseInt(formData.semester),
        }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Subject updated successfully" })
        setIsEditDialogOpen(false)
        fetchSubjects(selectedCourse.id)
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update subject", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSubject = async (subjectId: number) => {
    if (!selectedCourse || !confirm("Are you sure you want to delete this subject?")) return

    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/subjects/${subjectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Subject deleted successfully" })
        fetchSubjects(selectedCourse.id)
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete subject", variant: "destructive" })
    }
  }

  const openEditDialog = (subject: Subject) => {
    setSelectedSubject(subject)
    setFormData({
      name: subject.name,
      code: subject.code,
      semester: subject.semester.toString(),
    })
    setIsEditDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/20 blur-[150px]" />
      </div>

      <motion.div 
        className="container relative z-10 mx-auto px-4 sm:px-6 py-8 space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* --- Header Section --- */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-2">
                 <Button 
                    onClick={() => router.push("/admin/dashboard")} 
                    variant="ghost" 
                    size="sm" 
                    className="pl-0 hover:bg-transparent hover:text-indigo-600 dark:hover:text-indigo-400"
                 >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                 </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-gray-200 dark:to-gray-500 bg-clip-text text-transparent flex items-center gap-3">
              <Library className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Subject Management
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Configure curriculum subjects and assign codes
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>Create a new subject for <strong>{selectedCourse?.name}</strong></DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input
                    placeholder="e.g., Data Structures"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label>Subject Code</Label>
                    <Input
                        placeholder="e.g., CS101"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                    </div>
                    <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select
                        value={formData.semester}
                        onValueChange={(value) => setFormData({ ...formData, semester: value })}
                    >
                        <SelectTrigger>
                        <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                        {selectedCourse &&
                            Array.from({ length: selectedCourse.total_semesters }, (_, i) => i + 1).map((sem) => (
                            <SelectItem key={sem} value={sem.toString()}>
                                Semester {sem}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    </div>
                </div>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddSubject} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Subject"}
                  </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* --- Course Filter --- */}
        <motion.div variants={itemVariants}>
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Filter className="w-5 h-5 text-indigo-500" /> Filter by Course</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="max-w-md">
                        <Select value={selectedCourse?.id.toString() || ""} onValueChange={handleCourseChange}>
                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10">
                            <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                        <SelectContent>
                            {courses.map((course) => (
                            <SelectItem key={course.id} value={course.id.toString()}>
                                {course.name} <span className="text-muted-foreground text-xs ml-2">({course.total_semesters} Semesters)</span>
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </motion.div>

        {/* --- Subjects Grid --- */}
        <div className="grid gap-6">
          {subjects.length === 0 ? (
            <motion.div variants={itemVariants}>
                <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                <CardContent className="p-12 text-center">
                    <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium">No Subjects Found</h3>
                    <p className="text-muted-foreground mt-1">There are no subjects assigned to this course yet.</p>
                </CardContent>
                </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subjects.map((subject) => (
                <motion.div variants={itemVariants} key={subject.id}>
                    <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group">
                        <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <CardTitle className="text-xl line-clamp-1" title={subject.name}>{subject.name}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                        {subject.code}
                                    </Badge>
                                </div>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-muted-foreground group-hover:text-indigo-500 transition-colors">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                        </div>
                        </CardHeader>
                        <CardContent>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-muted-foreground bg-slate-100 dark:bg-zinc-900 px-2 py-1 rounded">
                                Semester {subject.semester}
                            </span>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(subject)} className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteSubject(subject.id)} className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        </CardContent>
                    </Card>
                </motion.div>
                ))}
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subject</DialogTitle>
              <DialogDescription>Update subject details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Subject Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Subject Code</Label>
                    <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select
                        value={formData.semester}
                        onValueChange={(value) => setFormData({ ...formData, semester: value })}
                    >
                        <SelectTrigger>
                        <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                        {selectedCourse &&
                            Array.from({ length: selectedCourse.total_semesters }, (_, i) => i + 1).map((sem) => (
                            <SelectItem key={sem} value={sem.toString()}>
                                Semester {sem}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
              </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleEditSubject} disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Subject"}
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}
