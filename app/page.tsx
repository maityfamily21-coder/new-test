"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ModeToggle } from "@/components/mode-toggle"
import { Users, Award, ShieldHalf, GraduationCap, BookOpen, UserCheck, Monitor, Wrench, X, DollarSign } from "lucide-react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

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

export default function HomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // --- BEACH STATE ---
  const [palmTrees, setPalmTrees] = useState<BeachItem[]>([])
  const [people, setPeople] = useState<BeachItem[]>([])
  const [waves, setWaves] = useState<BeachItem[]>([])
  const [stars, setStars] = useState<BeachItem[]>([])
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([])

  // --- SECRET MENU LOGIC ---
  const [showHidden, setShowHidden] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const handlePressStart = () => {
    timerRef.current = setTimeout(() => {
      setShowHidden(true)
    }, 3000)
  }

  const handlePressEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
  }

  useEffect(() => {
    setMounted(true)
    localStorage.removeItem("adminAuth")
    localStorage.removeItem("studentAuth")
    localStorage.removeItem("adminData")
    localStorage.removeItem("technicalTeamAuth")
    localStorage.removeItem("technicalTeamData")

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

  if (!mounted)
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-black">
        <div className="w-10 h-10 border-4 border-gray-400/30 dark:border-white/30 border-t-gray-800 dark:border-t-white rounded-full animate-spin" />
      </div>
    )

  // --- ROLE CONFIGURATION ---
  const allRoles = [
    { name: "Student", icon: Users, href: "/student/login" },
    { name: "Admin", icon: Award, href: "/admin/login" },
    { name: "Personnel", icon: ShieldHalf, href: "/admin-personnel/login" },
    { name: "Accounts", icon: DollarSign, href: "/accounts-personnel/login" },
    { name: "Tutor", icon: Users, href: "/tutor/login" },
    { name: "Technical", icon: Monitor, href: "/technical/login" },
    { name: "Peon", icon: Wrench, href: "/peon/login" },
  ]

  const studentRole = allRoles.find((r) => r.name === "Student")
  const staffRoles = allRoles.filter((r) => r.name !== "Student")

  return (
    <div
      className="relative min-h-screen
      bg-gradient-to-br from-sky-200 via-cyan-100 to-blue-200
      dark:from-[#0a0e1a] dark:via-[#121829] dark:to-[#1a1f3a]
      text-gray-900 dark:text-white transition-all duration-300 overflow-x-hidden"
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

      {/* Mode Toggle */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-20">
        <ModeToggle />
      </div>

      {/* ✅ Hero Section */}
      <section className="relative z-10 flex flex-col justify-center items-center text-center min-h-screen container mx-auto px-4 md:px-6">
       
        {/* Logos */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-6">
          <Image
            src="/images/gujarat-university-logo.png"
            alt="Gujarat University Logo"
            width={70}
            height={70}
            className="drop-shadow-xl hover:scale-110 transition"
          />
          <Image
            src="/images/gucpc-logo.png"
            alt="GUCPC Logo"
            width={110}
            height={55}
            className="drop-shadow-xl hover:scale-110 transition"
          />
        </div>

        {/* --- THE TRIGGER (Hold Samanvay Logo) --- */}
        <div
          className="flex items-center justify-center gap-3 md:gap-4 select-none cursor-pointer active:scale-95 transition-transform duration-200"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          title=""
        >
          <Image
            src="/images/samanvay-logo.png"
            alt="Samanvay Logo"
            width={60}
            height={60}
            className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 object-contain"
          />
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight drop-shadow-lg">Samanvay</h1>
        </div>

        <p className="mt-4 text-base sm:text-lg md:text-2xl text-gray-700 dark:text-gray-200 max-w-md sm:max-w-xl mx-auto px-2">
          An Integrated Futuristic Campus Ecosystem — Bridging Students, Faculty & Innovation.
        </p>

        {/* --- VISIBLE BUTTON (STUDENT) --- */}
        <div className="flex justify-center mt-10 px-2">
          {studentRole && (
            <button
              onClick={() => router.push(studentRole.href)}
              className="group relative w-32 h-32 sm:w-40 sm:h-40
                bg-white/70 dark:bg-white/10
                backdrop-blur-xl border border-gray-300 dark:border-white/20
                hover:border-purple-500 dark:hover:border-purple-400
                rounded-2xl flex flex-col items-center justify-center
                transition-all duration-300 hover:scale-110
                hover:shadow-[0_0_25px_#a855f760]"
            >
              <studentRole.icon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-700 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition" />
              <span className="text-sm sm:text-lg font-semibold mt-3 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                {studentRole.name}
              </span>
            </button>
          )}
        </div>

        {/* --- HIDDEN BUTTONS (STAFF) - OPTIMIZED FOR MOBILE --- */}
        <AnimatePresence>
          {showHidden && (
            <motion.div
              layout
              initial={{ opacity: 0, height: 0, scale: 0.98 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.98 }}
              transition={{
                duration: 0.4,
                ease: "circOut",
              }}
              className="mt-8 w-full max-w-4xl overflow-hidden"
              style={{ willChange: "height, opacity" }}
            >
              <div className="p-6 rounded-3xl bg-white/80 dark:bg-[#11111f]/90 border border-gray-200 dark:border-gray-800 backdrop-blur-sm mx-1">
                <div className="flex justify-between items-center mb-6 border-b border-gray-300 dark:border-gray-700 pb-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                    Authorized Personnel
                  </span>
                  <button
                    onClick={() => setShowHidden(false)}
                    className="text-gray-500 hover:text-red-500 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  {staffRoles.map((role, idx) => (
                    <button
                      key={idx}
                      onClick={() => router.push(role.href)}
                      className="group relative w-24 h-24 sm:w-28 sm:h-28
                      bg-white/60 dark:bg-white/5
                      backdrop-blur-sm 
                      border border-gray-300 dark:border-white/10
                      hover:border-cyan-500 dark:hover:border-cyan-400
                      rounded-xl flex flex-col items-center justify-center
                      transition-all duration-300 hover:scale-105
                      active:scale-95"
                    >
                      <role.icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600 dark:text-gray-400 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition" />
                      <span className="text-xs sm:text-sm mt-2 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white">
                        {role.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute bottom-6 text-gray-600 dark:text-gray-400 animate-bounce text-sm">Scroll Down ↓</div>
      </section>

      {/* ✅ Achievements */}
      <motion.section
        initial={{ opacity: 0, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.3 }}
        className="relative z-10 py-16 sm:py-20 bg-white/80 dark:bg-[#0f0f1a]/80 backdrop-blur-sm px-4 sm:px-6"
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-10">
            Our Achievements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, number: "4000+", label: "Students Enrolled" },
              { icon: UserCheck, number: "120+", label: "Expert Faculty" },
              { icon: BookOpen, number: "34+", label: "Courses Offered" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className="p-6 sm:p-8 rounded-2xl border border-gray-300 dark:border-white/10 bg-white/70 dark:bg-white/5 backdrop-blur-lg shadow-lg hover:shadow-[0_0_20px_#00ffff40] transition-all"
              >
                <stat.icon className="w-9 h-9 sm:w-10 sm:h-10 mx-auto text-cyan-500 mb-3" />
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{stat.number}</h3>
                <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ✅ About CPC */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        viewport={{ once: true, amount: 0.3 }}
        className="relative z-10 py-16 sm:py-20 px-4 md:px-20 bg-blue-50/50 dark:bg-[#0f0f1a]/80 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 sm:gap-12">
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-xl hover:scale-[1.02] transition">
            <Image
              src="/images/cpc-building.jpg"
              alt="CPC Building"
              width={1000}
              height={600}
              className="rounded-2xl object-cover w-full h-auto"
            />
          </div>

          <div className="w-full md:w-1/2 text-gray-700 dark:text-gray-300 text-sm sm:text-base">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              About Centre for Professional Courses (CPC)
            </h2>
            <p className="leading-relaxed mb-3">
              Centre for Professional Courses (CPC) is one of Gujarat University's youngest departments, established in
              2023. It stands at par with excellence, fostering modern education for a dynamic world.
            </p>
            <p className="leading-relaxed mb-3">
              It is situated in the lush green campus of Gujarat University, offering a peaceful and inspiring academic
              environment.
            </p>
            <p className="leading-relaxed">
              CPC provides multidisciplinary programmes like Animation, Cyber Security, Software Development, Cloud
              Technology, Mobile Apps, Fintech, Aviation & Financial Services — leading to B.Sc., M.Sc., MBA degrees,
              and more.
            </p>
          </div>
        </div>
      </motion.section>

      {/* ✅ Director Message */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="relative z-10 py-16 sm:py-20 px-4 md:px-20 bg-white/80 dark:bg-[#11111f]/80 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 sm:gap-12">
          <div className="w-full md:w-1/3 rounded-2xl overflow-hidden shadow-xl hover:scale-[1.02] transition">
            <Image
              src="/images/director.jpeg"
              alt="Director Dr. Paavan Pandit"
              width={600}
              height={700}
              className="rounded-2xl object-cover w-full h-auto"
            />
          </div>

          <div className="w-full md:w-2/3 text-gray-700 dark:text-gray-300 text-sm sm:text-base">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              Director's Message
            </h2>
            <p className="leading-relaxed mb-3 italic">
              "In today's fast-paced world, new-age skills are in high demand. Our Centre for Professional Courses
              offers cutting-edge programs to meet these needs. We provide a variety of Master, Integrated Master, and
              Bachelor Programmes across multiple departments."
            </p>
            <p className="leading-relaxed mb-3 italic">
              Our vision is to create an innovative and excellent learning environment. We continuously update our
              curriculum to align with the latest industry trends and technological advancements.
            </p>
            <p className="leading-relaxed italic">
              Join us on this exciting journey as we prepare the next generation of professionals to thrive and lead in
              a dynamic global environment."
            </p>
            <p className="mt-5 font-semibold text-base sm:text-lg text-gray-900 dark:text-white">~ Dr. Paavan Pandit</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Director, Centre for Professional Courses (CPC)
            </p>
          </div>
        </div>
      </motion.section>

      {/* ✅ Developer Message */}
      <motion.section
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
        viewport={{ once: true, amount: 0.3 }}
        className="relative z-10 py-16 sm:py-20 px-4 md:px-20 bg-blue-50/50 dark:bg-[#0f0f1a]/80 backdrop-blur-sm"
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-8 sm:gap-12">
          <div className="w-full md:w-1/3 rounded-2xl overflow-hidden shadow-xl hover:scale-[1.02] transition">
            <Image
              src="/images/developer.jpg"
              alt="Developer"
              width={600}
              height={700}
              className="rounded-2xl object-cover w-full h-auto"
            />
          </div>

          <div className="w-full md:w-2/3 text-gray-700 dark:text-gray-300 text-sm sm:text-base">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-6">
              Developer's Message
            </h2>
            <p className="leading-relaxed mb-3 italic">
              "Samanvay is not just a project — it's a vision to bring every academic and administrative function under
              one smart digital ecosystem. The goal is to simplify processes, enhance transparency, and make Gujarat
              University a leader in futuristic campus management."
            </p>
            <p className="leading-relaxed mb-3 italic">
              This system integrates every aspect — from student life and faculty management to innovation and
              automation. Designed with performance and scalability in mind, Samanvay aims to shape the next era of
              digital education.
            </p>
            <p className="leading-relaxed italic">
              With passion and precision, we strive to make technology empower education."
            </p>
            <p className="mt-5 font-semibold text-base sm:text-lg text-gray-900 dark:text-white">~ Simon Maity</p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              Developer Team - GUCPC Gujarat University — Samanvay Project
            </p>
          </div>
        </div>
      </motion.section>

      {/* ✅ Footer */}
      <footer className="relative z-10 text-center py-5 sm:py-6 border-t border-gray-300 dark:border-gray-700/40 bg-white/60 dark:bg-[#0a0a0f]/80 backdrop-blur-sm">
        <Link href="/terms" className="inline-block group transition-all duration-300">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
            © 2025 Avinya Project by Simon Maity All Rights Reserved. | Samanvay ERP | Developed for GUCPC, Gujarat
            University.
          </p>
        </Link>
      </footer>
    </div>
  )
}
