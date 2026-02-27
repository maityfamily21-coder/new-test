"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

type Item = {
  id: number
  recipient_email: string
  subject: string
  type: "seminar" | "message" | "company"
  status: "pending" | "processing" | "sent" | "failed"
  attempts: number
  last_error?: string | null
  created_at: string
  updated_at: string
}

export default function AdminMailPage() {
  const router = useRouter()
  const [active, setActive] = useState<"pending" | "sent" | "failed">("pending")
  const [items, setItems] = useState<Item[]>([])
  const [counts, setCounts] = useState<{ pending: number; sent: number; failed: number }>({
    pending: 0,
    sent: 0,
    failed: 0,
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const adminAuth = localStorage.getItem("adminAuth")
    if (!adminAuth) router.push("/admin/login")
  }, [router])

  async function load(status: "pending" | "sent" | "failed") {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/mail-queue?status=${status}`, { cache: "no-store" })
      const data = await res.json()
      if (data?.success) {
        setItems(data.items || [])
        setCounts(data.counts || { pending: 0, sent: 0, failed: 0 })
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(active)
    const id = setInterval(() => load(active), 5000)
    return () => clearInterval(id)
  }, [active])

  useEffect(() => {
    // kick off processing immediately on page load
    processNow()
    const pid = setInterval(() => {
      processNow()
    }, 30000)
    return () => clearInterval(pid)
  }, [])

  async function processNow() {
    // trigger background processor without awaiting admins’ action result
    fetch("/api/jobs/email/process", { method: "POST" }).catch(() => {})
  }

  return (
    <main className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/dashboard" className="text-sm underline">
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-2 text-pretty">Mail Status</h1>
          <p className="text-sm text-muted-foreground">Pending emails, delivery status, and failures.</p>
        </div>
        <Button onClick={processNow} variant="secondary">
          Process Now
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-balance">Queue Overview</CardTitle>
          <CardDescription>Live counts refresh every 5 seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Badge variant="outline">Pending: {counts.pending}</Badge>
            <Badge variant="outline">Sent: {counts.sent}</Badge>
            <Badge variant="outline">Failed: {counts.failed}</Badge>
          </div>
        </CardContent>
      </Card>

      <Tabs value={active} onValueChange={(v) => setActive(v as any)} className="mt-6">
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
          <TabsTrigger value="failed">Failed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <MailTable items={items} loading={loading} empty="No pending emails." />
        </TabsContent>
        <TabsContent value="sent">
          <MailTable items={items} loading={loading} empty="No sent emails yet." />
        </TabsContent>
        <TabsContent value="failed">
          <MailTable items={items} loading={loading} empty="No failed emails. Great!" />
        </TabsContent>
      </Tabs>
    </main>
  )
}

function MailTable({ items, loading, empty }: { items: Item[]; loading: boolean; empty: string }) {
  return (
    <Card className="mt-4">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Recipient</th>
                <th className="text-left p-3 font-medium">Subject</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Attempts</th>
                <th className="text-left p-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4" colSpan={6}>
                    Loading...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="p-4" colSpan={6}>
                    {empty}
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="p-3">{i.recipient_email}</td>
                    <td className="p-3">{i.subject}</td>
                    <td className="p-3 capitalize">{i.type}</td>
                    <td className="p-3">{i.status}</td>
                    <td className="p-3">{i.attempts}</td>
                    <td className="p-3">{new Date(i.updated_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
