"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, ArrowLeft, Eye, MessageSquare, Megaphone, Loader2 } from "lucide-react"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingBroadcast, setEditingBroadcast] = useState<any | null>(null)
  const [viewBroadcast, setViewBroadcast] = useState<any | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image_url: "",
    custom_link_url: "",
    custom_link_text: "",
    is_active: true,
  })

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    fetchBroadcasts()
  }, [router])

  const fetchBroadcasts = async () => {
    try {
      const response = await fetch("/api/admin/broadcast")
      const data = await response.json()
      if (data.success) {
        setBroadcasts(data.broadcasts)
      }
    } catch (error) {
      console.error("Failed to fetch broadcasts:", error)
      toast({ title: "Error", description: "Failed to fetch broadcasts", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const url = editingBroadcast ? `/api/admin/broadcast/${editingBroadcast.id}` : "/api/admin/broadcast"
      const method = editingBroadcast ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        fetchBroadcasts()
        resetForm()
        setIsAddDialogOpen(false)
        setEditingBroadcast(null)
        toast({ title: "Success", description: `Broadcast ${editingBroadcast ? "updated" : "created"} successfully!` })
      } else {
        toast({ title: "Error", description: data.message || "Operation failed", variant: "destructive" })
      }
    } catch (error) {
      console.error("Submit error:", error)
      toast({ title: "Error", description: "Operation failed", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this broadcast?")) return
    try {
      const response = await fetch(`/api/admin/broadcast/${id}`, { method: "DELETE" })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Broadcast deleted successfully" })
        fetchBroadcasts()
      } else {
        toast({ title: "Error", description: data.message || "Delete failed", variant: "destructive" })
      }
    } catch (error) {
      console.error("Delete error:", error)
      toast({ title: "Error", description: "Delete failed", variant: "destructive" })
    }
  }

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/broadcast/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Status updated successfully" })
        fetchBroadcasts()
      }
    } catch (error) {
      console.error("Toggle error:", error)
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      image_url: "",
      custom_link_url: "",
      custom_link_text: "",
      is_active: true,
    })
  }

  const handleEdit = (broadcast: any) => {
    setFormData({
      title: broadcast.title,
      content: broadcast.content,
      image_url: broadcast.image_url || "",
      custom_link_url: broadcast.custom_link_url || "",
      custom_link_text: broadcast.custom_link_text || "",
      is_active: broadcast.is_active,
    })
    setEditingBroadcast(broadcast)
    setIsAddDialogOpen(true)
  }

  const handleView = (broadcast: any) => {
    setViewBroadcast(broadcast)
    setIsViewDialogOpen(true)
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
              <Megaphone className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Broadcast Messages
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Manage system-wide announcements visible to all students
            </p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={resetForm} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Plus className="w-4 h-4" /> Create Broadcast
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{editingBroadcast ? "Edit Broadcast" : "New Announcement"}</DialogTitle>
                    <DialogDescription>
                        {editingBroadcast ? "Update the broadcast details" : "Create a new message visible on student dashboards"}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Exam Schedule Update" required />
                    </div>
                    <div className="space-y-2">
                        <Label>Content *</Label>
                        <Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="Enter detailed message..." rows={5} required />
                    </div>
                    <div className="space-y-2">
                        <Label>Image URL (Optional)</Label>
                        <Input type="url" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
                        {formData.image_url && (
                             <div className="mt-2 p-2 border rounded-lg bg-slate-50 dark:bg-white/5 flex justify-center">
                                 <img src={formData.image_url} alt="Preview" className="max-h-32 rounded object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
                             </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Link URL (Optional)</Label><Input type="url" value={formData.custom_link_url} onChange={e => setFormData({...formData, custom_link_url: e.target.value})} placeholder="https://..." /></div>
                        <div className="space-y-2"><Label>Button Text (Optional)</Label><Input value={formData.custom_link_text} onChange={e => setFormData({...formData, custom_link_text: e.target.value})} placeholder="e.g. Learn More" /></div>
                    </div>
                    <div className="flex items-center space-x-2 p-3 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                        <Switch id="is_active" checked={formData.is_active} onCheckedChange={(c) => setFormData({...formData, is_active: c})} />
                        <Label htmlFor="is_active" className="cursor-pointer">Active (Visible to students)</Label>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (editingBroadcast ? "Update" : "Publish")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* --- Broadcast List --- */}
        <motion.div variants={itemVariants}>
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Broadcast History</CardTitle>
                            <CardDescription>Total {broadcasts.length} announcements created</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-white/5">
                            <TableRow className="border-slate-100 dark:border-white/5 hover:bg-transparent">
                                <TableHead className="pl-6">Title</TableHead>
                                <TableHead>Content Preview</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created Date</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {broadcasts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                        No broadcasts found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                broadcasts.map((broadcast) => (
                                    <TableRow key={broadcast.id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                                        <TableCell className="pl-6 font-medium text-foreground dark:text-white">{broadcast.title}</TableCell>
                                        <TableCell className="max-w-xs truncate text-muted-foreground">{broadcast.content}</TableCell>
                                        <TableCell>
                                            <Badge variant={broadcast.is_active ? "default" : "secondary"} className={cn("capitalize", broadcast.is_active ? "bg-green-600 hover:bg-green-700" : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-400")}>
                                                {broadcast.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{new Date(broadcast.created_at).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleView(broadcast)} className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"><Eye className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(broadcast)} className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"><Edit className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(broadcast.id)} className="h-8 w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </motion.div>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle>{viewBroadcast?.title}</DialogTitle>
                    <DialogDescription>
                        Posted on {viewBroadcast && new Date(viewBroadcast.created_at).toLocaleDateString()}
                    </DialogDescription>
                </DialogHeader>
                {viewBroadcast && (
                    <div className="space-y-4">
                        {viewBroadcast.image_url && (
                            <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-white/10">
                                <img src={viewBroadcast.image_url} alt="Broadcast" className="w-full max-h-48 object-cover" />
                            </div>
                        )}
                        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto pr-2">
                            {viewBroadcast.content}
                        </div>
                        {viewBroadcast.custom_link_url && (
                            <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
                                <a href={viewBroadcast.custom_link_url} target="_blank" rel="noopener noreferrer">
                                    {viewBroadcast.custom_link_text || "Learn More"}
                                </a>
                            </Button>
                        )}
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="w-full mt-2">Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </motion.div>
    </div>
  )
}
