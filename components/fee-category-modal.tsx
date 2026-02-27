import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface FeeCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number
  studentName: string
  currentCategory: string
  onUpdate: (category: string) => void
}

const FEE_CATEGORIES = [
  { value: "GENERAL", label: "General Fees Student", color: "bg-blue-100 text-blue-800" },
  { value: "FREESHIP", label: "Freeship Student", color: "bg-green-100 text-green-800" },
  { value: "SCHOLARSHIP", label: "Scholarship Student", color: "bg-purple-100 text-purple-800" },
  { value: "EWS", label: "EWS Student", color: "bg-orange-100 text-orange-800" },
]

export function FeeCategoryModal({
  open,
  onOpenChange,
  studentId,
  studentName,
  currentCategory,
  onUpdate,
}: FeeCategoryModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(currentCategory)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSave = async () => {
    if (selectedCategory === currentCategory) {
      onOpenChange(false)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/students/${studentId}/fee-category`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fee_category: selectedCategory }),
      })

      if (!response.ok) {
        throw new Error("Failed to update fee category")
      }

      const data = await response.json()
      onUpdate(selectedCategory)
      toast({
        title: "Success",
        description: `Fee category updated to ${selectedCategory}`,
        variant: "default",
      })
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating fee category:", error)
      toast({
        title: "Error",
        description: "Failed to update fee category",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getCategoryInfo = (category: string) => {
    return FEE_CATEGORIES.find((c) => c.value === category)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Fee Type</DialogTitle>
          <DialogDescription>
            Select a fee category for <strong>{studentName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-3">
            {FEE_CATEGORIES.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={`w-full p-4 text-left border-2 rounded-lg transition-all ${
                  selectedCategory === category.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{category.label}</span>
                    <span className="text-sm text-gray-500">{category.value}</span>
                  </div>
                  {selectedCategory === category.value && (
                    <Badge className={category.color}>Selected</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>

          {selectedCategory !== currentCategory && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
              <p className="text-yellow-800">
                Current: <strong>{getCategoryInfo(currentCategory)?.label}</strong>
              </p>
              <p className="text-yellow-800">
                New: <strong>{getCategoryInfo(selectedCategory)?.label}</strong>
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
