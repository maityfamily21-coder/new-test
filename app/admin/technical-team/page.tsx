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
import { Plus, Edit, Trash2, Monitor, ArrowLeft, Loader2, Mail, Calendar } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface TechnicalUser {
  id: number
  username: string
  name: string
  email?: string
  created_at: string
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

export default function TechnicalTeamManagement() {
  const [users, setUsers] = useState<TechnicalUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TechnicalUser | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
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

    fetchUsers(adminAuth)
  }, [router])

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch("/api/admin/technical-team", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) setUsers(data.users)
    } catch (error) {
      console.error("Failed to fetch users:", error)
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
      const url = editingUser ? `/api/admin/technical-team/${editingUser.id}` : "/api/admin/technical-team"
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
        fetchUsers(token)
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
    if (!confirm("Are you sure you want to delete this technical team member?")) return

    const token = localStorage.getItem("adminAuth")
    if (!token) return

    try {
      const response = await fetch(`/api/admin/technical-team/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (data.success) {
        fetchUsers(token)
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

  const openEditDialog = (user: TechnicalUser) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      password: "",
      name: user.name,
      email: user.email || "",
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setFormData({
      username: "",
      password: "",
      name: "",
      email: "",
    })
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
              <Monitor className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Technical Team
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Manage accounts for PC setup and infrastructure support
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Plus className="w-4 h-4" /> Add Team Member
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingUser ? "Edit Profile" : "New Account"}</DialogTitle>
                    <DialogDescription>
                        {editingUser ? "Modify existing team member details" : "Create a new technical team user account"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Alex Tech"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="alex@example.com"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Username</Label>
                        <Input
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="alextech"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Password {editingUser && "(Leave blank to keep current)"}</Label>
                        <Input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="••••••••"
                            required={!editingUser}
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingUser ? "Update" : "Create")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* --- Team List --- */}
        <div className="space-y-6">
            {users.length === 0 ? (
                <motion.div variants={itemVariants}>
                    <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                        <CardContent className="p-12 text-center">
                            <Monitor className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <p className="text-muted-foreground">No technical team members found.</p>
                            <Button variant="link" onClick={openCreateDialog} className="mt-2 text-indigo-600">
                                Add your first team member
                            </Button>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user) => (
                        <motion.div variants={itemVariants} key={user.id}>
                            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all group">
                                <CardHeader className="pb-4">
                                    <div className="flex justify-between items-start">
                                        <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                                            {user.name.charAt(0)}
                                        </div>
                                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                            Technical
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-4">{user.name}</CardTitle>
                                    <CardDescription>@{user.username}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2 text-sm text-muted-foreground">
                                        {user.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="w-4 h-4" /> {user.email}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Joined {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="flex-1 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-300 border-slate-200 dark:border-white/10"
                                            onClick={() => openEditDialog(user)}
                                        >
                                            <Edit className="w-4 h-4 mr-2" /> Edit
                                        </Button>
                                        <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            className="flex-1"
                                            onClick={() => handleDelete(user.id)}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
      </motion.div>
    </div>
  )
}
