"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { 
  Calendar, 
  Clock, 
  User, 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ClipboardList,
  RefreshCw,
  Briefcase
} from "lucide-react"

// --- Interfaces ---
interface LeaveRequest {
  id: number
  user_id: number
  user_type: string
  user_name: string
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: string
  created_at: string
  rejection_reason?: string
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

export default function AdminPersonnelPeonLeavesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [adminData, setAdminData] = useState<any>(null)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Dialog States
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"approve" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminPersonnelAuth")
    const adminDataStr = localStorage.getItem("adminPersonnelData")

    if (!adminAuth || !adminDataStr) {
      router.push("/admin-personnel/login")
      return
    }

    try {
      const admin = JSON.parse(adminDataStr)
      setAdminData(admin)
      fetchLeaves()
    } catch (error) {
      console.error("Failed to parse admin data:", error)
      router.push("/admin-personnel/login")
    }
  }, [router])

  const fetchLeaves = async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/admin/leaves/pending?role=admin_personnel`)
      const data = await response.json()

      if (data.success) {
        setLeaves(data.leaves)
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error fetching leaves:", error)
      toast({ title: "Error", description: "Failed to fetch leave requests", variant: "destructive" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleReviewClick = (leave: LeaveRequest, action: "approve" | "reject") => {
    setSelectedLeave(leave)
    setReviewAction(action)
    setRejectionReason("")
    setIsReviewDialogOpen(true)
  }

  const handleSubmitReview = async () => {
    if (!selectedLeave || !reviewAction || !adminData) return

    if (reviewAction === "reject" && !rejectionReason.trim()) {
      toast({ title: "Error", description: "Please provide a rejection reason", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/admin/leaves/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: selectedLeave.id,
          action: reviewAction,
          adminId: adminData.id,
          adminRole: "admin_personnel",
          rejectionReason: reviewAction === "reject" ? rejectionReason : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: `Leave request ${reviewAction === "approve" ? "approved" : "rejected"} successfully`,
        })
        setIsReviewDialogOpen(false)
        fetchLeaves()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      console.error("Error reviewing leave:", error)
      toast({ title: "Error", description: "Failed to process leave request", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">Pending</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800">Approved</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
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
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6">
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
              <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Peon Leave Requests
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Review and manage leave applications from support staff
            </p>
          </div>
          <div className="flex gap-3">
             <Button 
                onClick={() => fetchLeaves()} 
                variant="outline" 
                className="gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-slate-200 dark:border-white/10"
                disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* --- Intro Card --- */}
        <motion.div variants={itemVariants}>
            <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/50">
                <CardContent className="p-6 flex items-start gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Staff Management Protocol</h3>
                        <p className="text-sm text-blue-800 dark:text-blue-300/80">
                            Approve or reject leave requests from peon and housekeeping staff based on availability. 
                            Approved leaves are automatically deducted from their annual balance.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </motion.div>

        {/* --- Requests Grid --- */}
        <div className="space-y-4">
          {leaves.length === 0 ? (
             <motion.div variants={itemVariants}>
                <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                    <CardContent className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="h-16 w-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-muted-foreground">All Clear</h3>
                        <p className="text-sm text-muted-foreground/80 mt-1">There are no pending leave requests to review.</p>
                    </CardContent>
                </Card>
             </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {leaves.map((leave) => (
                    <motion.div variants={itemVariants} key={leave.id}>
                        <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md flex flex-col">
                            <CardHeader className="pb-3 border-b border-slate-100 dark:border-white/5">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-zinc-900 flex items-center justify-center">
                                            <User className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-bold">{leave.user_name}</CardTitle>
                                            <div className="flex gap-2 mt-1">
                                                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Peon</Badge>
                                                {getStatusBadge(leave.status)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground bg-slate-100 dark:bg-white/5 px-2 py-1 rounded">
                                        {new Date(leave.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 pt-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Leave Type</p>
                                        <p className="font-medium capitalize flex items-center gap-1">
                                            <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
                                            {leave.leave_type.replace("_", " ")}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Duration</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                                            {leave.total_days} day(s)
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Start</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                            {new Date(leave.start_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">End</p>
                                        <p className="font-medium flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                            {new Date(leave.end_date).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-lg border border-slate-100 dark:border-white/5">
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Reason</p>
                                    <p className="text-sm italic text-foreground/80">"{leave.reason}"</p>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2 pb-4 px-4 gap-2">
                                <Button 
                                    onClick={() => handleReviewClick(leave, "approve")}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" /> Approve
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={() => handleReviewClick(leave, "reject")}
                                    className="flex-1 gap-2"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </Button>
                            </CardFooter>
                        </Card>
                    </motion.div>
                ))}
            </div>
          )}
        </div>

        {/* --- Review Dialog --- */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className={cn("mx-auto rounded-full h-12 w-12 flex items-center justify-center mb-2", reviewAction === 'approve' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                  {reviewAction === 'approve' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <DialogTitle className="text-center">{reviewAction === "approve" ? "Approve Leave Request" : "Reject Leave Request"}</DialogTitle>
              <DialogDescription className="text-center">
                {reviewAction === "approve"
                  ? "Are you sure? The leave days will be deducted from the staff member's annual balance."
                  : "Please provide a reason for rejecting this leave request. This will be visible to the staff member."}
              </DialogDescription>
            </DialogHeader>

            {reviewAction === "reject" && (
              <div className="space-y-2 py-2">
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="e.g. Staff shortage on these dates..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="bg-slate-50 dark:bg-zinc-900"
                />
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 mt-4">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitReview} 
                disabled={submitting} 
                className={cn("flex-1 text-white", reviewAction === 'approve' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}
              >
                {submitting ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}
