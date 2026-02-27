"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { TutorAttendanceCardAdvanced } from "@/components/tutor-attendance-card-advanced"
import { DeviceInfoDisplay } from "@/components/device-info-display"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  BookOpen,
  LogOut,
  Calendar,
  Users,
  RefreshCw,
  FileText,
  Package,
  Sparkles,
  GraduationCap,
  Presentation,
  CheckCircle2,
  ChevronRight,
  Library,
  School,
  TicketX as Tickets,
  ClipboardCheck,
  Zap,
  MapPin,
  Smartphone,
  Map as MapIcon,
  User,
  Navigation
} from "lucide-react"

// --- Interfaces ---
interface Subject {
  id: number
  name: string
  code: string
  course_name: string
  semester: number
}

interface Tutor {
  id: number
  name: string
  department: string
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

export default function TutorDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const [tutor, setTutor] = useState<Tutor | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [greeting, setGreeting] = useState("")

  useEffect(() => {
    // Dynamic Greeting
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 18) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")

    const tutorAuth = localStorage.getItem("tutorAuth")
    if (!tutorAuth) {
      router.push("/tutor/login")
      return
    }

    try {
      const tutorData = JSON.parse(tutorAuth)
      setTutor(tutorData)
      fetchSubjects(tutorData.id)
    } catch (error) {
      console.error("Failed to parse tutor auth:", error)
      localStorage.removeItem("tutorAuth")
      router.push("/tutor/login")
    }
  }, [router])

  useEffect(() => {
    if (!tutor) return

    const interval = setInterval(() => {
      console.log("[MYT] Auto-refreshing subjects for tutor:", tutor.id)
      fetchSubjects(tutor.id, true)
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [tutor])

  const fetchSubjects = async (tutorId: number, isAutoRefresh = false) => {
    try {
      if (!isAutoRefresh) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      const response = await fetch(`/api/tutor/${tutorId}/subjects?t=${Date.now()}`)
      const data = await response.json()
      if (data.success) {
        setSubjects(data.subjects)
        if (isAutoRefresh && data.subjects.length > subjects.length) {
          toast({ title: "Update", description: "New subjects have been assigned to you!" })
        }
      } else {
        toast({ title: "Error", description: data.error || "Failed to fetch subjects", variant: "destructive" })
      }
    } catch (error) {
      console.error("Error fetching subjects:", error)
      toast({ title: "Error", description: "Failed to fetch subjects", variant: "destructive" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleManualRefresh = async () => {
    if (tutor) {
      await fetchSubjects(tutor.id, false)
      toast({ title: "Refreshed", description: "Subject list updated." })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("tutorAuth")
    toast({ title: "Success", description: "Logged out successfully" })
    router.push("/tutor/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-violet-500 animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!tutor) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Light Mode Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-violet-50/50 via-white to-fuchsia-50/50 dark:hidden" />

        {/* Dark Mode: The Void & Grid */}
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
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6"
        >
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-gray-200 dark:to-gray-500 bg-clip-text text-transparent">
              {greeting}, {tutor.name}
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Faculty Portal &bull; {tutor.department}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={handleManualRefresh}
              variant="outline"
              size="sm"
              disabled={refreshing}
              className="rounded-full border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
              Refresh
            </Button>
            <Button onClick={handleLogout} variant="destructive" size="sm" className="rounded-full px-4">
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </motion.div>

        {/* --- Hero Stats Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Total Subjects"
            value={subjects.length}
            icon={BookOpen}
            color="violet"
            subValue="Assigned to you"
            href="#"
          />
          <StatCard
            title="Active Lectures"
            value="-"
            icon={Presentation}
            color="blue"
            subValue="Coming Soon"
            href="#"
          />
          <StatCard
            title="Attendance"
            value="-"
            icon={Users}
            color="green"
            subValue="Student Stats"
            href="/tutor/exam-attendance"
          />
          <StatCard
            title="Raise Ticket"
            value="Active"
            icon={Tickets}
            color="orange"
            subValue="Raise Tickets"
            href="/tutor/tickets"
          />
        </div>

        {/* --- Main Dashboard Grid --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* 1. Academic Identity + Self Attendance Map Button (Left Side - Bigger) */}
          <motion.div variants={itemVariants} className="lg:col-span-8">
            <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-2xl overflow-hidden flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl text-foreground dark:text-white">
                  <School className="w-5 h-5 text-violet-500 dark:text-violet-400" />
                  Academic Staff Identity
                </CardTitle>
                <CardDescription className="dark:text-gray-400">Department and Role Information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
                
                {/* Profile + Map Button Row */}
                <div className="flex flex-col md:flex-row gap-6">
                    
                    {/* Left: Profile Info */}
                    <div className="flex-1 p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-violet-50/50 dark:from-zinc-900/50 dark:to-violet-900/10 border border-slate-100 dark:border-white/5 flex flex-col justify-center items-start gap-4">
                        <div className="flex items-center gap-4">
                             <div className="h-16 w-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center border border-violet-200 dark:border-violet-500/30 shrink-0">
                                <GraduationCap className="w-8 h-8 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-foreground dark:text-white">{tutor.name}</h3>
                                <p className="text-sm text-muted-foreground dark:text-gray-400 font-medium">{tutor.department}</p>
                            </div>
                        </div>
                        <Badge className="bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 border-none">
                           Faculty Member
                        </Badge>
                    </div>

                    {/* Right: Map Style Self Attendance Button */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="md:w-56 cursor-pointer group relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:border-violet-300 dark:hover:border-violet-500/50 transition-all duration-300">
                                {/* Dummy Map Background */}
                                <div className="absolute inset-0 opacity-10 dark:opacity-[0.03] pointer-events-none">
                                    <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #8b5cf6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                    <MapIcon className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-400 transform -rotate-12" />
                                </div>
                                
                                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 gap-3">
                                    {/* Character on Map Pin */}
                                    <div className="relative">
                                         <MapPin className="w-10 h-10 text-violet-500 drop-shadow-md group-hover:translate-y-[-2px] transition-transform" />
                                         <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white dark:bg-zinc-800 rounded-full p-1 shadow-sm border border-slate-100 dark:border-white/10">
                                            <User className="w-4 h-4 text-violet-700 dark:text-violet-400" />
                                         </div>
                                         <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-black/20 blur-sm rounded-full group-hover:scale-75 transition-transform duration-300"></div>
                                    </div>
                                    
                                    <div className="text-center">
                                        <h4 className="font-bold text-sm text-foreground dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">Mark Attendance</h4>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Tap to locate</p>
                                    </div>
                                </div>
                            </div>
                        </DialogTrigger>

                        {/* --- MODAL CONTENT --- */}
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
                           <DialogHeader>
                              <DialogTitle className="text-xl flex items-center gap-2">
                                 <MapPin className="w-5 h-5 text-violet-500" />
                                 Attendance & Device Check
                              </DialogTitle>
                              <DialogDescription>
                                 Ensure your device is authorized and you are within campus bounds.
                              </DialogDescription>
                           </DialogHeader>
                           
                           <div className="space-y-6 mt-2">
                               {/* Section 1: Attendance Controls */}
                               <div className="space-y-2">
                                   <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attendance Status</h4>
                                   <TutorAttendanceCardAdvanced tutorId={tutor.id} />
                               </div>

                               {/* Section 2: Device Info */}
                               <div className="space-y-2">
                                   <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Device Health</h4>
                                   <DeviceInfoDisplay tutorId={tutor.id} />
                               </div>
                           </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Bottom: Status Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Status Active</p>
                      <p className="text-xs text-muted-foreground">System Access</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600">
                      <Library className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{subjects.length} Subjects</p>
                      <p className="text-xs text-muted-foreground">Current Load</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </motion.div>

          {/* 2. Quick Actions (Right Side - Now here instead of self attendance) */}
          <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col">
            <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="h-full">
                  <div className="grid grid-cols-2 gap-3 h-full pb-2">
                    <QuickActionBtn href="/tutor/exam-marks" icon={ClipboardCheck} label="Marks Entry" color="blue" />
                    <QuickActionBtn href="/tutor/exam-attendance" icon={Users} label="Student Attendance" color="green" />
                    <QuickActionBtn href="/tutor/leaves" icon={FileText} label="Apply Leave" color="violet" />
                    <QuickActionBtn href="/tutor/stationery" icon={Package} label="Stationery" color="orange" />
                  </div>
              </CardContent>
            </Card>
          </motion.div>

        </div>

        {/* --- Subjects Section Header --- */}
        <div className="flex items-center gap-4 py-4">
          <h2 className="text-2xl font-bold text-foreground dark:text-white">Assigned Subjects</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-zinc-800 to-transparent" />
        </div>

        {/* --- Subjects Grid --- */}
        <div className="pb-12">
          {subjects.length === 0 ? (
            <motion.div variants={itemVariants}>
              <Card className="bg-white/50 dark:bg-white/5 border-dashed border-2 border-slate-300 dark:border-white/10">
                <CardContent className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="h-16 w-16 bg-slate-100 dark:bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-muted-foreground">No subjects assigned yet</h3>
                  <p className="text-sm text-muted-foreground/80 mt-1">
                    Please contact the administrator for course allocation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <SubjectCard key={subject.id} subject={subject} color="violet" />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// --- Sub Components ---

const getColorClasses = (color: string) => {
  const maps: any = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    green:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    violet:
      "text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800",
    orange:
      "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    slate: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700",
  }
  return maps[color] || maps.violet
}

function StatCard({ title, value, icon: Icon, color, subValue, href }: any) {
  const colorClass = getColorClasses(color)

  return (
    <motion.div variants={itemVariants}>
      <Link href={href} className="block h-full">
        <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:translate-y-[-5px] transition-all duration-300 group cursor-pointer hover:shadow-lg dark:hover:shadow-violet-500/10 hover:border-violet-500/50">
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground dark:text-gray-400">{title}</p>
              <h3 className="text-3xl font-bold text-foreground dark:text-white mt-2">{value}</h3>
              {subValue && (
                <p className="text-xs font-medium text-muted-foreground/80 dark:text-gray-500 mt-1">{subValue}</p>
              )}
            </div>
            <div className={cn("p-3 rounded-xl transition-colors border", colorClass)}>
              <Icon className="w-6 h-6" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  )
}

function QuickActionBtn({ href, icon: Icon, label, color }: any) {
  const colorClass = getColorClasses(color)

  return (
    <Link href={href} className="flex-1 h-full">
      <div
        className={cn(
          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105 cursor-pointer h-full min-h-[90px] gap-2 bg-white/50 dark:bg-zinc-900/20 w-full",
          colorClass,
        )}
      >
        <Icon className="w-6 h-6" />
        <span className="text-xs font-semibold text-center leading-tight">{label}</span>
      </div>
    </Link>
  )
}

function SubjectCard({ subject, color }: any) {
  const colorClass = getColorClasses(color)

  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-violet-400 dark:hover:border-white/30 transition-all group overflow-hidden shadow-sm hover:shadow-md">
        <div className="absolute top-0 right-0 p-4 opacity-[0.05] dark:opacity-[0.05] group-hover:opacity-10 dark:group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
          <BookOpen className="w-32 h-32 text-violet-500" />
        </div>
        <CardHeader className="relative z-10 pb-2">
          <div className="flex justify-between items-start mb-2">
            <Badge
              variant="outline"
              className="bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-300 border-violet-200 dark:border-violet-800"
            >
              {subject.code}
            </Badge>
            <Badge variant="secondary" className="bg-slate-100 dark:bg-white/10">
              Sem {subject.semester}
            </Badge>
          </div>
          <CardTitle className="text-lg font-bold text-foreground dark:text-white line-clamp-2 min-h-[3.5rem]">
            {subject.name}
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-gray-400 line-clamp-1">
            {subject.course_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 pt-4">
          <div className="flex gap-2">
            <Link href={`/tutor/subjects/${subject.id}/lectures`} className="flex-1">
              <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white gap-2 group/btn">
                <Calendar className="w-4 h-4" />
                Lectures
                <ChevronRight className="w-4 h-4 opacity-70 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href={`/tutor/subjects/${subject.id}/assignments`} className="flex-1">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 group/btn">
                <FileText className="w-4 h-4" />
                Assignments
                <ChevronRight className="w-4 h-4 opacity-70 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
