"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Package, ClipboardList, TrendingDown, CheckCircle2, AlertCircle, PackagePlus, ArrowLeft, Loader2, History } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface StationeryItem {
  id: number
  name: string
  description: string
  total_quantity: number
  available_quantity: number
  unit: string
  is_low_stock: boolean
}

interface StationeryRequest {
  id: number
  requester_name: string
  requester_type: string
  item_name: string
  unit: string
  quantity: number
  status: string
  created_at: string
  reason?: string
  processed_by?: number
  processed_at?: string
  admin_notes?: string
}

interface StockHistory {
  id: number
  item_id: number
  item_name: string
  quantity_added: number
  added_by_id: number
  added_by_type: string
  added_by_name: string
  added_by_username: string
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

export default function SuperAdminStationery() {
  const [admin, setAdmin] = useState<any>(null)
  const [items, setItems] = useState<StationeryItem[]>([])
  const [requests, setRequests] = useState<StationeryRequest[]>([])
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([])
  const [loading, setLoading] = useState(true)

  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [stockItem, setStockItem] = useState<StationeryItem | null>(null)
  const [stockQuantity, setStockQuantity] = useState("")

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkAuth = () => {
      const adminToken = localStorage.getItem("adminAuth")
      if (!adminToken) {
        router.push("/admin/login")
        return
      }

      const adminData = localStorage.getItem("adminData")
      if (adminData) {
        setAdmin(JSON.parse(adminData))
        fetchData(adminToken)
      }
    }

    checkAuth()
  }, [router])

  const fetchData = async (token: string) => {
    setLoading(true)
    try {
      const [itemsRes, requestsRes, historyRes] = await Promise.all([
        fetch("/api/admin/stationery/items", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/stationery/requests", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/stationery/stock", { headers: { Authorization: `Bearer ${token}` } }),
      ])

      const itemsData = await itemsRes.json()
      const requestsData = await requestsRes.json()
      const historyData = await historyRes.json()

      if (itemsData.success && itemsData.items) setItems(itemsData.items)
      if (requestsData.success && requestsData.requests) setRequests(requestsData.requests)
      if (historyData.success && historyData.history) setStockHistory(historyData.history)
      
    } catch (error) {
      console.error("Error fetching admin stationery data:", error)
      toast({ title: "Error", description: "Failed to fetch stationery records", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddStock = async () => {
    if (!stockItem || !stockQuantity || Number.parseInt(stockQuantity) <= 0) {
      toast({ title: "Error", description: "Please enter a valid quantity", variant: "destructive" })
      return
    }

    try {
      const token = localStorage.getItem("adminAuth")
      const response = await fetch("/api/admin/stationery/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemId: stockItem.id,
          quantityToAdd: Number.parseInt(stockQuantity),
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: `Added ${stockQuantity} ${stockItem.unit} to ${stockItem.name}` })
        setIsStockDialogOpen(false)
        setStockItem(null)
        setStockQuantity("")
        fetchData(token!)
      } else {
        toast({ title: "Error", description: data.error || "Failed to add stock", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error adding stock:", error)
      toast({ title: "Error", description: "Failed to add stock", variant: "destructive" })
    }
  }

  const openStockDialog = (item: StationeryItem) => {
    setStockItem(item)
    setStockQuantity("")
    setIsStockDialogOpen(true)
  }

  if (loading || !admin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
      </div>
    )
  }

  const lowStockCount = items.filter((i) => i.is_low_stock).length
  const pendingCount = requests.filter((r) => r.status === "pending").length

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
              <Package className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Stationery Overview
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Full visibility of system-wide inventory and requests
            </p>
          </div>
        </motion.div>

        {/* --- Stats Grid --- */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Inventory" value={`${items.length} Items`} icon={Package} color="indigo" />
          <StatCard title="Low Stock" value={lowStockCount} icon={TrendingDown} color="orange" subtext="Warnings" />
          <StatCard title="Pending Requests" value={pendingCount} icon={ClipboardList} color="blue" />
          <StatCard title="Total Requests" value={requests.length} icon={CheckCircle2} color="green" />
        </motion.div>

        {/* --- Main Content Tabs --- */}
        <Tabs defaultValue="inventory" className="w-full">
          <TabsList className="bg-slate-100 dark:bg-zinc-900 grid w-full grid-cols-3 max-w-[600px] mb-6">
            <TabsTrigger value="inventory">Inventory Records</TabsTrigger>
            <TabsTrigger value="requests">Request History</TabsTrigger>
            <TabsTrigger value="stock-history">Stock History</TabsTrigger>
          </TabsList>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <motion.div variants={itemVariants}>
                <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden">
                <CardHeader>
                    <CardTitle>Global Inventory List</CardTitle>
                    <CardDescription>Real-time stock levels across all stationery items</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                    <TableHeader className="bg-slate-50 dark:bg-white/5">
                        <TableRow className="border-slate-100 dark:border-white/5 hover:bg-transparent">
                        <TableHead className="pl-6">Item Name</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Total Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                <Package className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                No inventory items found
                            </TableCell>
                        </TableRow>
                        ) : (
                        items.map((item) => (
                            <TableRow key={item.id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                            <TableCell className="pl-6 font-medium text-foreground dark:text-white">{item.name}</TableCell>
                            <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                            <TableCell>
                                <span className={cn("font-bold", item.is_low_stock ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400")}>
                                    {item.available_quantity}
                                </span>
                            </TableCell>
                            <TableCell>{item.total_quantity}</TableCell>
                            <TableCell>
                                {item.is_low_stock ? (
                                <Badge variant="destructive" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 gap-1">
                                    <AlertCircle className="w-3 h-3" /> Low Stock
                                </Badge>
                                ) : (
                                <Badge variant="default" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-100">
                                    Healthy
                                </Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <Button variant="outline" size="sm" onClick={() => openStockDialog(item)} className="gap-1 bg-white/50 dark:bg-zinc-900/50 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600">
                                <PackagePlus className="w-4 h-4" /> Add Stock
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
            </motion.div>
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests">
             <motion.div variants={itemVariants}>
                <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden">
                <CardHeader>
                    <CardTitle>System-wide Requests</CardTitle>
                    <CardDescription>Historical log of all stationery requests and approvals</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                    <TableHeader className="bg-slate-50 dark:bg-white/5">
                        <TableRow className="border-slate-100 dark:border-white/5 hover:bg-transparent">
                        <TableHead className="pl-6">Requester</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Processed By</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                No requests found
                            </TableCell>
                        </TableRow>
                        ) : (
                        requests.map((request) => (
                            <TableRow key={request.id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                            <TableCell className="pl-6 font-medium text-foreground dark:text-white">{request.requester_name}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-slate-400 border-slate-200">
                                {request.requester_type.replace("_", " ")}
                                </Badge>
                            </TableCell>
                            <TableCell>{request.item_name}</TableCell>
                            <TableCell>{request.quantity} {request.unit}</TableCell>
                            <TableCell>
                                {request.status === "pending" && <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200">Pending</Badge>}
                                {request.status === "approved" && <Badge variant="default" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 hover:bg-emerald-100">Approved</Badge>}
                                {request.status === "rejected" && <Badge variant="destructive" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 hover:bg-red-100">Rejected</Badge>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(request.created_at).toLocaleDateString()}</TableCell>
                            <TableCell className="text-sm text-muted-foreground italic">
                                {request.processed_by ? `User ID: ${request.processed_by}` : "-"}
                            </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
             </motion.div>
          </TabsContent>

          {/* Stock History Tab */}
          <TabsContent value="stock-history">
             <motion.div variants={itemVariants}>
                <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md overflow-hidden">
                <CardHeader>
                    <CardTitle>Stock Addition History</CardTitle>
                    <CardDescription>Complete audit log of all stock additions and updates</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                    <TableHeader className="bg-slate-50 dark:bg-white/5">
                        <TableRow className="border-slate-100 dark:border-white/5 hover:bg-transparent">
                        <TableHead className="pl-6">Date & Time</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Quantity Added</TableHead>
                        <TableHead>Added By</TableHead>
                        <TableHead>User Type</TableHead>
                        <TableHead>Username</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stockHistory.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                No stock history found
                            </TableCell>
                        </TableRow>
                        ) : (
                        stockHistory.map((entry) => (
                            <TableRow key={entry.id} className="border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5">
                            <TableCell className="pl-6 text-sm text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</TableCell>
                            <TableCell className="font-medium text-foreground dark:text-white">{entry.item_name}</TableCell>
                            <TableCell className="text-emerald-600 font-bold">+{entry.quantity_added}</TableCell>
                            <TableCell>{entry.added_by_name}</TableCell>
                            <TableCell>
                                <Badge variant="outline" className="capitalize bg-slate-100 dark:bg-zinc-900 border-slate-200">
                                {entry.added_by_type.replace("_", " ")}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{entry.added_by_username}</TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                    </Table>
                </CardContent>
                </Card>
             </motion.div>
          </TabsContent>
        </Tabs>

        {/* Add Stock Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Stock</DialogTitle>
              <DialogDescription>Update inventory for <span className="font-semibold text-foreground">{stockItem?.name}</span></DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-center bg-slate-100 dark:bg-zinc-900 p-3 rounded-lg">
                <span className="text-sm font-medium">Current Stock</span>
                <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                  {stockItem?.available_quantity} <span className="text-sm font-normal text-muted-foreground">{stockItem?.unit}</span>
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock-quantity">Quantity to Add</Label>
                <Input
                  id="stock-quantity"
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="Enter amount"
                  className="bg-white dark:bg-black"
                />
              </div>
              {stockQuantity && Number.parseInt(stockQuantity) > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  New total will be: <span className="font-bold">{(stockItem?.available_quantity || 0) + Number.parseInt(stockQuantity)}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsStockDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddStock} className="bg-indigo-600 hover:bg-indigo-700">Confirm Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </motion.div>
    </div>
  )
}

// --- Sub Components ---

function StatCard({ title, value, icon: Icon, color, subtext }: any) {
    const colors: any = {
        indigo: "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
        orange: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
        blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
        green: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    }
    const colorClass = colors[color]

    return (
        <motion.div variants={itemVariants}>
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardContent className="p-5 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <h3 className="text-3xl font-bold mt-2 text-foreground dark:text-white">{value}</h3>
                        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
                    </div>
                    <div className={cn("p-3 rounded-xl border", colorClass)}>
                        <Icon className="w-6 h-6" />
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}
