"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ModeToggle } from "@/components/mode-toggle"
import { BookOpen, ArrowLeft, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// --- BEACH CONFIGURATION ---
interface BeachItem {
  id: number
  left: number
  duration: number
  delay: number
  scale: number
  type?: string
}

interface ShootingStar {
  id: number
  left: number
  top: number
  duration: number
  delay: number
  angle: number
}

declare global {
  interface Window {
    turnstile: {
      render: (selector: string, options: any) => string
      getResponse: (widgetId: string) => string | undefined
      reset: (widgetId: string) => void
    }
  }
}

export default function TutorLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [captchaError, setCaptchaError] = useState("")
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(0)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null)

  // Beach State
  const [palmTrees, setPalmTrees] = useState<BeachItem[]>([])
  const [people, setPeople] = useState<BeachItem[]>([])
  const [waves, setWaves] = useState<BeachItem[]>([])
  const [stars, setStars] = useState<BeachItem[]>([])
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([])
  const [mounted, setMounted] = useState(false)

  const router = useRouter()
  const { toast } = useToast()
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetRef = useRef<string | null>(null)

  // --- 1. INITIALIZE BEACH ITEMS ---
  useEffect(() => {
    setMounted(true)

    // Palm Trees (Light Mode)
    const newPalmTrees = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: (i * 12) + Math.random() * 8,
      duration: 3 + Math.random() * 2,
      delay: Math.random() * -5,
      scale: 0.7 + Math.random() * 0.5,
    }))
    setPalmTrees(newPalmTrees)

    // Moving People (Light Mode)
    const newPeople = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 20 + Math.random() * 15,
      delay: Math.random() * -30,
      scale: 0.4 + Math.random() * 0.3,
      type: i % 3 === 0 ? 'walking' : i % 3 === 1 ? 'surfing' : 'running',
    }))
    setPeople(newPeople)

    // Ocean Waves (Light Mode)
    const newWaves = Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      left: i * 25,
      duration: 8 + Math.random() * 4,
      delay: i * -2,
      scale: 1,
    }))
    setWaves(newWaves)

    // Starry Sky (Dark Mode)
    const newStars = Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      duration: 2 + Math.random() * 3,
      delay: Math.random() * -5,
      scale: 0.3 + Math.random() * 0.7,
    }))
    setStars(newStars)

    // Shooting Stars (Dark Mode)
    const newShootingStars = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 40,
      duration: 1.5 + Math.random() * 1,
      delay: Math.random() * -20,
      angle: 30 + Math.random() * 30,
    }))
    setShootingStars(newShootingStars)
  }, [])

  // --- 2. AUTH & CAPTCHA SETUP ---
  useEffect(() => {
    localStorage.removeItem("tutorAuth")
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("studentAuth")
    localStorage.removeItem("adminData")

    const handlePopState = () => {
      localStorage.removeItem("tutorAuth")
      localStorage.removeItem("adminAuth")
      localStorage.removeItem("studentAuth")
      localStorage.removeItem("adminData")
      router.push("/")
    }

    window.addEventListener("popstate", handlePopState)

    const storedAttempts = localStorage.getItem("tutorLoginAttempts")
    const storedLockout = localStorage.getItem("tutorLoginLockout")
    if (storedAttempts) setFailedAttempts(Number.parseInt(storedAttempts))
    if (storedLockout) {
      const lockoutEnd = Number.parseInt(storedLockout)
      const now = Date.now()
      if (lockoutEnd > now) {
        setLockoutTime(lockoutEnd - now)
      }
    }

    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [router])

  useEffect(() => {
    const loadTurnstileKey = async () => {
      try {
        const response = await fetch("/api/config/turnstile-key")
        if (!response.ok) {
          throw new Error("Failed to fetch Turnstile key")
        }
        const data = await response.json()
        setTurnstileSiteKey(data.siteKey)
      } catch (err) {
        console.error("Failed to load Turnstile key:", err)
        setCaptchaError("Failed to load security verification")
      }
    }
    loadTurnstileKey()
  }, [])

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileContainerRef.current) return

    const loadTurnstile = async () => {
      if (window.turnstile) {
        try {
          turnstileWidgetRef.current = window.turnstile.render("#turnstile-container-tutor", {
            sitekey: turnstileSiteKey,
            theme: "light",
            callback: (token: string) => {
              console.log("[v0] Turnstile verified successfully")
              setTurnstileToken(token)
              setCaptchaError("")
            },
            "error-callback": () => {
              console.log("[v0] Turnstile error")
              setTurnstileToken(null)
              setCaptchaError("CAPTCHA verification failed. Please try again.")
            },
            "expired-callback": () => {
              console.log("[v0] Turnstile expired")
              setTurnstileToken(null)
              setCaptchaError("CAPTCHA expired. Please verify again.")
            },
          })
          setTurnstileReady(true)
        } catch (err) {
          console.error("Turnstile render error:", err)
          setCaptchaError("Failed to initialize security verification")
        }
      }
    }

    // Load Turnstile script
    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.defer = true
    script.onload = loadTurnstile
    script.onerror = () => {
      setCaptchaError("Failed to load security verification script")
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [turnstileSiteKey])

  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => {
        setLockoutTime(lockoutTime - 1000)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (lockoutTime === 0 && failedAttempts >= 5) {
      setFailedAttempts(0)
      localStorage.removeItem("tutorLoginAttempts")
      localStorage.removeItem("tutorLoginLockout")
    }
  }, [lockoutTime, failedAttempts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (lockoutTime > 0) {
      setError(`Account locked. Try again in ${Math.ceil(lockoutTime / 1000)} seconds.`)
      return
    }

    const token = turnstileWidgetRef.current ? window.turnstile?.getResponse(turnstileWidgetRef.current) : null
    if (!token) {
      setError("Please complete the CAPTCHA verification")
      return
    }

    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/tutor/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, token }),
      })

      const data = await response.json()

      if (data.success) {
        localStorage.setItem("tutorAuth", JSON.stringify(data.tutor))
        localStorage.setItem("tutorToken", data.token)
        localStorage.removeItem("tutorLoginAttempts")
        localStorage.removeItem("tutorLoginLockout")
        setFailedAttempts(0)
        setLockoutTime(0)
        toast({ title: "Success", description: "Login successful" })
        await new Promise((resolve) => setTimeout(resolve, 500))
        router.push("/tutor/dashboard")
      } else {
        const newAttempts = failedAttempts + 1
        setFailedAttempts(newAttempts)
        localStorage.setItem("tutorLoginAttempts", newAttempts.toString())

        if (newAttempts >= 5) {
          const lockoutEnd = Date.now() + 10 * 60 * 1000
          localStorage.setItem("tutorLoginLockout", lockoutEnd.toString())
          setLockoutTime(10 * 60 * 1000)
          setError("Too many failed attempts. Account locked for 10 minutes.")
        } else {
          setError(data.error || "Invalid credentials")
        }

        window.turnstile?.reset(turnstileWidgetRef.current!)
        setTurnstileToken(null)
      }
    } catch (error) {
      setError("Login failed. Please try again.")
      window.turnstile?.reset(turnstileWidgetRef.current!)
      setTurnstileToken(null)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToHome = () => {
    localStorage.removeItem("tutorAuth")
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("studentAuth")
    localStorage.removeItem("adminData")
    router.push("/")
  }

  return (
    <div className="min-h-screen relative w-full overflow-hidden bg-gradient-to-br from-violet-100 via-purple-50 to-indigo-100 dark:from-[#0a0e1a] dark:via-[#150f1a] dark:to-[#0f0a1a] flex items-center justify-center p-4">
      {/* --- INLINE STYLES FOR BEACH ANIMATIONS --- */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes palmSway {
          0%, 100% { transform: rotate(-3deg); }
          50% { transform: rotate(3deg); }
        }
        @keyframes walkAcross {
          0% { 
            transform: translateX(-100vw) scaleX(1); 
            opacity: 0;
          }
          5% { 
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% { 
            transform: translateX(100vw) scaleX(1); 
            opacity: 0;
          }
        }
        @keyframes waveFlow {
          0% { 
            transform: translateX(-100%) scale(1);
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
          100% { 
            transform: translateX(100vw) scale(1.2);
            opacity: 0.3;
          }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes shootingStar {
          0% { 
            transform: translate(0, 0) rotate(var(--angle));
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% { 
            transform: translate(calc(var(--distance) * 1px), calc(var(--distance) * 0.6px)) rotate(var(--angle));
            opacity: 0;
          }
        }
        .palm-tree {
          animation: palmSway ease-in-out infinite;
          transform-origin: bottom center;
        }
        .beach-person {
          animation: walkAcross linear infinite;
          position: absolute;
          bottom: 15vh;
        }
        .ocean-wave {
          animation: waveFlow linear infinite;
          position: absolute;
          bottom: 0;
        }
        .star {
          animation: twinkle ease-in-out infinite;
          position: absolute;
        }
        .shooting-star {
          animation: shootingStar linear infinite;
          position: absolute;
        }
      `}} />

      {/* --- BEACH LAYER (FIXED BACKGROUND) --- */}
      <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-[1]">
        
        {/* LIGHT MODE: BEACH SCENE */}
        <div className="block dark:hidden w-full h-full relative">
          {/* Sun with violet/purple glow */}
          <div className="absolute top-10 right-20 w-24 h-24 bg-violet-400 rounded-full shadow-[0_0_60px_#a78bfa] animate-pulse"></div>
          
          {/* Ocean Waves with purple/violet tints */}
          {waves.map((wave) => (
            <div
              key={wave.id}
              className="ocean-wave"
              style={{
                left: `${wave.left}%`,
                animationDuration: `${wave.duration}s`,
                animationDelay: `${wave.delay}s`,
                width: '300px',
                height: '80px',
              }}
            >
              <svg viewBox="0 0 300 80" fill="none" style={{ width: '100%', height: '100%' }}>
                <path d="M0 40 Q 75 20, 150 40 T 300 40 L 300 80 L 0 80 Z" fill="rgba(167, 139, 250, 0.2)" />
                <path d="M0 45 Q 75 30, 150 45 T 300 45 L 300 80 L 0 80 Z" fill="rgba(139, 92, 246, 0.15)" />
              </svg>
            </div>
          ))}
          
          {/* Palm Trees */}
          {palmTrees.map((tree) => (
            <div
              key={tree.id}
              className="palm-tree absolute"
              style={{
                left: `${tree.left}%`,
                bottom: '5vh',
                animationDuration: `${tree.duration}s`,
                animationDelay: `${tree.delay}s`,
                width: `${80 * tree.scale}px`,
                height: `${120 * tree.scale}px`,
              }}
            >
              <svg viewBox="0 0 100 150" fill="none" style={{ width: '100%', height: '100%', filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.2))' }}>
                {/* Trunk */}
                <rect x="45" y="60" width="10" height="90" fill="#8B4513" rx="2" />
                <ellipse cx="50" cy="75" rx="7" ry="4" fill="#A0522D" />
                <ellipse cx="50" cy="90" rx="7" ry="4" fill="#A0522D" />
                <ellipse cx="50" cy="105" rx="7" ry="4" fill="#A0522D" />
                {/* Palm Leaves */}
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#228B22" transform="rotate(-30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#2E8B57" transform="rotate(30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#32CD32" transform="rotate(0 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#3CB371" transform="rotate(-60 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#228B22" transform="rotate(60 50 30)" />
                {/* Coconuts */}
                <circle cx="45" cy="55" r="5" fill="#8B4513" />
                <circle cx="55" cy="58" r="5" fill="#A0522D" />
              </svg>
            </div>
          ))}
          
          {/* Moving People */}
          {people.map((person) => (
            <div
              key={person.id}
              className="beach-person"
              style={{
                left: `${person.left}%`,
                animationDuration: `${person.duration}s`,
                animationDelay: `${person.delay}s`,
                width: `${60 * person.scale}px`,
                height: `${80 * person.scale}px`,
              }}
            >
              {person.type === 'walking' && (
                <svg viewBox="0 0 60 80" fill="none" style={{ width: '100%', height: '100%' }}>
                  <circle cx="30" cy="15" r="8" fill="#FFA07A" />
                  <rect x="25" y="23" width="10" height="25" fill="#4169E1" rx="2" />
                  <rect x="22" y="35" width="6" height="25" fill="#FFE4B5" rx="2" />
                  <rect x="32" y="35" width="6" height="25" fill="#FFE4B5" rx="2" />
                  <rect x="20" y="23" width="5" height="20" fill="#FFE4B5" rx="2" transform="rotate(-20 22 23)" />
                  <rect x="35" y="23" width="5" height="20" fill="#FFE4B5" rx="2" transform="rotate(20 37 23)" />
                </svg>
              )}
              {person.type === 'surfing' && (
                <svg viewBox="0 0 80 60" fill="none" style={{ width: '100%', height: '100%' }}>
                  <ellipse cx="40" cy="45" rx="35" ry="8" fill="#FF6347" opacity="0.8" />
                  <circle cx="40" cy="20" r="7" fill="#FFA07A" />
                  <path d="M 33 27 Q 40 35 47 27" stroke="#4169E1" strokeWidth="4" fill="none" />
                  <rect x="30" y="27" width="5" height="15" fill="#FFE4B5" rx="2" transform="rotate(-30 32 27)" />
                  <rect x="45" y="27" width="5" height="15" fill="#FFE4B5" rx="2" transform="rotate(30 47 27)" />
                </svg>
              )}
              {person.type === 'running' && (
                <svg viewBox="0 0 60 80" fill="none" style={{ width: '100%', height: '100%' }}>
                  <circle cx="30" cy="15" r="8" fill="#FFA07A" />
                  <rect x="25" y="23" width="10" height="20" fill="#FF6347" rx="2" />
                  <rect x="20" y="38" width="6" height="28" fill="#FFE4B5" rx="2" transform="rotate(-40 23 38)" />
                  <rect x="34" y="38" width="6" height="28" fill="#FFE4B5" rx="2" transform="rotate(30 37 38)" />
                  <rect x="18" y="23" width="5" height="18" fill="#FFE4B5" rx="2" transform="rotate(-50 20 23)" />
                  <rect x="37" y="23" width="5" height="18" fill="#FFE4B5" rx="2" transform="rotate(40 39 23)" />
                </svg>
              )}
            </div>
          ))}
          
          {/* Beach Sand with violet tone */}
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-violet-200 via-purple-100 to-transparent"></div>
        </div>

        {/* DARK MODE: NIGHT BEACH WITH STARS */}
        <div className="hidden dark:block w-full h-full relative">
          {/* Moon with violet glow */}
          <div className="absolute top-16 right-24 w-20 h-20 bg-violet-200 rounded-full shadow-[0_0_80px_#ddd6fe] opacity-90">
            <div className="absolute top-2 right-3 w-4 h-4 bg-violet-300 rounded-full opacity-40"></div>
            <div className="absolute top-6 right-8 w-3 h-3 bg-violet-300 rounded-full opacity-30"></div>
          </div>
          
          {/* Stars with violet tint */}
          {stars.map((star) => (
            <div
              key={star.id}
              className="star"
              style={{
                left: `${star.left}%`,
                top: `${Math.random() * 60}%`,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            >
              <svg width={`${12 * star.scale}`} height={`${12 * star.scale}`} viewBox="0 0 24 24" fill="#ddd6fe">
                <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" />
              </svg>
            </div>
          ))}
          
          {/* Shooting Stars with violet trails */}
          {shootingStars.map((star) => (
            <div
              key={star.id}
              className="shooting-star"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                // @ts-ignore
                '--angle': `${star.angle}deg`,
                '--distance': Math.random() * 400 + 200,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            >
              <svg width="60" height="3" viewBox="0 0 60 3" fill="none">
                <defs>
                  <linearGradient id={`grad-${star.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ddd6fe" stopOpacity="0" />
                    <stop offset="50%" stopColor="#ddd6fe" stopOpacity="1" />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <rect width="60" height="3" fill={`url(#grad-${star.id})`} />
                <circle cx="58" cy="1.5" r="2" fill="#ddd6fe" />
              </svg>
            </div>
          ))}
          
          {/* Palm Tree Silhouettes */}
          {palmTrees.slice(0, 5).map((tree) => (
            <div
              key={tree.id}
              className="palm-tree absolute opacity-40"
              style={{
                left: `${tree.left}%`,
                bottom: '5vh',
                animationDuration: `${tree.duration}s`,
                animationDelay: `${tree.delay}s`,
                width: `${80 * tree.scale}px`,
                height: `${120 * tree.scale}px`,
              }}
            >
              <svg viewBox="0 0 100 150" fill="none" style={{ width: '100%', height: '100%' }}>
                <rect x="45" y="60" width="10" height="90" fill="#2d1b2d" rx="2" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#3d203d" transform="rotate(-30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#3d203d" transform="rotate(30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#4d254d" transform="rotate(0 50 30)" />
              </svg>
            </div>
          ))}
          
          {/* Dark Ocean Waves with violet tint */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-violet-950 via-purple-950/50 to-transparent opacity-60">
            <svg className="absolute bottom-0 w-full h-full opacity-30" viewBox="0 0 1200 100" preserveAspectRatio="none">
              <path d="M0,50 Q300,20 600,50 T1200,50 L1200,100 L0,100 Z" fill="rgba(76, 29, 149, 0.3)" />
            </svg>
          </div>
          
          {/* Night Beach Sand with violet tone */}
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-violet-950 via-purple-900/50 to-transparent opacity-50"></div>
        </div>
      </div>

      {/* Background Glows with tutor colors */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        <div className="absolute top-1/4 left-10 w-80 h-80 bg-violet-400/20 dark:bg-violet-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-purple-400/20 dark:bg-purple-600/10 blur-[120px] rounded-full animate-pulse"></div>
      </div>

      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToHome}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Button>
        <ModeToggle />
      </div>

      <div className="w-full max-w-md relative z-20">
        <Card className="shadow-2xl border-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                Tutor Portal
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                Sign in to manage your lectures and attendance
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 bg-background/50 border-2 focus:border-purple-500 transition-colors"
                  required
                  disabled={loading || lockoutTime > 0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 bg-background/50 border-2 focus:border-purple-500 transition-colors pr-10"
                    required
                    disabled={loading || lockoutTime > 0}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-11 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading || lockoutTime > 0}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Verify you are human</Label>
                <div id="turnstile-container-tutor" ref={turnstileContainerRef} className="flex justify-center" />
              </div>

              {captchaError && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription className="text-sm">{captchaError}</AlertDescription>
                </Alert>
              )}

              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading || lockoutTime > 0}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">Authorized tutors only</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="absolute bottom-4 left-4 right-4 text-center z-20">
        <p className="text-xs text-muted-foreground">
          © 2025 Avinya Project by Simon Maity All Rights Reserved. | Samanvay ERP | Developed for GUCPC, Gujarat
          University.
        </p>
      </div>
    </div>
  )
}
