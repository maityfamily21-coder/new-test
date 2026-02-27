"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import {
  Package,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardList,
  TrendingDown,
  PackagePlus,
  History,
  ArrowLeft,
  Box,
  RefreshCw,
  CheckCircle2,
} from "lucide-react"

// --- Interfaces ---
interface StationeryItem {
  id: number
  name: string
  description: string
  total_quantity: number
  available_quantity: number
  unit: string
}

interface StationeryRequest {
  id: number
  requester_name: string
  requester_type: string
  name: string
  unit: string
  quantity: number
  status: string
  created_at: string
  reason: string
  available_quantity: number
  forwarded_by_name?: string
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

export default function TechnicalStationeryManagement() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [items, setItems] = useState<StationeryItem[]>([])
  const [requests, setRequests] = useState<StationeryRequest[]>([])
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"inventory" | "requests" | "request-history" | "stock-history">(
    "inventory",
  )
  const [refreshing, setRefreshing] = useState(false)

  // Dialog States
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<StationeryItem | null>(null)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [stockItem, setStockItem] = useState<StationeryItem | null>(null)
  const [stockQuantity, setStockQuantity] = useState("")
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false)
  const [reviewingRequest, setReviewingRequest] = useState<StationeryRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    total_quantity: "",
    unit: "pieces",
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("technicalTeamAuth")
      const data = localStorage.getItem("technicalTeamData")

      if (!token || !data) {
        router.push("/technical/login")
        return
      }

      try {
        setUserData(JSON.parse(data))
        setIsAuthenticated(true)
        fetchData()
      } catch (error) {
        console.error("Failed to parse technical team data:", error)
        router.push("/technical/login")
      }
    }

    checkAuth()
  }, [router])

  const fetchData = async () => {
    setRefreshing(true)
    await Promise.all([fetchItems(), fetchRequests(), fetchStockHistory()])
    setLoading(false)
    setRefreshing(false)
  }

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch("/api/technical/stationery/items", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) setItems(data.items)
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch items", variant: "destructive" })
    }
  }

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch("/api/technical/stationery/requests?status=all", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) setRequests(data.requests)
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch requests", variant: "destructive" })
    }
  }

  const fetchStockHistory = async () => {
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch("/api/technical/stationery/stock", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) setStockHistory(data.history)
    } catch (error) {
      toast({ title: "Error", description: "Failed to fetch stock history", variant: "destructive" })
    }
  }

  // ... (Keep existing handlers: handleAddStock, handleAddItem, handleEditItem, handleReviewRequest)
  // Re-implementing simplified versions for brevity while keeping functionality

  const handleAddStock = async () => {
    if (!stockItem || !stockQuantity || Number.parseInt(stockQuantity) <= 0) return
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch("/api/technical/stationery/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itemId: stockItem.id, quantityToAdd: Number.parseInt(stockQuantity) }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Stock updated successfully" })
        setIsStockDialogOpen(false)
        setStockItem(null)
        setStockQuantity("")
        fetchData()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update stock", variant: "destructive" })
    }
  }

  const handleAddItem = async () => {
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch("/api/technical/stationery/items", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Item added successfully" })
        setIsAddDialogOpen(false)
        setFormData({ name: "", description: "", total_quantity: "", unit: "pieces" })
        fetchItems()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add item", variant: "destructive" })
    }
  }

  const handleEditItem = async () => {
    if (!editingItem) return
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch(`/api/technical/stationery/items/${editingItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, available_quantity: editingItem.available_quantity }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Item updated successfully" })
        setIsEditDialogOpen(false)
        setEditingItem(null)
        setFormData({ name: "", description: "", total_quantity: "", unit: "pieces" })
        fetchItems()
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" })
    }
  }

  const handleReviewRequest = async (action: "approve" | "reject") => {
    if (!reviewingRequest) return
    if (action === "reject" && !rejectionReason.trim()) {
      toast({ title: "Error", description: "Rejection reason required", variant: "destructive" })
      return
    }
    try {
      const token = localStorage.getItem("technicalTeamAuth")
      const response = await fetch(`/api/technical/stationery/requests/${reviewingRequest.id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, reason: action === "reject" ? rejectionReason : null }),
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: `Request ${action}d` })
        setIsReviewDialogOpen(false)
        setReviewingRequest(null)
        setRejectionReason("")
        fetchData()
      }
    } catch (error) {
      toast({ title: "Error", description: "Action failed", variant: "destructive" })
    }
  }

  // Dialog Openers
  const openStockDialog = (item: StationeryItem) => {
    setStockItem(item)
    setStockQuantity("")
    setIsStockDialogOpen(true)
  }
  const openEditDialog = (item: StationeryItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || "",
      total_quantity: item.total_quantity.toString(),
      unit: item.unit,
    })
    setIsEditDialogOpen(true)
  }
  const openReviewDialog = (request: StationeryRequest) => {
    setReviewingRequest(request)
    setIsReviewDialogOpen(true)
  }

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-emerald-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  const lowStockItems = items.filter((item) => item.available_quantity < 10)
  const pendingRequests = requests.filter((req) => req.status === "pending" || req.status === "forwarded")
  const processedRequests = requests.filter((req) => req.status === "approved" || req.status === "rejected")

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50 dark:hidden" />
        <div className="hidden dark:block absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="hidden dark:block absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/20 blur-[150px]" />
        <div className="hidden dark:block absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[150px]" />
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
                onClick={() => router.push("/technical/dashboard")}
                variant="ghost"
                size="sm"
                className="pl-0 hover:bg-transparent hover:text-emerald-600 dark:hover:text-emerald-400"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
              </Button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent flex items-center gap-3">
              <Package className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              Stationery Management
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Inventory tracking and request fulfillment
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => fetchData()}
              variant="outline"
              className="gap-2 bg-white/50 dark:bg-white/5 backdrop-blur-sm border-slate-200 dark:border-white/10"
              disabled={refreshing}
            >
              <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
              Refresh Data
            </Button>
          </div>
        </motion.div>

        {/* --- Stats Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard title="Total Items" value={items.length} icon={Box} color="blue" />
          <StatCard title="Low Stock" value={lowStockItems.length} icon={TrendingDown} color="orange" />
          <StatCard title="Pending Requests" value={pendingRequests.length} icon={ClipboardList} color="emerald" />
          <StatCard title="Total Requests" value={requests.length} icon={History} color="purple" />
        </div>

        {/* --- Low Stock Alert --- */}
        {lowStockItems.length > 0 && (
          <motion.div variants={itemVariants}>
            <Card className="border-l-4 border-l-orange-500 border-y-0 border-r-0 rounded-r-lg bg-orange-50/50 dark:bg-orange-950/20 shadow-sm">
              <CardContent className="p-4 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-1" />
                <div>
                  <h3 className="font-semibold text-orange-900 dark:text-orange-200">Attention Needed: Low Stock</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {lowStockItems.map((item) => (
                      <Badge
                        key={item.id}
                        variant="outline"
                        className="border-orange-200 bg-white/50 text-orange-700 dark:border-orange-800 dark:bg-black/20 dark:text-orange-300"
                      >
                        {item.name}: {item.available_quantity} left
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* --- Tabs Navigation --- */}
        <motion.div variants={itemVariants} className="flex p-1 bg-slate-100 dark:bg-zinc-900/50 rounded-xl w-fit">
          <TabButton
            active={activeTab === "inventory"}
            onClick={() => setActiveTab("inventory")}
            icon={Package}
            label="Inventory"
          />
          <TabButton
            active={activeTab === "requests"}
            onClick={() => setActiveTab("requests")}
            icon={ClipboardList}
            label="Requests"
            badge={pendingRequests.length}
          />
          <TabButton
            active={activeTab === "request-history"}
            onClick={() => setActiveTab("request-history")}
            icon={CheckCircle}
            label="Request History"
          />
          <TabButton
            active={activeTab === "stock-history"}
            onClick={() => setActiveTab("stock-history")}
            icon={History}
            label="Stock History"
          />
        </motion.div>

        {/* --- Main Content Content --- */}
        <motion.div
          variants={itemVariants}
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "inventory" && (
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
                <div>
                  <CardTitle>Inventory List</CardTitle>
                  <CardDescription>Manage current stock levels</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                      <Plus className="w-4 h-4" /> Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Item</DialogTitle>
                      <DialogDescription>Create a new stationery item entry</DialogDescription>
                    </DialogHeader>
                    {/* Add Item Form Inputs (Simplified Layout) */}
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Item Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. A4 Paper"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea
                          id="desc"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>Total Quantity</Label>
                          <Input
                            type="number"
                            value={formData.total_quantity}
                            onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>Unit</Label>
                          <Select value={formData.unit} onValueChange={(v) => setFormData({ ...formData, unit: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pieces">Pieces</SelectItem>
                              <SelectItem value="boxes">Boxes</SelectItem>
                              <SelectItem value="packets">Packets</SelectItem>
                              <SelectItem value="reams">Reams</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddItem}>Save Item</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 dark:border-white/5 hover:bg-transparent">
                      <TableHead className="pl-6">Item Name</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Available</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} className="border-slate-100 dark:border-white/5">
                        <TableCell className="pl-6 font-medium">
                          <div>{item.name}</div>
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        </TableCell>
                        <TableCell>
                          {item.total_quantity} {item.unit}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "font-mono font-bold",
                              item.available_quantity < 10 ? "text-orange-600" : "text-emerald-600",
                            )}
                          >
                            {item.available_quantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.available_quantity < 10 ? (
                            <Badge
                              variant="destructive"
                              className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200"
                            >
                              Low Stock
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              In Stock
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openStockDialog(item)}
                              className="h-8 gap-1"
                            >
                              <PackagePlus className="w-3.5 h-3.5" /> Stock
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(item)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeTab === "requests" && (
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
              <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-3">
                <CardTitle>Request Queue</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 dark:border-white/5">
                      <TableHead className="pl-6">Requester</TableHead>
                      <TableHead>Item Requested</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Forwarded By</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead className="text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow
                        key={request.id}
                        className="border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5"
                      >
                        <TableCell className="pl-6 font-medium text-foreground dark:text-white">
                          {request.requester_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{request.name}</TableCell>
                        <TableCell className="text-center text-sm">
                          {request.quantity} {request.unit}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "capitalize font-medium",
                              request.status === "pending"
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800"
                                : request.status === "approved"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                                  : request.status === "rejected"
                                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                                    : request.status === "forwarded" && request.forwarded_by_name
                                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                                      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/20 dark:text-slate-400 dark:border-slate-800",
                            )}
                          >
                            {request.status === "forwarded" && request.forwarded_by_name
                              ? `Forwarded by ${request.forwarded_by_name}`
                              : request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm font-medium">
                          {request.requester_type === "personnel" ? (
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                            >
                              Direct
                            </Badge>
                          ) : request.forwarded_by_name ? (
                            <span className="text-blue-700 dark:text-blue-400">{request.forwarded_by_name}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs md:text-sm text-muted-foreground">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-medium">{new Date(request.created_at).toLocaleDateString()}</span>
                            <span className="text-xs opacity-75">
                              {new Date(request.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {(request.status === "pending" || request.status === "forwarded") && (
                            <Button
                              onClick={() => openReviewDialog(request)}
                              size="sm"
                              variant="outline"
                              className="gap-2 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-900/20"
                            >
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {activeTab === "request-history" && (
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
              <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-3">
                <CardTitle>Request History</CardTitle>
                <CardDescription>All approved and rejected requests</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {processedRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CheckCircle className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                    <p className="text-muted-foreground">No processed requests yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-100 dark:border-white/5">
                        <TableHead className="pl-6">Requester</TableHead>
                        <TableHead>Item Requested</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right pr-6">Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedRequests.map((req) => (
                        <TableRow key={req.id} className="border-slate-100 dark:border-white/5">
                          <TableCell className="pl-6">
                            <div className="font-medium">{req.requester_name}</div>
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                              {req.requester_type}
                            </Badge>
                          </TableCell>
                          <TableCell>{req.name}</TableCell>
                          <TableCell>
                            {req.quantity} {req.unit}
                          </TableCell>
                          <TableCell>
                            {req.status === "approved" && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800"
                              >
                                Approved
                              </Badge>
                            )}
                            {req.status === "rejected" && (
                              <Badge
                                variant="outline"
                                className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                              >
                                Rejected
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(req.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            {req.reason ? (
                              <span className="text-xs text-slate-500 dark:text-slate-400 italic max-w-xs truncate">
                                {req.reason}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "stock-history" && (
            <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
              <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-3">
                <CardTitle>Stock History</CardTitle>
                <CardDescription>All stock additions and changes</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-100 dark:border-white/5">
                      <TableHead className="pl-6">Date</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Change</TableHead>
                      <TableHead>User</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockHistory.map((hist) => (
                      <TableRow key={hist.id} className="border-slate-100 dark:border-white/5">
                        <TableCell className="pl-6 text-sm text-muted-foreground">
                          {new Date(hist.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="font-medium">{hist.item_name}</TableCell>
                        <TableCell className="text-emerald-600 font-bold">+{hist.quantity_added}</TableCell>
                        <TableCell className="text-sm">
                          {hist.added_by_name}{" "}
                          <span className="text-xs text-muted-foreground">({hist.added_by_type})</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* --- Shared Dialogs (Add Stock, Edit, Review) --- */}
        {/* Add Stock Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Stock</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <div className="flex justify-between mb-4 p-3 bg-slate-50 rounded-lg">
                <span className="text-sm">Current Stock:</span>
                <span className="font-bold">
                  {stockItem?.available_quantity} {stockItem?.unit}
                </span>
              </div>
              <div className="space-y-2">
                <Label>Quantity to Add</Label>
                <Input
                  type="number"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
              {stockQuantity && Number.parseInt(stockQuantity) > 0 && (
                // CHANGE IS HERE: Added "mt-4" to the beginning of className
                <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  New total will be:{" "}
                  <span className="font-bold">
                    {(stockItem?.available_quantity || 0) + Number.parseInt(stockQuantity)}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={handleAddStock}>Confirm Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Review Request</DialogTitle>
            </DialogHeader>
            {reviewingRequest && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-slate-50 dark:bg-white/5 rounded-lg border border-slate-100 dark:border-white/5">
                  <div>
                    <span className="text-muted-foreground">Item:</span>{" "}
                    <span className="font-semibold block">{reviewingRequest.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Qty:</span>{" "}
                    <span className="font-semibold block">
                      {reviewingRequest.quantity} {reviewingRequest.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Requester:</span>{" "}
                    <span className="font-semibold block">{reviewingRequest.requester_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stock:</span>{" "}
                    <span
                      className={cn(
                        "font-semibold block",
                        reviewingRequest.available_quantity < reviewingRequest.quantity
                          ? "text-red-500"
                          : "text-emerald-600",
                      )}
                    >
                      {reviewingRequest.available_quantity} available
                    </span>
                  </div>
                  {reviewingRequest.reason && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Reason:</span>{" "}
                      <p className="mt-1">{reviewingRequest.reason}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Rejection Reason (Optional)</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Why is this being rejected?"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="destructive" onClick={() => handleReviewRequest("reject")} className="gap-2">
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Button
                onClick={() => handleReviewRequest("approve")}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="w-4 h-4" /> Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog (Reused logic from Add, simplified) */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Total Qty</Label>
                <Input
                  type="number"
                  value={formData.total_quantity}
                  onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleEditItem}>Update</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

// --- Sub Components ---
function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  }
  return (
    <motion.div variants={itemVariants}>
      <Card className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
        <CardContent className="p-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-3xl font-bold mt-2 text-foreground dark:text-white">{value}</h3>
          </div>
          <div className={cn("p-3 rounded-xl", colors[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function TabButton({ active, onClick, icon: Icon, label, badge }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-zinc-800/50",
      )}
    >
      <Icon className="w-4 h-4" />
      {label}
      {badge > 0 && (
        <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
          {badge}
        </span>
      )}
    </button>
  )
}
