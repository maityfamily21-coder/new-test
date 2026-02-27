"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Student {
  id: number
  full_name: string
  enrollment_number: string
  email: string
  phone_number: string
  course_id: number
  current_semester: number
}

interface Batch {
  id: number
  batch_name: string
  semester: number
  course_id: number
}

export default function BatchStudentsPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const batchId = Number(params.batchId)

  const [batch, setBatch] = useState<Batch | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStudents, setSelectedStudents] = useState<number[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }

    fetchBatchAndStudents()
  }, [router, batchId])

  const fetchBatchAndStudents = async () => {
    setLoading(true)
    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const headers = adminAuth ? { Authorization: `Bearer ${adminAuth}` } : {}

      const response = await fetch(`/api/admin/batches/${batchId}`, { headers })
      const data = await response.json()

      if (data.success) {
        setBatch(data.batch)
        setStudents(data.students)

        const allStudentsResponse = await fetch(
          `/api/admin/students?courseId=${data.batch.course_id}&semester=${data.batch.semester}`,
          { headers },
        )
        const allStudentsData = await allStudentsResponse.json()
        setAllStudents(allStudentsData.students || [])
      }
    } catch (error) {
      console.error("Error fetching batch and students:", error)
      toast({ title: "Error", description: "Failed to fetch batch details", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      toast({ title: "Error", description: "Please select at least one student", variant: "destructive" })
      return
    }

    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/batches/${batchId}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminAuth && { Authorization: `Bearer ${adminAuth}` }),
        },
        body: JSON.stringify({ studentIds: selectedStudents }),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: `Added ${data.addedStudents} student(s)` })
        setSelectedStudents([])
        setIsDialogOpen(false)
        fetchBatchAndStudents()
      }
    } catch (error) {
      console.error("Error adding students:", error)
      toast({ title: "Error", description: "Failed to add students", variant: "destructive" })
    }
  }

  const handleRemoveStudent = async (studentId: number) => {
    if (!confirm("Remove this student from the batch?")) return

    try {
      const adminAuth = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/batches/${batchId}/students`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(adminAuth && { Authorization: `Bearer ${adminAuth}` }),
        },
        body: JSON.stringify({ studentIds: [studentId] }),
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: "Success", description: "Student removed from batch" })
        fetchBatchAndStudents()
      }
    } catch (error) {
      console.error("Error removing student:", error)
      toast({ title: "Error", description: "Failed to remove student", variant: "destructive" })
    }
  }

  const availableStudents = allStudents.filter((s) => !students.find((bs) => bs.id === s.id))

  const filteredAvailableStudents = availableStudents.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-2 border-primary/30 border-t-primary mx-auto"></div>
          <p className="text-lg text-muted-foreground">Loading batch details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-blue-50/30 dark:to-blue-950/10">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6 md:space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/admin/batches">
              <Button variant="outline" size="icon" className="rounded-lg bg-transparent">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{batch?.batch_name}</h1>
              <p className="text-sm md:text-base text-muted-foreground">Manage student assignments for this batch</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 gap-2 rounded-lg">
                <Plus className="w-4 h-4" />
                Add Students
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Students to Batch</DialogTitle>
                <DialogDescription>Select students to add to {batch?.batch_name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Search by name or enrollment number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-lg"
                />
                <div className="border rounded-lg max-h-96 overflow-y-auto">
                  {filteredAvailableStudents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {availableStudents.length === 0 ? "All students are already in a batch" : "No students found"}
                    </div>
                  ) : (
                    filteredAvailableStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-2 p-3 border-b hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      >
                        <Checkbox
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedStudents([...selectedStudents, student.id])
                            } else {
                              setSelectedStudents(selectedStudents.filter((id) => id !== student.id))
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">{student.enrollment_number}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-lg flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddStudents}
                    disabled={selectedStudents.length === 0}
                    className="bg-blue-600 hover:bg-blue-700 rounded-lg flex-1"
                  >
                    Add {selectedStudents.length} Student(s)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Students List */}
        <Card className="rounded-lg border border-blue-100 dark:border-blue-900/30">
          <CardHeader>
            <CardTitle>Assigned Students</CardTitle>
            <CardDescription>{students.length} student(s) in this batch</CardDescription>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No students assigned yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Enrollment</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{student.enrollment_number}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{student.email}</TableCell>
                        <TableCell className="text-sm">{student.phone_number}</TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRemoveStudent(student.id)}
                            className="gap-1 text-xs rounded-lg"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
