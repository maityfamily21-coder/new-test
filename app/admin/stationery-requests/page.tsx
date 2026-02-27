"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, Forward, Clock, AlertCircle, GraduationCap, Package, ArrowLeft, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

// --- Types ---
type StationeryRequest = {
  id: number
  requester_name: string
  requester_type: string
  name: string
  unit: string
  quantity: number
  available_quantity: number
  status: "pending_approval" | "forwarded" | "approved" | "rejected"
  created_at: string
  purpose: string
  rejection_reason?: string
  items?: {
    name: string
    unit: string
    quantity: number
    available_quantity: number
  }[]
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

export default function StationeryRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [requests, setRequests] = useState<StationeryRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("pending")
  const [rejectDialog, setRejectDialog] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<StationeryRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [processingId, setProcessingId] = useState<number | null>(null)

  useEffect(() => {
    fetchRequests()
  }, [activeTab])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("adminAuth")
      if (!token) {
        router.push("/admin/login")
        return
      }

      const status = activeTab === "pending" ? "pending_approval" : activeTab === "all" ? "all" : activeTab
      const response = await fetch(`/api/course-admin/stationery/requests?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()

      if (data.success) {
        const groupedRequests = new Map()
        data.requests.forEach((req: StationeryRequest) => {
          if (!groupedRequests.has(req.id)) {
            groupedRequests.set(req.id, { ...req, items: [] })
          }
          groupedRequests.get(req.id).items.push({
            name: req.name,
            unit: req.unit,
            quantity: req.quantity,
            available_quantity: req.available_quantity,
          })
        })

        setRequests(Array.from(groupedRequests.values()))
      } else {
        toast({ title: "Error", description: data.error || "Failed to load requests", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch stationery requests", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleForward = async (requestId: number) => {
    setProcessingId(requestId)
    try {
      const token = localStorage.getItem("adminAuth")
      if (!token) return

      const response = await fetch(`/api/course-admin/stationery/requests/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "forward" }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: "Success", description: "Request forwarded to Technical Team successfully" })
        fetchRequests()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process request", variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    setProcessingId(selectedRequest.id)
    try {
      const token = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/course-admin/stationery/requests/${selectedRequest.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "reject", reason: rejectionReason || "Rejected by course admin" }),
      })

      const data = await response.json()
      if (response.ok) {
        toast({ title: "Success", description: "Request rejected successfully" })
        setRejectDialog(false)
        setRejectionReason("")
        setSelectedRequest(null)
        fetchRequests()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
        toast({ title: "Error", description: "Failed to process request", variant: "destructive" })
    } finally {
      setProcessingId(null)
    }
  }

  const pendingCount = requests.filter((r) => r.status === "pending_approval").length
  const forwardedCount = requests.filter((r) => r.status === "forwarded").length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Background Ambience */}
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
                 <Button onClick={() => router.push("/admin/dashboard")} variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:text-indigo-600 dark:hover:text-indigo-400">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                 </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-gray-200 dark:to-gray-500 bg-clip-text text-transparent flex items-center gap-3">
              <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Stationery Requests
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Review and manage supply requests from tutors
            </p>
          </div>
        </motion.div>

        {/* --- Main Content Tabs --- */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-slate-100 dark:bg-zinc-900 grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="pending">
                Pending {pendingCount > 0 && <span className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="forwarded">
                Forwarded {forwardedCount > 0 && <span className="ml-2 bg-indigo-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{forwardedCount}</span>}
            </TabsTrigger>
            <TabsTrigger value="all">History</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-0">
             {requests.filter(r => r.status === "pending_approval").length === 0 ? (
                <EmptyState message="No pending requests to review." />
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.filter(r => r.status === "pending_approval").map(request => (
                        <RequestTile key={request.id} request={request} onForward={handleForward} onReject={(req) => { setSelectedRequest(req); setRejectDialog(true); }} processingId={processingId} />
                    ))}
                </div>
             )}
          </TabsContent>

          <TabsContent value="forwarded" className="mt-0">
             {requests.filter(r => r.status === "forwarded").length === 0 ? (
                <EmptyState message="No forwarded requests." />
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.filter(r => r.status === "forwarded").map(request => (
                        <RequestTile key={request.id} request={request} onForward={handleForward} onReject={() => {}} processingId={processingId} readOnly />
                    ))}
                </div>
             )}
          </TabsContent>

          <TabsContent value="all" className="mt-0">
             {requests.length === 0 ? (
                <EmptyState message="No request history found." />
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {requests.map(request => (
                        <RequestTile key={request.id} request={request} onForward={handleForward} onReject={(req) => { setSelectedRequest(req); setRejectDialog(true); }} processingId={processingId} readOnly={request.status !== "pending_approval"} />
                    ))}
                </div>
             )}
          </TabsContent>
        </Tabs>

        {/* --- Reject Dialog --- */}
        <Dialog open={rejectDialog} onOpenChange={setRejectDialog}>
            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
                <DialogHeader>
                    <DialogTitle className="text-red-600 flex items-center gap-2"><XCircle className="w-5 h-5"/> Reject Request</DialogTitle>
                    <DialogDescription>Provide a reason for rejecting the request from {selectedRequest?.requester_name}.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Reason for Rejection</Label>
                        <Textarea 
                            value={rejectionReason} 
                            onChange={(e) => setRejectionReason(e.target.value)} 
                            placeholder="e.g. Item out of stock, budget limit exceeded..."
                            className="bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-white/10"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { setRejectDialog(false); setRejectionReason(""); setSelectedRequest(null); }}>Cancel</Button>
                    <Button variant="destructive" onClick={handleReject} disabled={processingId !== null}>
                        {processingId === selectedRequest?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Rejection"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </motion.div>
    </div>
  )
}

// --- Sub Components ---

function RequestTile({ request, onForward, onReject, processingId, readOnly = false }: any) {
    const isPending = request.status === "pending_approval";
    
    return (
        <motion.div variants={itemVariants}>
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col h-full">
                <CardHeader className="p-4 pb-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-semibold text-sm text-foreground">{request.requester_name}</h3>
                            <p className="text-xs text-muted-foreground">{new Date(request.created_at).toLocaleDateString()}</p>
                        </div>
                        <StatusBadge status={request.status} />
                    </div>
                </CardHeader>
                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between text-sm bg-slate-50 dark:bg-zinc-900 p-2 rounded border border-slate-100 dark:border-white/5">
                            <span className="font-medium text-foreground">{request.name}</span>
                            <span className="text-xs text-muted-foreground bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10">Qty: {request.quantity}</span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2 italic bg-slate-50/50 dark:bg-zinc-900/50 p-2 rounded">
                            "{request.purpose}"
                        </div>
                        {request.rejection_reason && (
                             <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-900">
                                 <strong>Note:</strong> {request.rejection_reason}
                             </div>
                        )}
                    </div>
                    
                    {!readOnly && isPending && (
                        <div className="flex gap-2 pt-2 mt-auto">
                            <Button variant="outline" size="sm" onClick={() => onReject(request)} disabled={processingId !== null} className="flex-1 h-8 text-xs border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-900/20">
                                Reject
                            </Button>
                            <Button size="sm" onClick={() => onForward(request.id)} disabled={processingId !== null} className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white">
                                {processingId === request.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Forward"}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}

function StatusBadge({ status }: { status: string }) {
    const styles: any = {
        pending_approval: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
        forwarded: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
        approved: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
        rejected: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    }
    const icons: any = {
        pending_approval: Clock,
        forwarded: Forward,
        approved: CheckCircle2,
        rejected: XCircle,
    }
    const Icon = icons[status] || AlertCircle

    return (
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 flex items-center gap-1 h-5 capitalize", styles[status])}>
            <Icon className="w-3 h-3" /> {status.replace('_', ' ')}
        </Badge>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <motion.div variants={itemVariants}>
            <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                <CardContent className="p-12 text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>{message}</p>
                </CardContent>
            </Card>
        </motion.div>
    )
}
