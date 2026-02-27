import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import Footer from "@/components/footer"
import IntroOverlay from "@/components/IntroOverlay"
import MaintenanceOverlay from "@/components/MaintenanceOverlay"

// 1. IMPORT THE FESTIVAL THEME

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Samanvay",
  description: "management system for GUCPC students",
  generator: "MYT.app",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >

          {/* Maintenance Overlay (Highest Priority) */}
          <MaintenanceOverlay />

          {/* Intro Overlay comes next */}
          <IntroOverlay />

          <Header />
          <main className="min-h-screen bg-background">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
