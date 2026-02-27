"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit2, Trash2, X, Check } from "lucide-react"
import Image from "next/image"

interface Faculty {
  id: number
  name: string
  designation: string
  department: string
  email: string
  phone_number: string
  about: string
  photo_url: string
  instagram_url?: string
  linkedin_url?: string
  whatsapp_number?: string
}

export default function FacultyManagementPage() {
  const router = useRouter()
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    designation: "",
    department: "",
    email: "",
    phone_number: "",
    about: "",
    photo_url: "",
    instagram_url: "",
    linkedin_url: "",
    whatsapp_number: "",
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const adminAuth = localStorage.getItem("adminAuth")
        if (!adminAuth) {
          router.push("/admin/login")
          return
        }
        await fetchFaculty()
      } catch (err) {
        console.error("[MYT] Auth check error:", err)
        setError("Failed to load page")
      }
    }
    checkAuth()
  }, [router])

  const fetchFaculty = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/faculty")

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      setFaculty(data.success && Array.isArray(data.faculty) ? data.faculty : [])
    } catch (err) {
      console.error("[MYT] Fetch faculty error:", err)
      setError("Failed to load faculty. Please try again.")
      setFaculty([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.designation || !formData.email || !formData.phone_number) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      const url = editingId ? `/api/faculty/${editingId}` : "/api/faculty"
      const method = editingId ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Failed to ${editingId ? "update" : "create"} faculty`)
      }

      await fetchFaculty()
      setShowForm(false)
      setEditingId(null)
      setFormData({
        name: "",
        designation: "",
        department: "",
        email: "",
        phone_number: "",
        about: "",
        photo_url: "",
        instagram_url: "",
        linkedin_url: "",
        whatsapp_number: "",
      })
    } catch (err) {
      console.error("[MYT] Submit error:", err)
      setError(err instanceof Error ? err.message : "Failed to save faculty member")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (fac: Faculty) => {
    setFormData(fac)
    setEditingId(fac.id)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this faculty member?")) return

    try {
      setError(null)
      const response = await fetch(`/api/faculty/${id}`, { method: "DELETE" })
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete faculty")
      }

      await fetchFaculty()
    } catch (err) {
      console.error("[MYT] Delete error:", err)
      setError(err instanceof Error ? err.message : "Failed to delete faculty member")
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setFormData({
      name: "",
      designation: "",
      department: "",
      email: "",
      phone_number: "",
      about: "",
      photo_url: "",
      instagram_url: "",
      linkedin_url: "",
      whatsapp_number: "",
    })
    setError(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading faculty...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Faculty Management</h1>
          <p className="text-muted-foreground">Manage faculty members and their information</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2" size="lg">
          <Plus className="w-5 h-5" />
          Add Faculty
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card className="mb-8 border-2 border-primary/20">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Faculty" : "Add New Faculty"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Faculty name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Designation *</label>
                  <Input
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    placeholder="e.g., Professor, Associate Professor"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Department</label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Department name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Email *</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="faculty@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number *</label>
                  <Input
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="+91 XXXXXXXXXX"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Photo URL</label>
                  <Input
                    value={formData.photo_url}
                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">About</label>
                <Textarea
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  placeholder="Brief bio or description"
                  rows={4}
                />
              </div>
              <div className="border-t pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Social Media Links (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Instagram URL</label>
                    <Input
                      value={formData.instagram_url}
                      onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                      placeholder="https://instagram.com/username"
                      type="url"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">LinkedIn URL</label>
                    <Input
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      placeholder="https://linkedin.com/in/username"
                      type="url"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">WhatsApp Number</label>
                    <Input
                      value={formData.whatsapp_number}
                      onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  <Check className="w-4 h-4 mr-2" />
                  {submitting ? "Saving..." : editingId ? "Update" : "Add"} Faculty
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {faculty.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">No faculty members added yet</p>
              <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
                Add the first faculty member
              </Button>
            </CardContent>
          </Card>
        ) : (
          faculty.map((fac) => (
            <Card key={fac.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex gap-6">
                  {fac.photo_url && (
                    <div className="flex-shrink-0">
                      <Image
                        src={fac.photo_url || "/placeholder.svg"}
                        alt={fac.name}
                        width={120}
                        height={120}
                        className="rounded-lg object-cover w-32 h-32"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-grow">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-2xl font-bold">{fac.name}</h3>
                        <p className="text-primary font-semibold">{fac.designation}</p>
                        {fac.department && (
                          <Badge variant="secondary" className="mt-2">
                            {fac.department}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(fac)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(fac.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">Email:</span> {fac.email}
                      </p>
                      <p>
                        <span className="font-semibold">Phone:</span> {fac.phone_number}
                      </p>
                      {fac.about && (
                        <p>
                          <span className="font-semibold">About:</span> {fac.about}
                        </p>
                      )}
                      {(fac.instagram_url || fac.linkedin_url || fac.whatsapp_number) && (
                        <div className="pt-2 border-t">
                          <p className="font-semibold mb-2">Social Media:</p>
                          <div className="flex gap-2 flex-wrap">
                            {fac.instagram_url && (
                              <a
                                href={fac.instagram_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                              >
                                Instagram
                              </a>
                            )}
                            {fac.linkedin_url && (
                              <a
                                href={fac.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                              >
                                LinkedIn
                              </a>
                            )}
                            {fac.whatsapp_number && (
                              <a
                                href={`https://wa.me/${fac.whatsapp_number.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
                              >
                                WhatsApp
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
