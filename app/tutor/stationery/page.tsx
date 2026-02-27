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
  Package, 
  Send, 
  History, 
  ArrowLeft, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
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
  name: string
  unit: string
  quantity: number
  status: string
  created_at: string
  reason: string
  processed_by_name?: string
  processed_at?: string
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

export default function TutorStationery() {
  const [tutor, setTutor] = useState<any>(null)
  const [items, setItems] = useState<StationeryItem[]>([])
  const [requests, setRequests] = useState<StationeryRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    itemId: "",
    quantityRequested: "",
    purpose: "",
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkAuth = () => {
      const tutorAuth = localStorage.getItem("tutorAuth")
      if (!tutorAuth) {
        router.push("/tutor/login")
        return
      }

      try {
        setTutor(JSON.parse(tutorAuth))
        fetchData()
      } catch (error) {
        console.error("Failed to parse tutor auth:", error)
        router.push("/tutor/login")
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
      const token = localStorage.getItem("tutorToken") || ""
      const response = await fetch("/api/tutor/stationery/items", {
        headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem("tutorToken") || ""
      const response = await fetch("/api/tutor/stationery/requests", {
        headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem("tutorToken") || ""
      const response = await fetch("/api/tutor/stationery/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

  if (loading || !tutor) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-violet-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-50/50 via-white to-fuchsia-50/50 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-900/20 blur-[150px]" />
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
                    onClick={() => router.push("/tutor/dashboard")} 
                    variant="ghost" 
                    size="sm" 
                    className="pl-0 hover:bg-transparent hover:text-violet-600 dark:hover:text-violet-400"
                 >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
                 </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-violet-700 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-300 bg-clip-text text-transparent flex items-center gap-3">
              <Package className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              Stationery Requests
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Submit and track supply requests for your department
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Request Form */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm border-t-4 border-t-violet-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  New Request
                </CardTitle>
                <CardDescription>Select an item and specify the quantity</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="item">Stationery Item *</Label>
                    <Select
                      value={formData.itemId}
                      onValueChange={(value) => setFormData({ ...formData, itemId: value })}
                    >
                      <SelectTrigger className="bg-white/50 dark:bg-zinc-900/50">
                        <SelectValue placeholder="Select an item" />
                      </SelectTrigger>
                      <SelectContent>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name} <span className="text-muted-foreground text-xs ml-2">({item.available_quantity} {item.unit} available)</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      className="bg-white/50 dark:bg-zinc-900/50"
                      value={formData.quantityRequested}
                      onChange={(e) => setFormData({ ...formData, quantityRequested: e.target.value })}
                      placeholder="Enter quantity"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose (Optional)</Label>
                    <Textarea
                      id="purpose"
                      className="bg-white/50 dark:bg-zinc-900/50 resize-none"
                      value={formData.purpose}
                      onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                      placeholder="Reason for request..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full bg-violet-600 hover:bg-violet-700 text-white" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {submitting ? "Submitting..." : "Submit Request"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Request History */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  Request History
                </CardTitle>
                <CardDescription>Track status of your submitted requests</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                        <TableHead className="pl-6">Item Details</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Processed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                             <Package className="w-10 h-10 mb-2 opacity-20" />
                             <p>No requests submitted yet</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      requests.map((request) => (
                        <TableRow key={request.id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                          <TableCell className="pl-6 font-medium">
                             {request.name}
                             {request.reason && <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">{request.reason}</p>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-slate-100 dark:bg-zinc-900 border-slate-200">
                                {request.quantity} {request.unit}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.status === "pending" && (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200">
                                    <Clock className="w-3 h-3 mr-1" /> Pending
                                </Badge>
                            )}
                            {request.status === "approved" && (
                                <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 hover:bg-green-100">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Approved
                                </Badge>
                            )}
                            {request.status === "rejected" && (
                                <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 hover:bg-red-100">
                                    <XCircle className="w-3 h-3 mr-1" /> Rejected
                                </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                             {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                             {request.processed_by_name ? (
                                 <span>{request.processed_by_name}<br/>{new Date(request.processed_at!).toLocaleDateString()}</span>
                             ) : "-"}
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
