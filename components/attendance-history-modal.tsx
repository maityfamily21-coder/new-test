"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Calendar, TrendingUp, AlertCircle } from "lucide-react"

interface HistoryRecord {
  id: number
  date: string
  type: string
  markedAt: string
  campus: string
  location: { latitude: number; longitude: number }
  verified: boolean
  status: string
}

interface DailySummary {
  date: string
  marksCount: number
  isComplete: boolean
  firstMark: string
  lastMark: string
  campuses: string[]
}

interface HistoryData {
  pagination: {
    limit: number
    offset: number
    total: number
    pages: number
    currentPage: number
  }
  statistics: {
    totalDays: number
    completedDays: number
    partialDays: number
    completionPercentage: number
    totalMarks: number
  }
  records: HistoryRecord[]
  dailySummary: DailySummary[]
}

export function AttendanceHistoryModal({
  tutorId,
  isOpen,
  onClose,
  onOpen,
}: {
  tutorId: number
  isOpen: boolean
  onClose: () => void
  onOpen?: () => void
}) {
  const [historyData, setHistoryData] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7))
  const [searchDate, setSearchDate] = useState("")

  const limit = 10

  useEffect(() => {
    if (isOpen) {
      if (onOpen) onOpen()
      fetchHistory()
    }
  }, [isOpen, currentPage, selectedMonth, searchDate, onOpen])

  const fetchHistory = async () => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        tutorId: tutorId.toString(),
        limit: limit.toString(),
        offset: ((currentPage - 1) * limit).toString(),
      })

      if (selectedMonth) {
        params.append("month", selectedMonth)
      }

      const response = await fetch(`/api/tutor/attendance/history?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setHistoryData(data)
      } else {
        setError(data.message || "Failed to fetch history")
      }
    } catch (err) {
      console.error("[v0] Error fetching history:", err)
      setError("Failed to fetch attendance history")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    } catch {
      return ""
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
    } catch {
      return dateString
    }
  }

  if (!historyData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-96 overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Attendance History</DialogTitle>
            <DialogDescription>Loading your attendance records...</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  const stats = historyData.statistics

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance History
          </DialogTitle>
          <DialogDescription>
            View your attendance records and statistics for the selected period
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Total Days</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{stats.totalDays}</p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {stats.completedDays}
                </p>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Partial</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {stats.partialDays}
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
                  Completion
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                  {stats.completionPercentage}%
                </p>
              </div>
            </div>

            {/* Completion Progress Bar */}
            <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Completion Progress
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {stats.completedDays}/{stats.totalDays} days
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${stats.totalDays > 0 ? (stats.completedDays / stats.totalDays) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Weekly Stats */}
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-indigo-600" />
                <p className="font-semibold text-sm text-indigo-900 dark:text-indigo-300">
                  Quick Stats
                </p>
              </div>
              <div className="text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
                <p>
                  Total Attendance Marks: <span className="font-bold">{stats.totalMarks}</span>
                </p>
                <p>
                  Average Marks per Day:{" "}
                  <span className="font-bold">
                    {stats.totalDays > 0 ? (stats.totalMarks / stats.totalDays).toFixed(1) : 0}
                  </span>
                </p>
              </div>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            {/* Month Filter */}
            <div className="flex gap-2 items-center">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Filter by Month:
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : historyData.records.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>No attendance records found for the selected period.</AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Records Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
                        <th className="text-left p-2 font-semibold text-gray-700 dark:text-gray-300">
                          Date
                        </th>
                        <th className="text-left p-2 font-semibold text-gray-700 dark:text-gray-300">
                          Type
                        </th>
                        <th className="text-left p-2 font-semibold text-gray-700 dark:text-gray-300">
                          Time
                        </th>
                        <th className="text-left p-2 font-semibold text-gray-700 dark:text-gray-300">
                          Campus
                        </th>
                        <th className="text-left p-2 font-semibold text-gray-700 dark:text-gray-300">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyData.records.map((record: HistoryRecord) => (
                        <tr
                          key={record.id}
                          className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="p-2 text-gray-700 dark:text-gray-300">
                            {formatDate(record.date)}
                          </td>
                          <td className="p-2">
                            <Badge
                              variant="outline"
                              className={`${
                                record.type === "Entry"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              }`}
                            >
                              {record.type}
                            </Badge>
                          </td>
                          <td className="p-2 text-gray-700 dark:text-gray-300">
                            {formatTime(record.markedAt)}
                          </td>
                          <td className="p-2 text-gray-700 dark:text-gray-300">{record.campus}</td>
                          <td className="p-2">
                            <Badge
                              variant={record.verified ? "default" : "secondary"}
                              className={record.verified ? "bg-green-600" : ""}
                            >
                              {record.verified ? "Verified" : "Pending"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Page {historyData.pagination.currentPage} of {historyData.pagination.pages} (
                    {historyData.pagination.total} total records)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(
                          Math.min(historyData.pagination.pages, currentPage + 1)
                        )
                      }
                      disabled={currentPage === historyData.pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
