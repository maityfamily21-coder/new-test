"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Ticket, Clock, CheckCircle2, AlertCircle, Plus, RefreshCw, ArrowLeft, Loader2, LifeBuoy } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, Paperclip, Send, Camera, ImageIcon, FileVideo } from "lucide-react"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface TicketMessage {
  id: number
  sender_type: string
  sender_name: string
  content: string
  created_at: string
}

interface TicketAttachment {
  id: number
  file_name: string
  file_url: string
  file_type: string
  created_at: string
}

interface SupportTicket {
  id: number
  title: string
  description: string
  priority: string
  status: string
  created_by_name: string
  claimed_by_name: string | null
  claimed_at: string | null
  closed_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
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

export default function AdminPersonnelTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showNewTicketDialog, setShowNewTicketDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingChat, setLoadingChat] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  const [newTicket, setNewTicket] = useState({
    title: "",
    description: "",
    priority: "medium",
  })

  const fetchTickets = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const token = localStorage.getItem("adminPersonnelAuth")
      if (!token) {
        router.push("/admin-personnel/login")
        return
      }

      const response = await fetch("/api/admin-personnel/tickets", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setTickets(data.tickets || [])
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchTicketDetails = async (ticketId: number) => {
    setLoadingChat(true)
    try {
      const token = localStorage.getItem("adminPersonnelAuth")
      const [msgRes, attRes] = await Promise.all([
        fetch(`/api/tickets/${ticketId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/tickets/${ticketId}/attachments`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (msgRes.ok) {
        const data = await msgRes.json()
        setMessages(data.messages || [])
      }
      if (attRes.ok) {
        const data = await attRes.json()
        setAttachments(data.attachments || [])
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error)
    } finally {
      setLoadingChat(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = localStorage.getItem("adminPersonnelAuth")
      const response = await fetch("/api/admin-personnel/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newTicket),
      })

      if (response.ok) {
        setShowNewTicketDialog(false)
        setNewTicket({ title: "", description: "", priority: "medium" })
        fetchTickets()
      } else {
        alert("Failed to create ticket")
      }
    } catch (error) {
      console.error("Error creating ticket:", error)
      alert("Failed to create ticket")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedTicket) return

    setSendingMessage(true)
    try {
      const token = localStorage.getItem("adminPersonnelAuth")
      const response = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage }),
      })

      if (response.ok) {
        setNewMessage("")
        fetchTicketDetails(selectedTicket.id)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSendingMessage(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedTicket) return

    const mockUrl = URL.createObjectURL(file)

    try {
      const token = localStorage.getItem("adminPersonnelAuth")
      const response = await fetch(`/api/tickets/${selectedTicket.id}/attachments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: mockUrl,
          fileType: file.type,
        }),
      })

      if (response.ok) {
        fetchTicketDetails(selectedTicket.id)
      }
    } catch (error) {
      console.error("Error uploading file:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800"
      case "claimed":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800"
      case "closed":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
      default:
        return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-400"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 border-red-100 dark:border-red-900"
      case "high":
        return "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300 border-orange-100 dark:border-orange-900"
      case "medium":
        return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 border-blue-100 dark:border-blue-900"
      case "low":
        return "bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400 border-slate-100 dark:border-white/10"
      default:
        return "bg-slate-50 text-slate-600 dark:bg-white/5 dark:text-slate-400"
    }
  }

  const openTickets = tickets.filter((t) => t.status === "open")
  const claimedTickets = tickets.filter((t) => t.status === "claimed")
  const closedTickets = tickets.filter((t) => t.status === "closed")

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/50 via-white to-slate-100 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-slate-800/20 blur-[150px]" />
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
                onClick={() => router.push("/admin-personnel/dashboard")}
                variant="ghost"
                size="sm"
                className="pl-0 hover:bg-transparent hover:text-blue-600 dark:hover:text-blue-400"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-gray-200 dark:to-gray-500 bg-clip-text text-transparent flex items-center gap-3">
              <LifeBuoy className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Support Center
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Submit and track your technical support requests
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => fetchTickets(true)}
              variant="outline"
              className="gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-slate-200 dark:border-white/10"
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Dialog open={showNewTicketDialog} onOpenChange={setShowNewTicketDialog}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  <Plus className="w-4 h-4" /> New Ticket
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Support Ticket</DialogTitle>
                  <DialogDescription>Describe your issue for the technical team.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitTicket} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Issue Title</Label>
                    <Input
                      id="title"
                      placeholder="Brief summary..."
                      value={newTicket.title}
                      onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Detailed explanation..."
                      value={newTicket.description}
                      onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                      required
                      rows={4}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority Level</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low - General Question</SelectItem>
                        <SelectItem value="medium">Medium - Standard Issue</SelectItem>
                        <SelectItem value="high">High - Feature Broken</SelectItem>
                        <SelectItem value="urgent">Urgent - System Down</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowNewTicketDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Submit Ticket"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* --- Ticket Stats --- */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Waiting for response</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{claimedTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Being worked on</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{closedTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Successfully closed</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* --- Ticket List --- */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground dark:text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-500" /> My Tickets
          </h2>

          {tickets.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                <CardContent className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="h-16 w-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <LifeBuoy className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-muted-foreground">No tickets yet</h3>
                  <p className="text-sm text-muted-foreground/80 mt-1">
                    Create your first support ticket above if you need help.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {tickets.map((ticket) => (
                <motion.div variants={itemVariants} key={ticket.id}>
                  <Card
                    onClick={() => {
                      setSelectedTicket(ticket)
                      fetchTicketDetails(ticket.id)
                    }}
                    className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 cursor-pointer"
                  >
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn("font-normal capitalize", getStatusColor(ticket.status))}
                            >
                              {ticket.status}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn("font-normal capitalize text-xs", getPriorityColor(ticket.priority))}
                            >
                              {ticket.priority} Priority
                            </Badge>
                          </div>
                          <CardTitle className="text-lg pt-1">{ticket.title}</CardTitle>
                        </div>
                        <div className="text-xs text-muted-foreground bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                          #{ticket.id}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                      <p className="text-sm text-foreground/80 leading-relaxed bg-slate-50 dark:bg-white/5 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                        {ticket.description}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Created: {new Date(ticket.created_at).toLocaleString()}
                          </span>
                          {ticket.claimed_by_name && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              Assigned to: {ticket.claimed_by_name}
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-blue-600">
                          <MessageSquare className="w-3.5 h-3.5" /> Open Chat & Media
                        </Button>
                      </div>

                      {ticket.resolution_notes && (
                        <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Resolution:
                          </p>
                          <p className="text-sm text-emerald-800 dark:text-emerald-200">{ticket.resolution_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-blue-500/20">
          <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-white/5">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  {selectedTicket?.title}
                  <Badge className={cn("ml-2", getStatusColor(selectedTicket?.status || ""))}>
                    {selectedTicket?.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="mt-1">
                  Ticket #{selectedTicket?.id} • Created by {selectedTicket?.created_by_name}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b border-slate-100 dark:border-white/5">
              <TabsList className="bg-transparent h-12 p-0 gap-6">
                <TabsTrigger
                  value="chat"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-full px-0"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Discussion
                </TabsTrigger>
                <TabsTrigger
                  value="media"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none h-full px-0"
                >
                  <Paperclip className="w-4 h-4 mr-2" /> Media & Files ({attachments.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="chat"
              className="flex-1 flex flex-col p-0 m-0 overflow-hidden data-[state=inactive]:hidden"
            >
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6 pb-4">
                  {/* Original Description - UPDATED TO RIGHT SIDE (YOU) */}
                  <div className="flex flex-col ml-auto max-w-[85%] items-end">
                    <div className="bg-blue-600 text-white p-4 rounded-2xl rounded-tr-none shadow-sm shadow-blue-200 dark:shadow-none">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-100 block mb-1">
                        Original Request • {selectedTicket?.created_by_name} (You)
                      </span>
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket?.description}</p>
                      <span className="text-[10px] text-blue-100 text-right opacity-70 mt-2 block">
                        {selectedTicket && new Date(selectedTicket.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {messages.map((msg) => {
                    const isCurrentUser = msg.sender_type === "admin_personnel"

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex flex-col max-w-[85%]",
                          isCurrentUser ? "ml-auto items-end" : "mr-auto items-start",
                        )}
                      >
                        <div
                          className={cn(
                            "p-4 rounded-2xl shadow-sm",
                            isCurrentUser
                              ? "bg-blue-600 text-white rounded-tr-none shadow-blue-200 dark:shadow-none"
                              : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-tl-none",
                          )}
                        >
                          <span
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider block mb-1",
                              isCurrentUser ? "text-blue-100" : "text-blue-600 dark:text-blue-400",
                            )}
                          >
                            {msg.sender_name} {isCurrentUser ? "(You)" : "(Technical Support)"}
                          </span>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          <span
                            className={cn(
                              "text-[10px] mt-2 block opacity-70",
                              isCurrentUser ? "text-blue-100 text-right" : "text-muted-foreground",
                            )}
                          >
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>

              <div className="p-4 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-100 dark:border-white/5">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="pr-12 py-6 bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10 rounded-xl focus:ring-blue-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <Label
                        htmlFor="file-upload"
                        className="cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                      >
                        <Paperclip className="w-5 h-5 text-muted-foreground" />
                        <Input id="file-upload" type="file" className="hidden" onChange={handleFileUpload} />
                      </Label>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    disabled={sendingMessage || !newMessage.trim()}
                    className="h-12 w-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="media" className="flex-1 p-6 overflow-y-auto m-0">
              <ScrollArea className="flex-1 p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {selectedTicket?.status !== "closed" && (
                    <div className="aspect-square rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer relative overflow-hidden">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                        accept="image/*,video/*"
                        capture="environment"
                      />
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Capture Media</span>
                    </div>
                  )}

                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-white/10 border border-slate-200 dark:border-white/10"
                    >
                      {file.file_type.startsWith("image/") ? (
                        <img
                          src={file.file_url || "/placeholder.svg"}
                          alt={file.file_name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center gap-2">
                          <FileVideo className="w-8 h-8 text-blue-500" />
                          <span className="text-[10px] px-2 text-center truncate w-full">{file.file_name}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" variant="secondary" className="h-8 text-xs" asChild>
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                            View Full
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}

                  {attachments.length === 0 && !loadingChat && (
                    <div className="col-span-full py-12 text-center text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No media attached yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  )
}
