"use client"
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
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, Edit2, Trash2, BookOpen, Check, BarChart3, X, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface Tutor {
  id: number
  name: string
  username: string
  department: string
  faculty_type: string
  subject_count: number
}

interface Subject {
  id: number
  name: string
  code: string
  course_name: string
  semester: number
}

interface AssignedSubject extends Subject {
  tutor_name?: string
  tutor_id?: number
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

export default function TutorsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)

  // Subject Assignment State
  const [assignedToCurrentTutor, setAssignedToCurrentTutor] = useState<AssignedSubject[]>([])
  const [assignedToOtherTutors, setAssignedToOtherTutors] = useState<AssignedSubject[]>([])
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [unassignedSubjects, setUnassignedSubjects] = useState<Subject[]>([])
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([])
  const [isDeassigning, setIsDeassigning] = useState(false)
  const [filterCourse, setFilterCourse] = useState<string>("")
  const [filterSemester, setFilterSemester] = useState<string>("")

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    department: "",
    faculty_type: "Inhouse",
    password: "",
  })

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    fetchTutors()
  }, [router])

  // Fetch Logic
  const fetchTutors = async () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch("/api/admin/tutors", {
        headers: { Authorization: `Bearer ${adminAuth}` },
      })
      const data = await response.json()
      if (data.success) {
        setTutors(data.tutors)
      }
    } catch (error) {
      console.error("Error fetching tutors:", error)
      toast({ title: "Error", description: "Failed to fetch tutors", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableSubjects = async () => {
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch("/api/admin/subjects", {
        headers: { Authorization: `Bearer ${adminAuth}` },
      })
      const data = await response.json()
      const subjectsData = Array.isArray(data) ? data : data.subjects || []
      setAvailableSubjects(subjectsData)
    } catch (error) {
      console.error("Error fetching subjects:", error)
    }
  }

  const fetchTutorSubjects = async (tutorId: number) => {
    try {
      const response = await fetch(`/api/admin/tutors/${tutorId}/subjects`)
      const data = await response.json()
      if (data.success) {
        setAssignedToCurrentTutor(data.assignedToCurrentTutor || [])
        setAssignedToOtherTutors(data.assignedToOtherTutors || [])
        setSelectedSubjectIds((data.assignedToCurrentTutor || []).map((s: Subject) => s.id))
      }
    } catch (error) {
      console.error("Error fetching tutor subjects:", error)
    }
  }

  const filterUnassignedSubjects = () => {
    const currentTutorAssignedIds = new Set(assignedToCurrentTutor.map((s) => s.id))
    const unassigned = availableSubjects.filter((subject) => !currentTutorAssignedIds.has(subject.id))
    const filtered = unassigned.filter((subject) => {
      const courseMatch = filterCourse === "" || subject.course_name === filterCourse
      const semesterMatch = filterSemester === "" || subject.semester.toString() === filterSemester
      return courseMatch && semesterMatch
    })
    setUnassignedSubjects(filtered)
  }

  useEffect(() => {
    if (availableSubjects.length > 0) {
      filterUnassignedSubjects()
    }
  }, [availableSubjects, assignedToCurrentTutor, assignedToOtherTutors, filterCourse, filterSemester])

  // Handlers
  const handleAddTutor = async () => {
    if (!formData.name || !formData.username || !formData.department || !formData.password) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" })
      return
    }
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch("/api/admin/tutors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Tutor added successfully" })
        setFormData({ name: "", username: "", department: "", faculty_type: "Inhouse", password: "" })
        setIsAddDialogOpen(false)
        fetchTutors()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add tutor", variant: "destructive" })
    }
  }

  const handleEditTutor = async () => {
    if (!selectedTutor) return
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/tutors/${selectedTutor.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Tutor updated successfully" })
        setIsEditDialogOpen(false)
        fetchTutors()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update tutor", variant: "destructive" })
    }
  }

  const handleDeleteTutor = async (tutorId: number) => {
    if (!confirm("Are you sure you want to delete this tutor?")) return
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/tutors/${tutorId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminAuth}` },
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Tutor deleted successfully" })
        fetchTutors()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete tutor", variant: "destructive" })
    }
  }

  const handleAssignSubjects = async () => {
    if (!selectedTutor) return
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/tutors/${selectedTutor.id}/subjects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify({ subjectIds: selectedSubjectIds }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Subjects assigned successfully" })
        setIsSubjectDialogOpen(false)
        fetchTutors()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to assign subjects", variant: "destructive" })
    }
  }

  const handleDeassignSubject = async (subjectId: number, subjectName: string) => {
    if (!selectedTutor || !confirm(`Remove "${subjectName}" from this tutor?`)) return
    setIsDeassigning(true)
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/tutors/${selectedTutor.id}/subjects`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify({ subjectId }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Subject removed" })
        fetchTutorSubjects(selectedTutor.id)
        fetchAvailableSubjects()
        fetchTutors()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove subject", variant: "destructive" })
    } finally {
      setIsDeassigning(false)
    }
  }

  const openEditDialog = (tutor: Tutor) => {
    setSelectedTutor(tutor)
    setFormData({
      name: tutor.name,
      username: tutor.username,
      department: tutor.department,
      faculty_type: tutor.faculty_type || "Inhouse",
      password: "",
    })
    setIsEditDialogOpen(true)
  }

  const openSubjectDialog = (tutor: Tutor) => {
    setSelectedTutor(tutor)
    setFilterCourse("")
    setFilterSemester("")
    fetchAvailableSubjects()
    fetchTutorSubjects(tutor.id)
    setIsSubjectDialogOpen(true)
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
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6"
        >
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
              <Users className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Tutor Management
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Manage faculty members and assign course subjects
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Add Tutor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Tutor</DialogTitle>
                <DialogDescription>Create a new faculty account</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Dr. John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="johndoe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Faculty Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.faculty_type}
                    onChange={(e) => setFormData({ ...formData, faculty_type: e.target.value })}
                  >
                    <option value="Inhouse">Inhouse</option>
                    <option value="Visiting">Visiting</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTutor} className="bg-indigo-600 hover:bg-indigo-700">
                  Create Tutor
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* --- Tutors Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutors.map((tutor) => (
            <motion.div variants={itemVariants} key={tutor.id}>
              <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group h-full flex flex-col">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{tutor.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] px-1.5 py-0"
                        >
                          {tutor.faculty_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{tutor.department}</span>
                      </CardDescription>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      {tutor.name.charAt(0)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 flex-1 flex flex-col">
                  <div className="flex-1 space-y-2 mb-4">
                    <div className="text-sm text-muted-foreground flex justify-between">
                      <span>Username:</span>
                      <span className="font-mono text-xs bg-slate-100 dark:bg-white/5 px-1 rounded">
                        {tutor.username}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex justify-between">
                      <span>Subjects:</span>
                      <Badge variant="secondary">{tutor.subject_count}</Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 border-t border-slate-100 dark:border-white/5 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openSubjectDialog(tutor)}
                      className="flex-1 h-8 text-xs gap-1 border-indigo-200 hover:bg-indigo-50 dark:border-indigo-800 dark:hover:bg-indigo-900/20"
                    >
                      <BookOpen className="w-3 h-3" /> Assign
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(tutor)} className="h-8 w-8">
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => router.push(`/admin/tutors/${tutor.id}/tracking`)}
                      className="h-8 w-8"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTutor(tutor.id)} className="h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* --- Edit Dialog --- */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          {/* Content same as Add Dialog but with Update button */}
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Tutor</DialogTitle>
              <DialogDescription>Update tutor information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Faculty Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.faculty_type}
                  onChange={(e) => setFormData({ ...formData, faculty_type: e.target.value })}
                >
                  <option value="Inhouse">Inhouse</option>
                  <option value="Visiting">Visiting</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Leave blank to keep current"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditTutor} className="bg-indigo-600 hover:bg-indigo-700">
                Update
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* --- Subject Assignment Dialog --- */}
        <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
          <DialogContent className="max-w-6xl max-h-[85vh] h-[800px] flex flex-col p-0 overflow-hidden bg-white dark:bg-zinc-950">
            <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5">
              <DialogTitle>Assign Subjects to {selectedTutor?.name}</DialogTitle>
              <DialogDescription>Manage subject allocations for this faculty member.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-0 min-h-0">
              {/* Column 1: Available Subjects */}
              <div className="p-4 border-r border-slate-100 dark:border-white/5 overflow-y-auto bg-slate-50/50 dark:bg-white/5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <Plus className="w-4 h-4" /> Available Subjects
                </div>

                <div className="mb-4 space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Filter by Course</Label>
                    <select
                      value={filterCourse}
                      onChange={(e) => setFilterCourse(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">All Courses</option>
                      {[...new Set(availableSubjects.map((s) => s.course_name))].map((course) => (
                        <option key={course} value={course}>
                          {course}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground">Filter by Semester</Label>
                    <select
                      value={filterSemester}
                      onChange={(e) => setFilterSemester(e.target.value)}
                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">All Semesters</option>
                      {[...new Set(availableSubjects.map((s) => s.semester))].sort().map((sem) => (
                        <option key={sem} value={sem.toString()}>
                          Semester {sem}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  {unassignedSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No subjects available</p>
                  ) : (
                    unassignedSubjects.map((subject) => {
                      const otherTutor = assignedToOtherTutors.find((s) => s.id === subject.id)
                      return (
                        <div
                          key={subject.id}
                          onClick={() => {
                            if (!selectedSubjectIds.includes(subject.id))
                              setSelectedSubjectIds([...selectedSubjectIds, subject.id])
                          }}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                            selectedSubjectIds.includes(subject.id)
                              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                              : "border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900",
                            otherTutor && "border-amber-200 bg-amber-50 dark:bg-amber-900/10",
                          )}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex gap-2">
                              <input
                                type="checkbox"
                                checked={selectedSubjectIds.includes(subject.id)}
                                readOnly
                                className="mt-1"
                              />
                              <div>
                                <p className="font-medium text-sm">{subject.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {subject.course_name} • Sem {subject.semester}
                                </p>
                                {otherTutor && (
                                  <Badge
                                    variant="outline"
                                    className="mt-1 text-[10px] text-amber-600 border-amber-200 bg-amber-50"
                                  >
                                    Co-teaching: {otherTutor.tutor_name}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Column 2: Assigned to Current Tutor */}
              <div className="p-4 border-r border-slate-100 dark:border-white/5 overflow-y-auto">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <Check className="w-4 h-4" /> Assigned to {selectedTutor?.name}
                </div>
                <div className="space-y-2">
                  {assignedToCurrentTutor.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No subjects currently assigned</p>
                  ) : (
                    assignedToCurrentTutor.map((subject) => (
                      <div
                        key={subject.id}
                        className="p-3 rounded-lg border border-indigo-200 bg-indigo-50 dark:bg-indigo-950/20 dark:border-indigo-800 flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium text-sm text-indigo-900 dark:text-indigo-100">{subject.name}</p>
                          <p className="text-xs text-indigo-700 dark:text-indigo-300">{subject.code}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeassignSubject(subject.id, subject.name)}
                          disabled={isDeassigning}
                          className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Assigned to Others */}
              <div className="p-4 overflow-y-auto bg-slate-50/50 dark:bg-white/5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <Users className="w-4 h-4" /> Assigned to Others
                </div>
                <div className="space-y-2">
                  {assignedToOtherTutors.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No subjects assigned to other faculty</p>
                  ) : (
                    assignedToOtherTutors.map((subject) => (
                      <div
                        key={subject.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 opacity-80"
                      >
                        <p className="font-medium text-sm text-muted-foreground">{subject.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned to: <span className="font-semibold text-foreground">{subject.tutor_name}</span>
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-slate-100 dark:border-white/5">
              <Button variant="outline" onClick={() => setIsSubjectDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignSubjects}
                disabled={availableSubjects.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Save Assignments
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}
