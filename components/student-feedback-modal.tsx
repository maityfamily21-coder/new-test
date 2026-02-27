"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Star } from "lucide-react"
import { toast } from "sonner"

interface StudentFeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number
  pending: Array<{
    id: number
    name: string
    tutor_id: number
    tutor_name: string
  }>
  onSubmitSuccess: () => void
}

export function StudentFeedbackModal({
  open,
  onOpenChange,
  studentId,
  pending,
  onSubmitSuccess,
}: StudentFeedbackModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<any>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comments, setComments] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedSubject || rating === 0) {
      toast.error("Please select a subject and rating")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          tutorId: selectedSubject.tutor_id,
          subjectId: selectedSubject.id,
          rating,
          comments,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast.success("Feedback submitted successfully!")
        setSelectedSubject(null)
        setRating(0)
        setComments("")
        onSubmitSuccess()
      } else {
        toast.error(data.error || "Failed to submit feedback")
      }
    } catch (error) {
      toast.error("Error submitting feedback")
    } finally {
      setSubmitting(false)
    }
  }

  if (pending.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tutor Feedback</DialogTitle>
          </DialogHeader>
          <div className="py-8 text-center">
            <p className="text-gray-500">No pending feedback required at this time.</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tutor Feedback</DialogTitle>
          <DialogDescription>Share your feedback about your tutors</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Subject Selection */}
          <div>
            <Label>Select Subject</Label>
            <div className="grid gap-2 mt-2">
              {pending.map((subject) => (
                <Card
                  key={subject.id}
                  className={`p-3 cursor-pointer transition-all ${
                    selectedSubject?.id === subject.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                      : "hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedSubject(subject)}
                >
                  <p className="font-medium text-sm">{subject.name}</p>
                  <p className="text-xs text-gray-500">Tutor: {subject.tutor_name}</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Rating */}
          {selectedSubject && (
            <>
              <div>
                <Label>Rating</Label>
                <div className="flex gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform"
                    >
                      <Star
                        size={28}
                        className={`${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div>
                <Label>Comments (Optional)</Label>
                <Textarea
                  placeholder="Share your feedback..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-2 resize-none"
                  rows={3}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedSubject || rating === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
