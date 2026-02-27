"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export default function IntroOverlay() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isVisible]);

  const handleClose = () => {
    setIsVisible(false);
    document.body.style.overflow = "unset";
  };

  if (!isVisible) return null;

  return (
    <div
      onClick={handleClose}
      // UPDATED: bg-black/60 provides transparency to see the site behind it
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md cursor-pointer animate-in fade-in duration-500 p-4 md:p-8"
    >
      {/* UPDATED CONTAINER: 
        1. Removed h-[80vh] to prevent clipping.
        2. Added max-h-[90vh] to ensure it fits the screen.
        3. Added w-fit to wrap perfectly around the image.
      */}
      <div className="relative w-full max-w-[450px] max-h-[85vh] flex flex-col items-center">
        
        <div className="relative w-full h-auto rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <Image
            src="/images/cpc-utsav-poster.png"
            alt="CPC UTSAV 2026 Poster"
            width={500} // Set actual dimensions to maintain aspect ratio
            height={700}
            className="w-full h-auto object-contain"
            priority
          />
        </div>

        {/* Footer Hint */}
        <div className="mt-6 flex flex-col items-center gap-2 animate-pulse">
          <span className="text-white/80 text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold drop-shadow-md">
            Click anywhere to enter
          </span>
          <svg
            className="w-5 h-5 text-white/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
