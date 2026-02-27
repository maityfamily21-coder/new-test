"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Search, ArrowLeft, Edit2, Trash2 } from "lucide-react"
import Link from "next/link"

interface Student {
  id: number
  name: string
  enrollment_number: string
  course_name: string
  current_semester: number
}

interface FeeStructure {
  semester: number
  semester_fee: number
  exam_fee: number
  semester_paid: number
  exam_paid: number
  semester_pending: number
  exam_pending: number
}

interface PaymentHistory {
  id: number
  semester: number
  feeType: string
  amount: number
  paymentDate: string
  transactionId: string
  notes?: string
  recordedAt: string
}

export default function AdminPersonnelFeesPage() {
  const [searchType, setSearchType] = useState<"enrollment" | "uniqueCode" | "transactionId">("enrollment")
  const [searchTerm, setSearchTerm] = useState("")
  const [student, setStudent] = useState<Student | null>(null)
  const [feeDetails, setFeeDetails] = useState<FeeStructure[]>([])
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [editingPayment, setEditingPayment] = useState<PaymentHistory | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    amount: "",
    paymentDate: "",
    transactionId: "",
    notes: "",
  })
  const [paymentForm, setPaymentForm] = useState({
    semester: "",
    feeType: "",
    amount: "",
    paymentDate: new Date().toISOString().split("T")[0],
    transactionId: "",
    notes: "",
  })
  const { toast } = useToast()

  const searchStudent = async () => {
    if (!searchTerm.trim()) {
      const typeLabel =
        searchType === "enrollment" ? "enrollment number" :
          searchType === "uniqueCode" ? "unique code" : "transaction ID"
      toast({
        title: "Error",
        description: `Please enter a ${typeLabel}`,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      let url = "/api/admin-personnel/student-fees?"

      if (searchType === "enrollment") {
        url += `enrollment=${searchTerm}`
      } else if (searchType === "uniqueCode") {
        url += `uniqueCode=${searchTerm}`
      } else if (searchType === "transactionId") {
        url += `transactionId=${searchTerm}`
      }

      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setStudent(data.student)
        setFeeDetails(data.feeDetails)

        // Fetch payment history
        const historyResponse = await fetch(`/api/admin-personnel/payment-history?studentId=${data.student.id}`)
        const historyData = await historyResponse.json()
        if (historyResponse.ok) {
          setPaymentHistory(historyData.paymentHistory || [])
        }
      } else {
        toast({
          title: "Not Found",
          description: data.error || "Student not found",
          variant: "destructive",
        })
        setStudent(null)
        setFeeDetails([])
        setPaymentHistory([])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch student details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (payment: PaymentHistory) => {
    setEditingPayment(payment)
    setEditForm({
      amount: payment.amount.toString(),
      paymentDate: payment.paymentDate,
      transactionId: payment.transactionId,
      notes: payment.notes || "",
    })
    setShowEditModal(true)
  }

  const handleUpdatePayment = async () => {
    if (!editingPayment || !editForm.amount || !editForm.paymentDate) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin-personnel/payment-history/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: editingPayment.id,
          amount: Number(editForm.amount),
          paymentDate: editForm.paymentDate,
          transactionId: editForm.transactionId || "",
          notes: editForm.notes || "",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment updated successfully",
        })
        setShowEditModal(false)
        searchStudent()
      } else {
        toast({
          title: "Error",
          description: data.error || data.details || "Failed to update payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update payment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm("Are you sure you want to delete this payment? This action cannot be undone.")) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin-personnel/payment-history/delete?paymentId=${paymentId}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment deleted successfully",
        })
        searchStudent()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete payment",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!student || !paymentForm.semester || !paymentForm.feeType || !paymentForm.amount || !paymentForm.transactionId) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin-personnel/record-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.id,
          ...paymentForm,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Payment recorded successfully",
        })
        searchStudent()
        setPaymentForm({
          semester: "",
          feeType: "",
          amount: "",
          paymentDate: new Date().toISOString().split("T")[0],
          transactionId: "",
          notes: "",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to record payment",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin-personnel/dashboard">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Student Fees Management</h1>
            <p className="text-gray-500 dark:text-gray-400">Record and manage student fee payments</p>
          </div>
        </div>

        {/* Search Section */}
        <Card>
          <CardHeader>
            <CardTitle>Search Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Type Tabs */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setSearchType("enrollment")}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${searchType === "enrollment"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
              >
                Enrollment Number
              </button>
              <button
                onClick={() => setSearchType("uniqueCode")}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${searchType === "uniqueCode"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
              >
                Unique Code
              </button>
              <button
                onClick={() => setSearchType("transactionId")}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${searchType === "transactionId"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
              >
                Transaction ID
              </button>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <Input
                placeholder={
                  searchType === "enrollment" ? "Enter Enrollment Number (e.g., 2021001)" :
                    searchType === "uniqueCode" ? "Enter Unique Code" :
                      "Enter Transaction ID"
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchStudent()}
              />
              <Button onClick={searchStudent} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Student Details */}
        {student && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Student Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                  <p className="font-semibold">{student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enrollment Number</p>
                  <p className="font-semibold">{student.enrollment_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Course</p>
                  <p className="font-semibold">{student.course_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Current Semester</p>
                  <p className="font-semibold">{student.current_semester}</p>
                </div>
              </CardContent>
            </Card>

            {/* Fee Status Table */}
            <Card>
              <CardHeader>
                <CardTitle>Fee Status (Semester-wise)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Semester</th>
                        <th className="text-right p-2">Semester Fee</th>
                        <th className="text-right p-2">Exam Fee</th>
                        <th className="text-right p-2">Total</th>
                        <th className="text-right p-2">Paid</th>
                        <th className="text-right p-2">Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeDetails.map((fee) => (
                        <tr key={fee.semester} className="border-b">
                          <td className="p-2">Semester {fee.semester}</td>
                          <td className="text-right p-2">₹{fee.semester_fee.toLocaleString()}</td>
                          <td className="text-right p-2">₹{fee.exam_fee.toLocaleString()}</td>
                          <td className="text-right p-2 font-semibold">
                            ₹{(fee.semester_fee + fee.exam_fee).toLocaleString()}
                          </td>
                          <td className="text-right p-2 text-green-600">
                            ₹{paymentHistory
                              .filter((p) => p.semester === fee.semester)
                              .reduce((sum, p) => sum + p.amount, 0)
                              .toLocaleString()}
                          </td>
                          <td className="text-right p-2 text-red-600">
                            ₹{(
                              fee.semester_fee + fee.exam_fee -
                              paymentHistory
                                .filter((p) => p.semester === fee.semester)
                                .reduce((sum, p) => sum + p.amount, 0)
                            ).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            {paymentHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Semester</th>
                          <th className="text-left p-2">Fee Type</th>
                          <th className="text-right p-2">Amount</th>
                          <th className="text-left p-2">Payment Date</th>
                          <th className="text-left p-2">Transaction ID</th>
                          <th className="text-left p-2">Notes</th>
                          <th className="text-center p-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentHistory.map((payment) => (
                          <tr key={payment.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="p-2">Semester {payment.semester}</td>
                            <td className="p-2 capitalize">{payment.feeType}</td>
                            <td className="text-right p-2 text-green-600 font-semibold">₹{payment.amount.toLocaleString()}</td>
                            <td className="p-2">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                            <td className="p-2 text-xs font-mono">{payment.transactionId}</td>
                            <td className="p-2 text-gray-600 dark:text-gray-400">{payment.notes || "-"}</td>
                            <td className="p-2 flex gap-2 justify-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditModal(payment)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePayment(payment.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle>Record Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Select value={paymentForm.semester} onValueChange={(value) => setPaymentForm({ ...paymentForm, semester: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        {feeDetails.map((fee) => (
                          <SelectItem key={fee.semester} value={fee.semester.toString()}>
                            Semester {fee.semester}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fee Type</Label>
                    <Select value={paymentForm.feeType} onValueChange={(value) => setPaymentForm({ ...paymentForm, feeType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select fee type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semester">Semester Fee</SelectItem>
                        <SelectItem value="exam">Exam Fee</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Amount (₹)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Transaction ID</Label>
                    <Input
                      placeholder="Enter transaction ID"
                      value={paymentForm.transactionId}
                      onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Input
                      placeholder="Add notes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={handlePayment} disabled={loading} className="w-full">
                  {loading ? "Recording..." : "Record Payment"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && editingPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Date</Label>
                <Input
                  type="date"
                  value={editForm.paymentDate}
                  onChange={(e) => setEditForm({ ...editForm, paymentDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Transaction ID</Label>
                <Input
                  value={editForm.transactionId}
                  onChange={(e) => setEditForm({ ...editForm, transactionId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Input
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleUpdatePayment} disabled={loading} className="flex-1">
                  {loading ? "Updating..." : "Update"}
                </Button>
                <Button variant="outline" onClick={() => setShowEditModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}