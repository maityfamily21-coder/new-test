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
import { Calendar, Plus, Trash2, AlertCircle, ArrowLeft, Loader2, Sparkles, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { cn } from "@/lib/utils"

// --- Interfaces ---
interface Holiday {
  id: string | number
  holiday_date: string
  holiday_name: string
  holiday_type: "default" | "custom"
  description?: string
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

export default function HolidaysPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [adminData, setAdminData] = useState<any>(null)
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMonth, setSelectedMonth] = useState("all")
  const [isAuthChecking, setIsAuthChecking] = useState(true)

  const [formData, setFormData] = useState({
    holidayDate: "",
    holidayName: "",
    description: "",
  })

  useEffect(() => {
    try {
      const admin = JSON.parse(localStorage.getItem("adminData") || "{}")
      if (admin && admin.id) {
        setAdminData(admin)
        setIsAuthChecking(false)
        fetchHolidays()
      } else {
        setIsAuthChecking(false)
        router.push("/admin/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      setIsAuthChecking(false)
      router.push("/admin/login")
    }
  }, [router])

  useEffect(() => {
    if (adminData) {
      fetchHolidays()
    }
  }, [selectedYear, selectedMonth])

  const fetchHolidays = async () => {
    try {
      setLoading(true)
      let url = `/api/holidays/list?year=${selectedYear}&_cache=${Date.now()}`
      if (selectedMonth && selectedMonth !== "all") {
        url += `&month=${selectedMonth}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (data.success) {
        setHolidays(data.allHolidays || [])
      }
    } catch (error) {
      console.error("Error fetching holidays:", error)
      toast({ title: "Error", description: "Failed to fetch holidays", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.holidayDate || !formData.holidayName) {
      toast({ title: "Error", description: "Date and name are required", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/holidays/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          adminId: adminData?.id,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: "Success", description: "Holiday added successfully" })
        setIsDialogOpen(false)
        setFormData({ holidayDate: "", holidayName: "", description: "" })
        fetchHolidays()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add holiday", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteHoliday = async (holidayDate: string) => {
    if (!confirm("Are you sure you want to delete this custom holiday?")) return

    try {
      const response = await fetch("/api/holidays/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holidayDate }),
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: "Success", description: "Holiday deleted successfully" })
        fetchHolidays()
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete holiday", variant: "destructive" })
    }
  }

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
      </div>
    )
  }

  if (!adminData) return null

  const groupedHolidays = holidays.reduce(
    (acc, holiday) => {
      const month = new Date(holiday.holiday_date).toLocaleString("default", { month: "long", year: "numeric" })
      if (!acc[month]) acc[month] = []
      acc[month].push(holiday)
      return acc
    },
    {} as Record<string, Holiday[]>,
  )

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
              <Calendar className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              Holiday Management
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400">
              Configure system-wide holidays and non-working days
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                <Plus className="w-4 h-4" /> Add Custom Holiday
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Custom Holiday</DialogTitle>
                <DialogDescription>Add a new holiday to the academic calendar.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddHoliday} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Holiday Date</Label>
                  <Input
                    type="date"
                    value={formData.holidayDate}
                    onChange={(e) => setFormData({ ...formData, holidayDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Holiday Name</Label>
                  <Input
                    placeholder="e.g., Founder's Day"
                    value={formData.holidayName}
                    onChange={(e) => setFormData({ ...formData, holidayName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Additional notes..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700">
                    {submitting ? "Adding..." : "Add Holiday"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* --- Filters & Info --- */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><Filter className="w-5 h-5 text-indigo-500" /> Filter Calendar</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Year</Label>
                        <Input
                            type="number"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            min="2024"
                            max="2030"
                            className="bg-white dark:bg-zinc-900"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Month</Label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="bg-white dark:bg-zinc-900">
                                <SelectValue placeholder="Select Month" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Months</SelectItem>
                                {Array.from({ length: 12 }, (_, i) => (
                                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                                        {new Date(2024, i).toLocaleString("default", { month: "long" })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-indigo-900 dark:text-indigo-200">
                        <AlertCircle className="w-5 h-5" /> Default Policy
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-indigo-800 dark:text-indigo-300">
                    <p className="mb-2">The system automatically considers the following as non-working days:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                        <li>All Sundays</li>
                        <li>2nd Saturday of every month</li>
                        <li>4th Saturday of every month</li>
                    </ul>
                </CardContent>
            </Card>
        </motion.div>

        {/* --- Holidays List --- */}
        <div className="space-y-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
          ) : Object.keys(groupedHolidays).length === 0 ? (
            <motion.div variants={itemVariants}>
                <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                    <CardContent className="p-12 text-center">
                        <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">No holidays found for the selected period.</p>
                    </CardContent>
                </Card>
            </motion.div>
          ) : (
            Object.entries(groupedHolidays).map(([month, monthHolidays]) => (
              <motion.div variants={itemVariants} key={month}>
                <div className="flex items-center gap-2 mb-4">
                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                    <h3 className="text-xl font-bold text-foreground dark:text-white px-4 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        {month}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthHolidays.map((holiday) => (
                    <Card key={`${holiday.holiday_date}-${holiday.holiday_type}`} className="bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors">
                      <CardContent className="p-5 flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-lg">{holiday.holiday_name}</h4>
                            <Badge variant={holiday.holiday_type === "custom" ? "default" : "secondary"} className={cn(holiday.holiday_type === 'custom' ? "bg-indigo-600" : "")}>
                              {holiday.holiday_type === "custom" ? "Custom" : "Default"}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                             <Calendar className="w-4 h-4" />
                             <span>
                                {new Date(holiday.holiday_date).toLocaleDateString("en-US", {
                                    weekday: "long",
                                    month: "short",
                                    day: "numeric"
                                })}
                             </span>
                          </div>
                          
                          {holiday.description && (
                              <p className="text-sm text-muted-foreground/80 mt-2 bg-slate-50 dark:bg-white/5 p-2 rounded">
                                  {holiday.description}
                              </p>
                          )}
                        </div>

                        {holiday.holiday_type === "custom" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteHoliday(holiday.holiday_date)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 -mt-1 -mr-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
