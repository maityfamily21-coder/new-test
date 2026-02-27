"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Calendar, Clock, User, ArrowLeft, CheckCircle2, XCircle, Send, Search, Filter, Briefcase } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface LeaveRequest {
  id: number
  user_id: number
  user_type: string
  user_name: string
  department?: string
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: string
  course_admin_name?: string
  super_admin_name?: string
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

export default function AdminLeavesContent() {
  const router = useRouter()
  const { toast } = useToast()
  const [adminData, setAdminData] = useState<any>(null)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [historyLeaves, setHistoryLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  
  // Dialog State
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null)
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<"forward" | "approve" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  
  // Filter State
  const [activeRoleTab, setActiveRoleTab] = useState<string>("tutor")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    const adminDataStr = localStorage.getItem("adminData")

    if (!adminAuth || !adminDataStr) {
      router.push("/admin/login")
      return
    }

    try {
      const admin = JSON.parse(adminDataStr)
      setAdminData(admin)
      fetchLeaves(admin.role, admin.role === "super_admin" ? "tutor" : undefined)
    } catch (error) {
      console.error("Failed to parse admin data:", error)
      router.push("/admin/login")
    }
  }, [router])

  useEffect(() => {
    if (adminData?.role === "super_admin") {
      fetchLeaves(adminData.role, activeRoleTab)
    }
  }, [activeRoleTab, adminData])

  const fetchLeaves = async (role: string, filterRole?: string) => {
    try {
      setLoading(true)
      const filterParam = filterRole ? `&filterRole=${filterRole}` : ""

      const [pendingResponse, historyResponse] = await Promise.all([
        fetch(`/api/admin/leaves/pending?role=${role}${filterParam}`),
        fetch(`/api/admin/leaves/history?role=${role}${filterParam}`),
      ])

      const pendingData = await pendingResponse.json()
      const historyData = await historyResponse.json()

      if (pendingData.success && historyData.success) {
        setLeaves(pendingData.leaves || [])
        setHistoryLeaves(historyData.leaves || [])
      } else {
        toast({ title: "Error", description: pendingData.error || historyData.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch leave requests", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleReviewClick = (leave: LeaveRequest, action: "forward" | "approve" | "reject") => {
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
          adminRole: adminData.role,
          rejectionReason: reviewAction === "reject" ? rejectionReason : undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Success",
          description: `Leave request ${reviewAction === "forward" ? "forwarded" : reviewAction === "approve" ? "approved" : "rejected"} successfully`,
        })
        setIsReviewDialogOpen(false)
        fetchLeaves(adminData.role, adminData.role === "super_admin" ? activeRoleTab : undefined)
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to process leave request", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">Pending</Badge>
      case "forwarded":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800">Forwarded</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">Approved</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getUserTypeLabel = (userType: string) => {
    switch (userType) {
      case "tutor": return "Tutor"
      case "technical": return "Technical Team"
      case "admin_personnel": return "Admin Personnel"
      case "peon": return "Peon / Housekeeping"
      default: return userType
    }
  }

  const filterLeavesByRole = (allLeaves: LeaveRequest[], role: string) => {
    return allLeaves.filter((leave) => {
      const matchesRole = leave.user_type === role
      const matchesSearch =
        searchQuery === "" ||
        leave.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leave.leave_type?.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesRole && matchesSearch
    })
  }

  const isCourseAdmin = adminData?.role === "course_admin"
  const isSuperAdmin = adminData?.role === "super_admin"

  const pendingLeaves = leaves.filter((l) => l.status === "pending")
  const forwardedLeaves = leaves.filter((l) => l.status === "forwarded")
  const approvedLeaves = historyLeaves.filter((l) => l.status === "approved")
  const rejectedLeaves = historyLeaves.filter((l) => l.status === "rejected")

  const filteredPendingLeaves = isSuperAdmin ? filterLeavesByRole(pendingLeaves, activeRoleTab) : pendingLeaves
  const filteredForwardedLeaves = isSuperAdmin ? filterLeavesByRole(forwardedLeaves, activeRoleTab) : forwardedLeaves
  const filteredApprovedLeaves = isSuperAdmin ? filterLeavesByRole(approvedLeaves, activeRoleTab) : approvedLeaves
  const filteredRejectedLeaves = isSuperAdmin ? filterLeavesByRole(rejectedLeaves, activeRoleTab) : rejectedLeaves

  if (!adminData) return null

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
              <Briefcase className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Leave Management
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              {isCourseAdmin ? "Review and forward tutor leave requests" : "Approve or reject staff leave requests"}
            </p>
          </div>
        </motion.div>

        {isCourseAdmin && (
            <motion.div variants={itemVariants}>
                <Card className="bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-900/50">
                    <CardContent className="p-4 flex items-start gap-4">
                        <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-1" />
                        <div>
                            <h3 className="font-semibold text-indigo-900 dark:text-indigo-200">Course Admin Access</h3>
                            <p className="text-sm text-indigo-800 dark:text-indigo-300/80">
                                You can forward requests to Super Admin or reject them. Final approval lies with Super Admin.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        )}

        <Tabs defaultValue="pending" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <TabsList className="bg-slate-100 dark:bg-zinc-900">
                <TabsTrigger value="pending">Pending ({pendingLeaves.length})</TabsTrigger>
                {!isCourseAdmin && <TabsTrigger value="forwarded">Forwarded ({forwardedLeaves.length})</TabsTrigger>}
                <TabsTrigger value="history">History ({historyLeaves.length})</TabsTrigger>
              </TabsList>

              {isSuperAdmin && (
                  <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-white/10">
                      <Search className="w-4 h-4 text-muted-foreground ml-2" />
                      <Input 
                        placeholder="Search..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="border-none bg-transparent h-8 w-[150px] focus-visible:ring-0"
                      />
                  </div>
              )}
          </div>

          {isSuperAdmin && (
            <div className="mb-6 overflow-x-auto pb-2">
                <div className="flex gap-2">
                    {["tutor", "technical", "admin_personnel", "peon"].map((role) => (
                    <button
                        key={role}
                        onClick={() => setActiveRoleTab(role)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                            activeRoleTab === role
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-muted-foreground hover:bg-slate-50 dark:hover:bg-white/10"
                        )}
                    >
                        {getUserTypeLabel(role)}
                    </button>
                    ))}
                </div>
            </div>
          )}

          {/* Pending Tab */}
          <TabsContent value="pending" className="space-y-4">
            {filteredPendingLeaves.length === 0 ? (
                <EmptyState message={searchQuery ? "No matching requests" : "No pending leave requests"} />
            ) : (
                <div className="grid gap-4">
                    {filteredPendingLeaves.map((leave) => (
                        <LeaveRequestCard 
                            key={leave.id} 
                            leave={leave} 
                            getStatusBadge={getStatusBadge} 
                            getUserTypeLabel={getUserTypeLabel}
                            isCourseAdmin={isCourseAdmin}
                            onReview={handleReviewClick}
                        />
                    ))}
                </div>
            )}
          </TabsContent>

          {/* Forwarded Tab */}
          <TabsContent value="forwarded" className="space-y-4">
            {filteredForwardedLeaves.length === 0 ? (
                <EmptyState message="No forwarded requests" />
            ) : (
                <div className="grid gap-4">
                    {filteredForwardedLeaves.map((leave) => (
                        <LeaveRequestCard 
                            key={leave.id} 
                            leave={leave} 
                            getStatusBadge={getStatusBadge} 
                            getUserTypeLabel={getUserTypeLabel}
                            isCourseAdmin={isCourseAdmin}
                            onReview={handleReviewClick}
                        />
                    ))}
                </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-8">
             <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /> Approved</h3>
                {filteredApprovedLeaves.length === 0 ? <EmptyState message="No approved requests" /> : (
                    <div className="grid gap-4">
                        {filteredApprovedLeaves.map(leave => (
                            <LeaveHistoryCard key={leave.id} leave={leave} status="approved" getUserTypeLabel={getUserTypeLabel} />
                        ))}
                    </div>
                )}
             </div>

             <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><XCircle className="w-5 h-5 text-red-500" /> Rejected</h3>
                {filteredRejectedLeaves.length === 0 ? <EmptyState message="No rejected requests" /> : (
                    <div className="grid gap-4">
                        {filteredRejectedLeaves.map(leave => (
                            <LeaveHistoryCard key={leave.id} leave={leave} status="rejected" getUserTypeLabel={getUserTypeLabel} />
                        ))}
                    </div>
                )}
             </div>
          </TabsContent>
        </Tabs>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {reviewAction === "forward" ? "Forward Request" : reviewAction === "approve" ? "Approve Request" : "Reject Request"}
              </DialogTitle>
              <DialogDescription>
                {selectedLeave?.user_name} - {selectedLeave?.leave_type} Leave
              </DialogDescription>
            </DialogHeader>

            {reviewAction === "reject" ? (
                <div className="space-y-2 py-4">
                    <Label>Rejection Reason</Label>
                    <Textarea 
                        value={rejectionReason} 
                        onChange={(e) => setRejectionReason(e.target.value)} 
                        placeholder="Why is this request being rejected?" 
                        rows={3}
                    />
                </div>
            ) : (
                <div className="py-4 text-sm text-muted-foreground">
                    Are you sure you want to {reviewAction} this request? This action cannot be undone easily.
                </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleSubmitReview} 
                disabled={submitting}
                className={cn(
                    reviewAction === 'approve' ? "bg-green-600 hover:bg-green-700" : 
                    reviewAction === 'reject' ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
                )}
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

// --- Sub Components ---

function EmptyState({ message }: { message: string }) {
    return (
        <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
            <CardContent className="p-12 text-center text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>{message}</p>
            </CardContent>
        </Card>
    )
}

function LeaveRequestCard({ leave, getStatusBadge, getUserTypeLabel, isCourseAdmin, onReview }: any) {
    return (
        <motion.div variants={itemVariants}>
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 transition-all">
                <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                        <div className={cn("w-full md:w-2 h-2 md:h-auto", leave.status === 'forwarded' ? "bg-blue-500" : "bg-yellow-500")} />
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-lg text-foreground dark:text-white">{leave.user_name}</h3>
                                        {getStatusBadge(leave.status)}
                                    </div>
                                    <Badge variant="outline" className="text-xs bg-slate-100 dark:bg-zinc-900 border-slate-200">{getUserTypeLabel(leave.user_type)}</Badge>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                    Applied: {new Date(leave.created_at).toLocaleDateString()}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-slate-50 dark:bg-white/5 p-3 rounded-lg">
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Type</p>
                                    <p className="font-medium capitalize">{leave.leave_type.replace("_", " ")}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase">Duration</p>
                                    <p className="font-medium">{leave.total_days} Day(s)</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-muted-foreground uppercase">Dates</p>
                                    <p className="font-medium flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm italic text-foreground/80 mb-4 pl-2 border-l-2 border-slate-300 dark:border-slate-700">"{leave.reason}"</p>

                            <div className="flex gap-2 justify-end">
                                {isCourseAdmin ? (
                                    <>
                                        <Button size="sm" onClick={() => onReview(leave, "forward")} className="bg-blue-600 hover:bg-blue-700 text-white gap-2"><Send className="w-3 h-3" /> Forward</Button>
                                        <Button size="sm" variant="destructive" onClick={() => onReview(leave, "reject")} className="gap-2"><XCircle className="w-3 h-3" /> Reject</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button size="sm" onClick={() => onReview(leave, "approve")} className="bg-green-600 hover:bg-green-700 text-white gap-2"><CheckCircle2 className="w-3 h-3" /> Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => onReview(leave, "reject")} className="gap-2"><XCircle className="w-3 h-3" /> Reject</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

function LeaveHistoryCard({ leave, status, getUserTypeLabel }: any) {
    return (
        <motion.div variants={itemVariants}>
            <Card className={cn("bg-white/70 dark:bg-zinc-950/40 border-l-4 backdrop-blur-md", status === 'approved' ? "border-l-green-500" : "border-l-red-500")}>
                <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-semibold">{leave.user_name}</h4>
                            <p className="text-xs text-muted-foreground">{getUserTypeLabel(leave.user_type)} • {leave.leave_type}</p>
                        </div>
                        <Badge variant="outline" className={cn(status === 'approved' ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50")}>
                            {status.toUpperCase()}
                        </Badge>
                    </div>
                    <div className="mt-2 text-sm flex gap-4">
                        <span className="flex items-center gap-1 text-muted-foreground"><Clock className="w-3 h-3" /> {leave.total_days}d</span>
                        <span className="flex items-center gap-1 text-muted-foreground"><Calendar className="w-3 h-3" /> {new Date(leave.start_date).toLocaleDateString()}</span>
                    </div>
                    {leave.rejection_reason && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs rounded">
                            Reason: {leave.rejection_reason}
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    )
}
