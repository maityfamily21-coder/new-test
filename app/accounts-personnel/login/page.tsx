"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DollarSign, Eye, EyeOff, Sun, Moon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"

declare global {
  interface Window {
    turnstile: {
      render: (selector: string, options: any) => string
      getResponse: (widgetId: string) => string | undefined
      reset: (widgetId: string) => void
    }
  }
}

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

export default function AccountsPersonnelLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [turnstileReady, setTurnstileReady] = useState(false)
  const [captchaError, setCaptchaError] = useState("")
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutTime, setLockoutTime] = useState(0)
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null)
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const turnstileContainerRef = useRef<HTMLDivElement>(null)
  const turnstileWidgetRef = useRef<string | null>(null)

  // --- BEACH STATE ---
  const [palmTrees, setPalmTrees] = useState<BeachItem[]>([])
  const [people, setPeople] = useState<BeachItem[]>([])
  const [waves, setWaves] = useState<BeachItem[]>([])
  const [stars, setStars] = useState<BeachItem[]>([])
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([])

  useEffect(() => {
    setMounted(true)
    
    // --- GENERATE BEACH ITEMS ---
    
    // Palm Trees (Light Mode - Fixed positions)
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

  // Initialize and manage Turnstile
  useEffect(() => {
    localStorage.removeItem("accountsPersonnelAuth")

    const storedAttempts = localStorage.getItem("accountsLoginAttempts")
    const storedLockout = localStorage.getItem("accountsLoginLockout")
    if (storedAttempts) setFailedAttempts(Number.parseInt(storedAttempts))
    if (storedLockout) {
      const lockoutEnd = Number.parseInt(storedLockout)
      const now = Date.now()
      if (lockoutEnd > now) {
        setLockoutTime(lockoutEnd - now)
      }
    }
  }, [])

  // Load Turnstile site key
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

  // Initialize Turnstile widget
  useEffect(() => {
    if (!turnstileSiteKey || !turnstileContainerRef.current) return

    const loadTurnstile = async () => {
      if (window.turnstile) {
        try {
          turnstileWidgetRef.current = window.turnstile.render("#turnstile-container-accounts", {
            sitekey: turnstileSiteKey,
            theme: theme === "dark" ? "dark" : "light",
            callback: (token: string) => {
              console.log("[v0] Turnstile verified successfully, token length:", token.length)
              setIsCaptchaVerified(true)
              setCaptchaError("")
            },
            "error-callback": () => {
              console.log("[v0] Turnstile error callback triggered")
              setIsCaptchaVerified(false)
              setCaptchaError("CAPTCHA verification failed. Please try again.")
            },
            "expired-callback": () => {
              console.log("[v0] Turnstile expired callback triggered")
              setIsCaptchaVerified(false)
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
      if (turnstileWidgetRef.current) {
        // Clean up Turnstile widget
        const container = document.getElementById("turnstile-container-accounts")
        if (container) {
          container.innerHTML = ""
        }
        turnstileWidgetRef.current = null
      }
    }
  }, [turnstileSiteKey, theme])

  // Reset Turnstile when theme changes
  useEffect(() => {
    if (turnstileWidgetRef.current && window.turnstile) {
      window.turnstile.reset(turnstileWidgetRef.current)
    }
  }, [theme])

  // Manage lockout timer
  useEffect(() => {
    if (lockoutTime > 0) {
      const timer = setTimeout(() => {
        setLockoutTime(lockoutTime - 1000)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (lockoutTime === 0 && failedAttempts >= 5) {
      setFailedAttempts(0)
      localStorage.removeItem("accountsLoginAttempts")
      localStorage.removeItem("accountsLoginLockout")
    }
  }, [lockoutTime, failedAttempts])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (lockoutTime > 0) {
      setError(`Account locked. Try again in ${Math.ceil(lockoutTime / 1000)} seconds.`)
      return
    }

    // Get token directly from Turnstile widget at submission time
    let token: string | undefined
    if (turnstileWidgetRef.current && window.turnstile) {
      token = window.turnstile.getResponse(turnstileWidgetRef.current)
    }

    console.log("[v0] Token retrieval at login:", { hasToken: !!token, widgetRef: !!turnstileWidgetRef.current })

    if (!token) {
      setError("Please complete the CAPTCHA verification")
      return
    }

    if (!username || !password) {
      setError("Please enter username and password")
      return
    }

    setLoading(true)
    setError("")

    try {
      console.log("[v0] Attempting accounts personnel login with credentials:", { username, tokenLength: token.length })
      const response = await fetch("/api/accounts-personnel/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, token }),
      })

      const data = await response.json()
      console.log("[v0] Login response:", {
        status: response.status,
        ok: response.ok,
        success: data.success,
        message: data.message,
        error: data.error,
        hasToken: !!data.token
      })

      if (response.ok && data.success) {
        localStorage.setItem("accountsPersonnelToken", data.token)
        localStorage.setItem("accountsPersonnelAuth", JSON.stringify(data.personnel || {}))
        localStorage.removeItem("accountsLoginAttempts")
        localStorage.removeItem("accountsLoginLockout")
        setFailedAttempts(0)
        setLockoutTime(0)
        console.log("[v0] Accounts personnel login successful, token saved")

        toast({
          title: "Login Successful",
          description: "Welcome to Accounts Personnel Portal",
        })

        setUsername("")
        setPassword("")

        await new Promise((resolve) => setTimeout(resolve, 500))
        router.push("/accounts-personnel/dashboard")
      } else {
        console.log("[v0] Login failed with response:", data)

        // Only increment failed attempts for non-CAPTCHA errors
        if (!data.message?.includes("CAPTCHA")) {
          const newAttempts = failedAttempts + 1
          setFailedAttempts(newAttempts)
          localStorage.setItem("accountsLoginAttempts", newAttempts.toString())

          if (newAttempts >= 5) {
            const lockoutEnd = Date.now() + 10 * 60 * 1000
            localStorage.setItem("accountsLoginLockout", lockoutEnd.toString())
            setLockoutTime(10 * 60 * 1000)
          }
        }

        setError(data.message || data.error || "Login failed")

        if (turnstileWidgetRef.current) {
          window.turnstile?.reset(turnstileWidgetRef.current)
        }
        setIsCaptchaVerified(false)
      }
    } catch (error) {
      console.error("[v0] Login error:", error)
      setError("Something went wrong. Please try again.")

      if (turnstileWidgetRef.current) {
        window.turnstile?.reset(turnstileWidgetRef.current)
      }
      setIsCaptchaVerified(false)
    } finally {
      setLoading(false)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  if (!mounted) {
    return null
  }

  const isDarkMode = theme === "dark"

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        background: isDarkMode
          ? 'linear-gradient(135deg, #0a0e1a 0%, #121829 50%, #1a1f3a 100%)'
          : 'linear-gradient(135deg, #sky-200 0%, #cyan-100 50%, #blue-200 100%)'
      }}
    >
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
          {/* Sun */}
          <div className="absolute top-10 right-20 w-24 h-24 bg-yellow-400 rounded-full shadow-[0_0_60px_#fbbf24] animate-pulse"></div>
          
          {/* Ocean Waves */}
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
                <path d="M0 40 Q 75 20, 150 40 T 300 40 L 300 80 L 0 80 Z" fill="rgba(6, 182, 212, 0.3)" />
                <path d="M0 45 Q 75 30, 150 45 T 300 45 L 300 80 L 0 80 Z" fill="rgba(14, 165, 233, 0.2)" />
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
                  {/* Walking Person */}
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
                  {/* Surfer */}
                  <ellipse cx="40" cy="45" rx="35" ry="8" fill="#FF6347" opacity="0.8" />
                  <circle cx="40" cy="20" r="7" fill="#FFA07A" />
                  <path d="M 33 27 Q 40 35 47 27" stroke="#4169E1" strokeWidth="4" fill="none" />
                  <rect x="30" y="27" width="5" height="15" fill="#FFE4B5" rx="2" transform="rotate(-30 32 27)" />
                  <rect x="45" y="27" width="5" height="15" fill="#FFE4B5" rx="2" transform="rotate(30 47 27)" />
                </svg>
              )}
              {person.type === 'running' && (
                <svg viewBox="0 0 60 80" fill="none" style={{ width: '100%', height: '100%' }}>
                  {/* Running Person */}
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
          
          {/* Beach Sand */}
          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-yellow-200 via-yellow-100 to-transparent"></div>
        </div>

        {/* DARK MODE: NIGHT BEACH WITH STARS */}
        <div className="hidden dark:block w-full h-full relative">
          {/* Moon */}
          <div className="absolute top-16 right-24 w-20 h-20 bg-gray-200 rounded-full shadow-[0_0_80px_#e5e7eb] opacity-90">
            <div className="absolute top-2 right-3 w-4 h-4 bg-gray-400 rounded-full opacity-40"></div>
            <div className="absolute top-6 right-8 w-3 h-3 bg-gray-400 rounded-full opacity-30"></div>
          </div>
          
          {/* Stars */}
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
              <svg width={`${12 * star.scale}`} height={`${12 * star.scale}`} viewBox="0 0 24 24" fill="white">
                <path d="M12 2 L14.5 9.5 L22 12 L14.5 14.5 L12 22 L9.5 14.5 L2 12 L9.5 9.5 Z" />
              </svg>
            </div>
          ))}
          
          {/* Shooting Stars */}
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
                    <stop offset="0%" stopColor="white" stopOpacity="0" />
                    <stop offset="50%" stopColor="white" stopOpacity="1" />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <rect width="60" height="3" fill={`url(#grad-${star.id})`} />
                <circle cx="58" cy="1.5" r="2" fill="white" />
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
                <rect x="45" y="60" width="10" height="90" fill="#1a1a2e" rx="2" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#16213e" transform="rotate(-30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#16213e" transform="rotate(30 50 30)" />
                <ellipse cx="50" cy="30" rx="45" ry="15" fill="#0f3460" transform="rotate(0 50 30)" />
              </svg>
            </div>
          ))}
          
          {/* Dark Ocean Waves */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-950 via-blue-900/50 to-transparent opacity-60">
            <svg className="absolute bottom-0 w-full h-full opacity-30" viewBox="0 0 1200 100" preserveAspectRatio="none">
              <path d="M0,50 Q300,20 600,50 T1200,50 L1200,100 L0,100 Z" fill="rgba(59, 130, 246, 0.3)" />
            </svg>
          </div>
          
          {/* Night Beach Sand */}
          <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-slate-800 via-slate-700/50 to-transparent opacity-50"></div>
        </div>
      </div>

      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none z-[2]">
        <div className="absolute top-1/4 left-10 w-80 h-80 bg-cyan-400/20 dark:bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-10 w-80 h-80 bg-blue-400/20 dark:bg-indigo-600/10 blur-[120px] rounded-full animate-pulse"></div>
      </div>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-full transition-all duration-200 z-20"
        style={{
          background: isDarkMode ? '#374151' : '#f3f4f6',
          color: isDarkMode ? '#60a5fa' : '#0ea5e9',
          border: isDarkMode ? '1px solid #4b5563' : '1px solid #e5e7eb',
          boxShadow: isDarkMode 
            ? '0 4px 6px rgba(96, 165, 250, 0.2)' 
            : '0 4px 6px rgba(14, 165, 233, 0.2)'
        }}
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>

      <Card className="w-full max-w-md relative z-10" style={{
        border: isDarkMode ? '2px solid #1e3a8a' : '2px solid #bae6fd',
        boxShadow: isDarkMode
          ? '0 10px 25px rgba(30, 58, 138, 0.3)'
          : '0 10px 25px rgba(14, 165, 233, 0.1)',
        backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)'
      }}>
        <CardHeader className="space-y-1 text-center relative">
          {/* Background pattern for better text visibility */}
          <div className="absolute inset-0 rounded-t-lg opacity-5" style={{
            background: isDarkMode
              ? 'linear-gradient(45deg, #60a5fa 25%, transparent 25%, transparent 50%, #60a5fa 50%, #60a5fa 75%, transparent 75%, transparent)'
              : 'linear-gradient(45deg, #0ea5e9 25%, transparent 25%, transparent 50%, #0ea5e9 50%, #0ea5e9 75%, transparent 75%, transparent)',
            backgroundSize: '20px 20px'
          }} />

          <div className="flex justify-center mb-4 relative z-10">
            <div className="p-3 rounded-full" style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)'
                : 'linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%)',
              boxShadow: isDarkMode
                ? '0 4px 6px rgba(30, 58, 138, 0.4)'
                : '0 4px 6px rgba(14, 165, 233, 0.2)'
            }}>
              <DollarSign className="h-8 w-8" style={{
                color: isDarkMode ? '#60a5fa' : '#0ea5e9'
              }} />
            </div>
          </div>

          <CardTitle className="text-2xl font-bold relative z-10" style={{
            color: isDarkMode ? '#60a5fa' : '#0ea5e9',
            textShadow: isDarkMode
              ? '0 2px 4px rgba(0, 0, 0, 0.5)'
              : '0 2px 4px rgba(14, 165, 233, 0.2)'
          }}>
            Accounts Personnel
          </CardTitle>

          <CardDescription className="relative z-10" style={{
            color: isDarkMode ? '#d1d5db' : '#6b7280',
            textShadow: isDarkMode ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
          }}>
            Sign in to manage fees and financial operations
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive" style={{
                borderColor: isDarkMode ? '#1e40af' : '#7dd3fc',
                backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff'
              }}>
                <AlertDescription style={{
                  color: isDarkMode ? '#93c5fd' : '#0369a1'
                }}>
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {lockoutTime > 0 && (
              <Alert variant="destructive" style={{
                borderColor: isDarkMode ? '#1e40af' : '#7dd3fc',
                backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff'
              }}>
                <AlertDescription style={{
                  color: isDarkMode ? '#93c5fd' : '#0369a1'
                }}>
                  Account locked. Try again in {Math.ceil(lockoutTime / 1000)} seconds.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" style={{
                color: isDarkMode ? '#e5e7eb' : '#374151'
              }}>
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading || lockoutTime > 0}
                required
                className={isDarkMode ? "dark" : ""}
                style={{
                  borderColor: isDarkMode ? '#4b5563' : '#bae6fd',
                  backgroundColor: isDarkMode ? '#374151' : 'white',
                  color: isDarkMode ? '#f3f4f6' : '#111827',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = isDarkMode ? '#60a5fa' : '#0ea5e9';
                  e.target.style.boxShadow = isDarkMode
                    ? '0 0 0 3px rgba(96, 165, 250, 0.2)'
                    : '0 0 0 3px rgba(14, 165, 233, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDarkMode ? '#4b5563' : '#bae6fd';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" style={{
                color: isDarkMode ? '#e5e7eb' : '#374151'
              }}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || lockoutTime > 0}
                  required
                  className={isDarkMode ? "dark pr-10" : "pr-10"}
                  style={{
                    borderColor: isDarkMode ? '#4b5563' : '#bae6fd',
                    backgroundColor: isDarkMode ? '#374151' : 'white',
                    color: isDarkMode ? '#f3f4f6' : '#111827',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = isDarkMode ? '#60a5fa' : '#0ea5e9';
                    e.target.style.boxShadow = isDarkMode
                      ? '0 0 0 3px rgba(96, 165, 250, 0.2)'
                      : '0 0 0 3px rgba(14, 165, 233, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDarkMode ? '#4b5563' : '#bae6fd';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  disabled={loading || lockoutTime > 0}
                  style={{
                    color: isDarkMode ? '#60a5fa' : '#1e40af',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: loading || lockoutTime > 0 ? 'not-allowed' : 'pointer'
                  }}
                  onMouseOver={(e) => {
                    if (!loading && lockoutTime === 0) {
                      e.currentTarget.style.color = isDarkMode ? '#93c5fd' : '#0ea5e9';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = isDarkMode ? '#60a5fa' : '#1e40af';
                  }}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {captchaError && (
              <Alert variant="destructive" style={{
                borderColor: isDarkMode ? '#1e40af' : '#7dd3fc',
                backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff'
              }}>
                <AlertDescription style={{
                  color: isDarkMode ? '#93c5fd' : '#0369a1'
                }}>
                  {captchaError}
                </AlertDescription>
              </Alert>
            )}

            <div ref={turnstileContainerRef} id="turnstile-container-accounts" className="flex justify-center" />

            <Button
              type="submit"
              className="w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || lockoutTime > 0 || !isCaptchaVerified}
              style={{
                background: isDarkMode
                  ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)'
                  : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                border: 'none',
                boxShadow: isDarkMode
                  ? '0 4px 6px rgba(30, 64, 175, 0.3)'
                  : '0 4px 6px rgba(14, 165, 233, 0.2)',
                color: 'white'
              }}
              onMouseOver={(e) => {
                if (!loading && lockoutTime === 0 && isCaptchaVerified) {
                  e.currentTarget.style.background = isDarkMode
                    ? 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)'
                    : 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)';
                  e.currentTarget.style.boxShadow = isDarkMode
                    ? '0 6px 8px rgba(29, 78, 216, 0.4)'
                    : '0 6px 8px rgba(2, 132, 199, 0.3)';
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = isDarkMode
                  ? 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)'
                  : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)';
                e.currentTarget.style.boxShadow = isDarkMode
                  ? '0 4px 6px rgba(30, 64, 175, 0.3)'
                  : '0 4px 6px rgba(14, 165, 233, 0.2)';
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </Button>

            <div className="text-center text-sm mt-4" style={{
              color: isDarkMode ? '#9ca3af' : '#6b7280'
            }}>
              <p>For authorized accounts personnel only</p>
              <p className="text-xs mt-1">All activities are monitored and logged</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
