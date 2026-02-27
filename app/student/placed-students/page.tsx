"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Users, Building2, Search, Calendar, Award, TrendingUp, ArrowLeft, AlertCircle } from "lucide-react"
import Link from "next/link"

interface PlacedStudent {
  id: number
  full_name: string
  enrollment_number: string
  course_name: string
  current_semester: number
  company_name: string
  placement_date: string
  placement_tenure_days?: number
  placement_status: string
}

interface StudentData {
  id: number
  full_name: string
  name: string
  course_name: string
  current_semester: number
}

export default function PlacedStudentsPage() {
  const [placedStudents, setPlacedStudents] = useState<PlacedStudent[]>([])
  const [filteredStudents, setFilteredStudents] = useState<PlacedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [studentData, setStudentData] = useState<StudentData | null>(null)
  const router = useRouter()

  useEffect(() => {
    const studentAuth = localStorage.getItem("studentAuth")
    if (!studentAuth) {
      router.push("/student/login")
      return
    }

    try {
      const student = JSON.parse(studentAuth)
      setStudentData(student)
      fetchPlacedStudents()
    } catch (error) {
      console.error("Failed to parse student auth:", error)
      localStorage.removeItem("studentAuth")
      router.push("/student/login")
    }
  }, [router])

  const fetchPlacedStudents = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/students/placed")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        const students = Array.isArray(data.students) ? data.students : []
        setPlacedStudents(students)
        setFilteredStudents(students)
      } else {
        setError(data.message || "Failed to fetch placed students")
        setPlacedStudents([])
        setFilteredStudents([])
      }
    } catch (error) {
      console.error("Failed to fetch placed students:", error)
      setError("Failed to load placed students. Please try again.")
      setPlacedStudents([])
      setFilteredStudents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!Array.isArray(placedStudents)) {
      setFilteredStudents([])
      return
    }

    const filtered = placedStudents.filter(
      (student) =>
        student.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.enrollment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.course_name?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredStudents(filtered)
  }, [searchTerm, placedStudents])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading placed students...</p>
        </div>
      </div>
    )
  }

  const safeStudents = Array.isArray(filteredStudents) ? filteredStudents : []
  const safePlacedStudents = Array.isArray(placedStudents) ? placedStudents : []

  const stats = {
    totalPlaced: safePlacedStudents.length,
    averageTenure:
      safePlacedStudents.length > 0
        ? Math.round(
            safePlacedStudents.reduce((sum, student) => sum + (student.placement_tenure_days || 0), 0) /
              safePlacedStudents.length,
          )
        : 0,
    topCompanies: [...new Set(safePlacedStudents.map((s) => s.company_name).filter(Boolean))].length,
    thisMonth: safePlacedStudents.filter((s) => {
      if (!s.placement_date) return false
      const placementDate = new Date(s.placement_date)
      const now = new Date()
      return placementDate.getMonth() === now.getMonth() && placementDate.getFullYear() === now.getFullYear()
    }).length,
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/student/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              Placed Students
            </h1>
            <p className="text-muted-foreground">Success stories from your fellow students</p>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-8 border-destructive">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <p className="font-medium">Error loading data</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
              <Button variant="outline" onClick={fetchPlacedStudents} className="mt-4 bg-transparent">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {!error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-green-500/10 rounded-lg w-fit mx-auto mb-4">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold mb-1">{stats.totalPlaced}</div>
                <div className="text-sm text-muted-foreground">Total Placed</div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-blue-500/10 rounded-lg w-fit mx-auto mb-4">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold mb-1">{stats.averageTenure} days</div>
                <div className="text-sm text-muted-foreground">Avg Tenure</div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-purple-500/10 rounded-lg w-fit mx-auto mb-4">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold mb-1">{stats.topCompanies}</div>
                <div className="text-sm text-muted-foreground">Companies</div>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-orange-500/10 rounded-lg w-fit mx-auto mb-4">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold mb-1">{stats.thisMonth}</div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Filter */}
        {!error && safePlacedStudents.length > 0 && (
          <Card className="mb-8 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Search className="w-5 h-5 mr-2" />
                Search Students
              </CardTitle>
              <CardDescription>Find students by name, enrollment number, company, or course</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, enrollment number, company, or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Students Grid */}
        {!error && safeStudents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeStudents.map((student) => (
              <Card
                key={student.id}
                className="shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
                        <Award className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{student.full_name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{student.enrollment_number}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500 hover:bg-green-600">Placed</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="font-semibold text-blue-600">{student.company_name || "N/A"}</p>
                      <p className="text-sm text-muted-foreground">Company</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="font-medium">{student.course_name}</p>
                      <p className="text-sm text-muted-foreground">Semester {student.current_semester}</p>
                    </div>
                  </div>

                  {student.placement_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="font-medium">{new Date(student.placement_date).toLocaleDateString()}</p>
                        <p className="text-sm text-muted-foreground">Placement Date</p>
                      </div>
                    </div>
                  )}

                  {student.placement_tenure_days && (
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-4 h-4 text-orange-500" />
                      <div>
                        <p className="font-semibold text-orange-600">{student.placement_tenure_days} days</p>
                        <p className="text-sm text-muted-foreground">Tenure</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!error && !loading && safeStudents.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                {searchTerm ? "No students match your search criteria." : "No students have been placed yet."}
              </p>
              {searchTerm && (
                <Button variant="outline" onClick={() => setSearchTerm("")} className="mt-4">
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
