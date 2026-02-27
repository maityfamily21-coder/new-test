"use client"

import React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, LogIn, QrCode, ShieldCheck } from "lucide-react"

export default function QRAttendancePage({ params }: { params: { token: string } }) {
  const router = useRouter()
  const { token } = params
  const [enrollmentNumber, setEnrollmentNumber] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimed, setClaimed] = useState(false) // track claimed window session
  const [remaining, setRemaining] = useState(0) // track remaining seconds for claim window
  const [fingerprint, setFingerprint] = useState<string>("")
  const [deviceKey, setDeviceKey] = useState<string>("")
  const [fpReady, setFpReady] = useState(false) // track when a robust fingerprint is ready
  const [deviceGroup, setDeviceGroup] = useState<string>("") // track normalized device group id that’s stable across profiles

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/qr/${token}/claim`, { method: "POST", cache: "no-store", credentials: "include" })
        const data = await res.json().catch(() => ({}))
        if (!cancelled) {
          if (res.ok && data?.success) {
            setClaimed(true)
            setRemaining(20)
          } else {
            setClaimed(false)
            setError(data?.message || "Invalid or expired QR. Please rescan.")
          }
        }
      } catch {
        if (!cancelled) {
          setClaimed(false)
          setError("Network error")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  React.useEffect(() => {
    try {
      const existing = typeof window !== "undefined" ? window.localStorage.getItem("qr_device_key") : null
      if (existing && existing.trim() !== "") {
        setDeviceKey(existing)
        return
      }
      const key =
        typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
      if (typeof window !== "undefined") {
        window.localStorage.setItem("qr_device_key", key)
      }
      setDeviceKey(key)
    } catch {
      // if localStorage is blocked, deviceKey will remain empty; server still uses fallback checks
      setDeviceKey("")
    }
  }, [])

  React.useEffect(() => {
    if (!claimed) return
    const id = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(id)
          setClaimed(false)
          setError("Invalid or expired QR. Please rescan.")
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(id)
  }, [claimed])

  React.useEffect(() => {
    let cancelled = false
    async function computeFingerprint() {
      try {
        const nav = typeof navigator !== "undefined" ? navigator : ({} as any)
        const scr = typeof screen !== "undefined" ? screen : ({} as any)

        // Base stable parts (avoid language/fonts); include touch/cpu/mem and screen info
        const baseParts = [
          nav.userAgent || "",
          nav.platform || "",
          String((nav as any).hardwareConcurrency || ""),
          String((nav as any).deviceMemory || ""),
          String((nav as any).maxTouchPoints || ""),
          `${scr.width || 0}x${scr.height || 0}x${scr.colorDepth || 0}x${scr.pixelDepth || 0}`,
          String(new Date().getTimezoneOffset() || ""),
          (() => {
            try {
              return Intl.DateTimeFormat().resolvedOptions().timeZone || ""
            } catch {
              return ""
            }
          })(),
        ].join("|")

        // WebGL parameters (more deterministic than canvas toDataURL)
        let glSig = ""
        try {
          const canvas = document.createElement("canvas")
          const gl =
            (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
            (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
          if (gl) {
            const dbg = gl.getExtension("WEBGL_debug_renderer_info") as any
            const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)
            const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
            const shading = gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
            const version = gl.getParameter(gl.VERSION)
            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE)
            const maxCubeMapSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)
            const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
            const maxViewportDims = (() => {
              const arr = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
              return Array.isArray(arr) || (arr as any).length ? `${arr[0]}x${arr[1]}` : ""
            })()
            const extensions = (gl.getSupportedExtensions() || []).join(",")
            glSig = [
              vendor || "",
              renderer || "",
              shading || "",
              version || "",
              String(maxTextureSize || ""),
              String(maxCubeMapSize || ""),
              String(maxRenderbufferSize || ""),
              maxViewportDims || "",
              extensions,
            ].join("|")
          }
        } catch {
          glSig = ""
        }

        // WebGPU adapter name if available (extra anchor)
        let gpuName = ""
        try {
          const anyNav: any = nav
          if (anyNav && anyNav.gpu && anyNav.gpu.requestAdapter) {
            const adapter = await anyNav.gpu.requestAdapter()
            gpuName = adapter?.name || ""
          }
        } catch {
          gpuName = ""
        }

        // Compute a normalized group signature using only very stable signals
        let groupSig = ""
        try {
          const canvas = document.createElement("canvas")
          const gl =
            (canvas.getContext("webgl") as WebGLRenderingContext | null) ||
            (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null)
          if (gl) {
            const dbg: any = gl.getExtension("WEBGL_debug_renderer_info")
            const vendor = (dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)) || ""
            const renderer = (dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || ""
            // Only include core max limits which are stable across profiles on the same hardware
            const maxTextureSize = String(gl.getParameter(gl.MAX_TEXTURE_SIZE) || "")
            const maxRenderbufferSize = String(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) || "")
            const maxCubeMapSize = String(gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE) || "")
            // Avoid volatile fields like extensions list, viewport dims, DPR, screen size, deviceMemory, etc.
            const parts = [vendor, renderer, maxTextureSize, maxRenderbufferSize, maxCubeMapSize]
            const enc = new TextEncoder()
            const dig = await crypto.subtle.digest("SHA-256", enc.encode(parts.join("|")))
            groupSig = Array.from(new Uint8Array(dig))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")
          } else {
            groupSig = ""
          }
        } catch {
          groupSig = ""
        }

        // Hash everything deterministically
        const encoder = new TextEncoder()
        const toHash = [baseParts, glSig, gpuName].join("||")
        const digest = await crypto.subtle.digest("SHA-256", encoder.encode(toHash))
        const bytes = Array.from(new Uint8Array(digest))
        const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("")

        if (!cancelled) {
          setFingerprint(hex)
          setDeviceGroup((groupSig || hex).toLowerCase())
          setFpReady(true)
        }
      } catch {
        // If localStorage is blocked, deviceKey will remain empty; server still uses fallback checks
        try {
          const nav = typeof navigator !== "undefined" ? navigator : {}
          const scr = typeof screen !== "undefined" ? screen : {}
          const fallback = [
            nav.userAgent || "",
            nav.platform || "",
            String((nav as any).hardwareConcurrency || ""),
            `${scr.width || 0}x${scr.height || 0}x${scr.colorDepth || 0}x${scr.pixelDepth || 0}`,
          ].join("|")
          const enc = new TextEncoder()
          const dig = await crypto.subtle.digest("SHA-256", enc.encode(fallback))
          const bytes = Array.from(new Uint8Array(dig))
          const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("")
          setFingerprint(hex)
          setDeviceGroup(hex.toLowerCase())
        } catch {
          setFingerprint("fallback")
          setDeviceGroup("fallback")
        }
        setFpReady(true)
      }
    }
    computeFingerprint()
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/qr/${token}/attend`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Fingerprint": fingerprint || "",
          "X-Device-Group": deviceGroup || "",
        },
        body: JSON.stringify({ enrollmentNumber, password, fingerprint, deviceKey, deviceGroup }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDone(true)
      } else {
        setError(data.message || "Failed to mark attendance")
      }
    } catch (err) {
      console.error(err)
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md glass-panel">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Seminar Attendance
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Secure Login
            </Badge>
          </div>
          <CardDescription>Enter your credentials to mark attendance for this seminar.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="font-semibold mb-1">Attendance Recorded</p>
              <p className="text-sm text-muted-foreground">You have been marked Present for this seminar.</p>
              <div className="mt-6">
                <Button onClick={() => router.push("/student/dashboard")} className="w-full">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!claimed && <p className="text-sm text-red-600">{error || "Invalid or expired QR. Please rescan."}</p>}
              {claimed && (
                <div className="text-xs text-muted-foreground -mb-1" aria-live="polite">
                  This window is validated. You can complete attendance even if the QR rotates.
                  <span className="ml-2 font-medium text-foreground">Expires in {remaining}s</span>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="enrollmentNumber">Enrollment Number</Label>
                <Input
                  id="enrollmentNumber"
                  value={enrollmentNumber}
                  onChange={(e) => setEnrollmentNumber(e.target.value)}
                  placeholder="e.g., 2021XXXX"
                  required
                  disabled={!claimed}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  disabled={!claimed}
                />
              </div>
              {error && claimed && <p className="text-sm text-red-600">{error}</p>}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !claimed || !fpReady || !fingerprint || !deviceGroup}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? "Marking..." : "Mark Attendance"}
              </Button>
              {!fpReady && (
                <div className="text-center text-xs text-muted-foreground mt-1">Preparing secure device binding...</div>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-2">
                <ShieldCheck className="w-3 h-3" />
                Your credentials are only used to verify identity for this seminar.
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
