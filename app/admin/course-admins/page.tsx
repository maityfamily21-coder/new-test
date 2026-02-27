"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Pencil, Trash2, Plus, Shield, GraduationCap } from "lucide-react"

type Course = {
  id: number
  name: string
}

type CourseAdmin = {
  id: number
  name: string
  email: string
  username: string
  role: "super_admin" | "course_admin" | "personnel"
  assigned_course_ids: number[]
  assigned_courses: { id: number; name: string }[]
  is_active: boolean
  created_at: string
}

export default function CourseAdminsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [courseAdmins, setCourseAdmins] = useState<CourseAdmin[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<CourseAdmin | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    role: "course_admin" as "super_admin" | "course_admin" | "personnel",
    assigned_course_ids: [] as number[],
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("adminToken")
      if (!token) {
        router.push("/admin/login")
        return
      }

      const [adminsRes, coursesRes] = await Promise.all([
        fetch("/api/admin/course-admins", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/courses", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (adminsRes.ok) {
        const data = await adminsRes.json()
        setCourseAdmins(data.courseAdmins || [])
      }

      if (coursesRes.ok) {
        const data = await coursesRes.json()
        setCourses(data.courses || [])
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const token = localStorage.getItem("adminToken")
    if (!token) {
      router.push("/admin/login")
      return
    }

    try {
      const url = editingAdmin ? `/api/admin/course-admins/${editingAdmin.id}` : "/api/admin/course-admins"

      const method = editingAdmin ? "PATCH" : "POST"

      const payload = editingAdmin
        ? {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            assigned_course_ids: formData.assigned_course_ids,
          }
        : formData

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: "Success", description: data.message })
        setDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save course admin", variant: "destructive" })
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this admin?")) return

    const token = localStorage.getItem("adminToken")
    if (!token) return

    try {
      const response = await fetch(`/api/admin/course-admins/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (response.ok) {
        toast({ title: "Success", description: data.message })
        fetchData()
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete admin", variant: "destructive" })
    }
  }

  const openEditDialog = (admin: CourseAdmin) => {
    setEditingAdmin(admin)
    setFormData({
      name: admin.name,
      email: admin.email,
      username: admin.username,
      password: "",
      role: admin.role,
      assigned_course_ids: admin.assigned_course_ids || [],
    })
    setDialogOpen(true)
  }

  const resetForm = () => {
    setEditingAdmin(null)
    setFormData({
      name: "",
      email: "",
      username: "",
      password: "",
      role: "course_admin",
      assigned_course_ids: [],
    })
  }

  const toggleCourse = (courseId: number) => {
    setFormData((prev) => ({
      ...prev,
      assigned_course_ids: prev.assigned_course_ids.includes(courseId)
        ? prev.assigned_course_ids.filter((id) => id !== courseId)
        : [...prev.assigned_course_ids, courseId],
    }))
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="container mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Course Admins Management</h1>
          <p className="text-muted-foreground mt-2">Manage course-specific administrators with limited access</p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Course Admin
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAdmin ? "Edit Course Admin" : "Create New Course Admin"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {!editingAdmin && (
                <>
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
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course_admin">Course Admin</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="personnel">Personnel</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {formData.role === "course_admin" && "Full admin access limited to selected courses"}
                  {formData.role === "super_admin" && "Full access to all courses and system settings"}
                  {formData.role === "personnel" && "Limited permissions (attendance marking only)"}
                </p>
              </div>

              {formData.role === "course_admin" && (
                <div className="space-y-2">
                  <Label>Assigned Courses</Label>
                  <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={formData.assigned_course_ids.includes(course.id)}
                          onCheckedChange={() => toggleCourse(course.id)}
                        />
                        <label htmlFor={`course-${course.id}`} className="text-sm cursor-pointer">
                          {course.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Select at least one course</p>
                </div>
              )}

              <Button type="submit" className="w-full">
                {editingAdmin ? "Update Admin" : "Create Admin"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {courseAdmins.map((admin) => (
          <Card key={admin.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {admin.role === "super_admin" ? (
                      <Shield className="w-5 h-5 text-purple-500" />
                    ) : (
                      <GraduationCap className="w-5 h-5 text-blue-500" />
                    )}
                    {admin.name}
                    {!admin.is_active && <Badge variant="destructive">Inactive</Badge>}
                  </CardTitle>
                  <CardDescription>
                    @{admin.username} • {admin.email}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(admin)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(admin.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Role: </span>
                  <Badge variant={admin.role === "super_admin" ? "default" : "secondary"}>
                    {admin.role === "super_admin" && "Super Admin"}
                    {admin.role === "course_admin" && "Course Admin"}
                    {admin.role === "personnel" && "Personnel"}
                  </Badge>
                </div>
                {admin.role === "course_admin" && (
                  <div>
                    <span className="text-sm font-medium">Assigned Courses: </span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {admin.assigned_courses?.length > 0 ? (
                        admin.assigned_courses.map((course) => (
                          <Badge key={course.id} variant="outline">
                            {course.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No courses assigned</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {courseAdmins.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No course admins found. Create one to get started.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
