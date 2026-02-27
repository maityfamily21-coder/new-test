"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

// --------------------------------------------------------
// 🔴 CONTROL PANEL
// Change this to 'true' to LOCK the site.
// Change this to 'false' to UNLOCK the site.
// --------------------------------------------------------
const IS_MAINTENANCE_MODE = false; 

export default function MaintenanceOverlay() {
  const pathname = usePathname();

  // 1. If Maintenance is OFF, return nothing (site works normally).
  if (!IS_MAINTENANCE_MODE) {
    return null;
  }

  // 3. Otherwise, BLOCK the screen for everyone else.
  return (
    <div className="fixed inset-0 z-[100000] flex flex-col items-center justify-center bg-zinc-50/95 dark:bg-black/95 backdrop-blur-3xl cursor-not-allowed">
      
      {/* Animated Warning Icon */}
      <div className="mb-8 relative">
        <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl animate-pulse"></div>
        <div className="relative bg-zinc-100 dark:bg-zinc-900 p-6 rounded-full border border-zinc-200 dark:border-zinc-800 shadow-2xl">
           <svg className="w-16 h-16 text-yellow-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
        </div>
      </div>

      {/* Main Text */}
      <h1 className="text-4xl md:text-6xl font-black text-zinc-900 dark:text-white mb-4 tracking-tighter text-center px-4">
        System Under <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-600">Maintenance</span>
      </h1>

      <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl text-center px-6 font-medium leading-relaxed">
        Samanvay is currently undergoing scheduled upgrades to improve performance.
        <br />
        <span className="text-purple-600 dark:text-purple-400 font-bold mt-2 block">
          Only Super Admins can access the system at this time.
        </span>
      </p>

      {/* Logos Row (Dimmed) */}
      <div className="mt-16 flex items-center gap-8 opacity-50 grayscale filter pointer-events-none">
         <div className="w-16 h-16 relative">
            <Image src="/images/samanvay-logo.png" alt="Samanvay" fill className="object-contain"/>
         </div>
         <div className="w-12 h-12 relative">
            <Image src="/images/gucpc-logo.png" alt="GUCPC" fill className="object-contain"/>
         </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-10 text-center pointer-events-none">
        <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
          Expected Completion: 05/01/26 Monday 01:00PM
        </p>
        <p className="text-[10px] text-zinc-600 mt-2">
          Project Avinya • Developed by Simon Maity
        </p>
      </div>

    </div>
  );
}
