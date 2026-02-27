"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Interest } from "@/lib/db"

export default function InterestsPage() {
  const [interests, setInterests] = useState<Interest[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingInterest, setEditingInterest] = useState<Interest | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
  })

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) {
      router.push("/admin/login")
      return
    }
    fetchInterests()
  }, [router])

  const fetchInterests = async () => {
    try {
      const response = await fetch("/api/admin/interests")
      const data = await response.json()

      if (data.success) {
        setInterests(data.interests)
      }
    } catch (error) {
      console.error("Failed to fetch interests:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const url = editingInterest ? `/api/admin/interests/${editingInterest.id}` : "/api/admin/interests"
      const method = editingInterest ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        fetchInterests()
        resetForm()
        setIsAddDialogOpen(false)
        setEditingInterest(null)
      } else {
        alert(data.message || "Operation failed")
      }
    } catch (error) {
      console.error("Submit error:", error)
      alert("Operation failed")
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this interest? This will affect all students with this interest."))
      return

    try {
      const response = await fetch(`/api/admin/interests/${id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (data.success) {
        fetchInterests()
      } else {
        alert(data.message || "Delete failed")
      }
    } catch (error) {
      console.error("Delete error:", error)
      alert("Delete failed")
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
    })
  }

  const handleEdit = (interest: Interest) => {
    setFormData({
      name: interest.name,
    })
    setEditingInterest(interest)
    setIsAddDialogOpen(true)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">Loading...</div>
  }

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
          <h1 className="text-2xl font-bold text-foreground ml-4">Interest Management</h1>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Add Interest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingInterest ? "Edit Interest" : "Add New Interest"}</DialogTitle>
              <DialogDescription>
                {editingInterest ? "Update interest information" : "Enter interest details for student selection"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Interest Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Software Development"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false)
                    setEditingInterest(null)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">{editingInterest ? "Update Interest" : "Add Interest"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Interests ({interests.length})</CardTitle>
            <CardDescription>Manage student interests for company matching and seminars</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Interest Name</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interests.map((interest) => (
                    <TableRow key={interest.id}>
                      <TableCell className="font-medium">{interest.name}</TableCell>
                      <TableCell>{new Date(interest.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(interest)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleDelete(interest.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
