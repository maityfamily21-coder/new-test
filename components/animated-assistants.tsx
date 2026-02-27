"use client"

import { useState, useEffect } from "react"
import { MessageSquare, X, Calendar, Building2, Mail, Zap, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface AssistantData {
  messages: any[]
  companies: any[]
  seminars: any[]
}

interface AnimatedAssistantsProps {
  data: AssistantData
}

export function AnimatedAssistants({ data }: AnimatedAssistantsProps) {
  const [activeAssistant, setActiveAssistant] = useState<boolean>(false)
  const [showNotification, setShowNotification] = useState<boolean>(false)
  const [notificationMessage, setNotificationMessage] = useState("")
  const [notificationType, setNotificationType] = useState<"message" | "job" | "seminar" | "application" | "profile">(
    "message",
  )
  const [bounce, setBounce] = useState(0)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    const notifications = [
      { type: "message" as const, text: "You have new messages!" },
      { type: "job" as const, text: "A new job opening is live — check it out!" },
      { type: "seminar" as const, text: "An upcoming seminar is starting soon!" },
      { type: "application" as const, text: "Check your application status!" },
      { type: "profile" as const, text: "Complete your profile to improve matches!" },
    ]

    let index = 0
    const interval = setInterval(() => {
      const notification = notifications[index % notifications.length]
      setNotificationType(notification.type)
      setShowNotification(true)
      setNotificationMessage(notification.text)

      setTimeout(() => {
        setShowNotification(false)
      }, 4000)

      index++
    }, 6000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let frame = 0
    const bounceInterval = setInterval(() => {
      frame = (frame + 1) % 100
      setBounce(Math.abs(Math.sin((frame / 100) * Math.PI)) * 8)
    }, 30)
    return () => clearInterval(bounceInterval)
  }, [])

  const getLatestMessage = () => data.messages?.[0]
  const getLatestCompany = () => data.companies?.find((c) => !c.is_expired)
  const getUpcomingSeminars = () => data.seminars?.slice(0, 2) || []

  const getStats = () => {
    const totalCompanies = data.companies?.length || 0
    const appliedCompanies = data.companies?.filter((c) => c.has_applied).length || 0
    const totalSeminars = data.seminars?.length || 0
    const attendedSeminars = data.seminars?.filter((s) => s.attendance_status === "Present").length || 0
    const unreadMessages = data.messages?.length || 0

    return {
      totalCompanies,
      appliedCompanies,
      applicationRate: totalCompanies > 0 ? Math.round((appliedCompanies / totalCompanies) * 100) : 0,
      totalSeminars,
      attendedSeminars,
      attendanceRate: totalSeminars > 0 ? Math.round((attendedSeminars / totalSeminars) * 100) : 0,
      unreadMessages,
    }
  }

  const getTips = () => {
    const stats = getStats()
    const tips = []

    if (stats.applicationRate < 50 && stats.totalCompanies > 0) {
      tips.push({
        icon: Zap,
        title: "Boost Your Applications",
        description: `You've applied to ${stats.appliedCompanies} out of ${stats.totalCompanies} companies. Apply to more to increase your chances!`,
        color: "blue",
      })
    }

    if (stats.attendanceRate < 70 && stats.totalSeminars > 0) {
      tips.push({
        icon: Calendar,
        title: "Attend More Seminars",
        description: `Your attendance is at ${stats.attendanceRate}%. Seminars help you learn and network!`,
        color: "purple",
      })
    }

    if (stats.unreadMessages > 0) {
      tips.push({
        icon: Mail,
        title: "Check Your Messages",
        description: `You have ${stats.unreadMessages} message${stats.unreadMessages > 1 ? "s" : ""}. Stay updated with important announcements!`,
        color: "orange",
      })
    }

    if (tips.length === 0) {
      tips.push({
        icon: CheckCircle2,
        title: "Great Job!",
        description: "You're doing well! Keep applying and attending seminars to maximize your placement chances.",
        color: "green",
      })
    }

    return tips
  }

  const getNotificationIcon = () => {
    switch (notificationType) {
      case "job":
        return Building2
      case "seminar":
        return Calendar
      case "application":
        return TrendingUp
      case "profile":
        return AlertCircle
      default:
        return Mail
    }
  }

  const NotificationIcon = getNotificationIcon()

  const stats = getStats()
  const tips = getTips()

  return (
    <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-4">
      {/* Enhanced Notification Bubble */}
      {showNotification && (
        <div className="absolute -top-24 left-0 animate-bounce z-50">
          <div
            className={`bg-gradient-to-r ${
              notificationType === "job"
                ? "from-green-500 to-emerald-500"
                : notificationType === "seminar"
                  ? "from-purple-500 to-pink-500"
                  : notificationType === "application"
                    ? "from-blue-500 to-cyan-500"
                    : notificationType === "profile"
                      ? "from-orange-500 to-red-500"
                      : "from-blue-500 to-cyan-500"
            } text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg whitespace-nowrap flex items-center gap-2`}
          >
            <NotificationIcon className="w-4 h-4" />
            {notificationMessage}
            <div
              className={`absolute bottom-0 left-4 w-3 h-3 bg-gradient-to-r ${
                notificationType === "job"
                  ? "from-green-500 to-emerald-500"
                  : notificationType === "seminar"
                    ? "from-purple-500 to-pink-500"
                    : notificationType === "application"
                      ? "from-blue-500 to-cyan-500"
                      : notificationType === "profile"
                        ? "from-orange-500 to-red-500"
                        : "from-blue-500 to-cyan-500"
              } transform rotate-45 -translate-y-1.5`}
            ></div>
          </div>
        </div>
      )}

      {/* Animated Dog Button */}
      <button
        onClick={() => setActiveAssistant(!activeAssistant)}
        className="group relative text-7xl hover:scale-110 transition-transform duration-200 cursor-pointer filter drop-shadow-lg"
        style={{
          transform: `translateY(${-bounce}px)`,
          transition: "transform 0.03s linear",
        }}
      >
        🐶
        <p className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700 whitespace-nowrap">
          Bolt
        </p>
      </button>

      {/* Enhanced Modal - Floating Screen */}
      {activeAssistant && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-end justify-start p-4 sm:p-6">
          <Card className="w-full sm:w-96 max-h-[85vh] overflow-hidden shadow-2xl animate-in slide-in-from-left-4 duration-300 mb-40 flex flex-col">
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 dark:from-blue-600 dark:to-cyan-600 text-white pb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🐶</div>
                  <div>
                    <CardTitle className="text-white">Bolt</CardTitle>
                    <p className="text-xs text-white/80">Your placement assistant</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveAssistant(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="w-full rounded-none border-b bg-muted/50 flex-shrink-0">
                <TabsTrigger value="overview" className="flex-1 text-xs">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tips" className="flex-1 text-xs">
                  Tips
                </TabsTrigger>
                <TabsTrigger value="stats" className="flex-1 text-xs">
                  Stats
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Recent Messages */}
                {getLatestMessage() && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Mail className="w-4 h-4 text-blue-500" />
                      Latest Message
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                        {getLatestMessage().title}
                      </p>
                      <p className="text-xs text-blue-800 dark:text-blue-200 line-clamp-2">
                        {getLatestMessage().content}
                      </p>
                    </div>
                  </div>
                )}

                {/* Latest Job Opening */}
                {getLatestCompany() && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Building2 className="w-4 h-4 text-green-500" />
                      Latest Job Opening
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-xs font-semibold text-green-900 dark:text-green-100 mb-1">
                        {getLatestCompany().name}
                      </p>
                      <p className="text-xs text-green-800 dark:text-green-200 mb-2">{getLatestCompany().position}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {getLatestCompany().opening_type === "internship" ? "Internship" : "Job"}
                        </Badge>
                        <span className="text-xs text-green-700 dark:text-green-300 font-medium">
                          {getLatestCompany().days_remaining} days left
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upcoming Seminars */}
                {getUpcomingSeminars().length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      Upcoming Seminars
                    </div>
                    <div className="space-y-2">
                      {getUpcomingSeminars().map((seminar, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800"
                        >
                          <p className="text-xs font-semibold text-purple-900 dark:text-purple-100 mb-1">
                            {seminar.title}
                          </p>
                          <p className="text-xs text-purple-800 dark:text-purple-200">
                            {new Date(seminar.seminar_date).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {!getLatestMessage() && !getLatestCompany() && getUpcomingSeminars().length === 0 && (
                  <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground">No updates at the moment</p>
                  </div>
                )}
              </TabsContent>

              {/* Tips Tab */}
              <TabsContent value="tips" className="flex-1 overflow-y-auto p-4 space-y-3">
                {tips.map((tip, idx) => {
                  const TipIcon = tip.icon
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        tip.color === "blue"
                          ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                          : tip.color === "purple"
                            ? "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
                            : tip.color === "orange"
                              ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
                              : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      }`}
                    >
                      <div className="flex gap-2">
                        <TipIcon
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            tip.color === "blue"
                              ? "text-blue-600"
                              : tip.color === "purple"
                                ? "text-purple-600"
                                : tip.color === "orange"
                                  ? "text-orange-600"
                                  : "text-green-600"
                          }`}
                        />
                        <div className="flex-1">
                          <p
                            className={`text-xs font-semibold ${
                              tip.color === "blue"
                                ? "text-blue-900 dark:text-blue-100"
                                : tip.color === "purple"
                                  ? "text-purple-900 dark:text-purple-100"
                                  : tip.color === "orange"
                                    ? "text-orange-900 dark:text-orange-100"
                                    : "text-green-900 dark:text-green-100"
                            }`}
                          >
                            {tip.title}
                          </p>
                          <p
                            className={`text-xs mt-1 ${
                              tip.color === "blue"
                                ? "text-blue-800 dark:text-blue-200"
                                : tip.color === "purple"
                                  ? "text-purple-800 dark:text-purple-200"
                                  : tip.color === "orange"
                                    ? "text-orange-800 dark:text-orange-200"
                                    : "text-green-800 dark:text-green-200"
                            }`}
                          >
                            {tip.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </TabsContent>

              {/* Stats Tab */}
              <TabsContent value="stats" className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Applications</p>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                      {stats.appliedCompanies}/{stats.totalCompanies}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">{stats.applicationRate}%</p>
                  </div>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800 text-center">
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Attendance</p>
                    <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
                      {stats.attendedSeminars}/{stats.totalSeminars}
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-300">{stats.attendanceRate}%</p>
                  </div>
                </div>

                <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-lg border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <p className="text-xs font-semibold text-orange-900 dark:text-orange-100">Messages</p>
                  </div>
                  <p className="text-lg font-bold text-orange-900 dark:text-orange-100">{stats.unreadMessages}</p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">Unread messages</p>
                </div>

                {/* Progress Indicators */}
                <div className="space-y-2 pt-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold">Application Rate</span>
                      <span className="text-xs text-muted-foreground">{stats.applicationRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.applicationRate}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold">Attendance Rate</span>
                      <span className="text-xs text-muted-foreground">{stats.attendanceRate}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all"
                        style={{ width: `${stats.attendanceRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Close on backdrop click */}
          <div className="absolute inset-0 -z-10" onClick={() => setActiveAssistant(false)} />
        </div>
      )}
    </div>
  )
}
