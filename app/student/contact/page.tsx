"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, Phone, ArrowLeft, Instagram, Linkedin, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog"

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

export default function ContactPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null)

  useEffect(() => {
    fetchFaculty()
  }, [])

  const fetchFaculty = async () => {
    try {
      const response = await fetch("/api/faculty")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const facultyList = data.faculty && Array.isArray(data.faculty) ? data.faculty : []
      setFaculty(facultyList)
    } catch (error) {
      console.error("Error fetching faculty:", error)
      setFaculty([])
    } finally {
      setLoading(false)
    }
  }

  const filteredFaculty = faculty.filter(
    (fac) =>
      fac.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fac.department?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto py-12 px-4">
        {/* Header with Back Button */}
        <div className="mb-8">
          <Link href="/student/dashboard">
            <Button variant="outline" size="sm" className="mb-4 bg-transparent">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-5xl font-bold mb-4">Contact Directory</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Connect with our Prof. & Staff members. Find their contact information and learn more about their expertise.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <input
            type="text"
            placeholder="Search by name, designation, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-6 py-4 rounded-lg border border-border bg-background shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Faculty Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFaculty.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-lg text-muted-foreground">
                {faculty.length === 0 ? "No faculty members available" : "No faculty members match your search"}
              </p>
            </div>
          ) : (
            filteredFaculty.map((fac) => (
              <Card
                key={fac.id}
                className="overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-0 cursor-pointer"
                onClick={() => setSelectedFaculty(fac)}
              >
                <CardContent className="p-0">
                  {/* Photo Section */}
                  <div className="relative h-64 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
                    {fac.photo_url ? (
                      <Image
                        src={fac.photo_url || "/placeholder.svg"}
                        alt={fac.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          console.log("Image failed to load:", fac.photo_url)
                        }}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white text-4xl font-bold">
                        {fac.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="p-6">
                    <h3 className="text-2xl font-bold mb-1 hover:text-primary transition-colors">{fac.name}</h3>
                    <p className="text-primary font-semibold mb-3">{fac.designation}</p>

                    {fac.department && (
                      <Badge variant="secondary" className="mb-4">
                        {fac.department}
                      </Badge>
                    )}

                    {fac.about && (
                      <p className="text-sm text-muted-foreground mb-6 line-clamp-3 hover:text-foreground transition-colors">
                        {fac.about}
                      </p>
                    )}

                    {/* Contact Info */}
                    <div className="space-y-3 border-t pt-4">
                      <a
                        href={`mailto:${fac.email}`}
                        className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="break-all">{fac.email}</span>
                      </a>
                      <a
                        href={`tel:${fac.phone_number}`}
                        className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                        <span>{fac.phone_number}</span>
                      </a>
                      {(fac.instagram_url || fac.linkedin_url || fac.whatsapp_number) && (
                        <div className="flex gap-2 pt-2 border-t">
                          {fac.instagram_url && (
                            <a
                              href={fac.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-gradient-to-br from-pink-500/10 to-orange-500/10 hover:from-pink-500/20 hover:to-orange-500/20 transition-colors"
                              title="Instagram"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                            </a>
                          )}
                          {fac.linkedin_url && (
                            <a
                              href={fac.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                              title="LinkedIn"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Linkedin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </a>
                          )}
                          {fac.whatsapp_number && (
                            <a
                              href={`https://wa.me/${fac.whatsapp_number.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors"
                              title="WhatsApp"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedFaculty} onOpenChange={(open) => !open && setSelectedFaculty(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prof. / Staff Details</DialogTitle>
            <DialogClose />
          </DialogHeader>

          {selectedFaculty && (
            <div className="space-y-6">
              {/* Photo Section */}
              <div className="flex justify-center">
                <div className="relative w-48 h-48 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  {selectedFaculty.photo_url ? (
                    <Image
                      src={selectedFaculty.photo_url || "/placeholder.svg"}
                      alt={selectedFaculty.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-lg bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white text-6xl font-bold">
                      {selectedFaculty.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Name and Designation */}
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-2">{selectedFaculty.name}</h2>
                <p className="text-xl text-primary font-semibold mb-3">{selectedFaculty.designation}</p>
                {selectedFaculty.department && (
                  <Badge variant="secondary" className="text-base px-4 py-2">
                    {selectedFaculty.department}
                  </Badge>
                )}
              </div>

              {/* About Section */}
              {selectedFaculty.about && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">About</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{selectedFaculty.about}</p>
                </div>
              )}

              {/* Contact Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                <div className="space-y-4">
                  <a
                    href={`mailto:${selectedFaculty.email}`}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Mail className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold break-all">{selectedFaculty.email}</p>
                    </div>
                  </a>
                  <a
                    href={`tel:${selectedFaculty.phone_number}`}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                  >
                    <Phone className="w-6 h-6 text-primary flex-shrink-0" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-semibold">{selectedFaculty.phone_number}</p>
                    </div>
                  </a>
                  {(selectedFaculty.instagram_url ||
                    selectedFaculty.linkedin_url ||
                    selectedFaculty.whatsapp_number) && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-3">Social Media</p>
                      <div className="flex gap-3 flex-wrap">
                        {selectedFaculty.instagram_url && (
                          <a
                            href={selectedFaculty.instagram_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-br from-pink-500/10 to-orange-500/10 hover:from-pink-500/20 hover:to-orange-500/20 transition-colors"
                          >
                            <Instagram className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                            <span className="text-sm font-medium">Instagram</span>
                          </a>
                        )}
                        {selectedFaculty.linkedin_url && (
                          <a
                            href={selectedFaculty.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
                          >
                            <Linkedin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium">LinkedIn</span>
                          </a>
                        )}
                        {selectedFaculty.whatsapp_number && (
                          <a
                            href={`https://wa.me/${selectedFaculty.whatsapp_number.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 transition-colors"
                          >
                            <MessageCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                            <span className="text-sm font-medium">WhatsApp</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
