"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { 
  Send, 
  History, 
  Package, 
  ArrowLeft, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Loader2
} from "lucide-react"

// --- Interfaces ---
interface StationeryItem {
  id: number
  name: string
  description: string
  available_quantity: number
  unit: string
}

interface StationeryRequest {
  id: number
  itemName: string
  unit: string
  quantityRequested: number
  status: string
  requestDate: string
  purpose: string
  reviewedByName?: string
  reviewedAt?: string
  rejectionReason?: string
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

export default function PersonnelStationery() {
  const [personnel, setPersonnel] = useState<any>(null)
  const [items, setItems] = useState<StationeryItem[]>([])
  const [requests, setRequests] = useState<StationeryRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const [formData, setFormData] = useState({
    itemId: "",
    quantityRequested: "",
    purpose: "",
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem("adminPersonnelAuth")
      const data = localStorage.getItem("adminPersonnelData")

      if (!auth || !data) {
        router.push("/admin-personnel/login")
        return
      }

      try {
        setPersonnel(JSON.parse(data))
        fetchData()
      } catch (error) {
        console.error("Failed to parse personnel data:", error)
        router.push("/admin-personnel/login")
      }
    }

    checkAuth()
  }, [router])

  const fetchData = async () => {
    setRefreshing(true)
    await Promise.all([fetchItems(), fetchRequests()])
    setLoading(false)
    setRefreshing(false)
  }

  const fetchItems = async () => {
    try {
      const auth = localStorage.getItem("adminPersonnelAuth")
      const response = await fetch("/api/admin-personnel/stationery/items", {
        headers: { Authorization: `Bearer ${auth}` },
      })
      const data = await response.json()
      if (data.success) {
        setItems(data.items)
      }
    } catch (error) {
      console.error("Error fetching items:", error)
    }
  }

  const fetchRequests = async () => {
    try {
      const auth = localStorage.getItem("adminPersonnelAuth")
      const response = await fetch("/api/admin-personnel/stationery/requests", {
        headers: { Authorization: `Bearer ${auth}` },
      })
      const data = await response.json()
      if (data.success) {
        setRequests(data.requests)
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.itemId || !formData.quantityRequested) {
      toast({ title: "Error", description: "Please select an item and quantity", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const auth = localStorage.getItem("adminPersonnelAuth")
      const response = await fetch("/api/admin-personnel/stationery/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Stationery request submitted successfully" })
        setFormData({ itemId: "", quantityRequested: "", purpose: "" })
        fetchRequests()
      } else {
        toast({ title: "Error", description: data.error || "Failed to submit request", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error submitting request:", error)
      toast({ title: "Error", description: "Failed to submit request", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !personnel) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const approvedCount = requests.filter(r => r.status === 'approved').length

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
              <Package className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Stationery Portal
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Submit and track your office supply requests
            </p>
          </div>
          <div className="flex gap-3">
             <Button 
                onClick={fetchData} 
                variant="outline" 
                className="gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-slate-200 dark:border-white/10"
                disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* --- Stats Overview (Optional but fits theme) --- */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                        <p className="text-2xl font-bold">{requests.length}</p>
                    </div>
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600">
                        <History className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
                    </div>
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg text-amber-600">
                        <Clock className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">Approved</p>
                        <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
                    </div>
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg text-emerald-600">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </CardContent>
            </Card>
        </motion.div>

        {/* --- Main Content Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* New Request Form */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm border-t-4 border-t-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  New Requisition
                </CardTitle>
                <CardDescription>Request items from inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Item *</Label>
                    <Select
                      value={formData.itemId}
                      onValueChange={(value) => setFormData({ ...formData, itemId: value })}
                    >
                      <SelectTrigger className="bg-white/50 dark:bg-zinc-900/50">
                        <SelectValue placeholder="Choose inventory item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} <span className="text-muted-foreground text-xs ml-2">({item.available_quantity} {item.unit} avail)</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      className="bg-white/50 dark:bg-zinc-900/50"
                      value={formData.quantityRequested}
                      onChange={(e) => setFormData({ ...formData, quantityRequested: e.target.value })}
                      placeholder="Amount needed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Purpose</Label>
                    <Textarea
                      className="bg-white/50 dark:bg-zinc-900/50 resize-none"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      placeholder="Briefly describe what this is for..."
                      rows={4}
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* History Table */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Request History
                </CardTitle>
                <CardDescription>Status of your previous requests</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                      <TableHead className="pl-6">Item Details</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                             <FileText className="w-10 h-10 mb-2 opacity-20" />
                             <p>No requests found in history</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                          <TableCell className="pl-6">
                             <div className="font-medium">{request.itemName}</div>
                             {request.rejectionReason && (
                                 <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={request.rejectionReason}>
                                     Note: {request.rejectionReason}
                                 </p>
                             )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-100 dark:bg-zinc-900 border-slate-200">
                                {request.quantityRequested} {request.unit}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.status === "pending" && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200">Pending</Badge>
                            )}
                            {request.status === "approved" && (
                                <Badge variant="default" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-100">Approved</Badge>
                            )}
                            {request.status === "rejected" && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 hover:bg-red-100">Rejected</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                             {new Date(request.requestDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </motion.div>
    </div>
  )
}
