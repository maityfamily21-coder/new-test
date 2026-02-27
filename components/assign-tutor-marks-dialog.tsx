"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, AlertCircle, Eye } from "lucide-react"

interface Tutor {
  id: number
  name: string
  department: string
}

interface Subject {
  subject_id: number
  subject_name: string
  total_marks: number
}

interface SubjectAssignment {
  subject_id: number
  tutor_id: number
  tutor_name: string
  is_completed: boolean
}

interface StudentMark {
  student_name: string
  enrollment_number: string
  marks_obtained: number | null
  total_marks: number
  status: string
  submission_date: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  exam: {
    id: number
    exam_name: string
    course_id: number
    course_name: string
    semester: number
    subjects: Subject[]
  }
  onSuccess: () => void
}

export function AssignTutorMarksDialog({ open, onOpenChange, exam, onSuccess }: Props) {
  const { toast } = useToast()
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [selectedTutor, setSelectedTutor] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assignments, setAssignments] = useState<SubjectAssignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const [marksModalOpen, setMarksModalOpen] = useState(false)
  const [selectedSubjectForMarks, setSelectedSubjectForMarks] = useState<{
    id: number
    name: string
  } | null>(null)
  const [marks, setMarks] = useState<StudentMark[]>([])
  const [loadingMarks, setLoadingMarks] = useState(false)

  useEffect(() => {
    if (open) {
      loadAssignments()
      setSelectedTutor("")
      setSelectedSubject("")
      setTutors([])
    }
  }, [open])

  const loadTutorsForSubject = async (subjectId: string) => {
    if (!subjectId) {
      setTutors([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/admin/exams/tutors-by-subject", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject_id: Number(subjectId),
          exam_id: exam.id,
        }),
      })

      console.log("[v0] tutors-by-subject response status:", response.status)

      const data = await response.json()
      console.log("[v0] tutors-by-subject response data:", data)

      if (response.ok && data.success) {
        const tutorList = Array.isArray(data.tutors) ? data.tutors : []
        console.log("[v0] Setting tutors list:", tutorList)
        setTutors(tutorList)
        
        if (tutorList.length === 0) {
          toast({
            title: "Warning",
            description: "No tutors found for this subject. Please assign tutors to the subject first.",
            variant: "default",
          })
        }
      } else {
        setTutors([])
        toast({
          title: "Error",
          description: data.message || "Failed to load tutors for this subject",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("[v0] Error loading tutors:", error)
      setTutors([])
      toast({
        title: "Error",
        description: "Failed to load tutors for this subject",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    setLoadingAssignments(true)
    try {
      const token = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/exams/${exam.id}/assign-tutor-marks`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && Array.isArray(data.assignments)) {
          setAssignments(data.assignments)
        }
      }
    } catch (error) {
      console.error("Error loading assignments:", error)
    } finally {
      setLoadingAssignments(false)
    }
  }

  const getSubjectAssignment = (subjectId: number): SubjectAssignment | undefined => {
    return assignments.find((a) => a.subject_id === subjectId)
  }

  const handleAssign = async () => {
    if (!selectedTutor || !selectedSubject) {
      toast({
        title: "Error",
        description: "Please select both tutor and subject",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("adminAuth")
      console.log("[MYT] Assigning tutor with token present:", !!token)

      const payload = {
        exam_id: exam.id,
        subject_id: Number(selectedSubject),
        tutor_id: Number(selectedTutor),
        course_id: exam.course_id,
        semester: exam.semester,
      }

      console.log("[MYT] Assign tutor payload:", payload)

      const response = await fetch(`/api/admin/exams/${exam.id}/assign-tutor-marks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      console.log("[MYT] Assign tutor response:", data)

      if (response.ok && data.success) {
        toast({
          title: "Success",
          description: data.message,
        })
        onOpenChange(false)
        onSuccess()
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to assign tutor",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[MYT] Error assigning tutor:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to assign tutor",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadMarksForSubject = async (subjectId: number, subjectName: string) => {
    setSelectedSubjectForMarks({ id: subjectId, name: subjectName })
    setMarksModalOpen(true)
    setLoadingMarks(true)

    try {
      const token = localStorage.getItem("adminAuth")
      const response = await fetch(`/api/admin/exams/${exam.id}/subject-marks?subjectId=${subjectId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMarks(data.marks)
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to load marks",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading marks:", error)
      toast({
        title: "Error",
        description: "Failed to load marks",
        variant: "destructive",
      })
    } finally {
      setLoadingMarks(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Tutor for Marks Entry</DialogTitle>
            <DialogDescription>
              Assign a tutor to evaluate marks for {exam.exam_name} ({exam.course_name} - Sem {exam.semester})
            </DialogDescription>
          </DialogHeader>

          <div className="border rounded-lg p-4 bg-muted/30 overflow-y-auto max-h-96">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              Current Assignment Status
              {loadingAssignments && <Loader2 className="w-4 h-4 animate-spin" />}
            </h4>
            <div className="space-y-2">
              {exam.subjects.map((subject) => {
                const assignment = getSubjectAssignment(subject.subject_id)
                return (
                  <div
                    key={subject.subject_id}
                    className="flex items-center justify-between text-sm py-2 px-3 rounded bg-background border"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{subject.subject_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {assignment ? (
                        <>
                          <div
                            className={`flex items-center gap-2 ${assignment.is_completed ? "text-blue-600" : "text-green-600"}`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">
                              {assignment.is_completed ? "Completed" : "Assigned"} - {assignment.tutor_name}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => loadMarksForSubject(subject.subject_id, subject.subject_name)}
                            className="h-7 text-xs"
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View Marks
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-orange-500">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-xs">Unassigned</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="subject-select">Subject</Label>
              <Select value={selectedSubject} onValueChange={(value) => {
                setSelectedSubject(value)
                setSelectedTutor("")
                loadTutorsForSubject(value)
              }}>
                <SelectTrigger id="subject-select">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {exam.subjects.map((subject) => {
                    const assignment = getSubjectAssignment(subject.subject_id)
                    return (
                      <SelectItem key={subject.subject_id} value={subject.subject_id.toString()}>
                        <div className="flex items-center gap-2">
                          {subject.subject_name} ({subject.total_marks} marks)
                          {assignment && <span className="text-xs text-green-600 ml-2">✓ {assignment.tutor_name}</span>}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tutor-select">Tutor</Label>
              <Select value={selectedTutor} onValueChange={setSelectedTutor} disabled={loading || tutors.length === 0}>
                <SelectTrigger id="tutor-select">
                  <SelectValue placeholder={
                    loading 
                      ? "Loading tutors..." 
                      : tutors.length === 0 
                        ? "No tutors available for this subject" 
                        : "Select tutor"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {tutors.length === 0 && !loading ? (
                    <div className="p-2 text-sm text-muted-foreground text-center">
                      No tutors teaching this subject
                    </div>
                  ) : (
                    tutors.map((tutor) => (
                      <SelectItem key={tutor.id} value={tutor.id.toString()}>
                        {tutor.name} ({tutor.department})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {tutors.length === 0 && !loading && selectedSubject && (
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  ⚠️ Please ensure tutors are assigned to this subject in the system first
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAssign} disabled={isSubmitting || loading} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Tutor"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={marksModalOpen} onOpenChange={setMarksModalOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Marks Status - {selectedSubjectForMarks?.name}</DialogTitle>
            <DialogDescription>View marks entered by tutor for {exam.exam_name}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loadingMarks ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : marks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mb-4" />
                <p>No marks have been entered yet for this subject.</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-semibold text-sm">Enrollment Number</th>
                      <th className="text-left p-3 font-semibold text-sm">Student Name</th>
                      <th className="text-center p-3 font-semibold text-sm">Marks Obtained</th>
                      <th className="text-center p-3 font-semibold text-sm">Total Marks</th>
                      <th className="text-center p-3 font-semibold text-sm">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.map((mark, index) => (
                      <tr key={index} className="border-t hover:bg-muted/50">
                        <td className="p-3 text-sm font-mono">{mark.enrollment_number}</td>
                        <td className="p-3 text-sm">{mark.student_name}</td>
                        <td className="p-3 text-sm text-center font-semibold">
                          {mark.marks_obtained !== null ? mark.marks_obtained : "-"}
                        </td>
                        <td className="p-3 text-sm text-center">{mark.total_marks}</td>
                        <td className="p-3 text-sm text-center">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              mark.status === "submitted"
                                ? "bg-green-100 text-green-800"
                                : mark.status === "draft"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {mark.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setMarksModalOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
