"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
import {
  LogOut,
  Menu,
  Home,
  Users,
  Building2,
  BookOpen,
  MessageSquare,
  Calendar,
  BarChart3,
  Heart,
  Award,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface AuthUser {
  id: string
  name: string
  role: string
  course?: string
  semester?: string
  type: "student" | "admin"
}

export function Header() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Don't show header on login pages
  const isLoginPage =
    pathname === "/student/login" ||
    pathname === "/admin/login" ||
    pathname === "/tutor/login" ||
    pathname === "/" ||
    pathname === "/accounts-personnel/login" ||
    pathname === "/admin-personnel/login" ||
    pathname === "/technical/login" ||
    pathname === "/peon/login"

  useEffect(() => {
    const checkAuth = () => {
      try {
        const adminAuth = localStorage.getItem("adminAuth")
        const studentAuth = localStorage.getItem("studentAuth")

        if (adminAuth === "true") {
          const adminDataString = localStorage.getItem("adminData")
          if (adminDataString) {
            const admin = JSON.parse(adminDataString)
            setUser({
              id: admin.id || "admin-default",
              name: admin.username || "Admin",
              role: "Administrator",
              type: "admin",
            })
          } else {
            setUser({
              id: "admin-default",
              name: "Administrator",
              role: "Administrator",
              type: "admin",
            })
          }
        } else if (studentAuth) {
          try {
            const student = JSON.parse(studentAuth)
            setUser({
              id: student.id,
              name: student.full_name || student.name,
              role: "Student",
              course: student.course_name,
              semester: student.current_semester?.toString(),
              type: "student",
            })
          } catch (error) {
            console.error("Error parsing student auth data:", error)
            localStorage.removeItem("studentAuth")
            setUser(null)
          }
        } else {
          setUser(null)
        }
      } catch (error) {
        console.error("Error checking auth status:", error)
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("studentAuth")
    localStorage.removeItem("adminData")
    setUser(null)
    router.push("/")
  }

  const studentNavItems = [
    { href: "/student/dashboard", label: "Dashboard", icon: Home },
    { href: "/student/placed-students", label: "Placed Students", icon: Award },
    { href: "/student/contact", label: "Contact Prof.", icon: MessageSquare },
  ]

  const adminNavItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/companies", label: "Companies", icon: Building2 },
    { href: "/admin/seminars", label: "Seminars", icon: Calendar },
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/interests", label: "Interests", icon: Heart },
    { href: "/admin/messages", label: "Messages", icon: MessageSquare },
    { href: "/admin/exams", label: "Exams", icon: Calendar },
    { href: "/admin/exams/attendance", label: "Attendance", icon: Users },
  ]

  const navItems = user?.type === "admin" ? adminNavItems : user?.type === "student" ? studentNavItems : []

  if (isLoginPage) {
    return null
  }

  if (isLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <img
                  src="/images/gujarat-university-logo.png"
                  alt="Gujarat University"
                  className="h-8 w-8 object-contain"
                />
                <img src="/images/gucpc-logo.png" alt="GUCPC" className="h-6 object-contain" />
                {/* Added Samanvay Logo */}
                <img 
                  src="/images/samanvay-logo.png" 
                  alt="Samanvay" 
                  className="h-7 w-7 object-contain" 
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold">Samanvay Portico</h1>
                <p className="text-xs text-muted-foreground">The Architecture of Learning</p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          {user && navItems.length > 0 && (
            <nav className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => router.push(item.href)}
                    className="flex items-center space-x-2"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                )
              })}
            </nav>
          )}

          {/* Right Side - User Info and Controls */}
          <div className="flex items-center space-x-4">
            <ModeToggle />

            {user && (
              <>
                {/* Desktop User Info */}
                <div className="hidden md:flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user.name}</p>
                    {user.role && <p className="text-xs text-muted-foreground">{user.role}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>

                {/* Mobile Menu */}
                <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
                  <SheetTrigger asChild className="md:hidden">
                    <Button variant="ghost" size="sm">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-80">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between pb-4 border-b">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <img
                              src="/images/gujarat-university-logo.png"
                              alt="Gujarat University"
                              className="h-6 w-6 object-contain"
                            />
                            <img src="/images/gucpc-logo.png" alt="GUCPC" className="h-4 object-contain" />
                            <img src="/images/samanvay-logo.png" alt="Samanvay" className="h-5 w-5 object-contain" />
                          </div>
                          <div>
                            <h2 className="font-semibold">Samanvay Portico</h2>
                            <p className="text-xs text-muted-foreground">The Architecture of Learning</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-4 border-b">
                        <p className="font-medium">{user.name}</p>
                        {user.role && <p className="text-sm text-muted-foreground">{user.role}</p>}
                      </div>

                      <nav className="flex-1 py-4">
                        <div className="space-y-2">
                          {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                              <Button
                                key={item.href}
                                variant={isActive ? "default" : "ghost"}
                                onClick={() => {
                                  router.push(item.href)
                                  setIsMenuOpen(false)
                                }}
                                className="w-full justify-start"
                              >
                                <Icon className="h-4 w-4 mr-2" />
                                <span>{item.label}</span>
                              </Button>
                            )
                          })}
                        </div>
                      </nav>

                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={handleLogout}
                          className="w-full justify-start bg-transparent"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </Button>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
