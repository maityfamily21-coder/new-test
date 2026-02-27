"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Calendar, Clock, FileText, ArrowLeft, Plus, RefreshCw, CheckCircle2, XCircle, PieChart, Info, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface Leave {
  id: number
  leave_type: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  status: string
  super_admin_name?: string
  rejection_reason?: string
  created_at: string
}

interface LeaveBalance {
  total_leaves: number
  used_leaves: number
  remaining_leaves: number
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

export default function PeonLeavesPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [userData, setUserData] = useState<any>(null)
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({ total_leaves: 12, used_leaves: 0, remaining_leaves: 12 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    leaveType: "",
    startDate: "",
    endDate: "",
    reason: "",
  })

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("peonAuth")
      const data = localStorage.getItem("peonData")

      if (!token || !data) {
        router.push("/peon/login")
        return
      }

      try {
        const user = JSON.parse(data)
        setUserData(user)
        fetchLeaves(user.id)
      } catch (error) {
        console.error("Failed to parse peon data:", error)
        router.push("/peon/login")
      }
    }

    checkAuth()
  }, [router])

  const fetchLeaves = async (userId: number, isRefresh = false) => {
    try {
      if(isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await fetch(`/api/leaves/my-leaves?userId=${userId}&userType=peon&t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
      const data = await response.json()

      if (data.success) {
        setLeaves(data.leaves || [])
        if (data.balance) setLeaveBalance(data.balance)
        if(isRefresh) toast({ title: "Updated", description: "Leave data refreshed." })
      } else {
        toast({ title: "Error", description: data.message, variant: "destructive" })
      }
    } catch (error) {
      console.error("Failed to fetch leaves:", error)
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch("/api/leaves/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          userId: userData.id,
          userType: "peon",
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: "Success", description: "Leave request submitted successfully" })
        setIsDialogOpen(false)
        setFormData({ leaveType: "", startDate: "", endDate: "", reason: "" })
        fetchLeaves(userData.id)
      } else {
        toast({ title: "Error", description: data.message || "Failed to apply", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800">Pending</Badge>
      case "approved":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">Approved</Badge>
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading || !userData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-amber-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-50/50 via-white to-orange-50/50 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-amber-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-orange-900/20 blur-[150px]" />
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
                    onClick={() => router.push("/peon/dashboard")} 
                    variant="ghost" 
                    size="sm" 
                    className="pl-0 hover:bg-transparent hover:text-amber-600 dark:hover:text-amber-400"
                 >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                 </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400 bg-clip-text text-transparent flex items-center gap-3">
              <FileText className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              My Leaves
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Manage your leave requests and view balance
            </p>
          </div>
          <div className="flex gap-3">
             <Button 
                onClick={() => fetchLeaves(userData.id, true)} 
                variant="outline" 
                className="gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-slate-200 dark:border-white/10"
                disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-amber-600 hover:bg-amber-700 text-white gap-2">
                        <Plus className="w-4 h-4" /> Apply for Leave
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Apply for Leave</DialogTitle>
                        <DialogDescription>Submit a request to the Super Admin.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="leaveType">Leave Type</Label>
                            <Select value={formData.leaveType} onValueChange={(value) => setFormData({ ...formData, leaveType: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sick">Sick Leave</SelectItem>
                                    <SelectItem value="casual">Casual Leave</SelectItem>
                                    <SelectItem value="personal">Personal Leave</SelectItem>
                                    <SelectItem value="emergency">Emergency Leave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} min={new Date().toISOString().split("T")[0]} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} min={formData.startDate || new Date().toISOString().split("T")[0]} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Textarea id="reason" placeholder="Why are you taking leave?" value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={submitting} className="bg-amber-600 hover:bg-amber-700">{submitting ? "Submitting..." : "Submit"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* --- Balance Stats --- */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeaveStatCard 
                title="Total Allocated" 
                value={leaveBalance.total_leaves} 
                icon={PieChart} 
                color="blue" 
                subtext="Annual"
            />
            <LeaveStatCard 
                title="Leaves Used" 
                value={leaveBalance.used_leaves} 
                icon={Clock} 
                color="orange" 
                subtext="Consumed"
            />
            <LeaveStatCard 
                title="Remaining" 
                value={leaveBalance.remaining_leaves} 
                icon={CheckCircle2} 
                color="green" 
                subtext="Available"
            />
        </motion.div>

        {/* --- Leave History List --- */}
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
                <h2 className="text-xl font-bold text-foreground dark:text-white">Leave History</h2>
            </div>

            {leaves.length === 0 ? (
                <motion.div variants={itemVariants}>
                    <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                        <CardContent className="p-12 text-center flex flex-col items-center justify-center">
                            <div className="h-16 w-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-muted-foreground">No records found</h3>
                            <p className="text-sm text-muted-foreground/80 mt-1">You haven't applied for any leaves yet.</p>
                        </CardContent>
                    </Card>
                </motion.div>
            ) : (
                <div className="grid gap-4">
                    {leaves.map((leave) => (
                        <motion.div variants={itemVariants} key={leave.id}>
                            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden hover:border-amber-400 dark:hover:border-amber-700 transition-all duration-300">
                                <CardContent className="p-0">
                                    <div className="flex flex-col md:flex-row">
                                        {/* Status Strip */}
                                        <div className={cn("w-full md:w-2 h-2 md:h-auto", 
                                            leave.status === 'approved' ? "bg-green-500" : 
                                            leave.status === 'rejected' ? "bg-red-500" : "bg-yellow-500"
                                        )} />
                                        
                                        <div className="p-5 flex-1 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-semibold text-lg capitalize">{leave.leave_type.replace("_", " ")} Leave</h3>
                                                    {getStatusBadge(leave.status)}
                                                </div>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {leave.total_days} Day(s)
                                                    </span>
                                                </div>
                                                <p className="text-sm mt-2 italic text-foreground/80">"{leave.reason}"</p>
                                                
                                                {leave.rejection_reason && (
                                                    <div className="mt-2 text-sm bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-2 rounded-md border border-red-100 dark:border-red-900/50 flex items-start gap-2">
                                                        <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                        <span><strong>Note:</strong> {leave.rejection_reason}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="text-right text-xs text-muted-foreground self-end md:self-center">
                                                Applied: {new Date(leave.created_at).toLocaleDateString()}
                                            </div>
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

// --- Sub Components ---

function LeaveStatCard({ title, value, icon: Icon, color, subtext }: any) {
    const colors: any = {
        blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
        orange: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
        green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    }
    const colorClass = colors[color]

    return (
        <motion.div variants={itemVariants}>
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardContent className="p-6 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <h3 className="text-3xl font-bold mt-1 text-foreground dark:text-white">{value}</h3>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Info className="w-3 h-3" /> {subtext}
                        </p>
                    </div>
                    <div className={cn("p-4 rounded-xl border", colorClass)}>
                        <Icon className="w-6 h-6" />
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
