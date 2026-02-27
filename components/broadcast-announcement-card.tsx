"use client"

import { X, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface BroadcastAnnouncementCardProps {
  broadcast: {
    id: number
    title: string
    content: string
    image_url?: string
    custom_link_url?: string
    custom_link_text?: string
    created_at: string
  }
  onClose: (id: number) => void
}

export function BroadcastAnnouncementCard({ broadcast, onClose }: BroadcastAnnouncementCardProps) {
  return (
    <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent shadow-md">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded">
                ANNOUNCEMENT
              </span>
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">{broadcast.title}</h3>

            {broadcast.image_url && (
              <div className="mb-4 rounded-lg overflow-hidden border border-border/50">
                <img
                  src={broadcast.image_url || "/placeholder.svg"}
                  alt={broadcast.title}
                  className="w-full max-h-48 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none"
                  }}
                />
              </div>
            )}

            <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-4 leading-relaxed">{broadcast.content}</p>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {new Date(broadcast.created_at).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>

              {broadcast.custom_link_url && (
                <Button
                  size="sm"
                  onClick={() => window.open(broadcast.custom_link_url, "_blank", "noopener,noreferrer")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {broadcast.custom_link_text || "Learn More"}
                </Button>
              )}
            </div>
          </div>

          <button
            onClick={() => onClose(broadcast.id)}
            className="flex-shrink-0 p-1 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close announcement"
          >
            <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
