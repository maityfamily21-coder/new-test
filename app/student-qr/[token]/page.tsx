"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function StudentQRAttendancePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter()
  const [token, setToken] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fingerprint, setFingerprint] = useState<string>("")
  const [deviceKey, setDeviceKey] = useState<string>("")
  const [deviceGroup, setDeviceGroup] = useState<string>("")
  const [fpReady, setFpReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function unwrapParams() {
      try {
        const resolvedParams = await params
        if (!cancelled) {
          setToken(resolvedParams.token)
        }
      } catch (err) {
        console.error("[MYT] Failed to unwrap params:", err)
        if (!cancelled) {
          setError("Invalid QR code")
        }
      }
    }
    unwrapParams()
    return () => {
      cancelled = true
    }
  }, [params])

  // Initialize device identifiers
  useEffect(() => {
    try {
      const existing = typeof window !== "undefined" ? window.localStorage.getItem("qr_device_key") : null
      if (existing && existing.trim() !== "") {
        setDeviceKey(existing)
      } else {
        const key =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`
        if (typeof window !== "undefined") {
          window.localStorage.setItem("qr_device_key", key)
        }
        setDeviceKey(key)
      }
    } catch {
      setDeviceKey("")
    }
  }, [])

  // Compute device fingerprint
  useEffect(() => {
    let cancelled = false
    async function computeFingerprint() {
      try {
        const nav = typeof navigator !== "undefined" ? navigator : ({} as any)
        const scr = typeof screen !== "undefined" ? screen : ({} as any)

        const baseParts = [
          nav.userAgent || "",
          nav.platform || "",
          String((nav as any).hardwareConcurrency || ""),
          String((nav as any).deviceMemory || ""),
          String((nav as any).maxTouchPoints || ""),
          `${scr.width || 0}x${scr.height || 0}x${scr.colorDepth || 0}x${scr.pixelDepth || 0}`,
          String(new Date().getTimezoneOffset() || ""),
        ].join("|")

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
            glSig = [vendor || "", renderer || ""].join("|")
          }
        } catch {
          glSig = ""
        }

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
            const maxTextureSize = String(gl.getParameter(gl.MAX_TEXTURE_SIZE) || "")
            const parts = [vendor, renderer, maxTextureSize]
            const enc = new TextEncoder()
            const dig = await crypto.subtle.digest("SHA-256", enc.encode(parts.join("|")))
            groupSig = Array.from(new Uint8Array(dig))
              .map((b) => b.toString(16).padStart(2, "0"))
              .join("")
          }
        } catch {
          groupSig = ""
        }

        const encoder = new TextEncoder()
        const toHash = [baseParts, glSig].join("||")
        const digest = await crypto.subtle.digest("SHA-256", encoder.encode(toHash))
        const bytes = Array.from(new Uint8Array(digest))
        const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("")

        if (!cancelled) {
          setFingerprint(hex)
          setDeviceGroup((groupSig || hex).toLowerCase())
          setFpReady(true)
        }
      } catch {
        try {
          const nav = typeof navigator !== "undefined" ? navigator : {}
          const scr = typeof screen !== "undefined" ? screen : {}
          const fallback = [nav.userAgent || "", nav.platform || "", `${scr.width || 0}x${scr.height || 0}`].join("|")
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

  // Auto-submit when ready
  useEffect(() => {
    if (!fpReady || !fingerprint || !deviceGroup || done || error || !token) return

    const submitAttendance = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/student-qr/${token}/attend`, {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fingerprint, deviceKey, deviceGroup }),
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

    submitAttendance()
  }, [fpReady, fingerprint, deviceGroup, token, done, error])

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "28rem",
          backgroundColor: "#fff",
          borderRadius: "0.5rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          padding: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}
          >
            <h2
              style={{ fontSize: "1.25rem", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              ✓ Attendance Marked
            </h2>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.25rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.25rem",
              }}
            >
              Secure
            </span>
          </div>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Student QR Code Attendance System</p>
        </div>

        <div style={{ textAlign: "center", paddingTop: "1.5rem", paddingBottom: "1.5rem" }}>
          {done ? (
            <>
              <div style={{ fontSize: "3rem", color: "#22c55e", marginBottom: "0.75rem" }}>✓</div>
              <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Attendance Recorded</p>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
                Your attendance has been successfully marked.
              </p>
              <button
                onClick={() => router.push("/student/dashboard")}
                style={{
                  width: "100%",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#4f46e5",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Go to Dashboard
              </button>
            </>
          ) : error ? (
            <>
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  backgroundColor: "#fee2e2",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 0.75rem",
                }}
              >
                <span style={{ fontSize: "1.5rem" }}>⚠️</span>
              </div>
              <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Error</p>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>{error}</p>
              <button
                onClick={() => window.location.reload()}
                style={{
                  width: "100%",
                  padding: "0.5rem 1rem",
                  backgroundColor: "#4f46e5",
                  color: "#fff",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <div
                style={{
                  display: "inline-block",
                  width: "3rem",
                  height: "3rem",
                  border: "3px solid #e5e7eb",
                  borderTop: "3px solid #4f46e5",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                  marginBottom: "1rem",
                }}
              />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              <p style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Processing</p>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>Marking your attendance...</p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}
              >
                🔒 Secure device verification in progress
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
