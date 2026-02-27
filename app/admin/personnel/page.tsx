"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
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
import { Users, Plus, Trash2, RotateCcw, ArrowLeft, Loader2, UserCog, Mail } from "lucide-react"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface Personnel {
  id: number
  name: string
  email: string
  username: string
  is_active: boolean
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

export default function AdminPersonnelPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [adminAuth, setAdminAuth] = useState<string>("")
  const [personnel, setPersonnel] = useState<Personnel[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
  })
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false)
  const [resetPasswordId, setResetPasswordId] = useState<number | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const authToken = localStorage.getItem("adminAuth")
      if (!authToken) {
        router.push("/admin/login")
        return
      }
      setAdminAuth(authToken)
      setIsAuthenticated(true)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (isAuthenticated && adminAuth) {
      loadPersonnel()
    }
  }, [isAuthenticated, adminAuth])

  const loadPersonnel = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/personnel", {
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        router.push("/admin/login")
        return
      }

      if (response.ok) {
        const data = await response.json()
        setPersonnel(data)
      }
    } catch (error) {
      console.error("Error loading personnel:", error)
      toast({ title: "Error", description: "Failed to load personnel", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddPersonnel = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.username || !formData.password) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/personnel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        router.push("/admin/login")
        return
      }

      const data = await response.json()

      if (response.ok) {
        toast({ title: "Success", description: "Personnel added successfully" })
        setFormData({ name: "", email: "", username: "", password: "" })
        setDialogOpen(false)
        loadPersonnel()
      } else {
        toast({ title: "Error", description: data.error || "Failed to add personnel", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error adding personnel:", error)
      toast({ title: "Error", description: "Failed to add personnel", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePersonnel = async (id: number) => {
    if (!confirm("Are you sure you want to delete this personnel account?")) return

    try {
      const response = await fetch(`/api/admin/personnel/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${adminAuth}`,
        },
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        router.push("/admin/login")
        return
      }

      if (response.ok) {
        toast({ title: "Success", description: "Personnel deleted successfully" })
        loadPersonnel()
      } else {
        toast({ title: "Error", description: "Failed to delete personnel", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deleting personnel:", error)
      toast({ title: "Error", description: "Failed to delete personnel", variant: "destructive" })
    }
  }

  const handleResetPassword = async () => {
    if (!resetPasswordId || !newPassword) {
      toast({ title: "Error", description: "Please enter a new password", variant: "destructive" })
      return
    }

    try {
      const response = await fetch(`/api/admin/personnel/${resetPasswordId}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminAuth}`,
        },
        body: JSON.stringify({ newPassword }),
      })

      if (response.status === 401) {
        localStorage.removeItem("adminAuth")
        router.push("/admin/login")
        return
      }

      if (response.ok) {
        toast({ title: "Success", description: "Password reset successfully" })
        setResetPasswordDialogOpen(false)
        setNewPassword("")
        setResetPasswordId(null)
      } else {
        toast({ title: "Error", description: "Failed to reset password", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error resetting password:", error)
      toast({ title: "Error", description: "Failed to reset password", variant: "destructive" })
    }
  }

  if (!isAuthenticated) return null

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
              <UserCog className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Administrative Personnel
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Manage accounts for administrative staff members
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Add Personnel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Admin Account</DialogTitle>
                <DialogDescription>Create a new account for administrative staff.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPersonnel} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jane@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="janedoe"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Create Account"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* --- Personnel List --- */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
          ) : personnel.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                <CardContent className="p-12 text-center">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No administrative personnel found.</p>
                  <Button variant="link" onClick={() => setDialogOpen(true)} className="mt-2 text-indigo-600">
                    Add your first staff member
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {personnel.map((person) => (
                <motion.div variants={itemVariants} key={person.id}>
                  <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-lg">
                            {person.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground dark:text-white flex items-center gap-2">
                              {person.name}
                              <Badge
                                variant={person.is_active ? "default" : "secondary"}
                                className={cn("text-xs font-normal", person.is_active ? "bg-green-600" : "")}
                              >
                                {person.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </h3>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5" /> {person.email}
                              </span>
                              <span className="hidden sm:inline">•</span>
                              <span className="font-mono bg-slate-100 dark:bg-white/5 px-1.5 rounded text-xs">
                                @{person.username}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto">
                          <Dialog
                            open={resetPasswordDialogOpen && resetPasswordId === person.id}
                            onOpenChange={(open) => {
                              if (!open) setResetPasswordId(null)
                              setResetPasswordDialogOpen(open)
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 bg-transparent"
                                onClick={() => {
                                  setResetPasswordId(person.id)
                                  setResetPasswordDialogOpen(true)
                                }}
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset Password
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-sm">
                              <DialogHeader>
                                <DialogTitle>Reset Password</DialogTitle>
                                <DialogDescription>Set a new password for {person.name}</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2">
                                <div className="space-y-2">
                                  <Label>New Password</Label>
                                  <Input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                  />
                                </div>
                                <Button
                                  onClick={handleResetPassword}
                                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                                >
                                  Confirm Reset
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleDeletePersonnel(person.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
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
      </motion.div>
    </div>
  )
}
