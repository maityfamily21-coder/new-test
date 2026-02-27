"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, ArrowUp, Users, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function PromotionPage() {
  const [promotionData, setPromotionData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    fetchPromotionData()
  }, [router])

  const fetchPromotionData = async () => {
    try {
      const response = await fetch("/api/admin/promotion")
      const data = await response.json()

      if (data.success) {
        setPromotionData(data.promotionData)
      }
    } catch (error) {
      console.error("Failed to fetch promotion data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePromoteAll = async () => {
    if (!confirm("Are you sure you want to promote ALL students to the next semester? This action cannot be undone.")) {
      return
    }

    setPromoting(true)
    try {
      const response = await fetch("/api/admin/promotion", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        alert(`Successfully promoted ${data.promotedCount} students to the next semester!`)
        fetchPromotionData()
      } else {
        alert(data.message || "Promotion failed")
      }
    } catch (error) {
      console.error("Promotion error:", error)
      alert("Promotion failed")
    } finally {
      setPromoting(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">Loading...</div>
  }

  const totalStudents = promotionData.reduce((sum, item) => sum + item.student_count, 0)
  const eligibleStudents = promotionData
    .filter((item) => item.current_semester < item.total_semesters)
    .reduce((sum, item) => sum + item.student_count, 0)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <Link href="/admin/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground ml-4">Semester Promotion</h1>
        </div>
        <Button
          onClick={handlePromoteAll}
          disabled={promoting || eligibleStudents === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          {promoting ? (
            <>
              <ArrowUp className="w-4 h-4 mr-2 animate-bounce" />
              Promoting...
            </>
          ) : (
            <>
              <ArrowUp className="w-4 h-4 mr-2" />
              Promote All Students
            </>
          )}
        </Button>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground">{totalStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <ArrowUp className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Eligible for Promotion</p>
                  <p className="text-2xl font-bold text-foreground">{eligibleStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="w-8 h-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Final Semester</p>
                  <p className="text-2xl font-bold text-foreground">{totalStudents - eligibleStudents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Warning Alert */}
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Clicking "Promote All Students" will advance ALL eligible students to their next
            semester. Students in their final semester will not be affected. This action cannot be undone.
          </AlertDescription>
        </Alert>

        {/* Promotion Preview Table */}
        <Card>
          <CardHeader>
            <CardTitle>Promotion Preview</CardTitle>
            <CardDescription>Review students by course and semester before promotion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Current Semester</TableHead>
                    <TableHead>Student Count</TableHead>
                    <TableHead>After Promotion</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotionData.map((item, index) => {
                    const isEligible = item.current_semester < item.total_semesters
                    const nextSemester = isEligible ? item.current_semester + 1 : item.current_semester

                    return (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.course_name}</TableCell>
                        <TableCell>Semester {item.current_semester}</TableCell>
                        <TableCell>{item.student_count}</TableCell>
                        <TableCell>
                          {isEligible ? (
                            <span className="text-green-600 font-medium">Semester {nextSemester}</span>
                          ) : (
                            <span className="text-gray-500">Semester {item.current_semester} (No change)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isEligible ? "default" : "secondary"}>
                            {isEligible ? "Eligible" : "Final Semester"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
