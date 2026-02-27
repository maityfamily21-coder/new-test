"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

type StudentDetail = {
  id: number
  full_name: string
  enrollment_number: string
  course_id: number
  course_name?: string
  email: string
  phone_number: string
  parent_phone_number: string
  admission_semester: number
  current_semester: number
  resume_link?: string | null
  agreement_link?: string | null
  placement_status: string
  company_name?: string | null
  placement_tenure_days: number
  interests?: { id: number; name: string }[]
}

export default function StudentProfilePage() {
  const router = useRouter()
  const params = useParams()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("adminAuth")
    if (!token) {
      router.push("/admin/login")
      return
    }
    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/admin/students/${params?.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success) {
          setStudent(data.student)
        }
      } catch (e) {
        console.error("[MYT] Student profile load error:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchStudent()
  }, [router, params?.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] text-muted-foreground">Loading...</div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Link href="/admin/students">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Students
            </Button>
          </Link>
          <p className="mt-6 text-muted-foreground">Student not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/admin/students">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Students
            </Button>
          </Link>
          {/* Intentionally no Edit here; editing must be from the Students table Action column */}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">{student.full_name}</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enrollment: {student.enrollment_number} • Course: {student.course_name} • Semester:{" "}
              {student.current_semester}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-foreground">
            <div>
              <div className="font-medium mb-1">Contact</div>
              <div className="text-sm text-muted-foreground">Email</div>
              <div className="mb-3">{student.email}</div>
              <div className="text-sm text-muted-foreground">Phone</div>
              <div className="mb-3">{student.phone_number}</div>
              <div className="text-sm text-muted-foreground">Parent Phone</div>
              <div className="mb-3">{student.parent_phone_number}</div>
            </div>
            <div>
              <div className="font-medium mb-1">Academic</div>
              <div className="text-sm text-muted-foreground">Admission Semester</div>
              <div className="mb-3">{student.admission_semester}</div>
              <div className="text-sm text-muted-foreground">Current Semester</div>
              <div className="mb-3">{student.current_semester}</div>
              <div className="text-sm text-muted-foreground">Placement Status</div>
              <div className="mb-3">
                <Badge variant={student.placement_status === "Placed" ? "default" : "secondary"}>
                  {student.placement_status}
                </Badge>
              </div>
              {student.company_name && (
                <>
                  <div className="text-sm text-muted-foreground">Company</div>
                  <div className="mb-3">{student.company_name}</div>
                </>
              )}
            </div>
            <div>
              <div className="font-medium mb-1">Documents</div>
              <div className="text-sm text-muted-foreground">Resume</div>
              <div className="mb-3">
                {student.resume_link ? (
                  <a
                    href={student.resume_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Open Resume
                  </a>
                ) : (
                  "-"
                )}
              </div>
              <div className="text-sm text-muted-foreground">Agreement</div>
              <div className="mb-3">
                {student.agreement_link ? (
                  <a
                    href={student.agreement_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    Open Agreement
                  </a>
                ) : (
                  "-"
                )}
              </div>
            </div>
            <div>
              <div className="font-medium mb-1">Interests</div>
              <div className="flex flex-wrap gap-2">
                {student.interests?.length ? (
                  student.interests.map((i) => (
                    <Badge key={i.id} variant="outline">
                      {i.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No interests</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
