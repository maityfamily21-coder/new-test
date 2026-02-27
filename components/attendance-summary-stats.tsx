"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, Check, X, Clock } from "lucide-react"

interface AttendanceSummaryStatsProps {
  students: Array<{
    id: number
    attendance_status: string
  }>
}

export function AttendanceSummaryStats({ students }: AttendanceSummaryStatsProps) {
  const presentCount = students.filter((s) => s.attendance_status === "present").length
  const absentCount = students.filter((s) => s.attendance_status === "absent").length
  const pendingCount = students.filter((s) => s.attendance_status === "pending" || !s.attendance_status).length
  const total = students.length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50">
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="text-xs md:text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Students
            </p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{total}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="text-xs md:text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
              <Check className="w-4 h-4" />
              Present
            </p>
            <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{presentCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20">
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="text-xs md:text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <X className="w-4 h-4" />
              Absent
            </p>
            <p className="text-2xl md:text-3xl font-bold text-red-600 dark:text-red-400">{absentCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="space-y-1">
            <p className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending
            </p>
            <p className="text-2xl md:text-3xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
