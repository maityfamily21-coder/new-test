"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  RefreshCw,
  ArrowLeft,
  Terminal,
  Activity,
  Loader2,
  Paperclip,
  Send,
  ImageIcon,
  FileVideo,
  MessageCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

// --- Interfaces ---
interface SupportTicket {
  id: number
  title: string
  description: string
  priority: string
  status: string
  created_by_id: number
  created_by_type: string
  created_by_name: string
  claimed_by_id: number | null
  claimed_by_name: string | null
  claimed_at: string | null
  closed_at: string | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

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

export default function TechnicalTicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Dialog States
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Chat and Media Gallery States
  const [showChatDialog, setShowChatDialog] = useState(false)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loadingChat, setLoadingChat] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)

  // Filter State
  const [activeTab, setActiveTab] = useState("all")

  const fetchTickets = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const token = localStorage.getItem("technicalTeamAuth")
      if (!token) {
        router.push("/technical/login")
        return
      }

      const statusParam = activeTab === "all" ? "" : `?status=${activeTab}`
      const response = await fetch(`/api/technical/tickets${statusParam}`, {
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
      const token = localStorage.getItem("technicalTeamAuth")
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

  const handleClaimTicket = async (ticketId: number) => {
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch(`/api/technical/tickets/${ticketId}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (response.ok) {
        fetchTickets(true)
      } else {
        alert(data.message || "Failed to claim ticket")
      }
    } catch (error) {
      alert("Failed to claim ticket")
    }
  }

  const handleCloseTicket = async () => {
    if (!selectedTicket || !resolutionNotes.trim()) return

    setSubmitting(true)
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch(`/api/technical/tickets/${selectedTicket.id}/close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resolutionNotes }),
      })

      if (response.ok) {
        setShowCloseDialog(false)
        setSelectedTicket(null)
        setResolutionNotes("")
        fetchTickets(true)
      } else {
        alert("Failed to close ticket")
      }
    } catch (error) {
      alert("Failed to close ticket")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedTicket) return

    setSendingMessage(true)
    try {
      const token = localStorage.getItem("technicalTeamAuth")
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
      const token = localStorage.getItem("technicalTeamAuth")
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
        return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
      case "claimed":
        return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800"
      case "closed":
        return "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30 animate-pulse"
      case "high":
        return "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20"
      case "medium":
        return "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20"
      case "low":
        return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
      default:
        return "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20"
    }
  }

  const openTickets = tickets.filter((t) => t.status === "open")
  const claimedTickets = tickets.filter((t) => t.status === "claimed")
  const closedTickets = tickets.filter((t) => t.status === "closed")

  useEffect(() => {
    fetchTickets()
  }, [activeTab])

  if (loading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-emerald-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[150px]" />
      </div>

      <motion.div className="relative z-10 container mx-auto px-4 py-6 space-y-6" initial="hidden" animate="visible">
        {/* Header */}
        <motion.div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button
                onClick={() => router.push("/technical/dashboard")}
                variant="ghost"
                size="sm"
                className="pl-0 hover:bg-transparent hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 bg-clip-text text-transparent flex items-center gap-3">
              <Terminal className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Ticket Console
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Manage system incidents and technical support requests
            </p>
          </div>
          <Button
            onClick={() => fetchTickets(true)}
            variant="outline"
            className="gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-slate-200 dark:border-white/10"
            disabled={refreshing}
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Refresh Data
          </Button>
        </motion.div>

        {/* Stats Overview */}
        <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tickets</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
            </CardContent>
          </Card>
          <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Tickets</CardTitle>
              <Activity className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{claimedTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Currently processing</p>
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

        {/* Ticket Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-white/10">
            <TabsTrigger value="all">All Logs</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="claimed">In Progress</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {tickets.length === 0 ? (
              <motion.div>
                <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                  <CardContent className="py-12 text-center flex flex-col items-center">
                    <Ticket className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-muted-foreground">No tickets found in this category.</p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="grid gap-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id}>
                    <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 group">
                      <div className="flex flex-col md:flex-row">
                        {/* Status Strip */}
                        <div
                          className={cn(
                            "w-full md:w-1 h-1 md:h-auto",
                            ticket.status === "open"
                              ? "bg-red-500"
                              : ticket.status === "claimed"
                                ? "bg-amber-500"
                                : "bg-emerald-500",
                          )}
                        />

                        <CardContent className="p-5 flex-1">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge
                                  variant="outline"
                                  className={cn("font-medium capitalize", getStatusColor(ticket.status))}
                                >
                                  {ticket.status}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "font-medium capitalize text-xs",
                                    getPriorityColor(ticket.priority),
                                  )}
                                >
                                  {ticket.priority}
                                </Badge>
                                <span className="text-xs text-muted-foreground font-mono bg-slate-100 dark:bg-white/10 px-1.5 rounded">
                                  ID: #{ticket.id.toString().padStart(4, "0")}
                                </span>
                              </div>

                              <h3 className="text-lg font-bold text-foreground dark:text-white">{ticket.title}</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-slate-100 dark:border-white/5 font-mono">
                                {ticket.description}
                              </p>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" /> {ticket.created_by_name} ({ticket.created_by_type})
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(ticket.created_at).toLocaleString()}
                                </span>
                              </div>

                              {ticket.resolution_notes && (
                                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-sm">
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs block mb-1">
                                    :: RESOLUTION LOG ::
                                  </span>
                                  <span className="text-emerald-800 dark:text-emerald-200">
                                    {ticket.resolution_notes}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 justify-center min-w-[140px]">
                              {ticket.status === "open" && (
                                <Button
                                  onClick={() => handleClaimTicket(ticket.id)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white w-full shadow-sm"
                                >
                                  Claim Ticket
                                </Button>
                              )}
                              {ticket.status === "claimed" && (
                                <div className="space-y-2">
                                  <div className="text-xs text-center text-amber-700 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-900/20 py-1 rounded border border-amber-200 dark:border-amber-800">
                                    Assigned: {ticket.claimed_by_name}
                                  </div>
                                  <Button
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedTicket(ticket)
                                      setShowChatDialog(true)
                                      fetchTicketDetails(ticket.id)
                                    }}
                                    className="w-full border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 gap-1 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" /> Support Chat
                                  </Button>
                                  <Button
                                    onClick={() => {
                                      setSelectedTicket(ticket)
                                      setShowCloseDialog(true)
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full shadow-sm"
                                  >
                                    Resolve Ticket
                                  </Button>
                                </div>
                              )}
                              {ticket.status === "closed" && (
                                <div className="space-y-2">
                                  <div className="text-center p-2 bg-slate-100 dark:bg-zinc-900 rounded border border-slate-200 dark:border-white/10">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> Closed
                                    </span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedTicket(ticket)
                                      setShowChatDialog(true)
                                      fetchTicketDetails(ticket.id)
                                    }}
                                    className="w-full text-[10px] h-7 gap-1 text-muted-foreground"
                                  >
                                    <ImageIcon className="w-3 h-3" /> View History
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Close Ticket Dialog */}
        <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
          <DialogContent className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10">
            <DialogHeader>
              <DialogTitle className="text-emerald-600 dark:text-emerald-400 font-mono">:: CLOSE TICKET ::</DialogTitle>
              <DialogDescription>
                Finalize ticket #{selectedTicket?.id}. This action sends a resolution notification to the user.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution Report</Label>
                <Textarea
                  id="resolution"
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="bg-white dark:bg-zinc-900 font-mono text-sm min-h-[120px]"
                  placeholder="> Describe the technical solution applied..."
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCloseDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCloseTicket}
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirm Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Chat and Media Gallery Dialog */}
        <Dialog
          open={showChatDialog}
          onOpenChange={(open) => {
            setShowChatDialog(open)
            if (!open) setSelectedTicket(null)
          }}
        >
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden border-emerald-500/20">
            {selectedTicket && (
              <>
                <DialogHeader className="p-6 pb-2 border-b border-slate-100 dark:border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        #{selectedTicket.id.toString().padStart(4, "0")} {selectedTicket.title}
                        <Badge className={cn("ml-2 capitalize", getStatusColor(selectedTicket.status || ""))}>
                          {selectedTicket.status}
                        </Badge>
                      </DialogTitle>
                      <DialogDescription className="mt-1">
                        Support communication with {selectedTicket.created_by_name} ({selectedTicket.created_by_type})
                      </DialogDescription>
                    </div>
                  </div>
                </DialogHeader>

                <Tabs defaultValue="chat" className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 border-b border-slate-100 dark:border-white/5">
                    <TabsList className="bg-transparent h-12 p-0 gap-6">
                      <TabsTrigger
                        value="chat"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none h-full px-0"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" /> Discussion
                      </TabsTrigger>
                      <TabsTrigger
                        value="media"
                        className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 rounded-none h-full px-0"
                      >
                        <ImageIcon className="w-4 h-4 mr-2" /> Media Gallery ({attachments.length})
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent
                    value="chat"
                    className="flex-1 flex flex-col p-0 m-0 overflow-hidden data-[state=inactive]:hidden"
                  >
                    <ScrollArea className="flex-1 p-6">
                      <div className="space-y-6 pb-4">
                        {/* Original Description as first message - LEFT SIDE (Gray) */}
                        <div className="flex flex-col mr-auto max-w-[85%] items-start">
                          <div className="bg-slate-100 dark:bg-zinc-900/80 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-white/10 shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                              ORIGINAL REQUEST • {selectedTicket.created_by_type}
                            </span>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{selectedTicket.description}</p>
                            <span className="text-[10px] text-muted-foreground mt-2 block">
                              {selectedTicket && new Date(selectedTicket.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {messages.map((msg) => {
                          // FIX: Check if sender is "technical" type OR if the name matches the assigned technical person (Meet)
                          const isCurrentUser =
                            ["technical", "technical_support", "technical_team"].includes(msg.sender_type) ||
                            (selectedTicket.claimed_by_name && msg.sender_name === selectedTicket.claimed_by_name)

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
                                    ? "bg-emerald-600 text-white rounded-tr-none shadow-emerald-200 dark:shadow-none"
                                    : "bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/5 rounded-tl-none",
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider block mb-1",
                                    isCurrentUser ? "text-emerald-100" : "text-emerald-600 dark:text-emerald-400",
                                  )}
                                >
                                  {msg.sender_name} {isCurrentUser ? "(You)" : `(${msg.sender_type})`}
                                </span>
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                <span
                                  className={cn(
                                    "text-[10px] mt-2 block opacity-70",
                                    isCurrentUser ? "text-emerald-100 text-right" : "text-muted-foreground",
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
                            placeholder="Reply to user..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="pr-12 py-6 bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10 rounded-xl focus:ring-emerald-500"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <Label
                              htmlFor="tech-file-upload"
                              className="cursor-pointer p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
                            >
                              <Paperclip className="w-5 h-5 text-muted-foreground" />
                              <Input id="tech-file-upload" type="file" className="hidden" onChange={handleFileUpload} />
                            </Label>
                          </div>
                        </div>
                        <Button
                          type="submit"
                          size="icon"
                          disabled={sendingMessage || !newMessage.trim()}
                          className="h-12 w-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 shrink-0"
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </form>
                    </div>
                  </TabsContent>

                  <TabsContent value="media" className="flex-1 p-6 overflow-y-auto m-0">
                    <ScrollArea className="flex-1 p-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                                <FileVideo className="w-8 h-8 text-emerald-500" />
                                <span className="text-[10px] px-2 text-center truncate w-full font-mono">
                                  {file.file_name}
                                </span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="h-8 text-[10px] uppercase font-bold"
                                asChild
                              >
                                <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                                  Inspect
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}

                        {attachments.length === 0 && !loadingChat && (
                          <div className="col-span-full py-12 text-center text-muted-foreground">
                            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-mono">NO MEDIA ASSETS DETECTED</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}
