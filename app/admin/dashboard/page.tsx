"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  Users,
  GraduationCap,
  Building2,
  MessageSquare,
  BookOpen,
  Upload,
  TrendingUp,
  Calendar,
  BarChart3,
  Activity,
  Shield,
  Monitor,
  Bell,
  FileText,
  Wrench,
  ChevronRight,
  Sparkles,
  Zap,
  School,
  ListOrdered,
  RadioTower,
  TentTree,
  Codesandbox,
  DollarSign,
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
export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    placedStudents: 0,
    totalCompanies: 0,
    totalSeminars: 0,
    totalMessages: 0,
  })
  const [adminData, setAdminData] = useState<any>(null)
  const [greeting, setGreeting] = useState("")
  const router = useRouter()
  useEffect(() => {
    // Dynamic Greeting
    const hour = new Date().getHours()
    if (hour < 12) setGreeting("Good Morning")
    else if (hour < 18) setGreeting("Good Afternoon")
    else setGreeting("Good Evening")
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    try {
      const admin = JSON.parse(localStorage.getItem("adminData") || "{}")
      setAdminData(admin)
      fetchStats(adminAuth)
    } catch (error) {
      console.error("Failed to parse admin auth:", error)
      localStorage.removeItem("adminAuth")
      router.push("/admin/login")
    }
  }, [router])
  const fetchStats = async (token?: string) => {
    try {
      const response = await fetch("/api/admin/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    }
  }
  if (!adminData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-black">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
        </div>
      </div>
    )
  }
  const placementRate = stats.totalStudents > 0 ? Math.round((stats.placedStudents / stats.totalStudents) * 100) : 0
  const activeRate = stats.totalStudents > 0 ? Math.round((stats.activeStudents / stats.totalStudents) * 100) : 0
  const isSuperAdmin = adminData.role === "super_admin"
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-gray-100 transition-colors duration-500">
      {/* Background Ambience & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Light Mode Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:hidden" />
        {/* Dark Mode: The Void & Grid */}
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
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-6"
        >
          <div className="space-y-1">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:via-gray-200 dark:to-gray-500 bg-clip-text text-transparent">
              {greeting}, {adminData.username}
            </h1>
            <p className="text-lg text-muted-foreground dark:text-gray-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Here's what's happening in your campus today.
            </p>
          </div>
          {!isSuperAdmin && (
            <span className="px-4 py-1.5 text-sm font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 rounded-full">
              Course Admin
            </span>
          )}
        </motion.div>
        {/* --- Hero Stats Grid --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
            color="blue"
            href="/admin/students"
          />
          <StatCard
            title="Active"
            value={stats.activeStudents}
            icon={Activity}
            color="green"
            subValue={`${activeRate}% Active`}
            href="/admin/students?active=1"
          />
          <StatCard
            title="Placed"
            value={stats.placedStudents}
            icon={GraduationCap}
            color="purple"
            subValue={`${placementRate}% Placed`}
            href="/admin/students?placed=1"
          />
          <StatCard
            title="Partners"
            value={stats.totalCompanies}
            icon={Building2}
            color="orange"
            href="/admin/companies"
          />
          <StatCard
            title="Seminars"
            value={stats.totalSeminars}
            icon={Calendar}
            color="indigo"
            href="/admin/seminars"
          />
          <StatCard
            title="Messages"
            value={stats.totalMessages}
            icon={MessageSquare}
            color="pink"
            href="/admin/messages"
          />
        </div>
        {/* --- Bento Grid: Analytics & Quick Actions --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Analytics Chart Block */}
          <motion.div variants={itemVariants} className="lg:col-span-8">
            <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-foreground dark:text-white">
                  <BarChart3 className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                  Placement Intelligence
                </CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Real-time placement and activity overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-muted-foreground dark:text-gray-400">
                        Placement Rate
                      </span>
                      <span className="text-3xl font-bold text-foreground dark:text-white">{placementRate}%</span>
                    </div>
                    <Progress
                      value={placementRate}
                      className="h-2 bg-slate-200 dark:bg-zinc-800"
                      indicatorColor="bg-indigo-500"
                    />
                  </div>
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-zinc-900/50 border border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-end">
                      <span className="text-sm font-medium text-muted-foreground dark:text-gray-400">
                        Student Activity
                      </span>
                      <span className="text-3xl font-bold text-foreground dark:text-white">{activeRate}%</span>
                    </div>
                    <Progress
                      value={activeRate}
                      className="h-2 bg-slate-200 dark:bg-zinc-800"
                      indicatorColor="bg-emerald-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="text-center p-4">
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.placedStudents}</p>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground dark:text-gray-500 font-semibold mt-1">
                      Offers
                    </p>
                  </div>
                  <div className="text-center p-4 border-x border-slate-100 dark:border-white/5">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.activeStudents}</p>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground dark:text-gray-500 font-semibold mt-1">
                      Active
                    </p>
                  </div>
                  <div className="text-center p-4">
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.totalCompanies}</p>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground dark:text-gray-500 font-semibold mt-1">
                      Recruiters
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          {/* Quick Actions Grid */}
          <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
            <Card className="flex-1 bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-xl shadow-sm dark:shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <QuickActionBtn href="/admin/students/bulk-import" icon={Upload} label="Import" color="blue" />
                <QuickActionBtn href="/admin/companies" icon={Building2} label="New Job" color="orange" />
                <QuickActionBtn href="/admin/seminars" icon={Calendar} label="Event" color="purple" />
                <QuickActionBtn href="/admin/broadcast" icon={Bell} label="Broadcast" color="red" />
                <QuickActionBtn href="/admin/messages" icon={MessageSquare} label="Message" color="pink" />
                <QuickActionBtn href="/admin/mail" icon={BarChart3} label="Mail Stats" color="teal" />
              </CardContent>
            </Card>
            <Link href="/admin/leaves">
              <Card className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-zinc-900 dark:to-black border-slate-200 dark:border-zinc-800 hover:border-amber-500/50 transition-all group cursor-pointer h-full shadow-lg">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-300 dark:text-gray-400 mb-1">Pending Leaves</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{stats.totalMessages || 0}</span>
                      <span className="text-xs text-amber-400 font-medium">Requires Action</span>
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6 text-amber-400" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
        {/* --- Management Section Header --- */}
        <div className="flex items-center gap-4 py-4">
          <h2 className="text-2xl font-bold text-foreground dark:text-white">Management Console</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-zinc-800 to-transparent" />
        </div>
        {/* --- Management Grid (Arranged per Old Code Logic) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-12">
          {/* Public Modules (Visible to Everyone) */}
          <ManagementCard
            title="Student Management"
            desc="Records & Data"
            icon={Users}
            color="blue"
            links={[
              { label: "Manage Students", href: "/admin/students" },
              { label: "Bulk Import", href: "/admin/students/bulk-import" },
            ]}
          />
          <ManagementCard
            title="Company Management"
            desc="Jobs & Applications"
            icon={Building2}
            color="orange"
            links={[{ label: "Manage Companies", href: "/admin/companies" }]}
          />
          <ManagementCard
            title="Seminar Management"
            desc="Events & Tracking"
            icon={Calendar}
            color="purple"
            links={[{ label: "Manage Seminars", href: "/admin/seminars" }]}
          />
          <ManagementCard
            title="Communication"
            desc="Messages & Notifs"
            icon={MessageSquare}
            color="red"
            links={[{ label: "Message Center", href: "/admin/messages" }]}
          />
          <ManagementCard
            title="Broadcast"
            desc="Global Announcements"
            icon={RadioTower}
            color="blue"
            links={[{ label: "Manage Broadcasts", href: "/admin/broadcast" }]}
          />
          <ManagementCard
            title="Tutor & Subject"
            desc="Academic Allocation"
            icon={Calendar}
            color="purple"
            links={[
              { label: "Manage Tutors", href: "/admin/tutors" },
              { label: "Manage Subjects", href: "/admin/subjects" },
            ]}
          />
          <ManagementCard
            title="Fees Management"
            desc="Payments & Structure"
            icon={DollarSign}
            color="green"
            links={[
              { label: "Fee Structure", href: "/admin/fees/structure" },
              { label: "Payment Records", href: "/admin/fees/payments" },
            ]}
          />
          <ManagementCard
            title="Manage Batch"
            desc="Manage Your Sem into Batches"
            icon={ListOrdered}
            color="purple"
            links={[{ label: "Manage Batch", href: "/admin/batches" }]}
          />
          <ManagementCard
            title="Exam Management"
            desc="Exams & Attendance"
            icon={School}
            color="indigo"
            links={[
              { label: "Manage Exams", href: "/admin/exams" },
              { label: "QR Attendance", href: "/admin/exams/attendance" },
            ]}
          />
          {/* Super Admin Only Modules */}
          {isSuperAdmin && (
            <>
              <ManagementCard
                title="User Management"
                desc="Access Control"
                icon={Shield}
                color="blue"
                links={[
                  { label: "Manage Users", href: "/admin/users" },
                  { label: "Course Admins", href: "/admin/course-admins" },
                ]}
              />
              <ManagementCard
                title="Technical Team"
                desc="Lab Infrastructure"
                icon={Monitor}
                color="green"
                links={[{ label: "Manage Tech Team", href: "/admin/technical-team" }]}
              />
              <ManagementCard
                title="Peon & Housekeeping"
                desc="Support Staff"
                icon={Wrench}
                color="yellow"
                links={[{ label: "Manage Staff", href: "/admin/peon" }]}
              />
              <ManagementCard
                title="Admin Personnel"
                desc="Attendance Duties"
                icon={Users}
                color="pink"
                links={[{ label: "Manage Personnel", href: "/admin/personnel" }]}
              />
              <ManagementCard
                title="Faculty Management"
                desc="Professors & Staff"
                icon={Users}
                color="cyan"
                links={[{ label: "Manage Faculty", href: "/admin/faculty" }]}
              />
              <ManagementCard
                title="Student Promotion"
                desc="Semester Upgrade"
                icon={TrendingUp}
                color="indigo"
                links={[{ label: "Promote Students", href: "/admin/promotion" }]}
              />
              <ManagementCard
                title="Academic Management"
                desc="Courses & Interests"
                icon={BookOpen}
                color="green"
                links={[
                  { label: "Manage Courses", href: "/admin/courses" },
                  { label: "Manage Interests", href: "/admin/interests" },
                ]}
              />
              <ManagementCard
                title="Leaves & Holidays"
                desc="Operations Config"
                icon={TentTree}
                color="slate"
                links={[
                  { label: "Holidays", href: "/admin/holidays" },
                  { label: "Leave Requests", href: "/admin/leaves" },
                ]}
              />
              <ManagementCard
                title="Stationery Management"
                desc="Inventory & Stationery"
                icon={Codesandbox}
                color="orange"
                links={[{ label: "Manage Inventory", href: "/admin/stationery" }]}
              />
            </>
          )}
          {/* Tutor Stationery Requests */}
          <ManagementCard
            title="Tutor Stationery Requests"
            desc="Review & Forward Requests"
            icon={Codesandbox}
            color="blue"
            links={[{ label: "Review Requests", href: "/admin/stationery-requests" }]}
          />
        </div>
      </motion.div>
    </div>
  )
}
// --- Sub Components (Styled exactly as requested) ---
const getColorClasses = (color: string) => {
  const maps: any = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    green:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
    purple:
      "text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    orange:
      "text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    indigo:
      "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800",
    pink: "text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800",
    red: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    teal: "text-teal-600 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800",
    yellow:
      "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    cyan: "text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800",
    slate: "text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700",
  }
  return maps[color] || maps.blue
}
function StatCard({ title, value, icon: Icon, color, subValue, href }: any) {
  const colorClass = getColorClasses(color)
  return (
    <motion.div variants={itemVariants}>
      <Link href={href} className="block h-full">
        <Card className="h-full bg-white/70 dark:bg-zinc-950/40 border-slate-200 dark:border-white/10 backdrop-blur-md hover:translate-y-[-5px] transition-all duration-300 group cursor-pointer hover:shadow-lg dark:hover:shadow-indigo-500/10 hover:border-indigo-500/50">
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
      <div
        className={cn(
          "flex flex-col items-center justify-center p-3 rounded-xl border transition-all hover:scale-105 cursor-pointer h-24 gap-2 bg-white/50 dark:bg-zinc-900/20",
          colorClass,
        )}
      >
        <Icon className="w-6 h-6" />
        <span className="text-xs font-semibold">{label}</span>
      </div>
    </Link>
  )
}
function ManagementCard({ title, desc, icon: Icon, color, links, isHazard }: any) {
  const iconColorMap: any = {
    blue: "text-blue-500",
    orange: "text-orange-500",
    emerald: "text-emerald-500",
    cyan: "text-cyan-500",
    indigo: "text-indigo-500",
    purple: "text-purple-500",
    slate: "text-slate-500",
    pink: "text-pink-500",
    red: "text-red-500",
    green: "text-green-500",
    yellow: "text-yellow-500",
  }
  const iconColor = iconColorMap[color] || "text-blue-500"
  const cardBorder = isHazard
    ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/10"
    : "border-slate-200 dark:border-white/10 bg-white/70 dark:bg-zinc-950/40"
  return (
    <motion.div variants={itemVariants}>
      <Card
        className={cn(
          "h-full backdrop-blur-md hover:border-slate-400 dark:hover:border-white/30 transition-all group overflow-hidden shadow-sm hover:shadow-md",
          cardBorder,
        )}
      >
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
              <Button
                variant="ghost"
                className="w-full justify-between text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 group/btn"
              >
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
