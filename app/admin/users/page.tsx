"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Edit, Trash2, Shield, UserCog, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface Course {
  id: number
  name: string
}

interface User {
  id: number
  username: string
  role: "super_admin" | "course_admin"
  created_at: string
  assigned_courses: { course_id: number; course_name: string }[]
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

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "course_admin",
    assignedCourses: [] as number[],
  })
  const router = useRouter()

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    const adminData = JSON.parse(localStorage.getItem("adminData") || "{}")

    if (!adminAuth) {
      router.push("/admin/login")
      return
    }

    if (adminData.role !== "super_admin") {
      router.push("/admin/dashboard")
      return
    }

    fetchData(adminAuth)
  }, [router])

  const fetchData = async (token: string) => {
    try {
      const [usersRes, coursesRes] = await Promise.all([
        fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/courses", { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const usersData = await usersRes.json()
      const coursesData = await coursesRes.json()

      if (usersData.success) setUsers(usersData.users)
      if (coursesData.success) setCourses(coursesData.courses)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem("adminAuth")
    if (!token) return

    setSubmitting(true)
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users"
      const method = editingUser ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        setIsDialogOpen(false)
        resetForm()
        fetchData(token)
      } else {
        alert(data.message || "Failed to save user")
      }
    } catch (error) {
      console.error("Failed to save user:", error)
      alert("Failed to save user")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return

    const token = localStorage.getItem("adminAuth")
    if (!token) return

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (data.success) {
        fetchData(token)
      } else {
        alert(data.message || "Failed to delete user")
      }
    } catch (error) {
      console.error("Failed to delete user:", error)
      alert("Failed to delete user")
    }
  }

  const openCreateDialog = () => {
    resetForm()
    setEditingUser(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      assignedCourses: user.assigned_courses.map((c) => c.course_id),
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      role: "course_admin",
      assignedCourses: [],
    })
  }

  const toggleCourse = (courseId: number) => {
    setFormData((prev) => ({
      ...prev,
      assignedCourses: prev.assignedCourses.includes(courseId)
        ? prev.assignedCourses.filter((id) => id !== courseId)
        : [...prev.assignedCourses, courseId],
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
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
              <UserCog className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              User Management
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Create and manage admin users and course admins
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Plus className="w-4 h-4" /> Add User
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? "Edit User" : "Create New User"}</DialogTitle>
                        <DialogDescription>
                            {editingUser ? "Update user details and permissions" : "Create a new administrator account"}
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Password {editingUser && "(Leave blank to keep current)"}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required={!editingUser}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={formData.role} onValueChange={(value: "super_admin" | "course_admin") => setFormData({ ...formData, role: value })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="super_admin">Super Admin (Full Access)</SelectItem>
                                    <SelectItem value="course_admin">Course Admin (Limited Access)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {formData.role === "course_admin" && (
                            <div className="space-y-2">
                                <Label>Assigned Courses</Label>
                                <div className="border rounded-lg p-4 space-y-3 max-h-48 overflow-y-auto bg-slate-50 dark:bg-white/5">
                                    {courses.map((course) => (
                                        <div key={course.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`course-${course.id}`}
                                                checked={formData.assignedCourses.includes(course.id)}
                                                onCheckedChange={() => toggleCourse(course.id)}
                                            />
                                            <label htmlFor={`course-${course.id}`} className="text-sm font-medium leading-none cursor-pointer">
                                                {course.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                {formData.assignedCourses.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">At least one course is required for Course Admins.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={formData.role === "course_admin" && formData.assignedCourses.length === 0 || submitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : (editingUser ? "Update" : "Create")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* --- User List Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => (
                <motion.div variants={itemVariants} key={user.id}>
                    <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group h-full flex flex-col">
                        <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                                        {user.role === "super_admin" ? <Shield className="w-5 h-5" /> : <UserCog className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{user.username}</CardTitle>
                                        <CardDescription className="text-xs mt-1">Created {new Date(user.created_at).toLocaleDateString()}</CardDescription>
                                    </div>
                                </div>
                                <Badge variant={user.role === "super_admin" ? "default" : "secondary"} className={cn("capitalize", user.role === 'super_admin' ? "bg-indigo-600" : "")}>
                                    {user.role.replace("_", " ")}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 flex-1 flex flex-col">
                            {user.role === "course_admin" && (
                                <div className="flex-1 space-y-2 mb-4">
                                    <p className="text-sm font-medium text-muted-foreground">Assigned Courses:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {user.assigned_courses.length > 0 ? (
                                            user.assigned_courses.map((c) => (
                                                <Badge key={c.course_id} variant="outline" className="bg-slate-50 dark:bg-white/5 text-xs font-normal">
                                                    {c.course_name}
                                                </Badge>
                                            ))
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic">None assigned</span>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="flex gap-2 justify-end mt-auto pt-2 border-t border-slate-100 dark:border-white/5">
                                <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)} className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                    <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(user.id)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
      </motion.div>
    </div>
  )
}
