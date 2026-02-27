"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PersonnelAttendanceCard } from "@/components/personnel-attendance-card"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import {
  Calendar,
  Users,
  FileText,
  ClipboardList,
  Package,
  LogOut,
  Sparkles,
  Zap,
  CheckCircle2,
  ScanLine,
  ShieldAlert,
  Ban,
  UserCog,
  ChevronRight,
  Clock,
  Tickets,
  Briefcase,
  IndianRupee,
  MapPin,
  Map as MapIcon,
  User,
  GraduationCap
} from "lucide-react"

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

export default function AdminPersonnelDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [personnelData, setPersonnelData] = useState<any>(null)
  const [greeting, setGreeting] = useState("")
  const router = useRouter()

  useEffect(() => {
    // Dynamic Greeting
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 18) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")

    const checkAuth = () => {
      const token = localStorage.getItem("adminPersonnelAuth")
      const data = localStorage.getItem("adminPersonnelData")

      if (!token || !data) {
        router.push("/admin-personnel/login")
        return
      }

      try {
        setPersonnelData(JSON.parse(data))
        setIsAuthenticated(true)
      } catch (error) {
        console.error("Failed to parse personnel data:", error)
        localStorage.removeItem("adminPersonnelAuth")
        localStorage.removeItem("adminPersonnelData")
        router.push("/admin-personnel/login")
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("adminPersonnelAuth")
    localStorage.removeItem("adminPersonnelData")
    router.push("/admin-personnel/login")
  }

  if (!isAuthenticated || !personnelData) {
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
        {/* Light Mode Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/50 via-white to-slate-100 dark:hidden" />
        
        {/* Dark Mode: The Void & Grid */}
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
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-gray-200 dark:to-gray-500 bg-clip-text text-transparent">
              {greeting}, {personnelData.name}
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-500" />
              Administrative Personnel Portal
            </p>
          </div>
          <div className="flex gap-3">
             <span className="px-4 py-1.5 text-sm font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 rounded-full flex items-center gap-2">
              <UserCog className="w-4 h-4" />
              Admin Staff
            </span>
            <Button onClick={handleLogout} variant="destructive" size="sm" className="rounded-full px-4">
               <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>
        </motion.div>

        {/* --- Hero Stats Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Access Level" value="Limited" icon={ShieldAlert} color="yellow" subValue="Attendance & Logs Only" href="#" />
          <StatCard title="Exam Duty" value="Active" icon={ScanLine} color="blue" subValue="QR Scanner Ready" href="/admin-personnel/exams/attendance" />
          <StatCard title="Your Leaves" value="Manage" icon={FileText} color="purple" subValue="Check Balance" href="/admin-personnel/leaves" />
          <StatCard title="Stationery" value="Request" icon={Package} color="orange" subValue="Office Supplies" href="/admin-personnel/stationery" />
        </div>

        {/* --- Bento Grid: Profile & Quick Actions --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* 1. Identity + Map Button (Left Side - Big) */}
          <motion.div variants={itemVariants} className="lg:col-span-8">
            <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-2xl overflow-hidden flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xl text-foreground dark:text-white">
                  <Briefcase className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  Staff Identification & Permissions
                </CardTitle>
                <CardDescription className="dark:text-gray-400">Department and Role Information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 flex-1 flex flex-col justify-center">
                 
                 {/* Profile + Map Button Row */}
                 <div className="flex flex-col md:flex-row gap-6">
                    
                    {/* Left: Profile Info */}
                    <div className="flex-1 p-6 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-zinc-900/50 dark:to-blue-900/10 border border-slate-100 dark:border-white/5 flex flex-col justify-center items-start gap-4">
                       <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center border border-blue-200 dark:border-blue-500/30 shrink-0">
                             <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                             <h3 className="text-xl font-bold text-foreground dark:text-white">{personnelData.name}</h3>
                             <p className="text-sm text-muted-foreground dark:text-gray-400">{personnelData.email}</p>
                             <p className="mt-1 text-xs font-mono bg-slate-200 dark:bg-zinc-800 px-2 py-0.5 rounded inline-block">@{personnelData.username}</p>
                          </div>
                       </div>
                    </div>

                    {/* Right: Map Style Self Attendance Button */}
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="md:w-56 cursor-pointer group relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/10 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-300 min-h-[140px]">
                                {/* Dummy Map Background */}
                                <div className="absolute inset-0 opacity-10 dark:opacity-[0.03] pointer-events-none">
                                    <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(circle, #3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                                    <MapIcon className="absolute -bottom-4 -right-4 w-32 h-32 text-slate-400 transform -rotate-12" />
                                </div>
                                
                                <div className="relative z-10 h-full flex flex-col items-center justify-center p-4 gap-3">
                                    {/* Character on Map Pin */}
                                    <div className="relative">
                                         <MapPin className="w-10 h-10 text-blue-500 drop-shadow-md group-hover:translate-y-[-2px] transition-transform" />
                                         <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-white dark:bg-zinc-800 rounded-full p-1 shadow-sm border border-slate-100 dark:border-white/10">
                                            <User className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                                         </div>
                                         <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-black/20 blur-sm rounded-full group-hover:scale-75 transition-transform duration-300"></div>
                                    </div>
                                    
                                    <div className="text-center">
                                        <h4 className="font-bold text-sm text-foreground dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">Mark Attendance</h4>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Tap to locate</p>
                                    </div>
                                </div>
                            </div>
                        </DialogTrigger>

                        {/* --- MODAL CONTENT --- */}
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10">
                           <DialogHeader>
                              <DialogTitle className="text-xl flex items-center gap-2">
                                 <MapPin className="w-5 h-5 text-blue-500" />
                                 Attendance Check
                              </DialogTitle>
                              <DialogDescription>
                                 Ensure your device is authorized and you are within campus bounds.
                              </DialogDescription>
                           </DialogHeader>
                           
                           <div className="space-y-6 mt-2">
                               {/* Attendance Card loaded inside modal */}
                               <div className="space-y-2">
                                   <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attendance Status</h4>
                                   {typeof window !== "undefined" && <PersonnelAttendanceCard personnelId={personnelData?.id || 0} userType="admin_personnel" />}
                               </div>
                           </div>
                        </DialogContent>
                    </Dialog>
                 </div>

                 {/* Warning Block (Moved to bottom of card) */}
                 <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                    <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-1" />
                    <div>
                        <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">Limited Access Portal</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
                            You cannot create, edit, or delete exams. All attendance records marked via this portal are logged with your identity for auditing purposes.
                        </p>
                    </div>
                 </div>

              </CardContent>
            </Card>
          </motion.div>

          {/* 2. Quick Actions (Right Side - Moved Here) */}
          <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Task Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <QuickActionBtn href="/admin-personnel/exams/attendance" icon={ScanLine} label="Scan QR" color="blue" />
                <QuickActionBtn href="/admin-personnel/leaves" icon={FileText} label="My Leaves" color="purple" />
                <QuickActionBtn href="/admin-personnel/peon-leaves" icon={ClipboardList} label="Peon Log" color="pink" />
                <QuickActionBtn href="/admin-personnel/stationery" icon={Package} label="Supplies" color="orange" />
                <QuickActionBtn href="/admin-personnel/fees" icon={IndianRupee} label="Fees Mgmt" color="green" />
              </CardContent>
            </Card>

            <Link href="/admin-personnel/exams/attendance" className="block">
              <Card className="bg-gradient-to-br from-blue-900 to-indigo-900 dark:from-zinc-900 dark:to-black border-slate-200 dark:border-zinc-800 hover:border-blue-500/50 transition-all group cursor-pointer shadow-lg">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300 dark:text-gray-400 mb-1">Upcoming Exam</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">Start Duty</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>

        {/* --- Management Section Header --- */}
        <div className="flex items-center gap-4 py-4">
          <h2 className="text-2xl font-bold text-foreground dark:text-white">Duty Console</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-zinc-800 to-transparent" />
        </div>

        {/* --- Management Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
          
          <ManagementCard 
            title="QR Exam Attendance" 
            desc="Scan Student Hall Tickets" 
            icon={ScanLine} 
            color="blue"
            links={[
              { label: "Start Scanner", href: "/admin-personnel/exams/attendance" },
              { label: "Attendance Logs", href: "/admin-personnel/exams/attendance" }
            ]}
          />

          <ManagementCard 
            title="Leave Management" 
            desc="Personal Leave Requests" 
            icon={FileText} 
            color="purple"
            links={[
              { label: "Apply for Leave", href: "/admin-personnel/leaves" },
              { label: "View History", href: "/admin-personnel/leaves" }
            ]}
          />

          <ManagementCard 
            title="Peon Leave Review" 
            desc="Approve Support Staff" 
            icon={ClipboardList} 
            color="pink"
            links={[
              { label: "Review Pending", href: "/admin-personnel/peon-leaves" }
            ]}
          />

          <ManagementCard 
            title="Stationery" 
            desc="Inventory Requests" 
            icon={Package} 
            color="orange"
            links={[
              { label: "New Request", href: "/admin-personnel/stationery" },
              { label: "Track Status", href: "/admin-personnel/stationery" }
            ]}
          />
          
          <ManagementCard 
            title="Students Management"
            desc="View and Manage Students" 
            icon={GraduationCap} 
            color="blue"
            links={[
              { label: "View All", href: "/admin-personnel/students" },
              { label: "Student Fees", href: "/admin-personnel/fees" }
            ]}
          />

          <ManagementCard 
            title="Tickets"
            desc="Raise Issue Tickets" 
            icon={Tickets} 
            color="orange"
            links={[
              { label: "New Request", href: "/admin-personnel/tickets" }
            ]}
          />

          <ManagementCard 
            title="Student Fees" 
            desc="Manage Fee Payments" 
            icon={IndianRupee} 
            color="green"
            links={[
              { label: "Search Student", href: "/admin-personnel/fees" },
              { label: "Record Payment", href: "/admin-personnel/fees" }
            ]}
          />

          {/* Restricted Access Card - Styled to look disabled/muted */}
          <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
             <Card className="h-full bg-slate-100/50 dark:bg-zinc-900/30 border-slate-200 dark:border-white/5 opacity-75 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
                         <div className="p-2 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-500">
                             <Ban className="w-5 h-5" />
                         </div>
                         Restricted Functions
                    </CardTitle>
                    <CardDescription>Admin level permissions required</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="text-sm text-slate-500 dark:text-slate-500 px-4">
                        <ul className="list-disc list-inside space-y-1">
                            <li>Create/Edit Exams</li>
                            <li>Delete Records</li>
                            <li>Modify Student Data</li>
                            <li>Global Configuration</li>
                        </ul>
                        <p className="mt-4 text-xs italic opacity-70">Contact Super Admin for support.</p>
                    </div>
                </CardContent>
             </Card>
          </motion.div>

        </div>
      </motion.div>
    </div>
  )
}

// --- Sub Components (Consistent with Admin/Tech Dashboards) ---

const getColorClasses = (color: string) => {
    const maps: any = {
        blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
        green: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800",
        purple: "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
        orange: "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
        pink: "text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
        red: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800",
        yellow: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
        slate: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700",
    }
    return maps[color] || maps.blue
}

function StatCard({ title, value, icon: Icon, color, subValue, href }: any) {
  const colorClass = getColorClasses(color)

  return (
    <motion.div variants={itemVariants}>
      <Link href={href} className="block h-full">
        <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:translate-y-[-5px] transition-all duration-300 group cursor-pointer hover:shadow-lg dark:hover:shadow-blue-500/10 hover:border-blue-500/50">
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
    <Link href={href}>
      <div className={cn("flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105 cursor-pointer h-24 gap-2 bg-white/50 dark:bg-zinc-900/20", colorClass)}>
        <Icon className="w-6 h-6" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
    </Link>
  )
}

function ManagementCard({ title, desc, icon: Icon, color, links }: any) {
  const iconColorMap: any = {
      blue: "text-blue-500",
      green: "text-green-500",
      orange: "text-orange-500",
      purple: "text-purple-500",
      pink: "text-pink-500",
      red: "text-red-500",
      yellow: "text-amber-500",
      slate: "text-slate-500",
  }
  const iconColor = iconColorMap[color] || "text-blue-500"
  
  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:border-slate-400 dark:hover:border-white/30 transition-all group overflow-hidden shadow-sm hover:shadow-md">
        <div className="absolute top-0 right-0 p-4 opacity-[0.05] dark:opacity-[0.05] group-hover:opacity-10 dark:group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500 pointer-events-none">
          <Icon className={cn("w-24 h-24", iconColor)} />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center gap-3 text-foreground dark:text-white">
            <div className={cn("p-2 rounded-lg bg-slate-100 dark:bg-zinc-900", iconColor)}>
              <Icon className="w-5 h-5" />
            </div>
            {title}
          </CardTitle>
          <CardDescription className="text-muted-foreground dark:text-gray-400">{desc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 relative z-10">
          {links.map((link: any, i: number) => (
            <Link key={i} href={link.href}>
              <Button variant="ghost" className="w-full justify-between text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 group/btn">
                {link.label}
                <ChevronRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </Button>
            </Link>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}
