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

export function PersonnelAttendanceHistoryModal({
  personnelId,
  userType,
  isOpen,
  onClose,
  onOpen,
}: {
  personnelId: number
  userType: string
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
        personnelId: personnelId.toString(),
        userType: userType,
        limit: limit.toString(),
        offset: ((currentPage - 1) * limit).toString(),
      })

      if (selectedMonth) {
        params.append("month", selectedMonth)
      }

      const response = await fetch(`/api/personnel/attendance/history?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setHistoryData(data)
      } else {
        setError(data.message || "Failed to fetch history")
      }
    } catch (err) {
      console.error("[v0] Error fetching history:", err)
      setError("Failed to load attendance history")
    } finally {
      setLoading(false)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1)
  }

  const handleNextPage = () => {
    if (historyData && currentPage < historyData.pagination.pages) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance History
          </DialogTitle>
          <DialogDescription>View your attendance records and statistics</DialogDescription>
        </DialogHeader>

        {loading && !historyData ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : historyData ? (
          <div className="space-y-4">
            {/* Month Selector */}
            <div className="flex gap-2">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value)
                  setCurrentPage(1)
                }}
                className="px-3 py-2 border rounded-md text-sm"
              />
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Days</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {historyData.statistics.totalDays}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {historyData.statistics.completedDays}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">Partial</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {historyData.statistics.partialDays}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">Completion</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {historyData.statistics.completionPercentage}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Marks</p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {historyData.statistics.totalMarks}
                </p>
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="daily">Daily Summary</TabsTrigger>
                <TabsTrigger value="records">All Records</TabsTrigger>
              </TabsList>

              <TabsContent value="daily" className="space-y-2 mt-4">
                {historyData.dailySummary.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No records for selected month</p>
                ) : (
                  historyData.dailySummary.map((day) => (
                    <div
                      key={day.date}
                      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">
                          {new Date(day.date + "T00:00:00").toLocaleDateString("en-IN", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        {day.isComplete ? (
                          <Badge className="bg-green-600 hover:bg-green-700">Complete</Badge>
                        ) : day.marksCount > 0 ? (
                          <Badge className="bg-blue-600 hover:bg-blue-700">Partial</Badge>
                        ) : (
                          <Badge variant="outline">No Entry</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {day.marksCount} marks • {day.campuses.join(", ")}
                      </p>
                      {day.firstMark && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {new Date(day.firstMark).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          -{" "}
                          {new Date(day.lastMark).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="records" className="space-y-2 mt-4">
                {historyData.records.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No records found</p>
                ) : (
                  <>
                    {historyData.records.map((record) => (
                      <div
                        key={record.id}
                        className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {record.type}
                            </Badge>
                            <p className="text-sm font-semibold">{record.campus}</p>
                          </div>
                          {record.verified && (
                            <Badge className="bg-green-600 hover:bg-green-700 text-xs">Verified</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(record.date).toLocaleDateString("en-IN", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          {new Date(record.markedAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}

                    {/* Pagination */}
                    <div className="flex justify-between items-center mt-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Page {historyData.pagination.currentPage} of {historyData.pagination.pages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleNextPage}
                          disabled={currentPage >= historyData.pagination.pages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
