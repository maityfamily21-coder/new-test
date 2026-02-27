export function isExamOngoing(examDate: string, durationMinutes = 180): boolean {
  const exam = new Date(examDate)
  const now = new Date()
  const examEnd = new Date(exam.getTime() + durationMinutes * 60 * 1000)
  return now >= exam && now <= examEnd
}

export function isExamUpcoming(examDate: string): boolean {
  return new Date(examDate) > new Date()
}

export function formatExamDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getTimeUntilExam(examDate: string): string {
  const exam = new Date(examDate)
  const now = new Date()
  const diff = exam.getTime() - now.getTime()

  if (diff < 0) return "Exam has started"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function formatExamWithSubject(examDate: string, subjectName: string, subjectCode: string): string {
  const formatted = formatExamDate(examDate)
  return `${subjectName} (${subjectCode}) - ${formatted}`
}
