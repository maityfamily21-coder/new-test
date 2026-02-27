"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PersonnelAttendanceCard } from "@/components/personnel-attendance-card"
import { DollarSign, Users, Receipt, TrendingUp, LogOut, Package } from "lucide-react"

export default function AccountsPersonnelDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCollected: 0,
    pendingPayments: 0,
    recentPayments: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("accountsPersonnelToken")
      
      if (!token) {
        console.error("[v0] No accounts personnel token found")
        setLoading(false)
        return
      }

      const response = await fetch("/api/accounts-personnel/stats", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error("[v0] Stats fetch failed:", response.status)
      }
    } catch (error) {
      console.error("[v0] Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch("/api/accounts-personnel/logout", { method: "POST" })
    router.push("/accounts-personnel/login")
  }

  // Get accountsPersonnelId from localStorage or use a placeholder
  const [personnelId, setPersonnelId] = useState<number>(0)

  useEffect(() => {
    const token = localStorage.getItem("accountsPersonnelToken")
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split(".")[1]))
        setPersonnelId(decoded.id || 0)
      } catch (e) {
        console.error("Failed to decode token:", e)
        setPersonnelId(0)
      }
    }
  }, [])

  const cards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: Users,
      color: "blue",
      description: "Active students",
    },
    {
      title: "Total Collected",
      value: `₹${stats.totalCollected.toLocaleString()}`,
      icon: DollarSign,
      color: "green",
      description: "All time collection",
    },
    {
      title: "Pending Payments",
      value: stats.pendingPayments,
      icon: Receipt,
      color: "orange",
      description: "Students with pending fees",
    },
    {
      title: "Recent Payments",
      value: stats.recentPayments,
      icon: TrendingUp,
      color: "purple",
      description: "Last 7 days",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Accounts Personnel</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Fees Management Portal</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {card.title}
                  </CardTitle>
                  <Icon className={`h-4 w-4 text-${card.color}-600`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{loading ? "..." : card.value}</div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{card.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-1">
            {personnelId > 0 && <PersonnelAttendanceCard personnelId={personnelId} userType="accounts_personnel" />}
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/accounts-personnel/update-payment")}>
            <CardHeader>
              <CardTitle>Update Payment</CardTitle>
              <CardDescription>Record new fee payments for students</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">
                <Receipt className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/accounts-personnel/fee-structure")}>
            <CardHeader>
              <CardTitle>Fee Structure</CardTitle>
              <CardDescription>Manage semester and exam fees</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-transparent" variant="outline">
                <DollarSign className="h-4 w-4 mr-2" />
                Manage Fees
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/accounts-personnel/stationery")}>
            <CardHeader>
              <CardTitle>Stationery Requests</CardTitle>
              <CardDescription>Request office supplies and inventory items</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-transparent" variant="outline">
                <Package className="h-4 w-4 mr-2" />
                Request Supplies
              </Button>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
