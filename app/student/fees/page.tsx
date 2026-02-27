"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DollarSign, Receipt, TrendingDown, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { SemesterPayButton } from "@/components/semester-pay-button"
import { useRouter, useSearchParams } from "next/navigation"

interface Student {
  id: number
  fullName: string
  enrollmentNumber: string
  courseName: string
  currentSemester: number
  totalSemesters: number
}

interface Summary {
  totalFees: number
  totalPaid: number
  totalRemaining: number
}

interface Payment {
  feeType: string
  amount: number
  paymentDate: string
  transactionId: string
}

interface SemesterBreakdown {
  semester: number
  semesterFee: number
  examFee: number
  totalFee: number
  totalPaid: number
  remaining: number
  status: string
  semesterFeePaid: boolean
  examFeePaid: boolean
  payments: Payment[]
}

export default function StudentFeesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [student, setStudent] = useState<Student | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  // We keep the full data in state here, so no data is lost
  const [semesterBreakdown, setSemesterBreakdown] = useState<SemesterBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null)

  useEffect(() => {
    fetchFeeDetails()
    
    const status = searchParams.get('payment_status')
    if (status) {
      setPaymentStatus(status)
      setTimeout(() => {
        router.replace('/student/fees')
      }, 5000)
    }
  }, [searchParams, router])

  const fetchFeeDetails = async () => {
    try {
      let token = localStorage.getItem("studentToken")
      
      if (!token) {
        const authData = localStorage.getItem("studentCredentials")
        if (authData) {
          try {
            const creds = JSON.parse(authData)
            const tokenData = `${creds.enrollment}:${creds.password}`
            token = btoa(tokenData)
            localStorage.setItem("studentToken", token)
          } catch (e) {
            console.error("[v0] Failed to recreate token:", e)
          }
        }
      }
      
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch("/api/student/fees", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      
      if (!response.ok) {
        setLoading(false)
        return
      }

      const data = await response.json()
      if (data.success) {
        setStudent(data.student)
        setSummary(data.summary)
        setSemesterBreakdown(data.semesterBreakdown)
      }
    } catch (error) {
      console.error("[v0] Error fetching fee details:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!student || !summary) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No fee information available</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- LOGIC CHANGE START ---
  // This calculates the list of semesters to SHOW, without deleting the actual data.
  // It effectively hides older semesters from the UI loop only.
  const visibleSemesters = semesterBreakdown.filter((sem) => {
    // Shows current semester AND previous 3 semesters (Range of 4 total)
    return sem.semester >= student.currentSemester - 3 && sem.semester <= student.currentSemester
  })
  // --- LOGIC CHANGE END ---

  const paymentPercentage = (summary.totalPaid / summary.totalFees) * 100

  return (
    <div className="container mx-auto py-8 space-y-8">
      {paymentStatus && (
        <div className={`p-4 rounded-lg border ${
          paymentStatus === 'SUCCESS' 
            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
            : paymentStatus === 'FAILED'
            ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
            : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
        }`}>
          <p className={`font-semibold ${
            paymentStatus === 'SUCCESS' 
              ? 'text-green-800 dark:text-green-200'
              : paymentStatus === 'FAILED'
              ? 'text-red-800 dark:text-red-200'
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            {paymentStatus === 'SUCCESS' && '✓ Payment successful! Your fees have been updated.'}
            {paymentStatus === 'FAILED' && '✗ Payment failed. Please try again.'}
            {paymentStatus === 'PENDING' && '⏳ Payment is pending. You will be notified once confirmed.'}
          </p>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Fees</h1>
          <p className="text-muted-foreground">
            View your fee structure and payment history
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Receipt className="w-5 h-5 mr-2" />
          Fee Portal
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-semibold">{student.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Enrollment Number</p>
              <p className="font-semibold">{student.enrollmentNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Course</p>
              <p className="font-semibold">{student.courseName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Semester</p>
              <p className="font-semibold">
                {student.currentSemester} / {student.totalSemesters}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Fees</p>
                {/* Keeps showing GLOBAL total, not just visible rows */}
                <p className="text-2xl font-bold">₹{summary.totalFees.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Up to Semester {student.currentSemester}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">₹{summary.totalPaid.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {paymentPercentage.toFixed(1)}% completed
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-red-600">₹{summary.totalRemaining.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {((summary.totalRemaining / summary.totalFees) * 100).toFixed(1)}% pending
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Semester-wise Fee Breakdown</CardTitle>
          <CardDescription>
            Showing recent semesters only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Semester</TableHead>
                  <TableHead className="text-right">Semester Fee</TableHead>
                  <TableHead className="text-right">Exam Fee</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Changed from 'semesterBreakdown' to 'visibleSemesters' */}
                {visibleSemesters.map((semester) => (
                  <TableRow key={semester.semester}>
                    <TableCell className="font-medium">Semester {semester.semester}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        ₹{semester.semesterFee.toFixed(2)}
                        {semester.semesterFeePaid && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        ₹{semester.examFee.toFixed(2)}
                        {semester.examFeePaid && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{semester.totalFee.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹{semester.totalPaid.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      ₹{semester.remaining.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          semester.status === "Paid"
                            ? "default"
                            : semester.status === "Partial"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {semester.status === "Paid" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {semester.status === "Pending" && <AlertCircle className="h-3 w-3 mr-1" />}
                        {semester.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {student && (
                        <SemesterPayButton
                          semester={semester.semester}
                          remaining={semester.remaining}
                          studentId={student.id.toString()}
                          enrollmentNumber={student.enrollmentNumber}
                          fullName={student.fullName}
                          courseName={student.courseName}
                          status={semester.status}
                          onPaymentComplete={() => fetchFeeDetails()}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Changed from 'semesterBreakdown' to 'visibleSemesters' */}
      {visibleSemesters.some((s) => s.payments.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Transactions for visible semesters</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {visibleSemesters.map((semester) =>
                semester.payments.length > 0 ? (
                  <div key={semester.semester} className="space-y-2">
                    <h3 className="font-semibold text-sm">Semester {semester.semester}</h3>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Transaction ID</TableHead>
                            <TableHead>Fee Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Payment Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {semester.payments.map((payment, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-mono text-sm">
                                {payment.transactionId}
                              </TableCell>
                              <TableCell className="capitalize">{payment.feeType}</TableCell>
                              <TableCell className="text-right font-semibold">
                                ₹{payment.amount.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                {new Date(payment.paymentDate).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Important Note</h3>
              <p className="text-sm text-muted-foreground">
                Fee information shown is for your current semester and previous 3 semesters only. 
                For any payment inquiries regarding older semesters, please contact the Accounts Office.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
