"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Search, Plus, Receipt } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface Student {
  id: number
  fullName: string
  enrollmentNumber: string
  courseId: number
  currentSemester: number
}

interface FeeStructure {
  semester: number
  semester_fee: string
  exam_fee: string
  course_name: string
}

interface Payment {
  id: number
  semester: number
  fee_type: string
  amount_paid: string
  payment_date: string
  transaction_id: string
  processed_by: string
  notes: string
  created_at: string
}

interface Summary {
  totalFees: number
  totalPaid: number
  totalRemaining: number
}

export default function FeePaymentsPage() {
  const [enrollmentNumber, setEnrollmentNumber] = useState("")
  const [student, setStudent] = useState<Student | null>(null)
  const [feeStructure, setFeeStructure] = useState<FeeStructure[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)

  // Payment form fields
  const [selectedSemester, setSelectedSemester] = useState("")
  const [feeType, setFeeType] = useState("")
  const [amountPaid, setAmountPaid] = useState("")
  const [paymentDate, setPaymentDate] = useState("")
  const [transactionId, setTransactionId] = useState("")
  const [notes, setNotes] = useState("")
  const [addingPayment, setAddingPayment] = useState(false)

  const { toast } = useToast()

  const searchStudent = async () => {
    if (!enrollmentNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an enrollment number",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("adminToken")
      
      if (!token) {
        toast({
          title: "Authentication Error",
          description: "Admin token not found. Please login again.",
          variant: "destructive",
        })
        setLoading(false)
        return
      }

      const response = await fetch(
        `/api/admin/fees/payments?enrollmentNumber=${encodeURIComponent(enrollmentNumber)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] API error:", response.status, errorData)
        toast({
          title: "Error",
          description: errorData.message || `Failed to fetch details (Status: ${response.status})`,
          variant: "destructive",
        })
        resetStudentData()
        return
      }

      const data = await response.json()
      if (data.success) {
        setStudent(data.student)
        setFeeStructure(data.feeStructure)
        setPayments(data.payments)
        setSummary(data.summary)
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to fetch student details",
          variant: "destructive",
        })
        resetStudentData()
      }
    } catch (error: any) {
      console.error("[v0] Error in searchStudent:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to fetch student details",
        variant: "destructive",
      })
      resetStudentData()
    } finally {
      setLoading(false)
    }
  }

  const handleAddPayment = async () => {
    if (!student || !selectedSemester || !feeType || !amountPaid || !paymentDate || !transactionId) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    setAddingPayment(true)
    try {
      const token = localStorage.getItem("adminToken")
      const response = await fetch("/api/admin/fees/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: student.id,
          semester: parseInt(selectedSemester),
          feeType,
          amountPaid: parseFloat(amountPaid),
          paymentDate,
          transactionId,
          notes,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: "Payment recorded successfully",
        })
        resetPaymentForm()
        searchStudent() // Refresh data
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      })
    } finally {
      setAddingPayment(false)
    }
  }

  const resetStudentData = () => {
    setStudent(null)
    setFeeStructure([])
    setPayments([])
    setSummary(null)
    resetPaymentForm()
  }

  const resetPaymentForm = () => {
    setSelectedSemester("")
    setFeeType("")
    setAmountPaid("")
    setPaymentDate("")
    setTransactionId("")
    setNotes("")
  }

  const calculateSemesterBalance = (semester: number) => {
    const fs = feeStructure.find((f) => f.semester === semester)
    if (!fs) return { total: 0, paid: 0, remaining: 0 }

    const total = parseFloat(fs.semester_fee) + parseFloat(fs.exam_fee)
    const semesterPayments = payments.filter((p) => p.semester === semester)
    const paid = semesterPayments.reduce((sum, p) => sum + parseFloat(p.amount_paid), 0)
    const remaining = total - paid

    return { total, paid, remaining }
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Payments Management</h1>
          <p className="text-muted-foreground">Record and manage student fee payments</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Receipt className="w-5 h-5 mr-2" />
          Accounts Portal
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Student</CardTitle>
          <CardDescription>Enter enrollment number to view and update fee payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Enter enrollment number"
                value={enrollmentNumber}
                onChange={(e) => setEnrollmentNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchStudent()}
              />
            </div>
            <Button onClick={searchStudent} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {student && summary && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Student Details</CardTitle>
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
                  <p className="text-sm text-muted-foreground">Current Semester</p>
                  <p className="font-semibold">Semester {student.currentSemester}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Course</p>
                  <p className="font-semibold">
                    {feeStructure[0]?.course_name || "N/A"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-2xl font-bold">₹{summary.totalFees.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">₹{summary.totalPaid.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold text-red-600">₹{summary.totalRemaining.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add Payment</CardTitle>
              <CardDescription>Record a new fee payment for this student</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester *</Label>
                  <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                    <SelectTrigger id="semester">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeStructure.map((fs) => (
                        <SelectItem key={fs.semester} value={fs.semester.toString()}>
                          Semester {fs.semester}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSemester && (
                    <p className="text-xs text-muted-foreground">
                      Balance: ₹{calculateSemesterBalance(parseInt(selectedSemester)).remaining.toFixed(2)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feeType">Fee Type *</Label>
                  <Select value={feeType} onValueChange={setFeeType}>
                    <SelectTrigger id="feeType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semester">Semester Fee</SelectItem>
                      <SelectItem value="exam">Exam Fee</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Amount Paid *</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date *</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transactionId">Transaction ID *</Label>
                  <Input
                    id="transactionId"
                    placeholder="Unique transaction ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2 lg:col-span-1">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Additional notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <Button onClick={handleAddPayment} disabled={addingPayment}>
                  <Plus className="w-4 h-4 mr-2" />
                  Record Payment
                </Button>
                <Button variant="outline" onClick={resetPaymentForm}>
                  Clear Form
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Semester-wise Fee Status</CardTitle>
              <CardDescription>View detailed fee breakdown by semester</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semester</TableHead>
                      <TableHead className="text-right">Semester Fee</TableHead>
                      <TableHead className="text-right">Exam Fee</TableHead>
                      <TableHead className="text-right">Total Fee</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeStructure.map((fs) => {
                      const balance = calculateSemesterBalance(fs.semester)
                      const status =
                        balance.remaining === 0 ? "paid" : balance.paid > 0 ? "partial" : "pending"
                      return (
                        <TableRow key={fs.semester}>
                          <TableCell className="font-medium">Semester {fs.semester}</TableCell>
                          <TableCell className="text-right">₹{parseFloat(fs.semester_fee).toFixed(2)}</TableCell>
                          <TableCell className="text-right">₹{parseFloat(fs.exam_fee).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{balance.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            ₹{balance.paid.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            ₹{balance.remaining.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                status === "paid"
                                  ? "default"
                                  : status === "partial"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {status === "paid" ? "Paid" : status === "partial" ? "Partial" : "Pending"}
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

          {payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All recorded payments for this student</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction ID</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Fee Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Processed By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.transaction_id}</TableCell>
                          <TableCell>Semester {payment.semester}</TableCell>
                          <TableCell className="capitalize">{payment.fee_type}</TableCell>
                          <TableCell className="text-right font-semibold">
                            ₹{parseFloat(payment.amount_paid).toFixed(2)}
                          </TableCell>
                          <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                          <TableCell>{payment.processed_by || "N/A"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {payment.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
