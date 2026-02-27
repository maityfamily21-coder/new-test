"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, ExternalLink, X } from "lucide-react"

interface Announcement {
  id: number
  title: string
  content: string
  image_url?: string
  custom_link_url?: string
  custom_link_text?: string
  created_at: string
}

interface AnnouncementsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  announcements: Announcement[]
}

export function AnnouncementsModal({ open, onOpenChange, announcements }: AnnouncementsModalProps) {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)

  const truncateContent = (content: string, lines = 2) => {
    const lineArray = content.split("\n")
    return lineArray.slice(0, lines).join("\n")
  }

  return (
    <>
      {/* Announcements List Modal */}
      <Dialog
        open={open && !selectedAnnouncement}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            onOpenChange(false)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-xl">Announcements</DialogTitle>
                <DialogDescription>
                  {announcements.length} {announcements.length === 1 ? "announcement" : "announcements"} available
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2">
            {announcements.length > 0 ? (
              <div className="divide-y border rounded-lg overflow-hidden">
                {announcements.map((announcement) => (
                  <button
                    key={announcement.id}
                    onClick={() => setSelectedAnnouncement(announcement)}
                    className="w-full text-left p-4 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg flex-shrink-0 group-hover:bg-blue-500/20 transition-colors">
                        <Bell className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors truncate">
                          {announcement.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {truncateContent(announcement.content, 2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(announcement.created_at).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {announcement.image_url && (
                            <Badge variant="outline" className="text-xs">
                              📷 Image
                            </Badge>
                          )}
                          {announcement.custom_link_url && (
                            <Badge variant="outline" className="text-xs">
                              🔗 Link
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground flex-shrink-0">→</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No announcements yet</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Announcement Detail Modal */}
      <Dialog
        open={!!selectedAnnouncement}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedAnnouncement(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold mb-2">{selectedAnnouncement.title}</DialogTitle>
                    <DialogDescription className="text-xs">
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString("en-IN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </DialogDescription>
                  </div>
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="p-1 hover:bg-muted rounded-lg transition-colors flex-shrink-0"
                  >
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                {selectedAnnouncement.image_url && (
                  <div className="rounded-lg overflow-hidden border border-border/50">
                    <img
                      src={selectedAnnouncement.image_url || "/placeholder.svg"}
                      alt={selectedAnnouncement.title}
                      className="w-full max-h-64 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                      }}
                    />
                  </div>
                )}

                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap">
                    {selectedAnnouncement.content}
                  </p>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  {selectedAnnouncement.custom_link_url && (
                    <Button
                      onClick={() => window.open(selectedAnnouncement.custom_link_url, "_blank", "noopener,noreferrer")}
                      className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {selectedAnnouncement.custom_link_text || "Learn More"}
                    </Button>
                  )}
                  <Button
                    onClick={() => setSelectedAnnouncement(null)}
                    variant="outline"
                    className={selectedAnnouncement.custom_link_url ? "" : "w-full"}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
