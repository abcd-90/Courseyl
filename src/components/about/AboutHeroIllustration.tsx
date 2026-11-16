import React from "react";
import Image from "next/image";

export function AboutHeroIllustration() {
  return (
    <div className="relative w-full max-w-[520px] mx-auto select-none flex items-center justify-center">
      {/* Soft ambient lime-green radial glow matching the 3D asset */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#eef5db] via-[#f7fbf2]/80 to-transparent dark:from-[#365314]/35 dark:via-transparent dark:to-transparent rounded-full blur-3xl -z-10 scale-125 pointer-events-none" />

      {/* Floating Sparkle Stars matching HD artwork */}
      <div className="absolute -top-3 left-6 text-[#5a7924] dark:text-[#a3b86c] animate-pulse pointer-events-none z-10">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-28 -left-3 text-[#5a7924] dark:text-[#a3b86c] opacity-80 pointer-events-none z-10">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-6 right-8 text-[#5a7924] dark:text-[#a3b86c] opacity-70 pointer-events-none z-10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>

      {/* 1024x1024 Ultra-HD 3D Hero Artwork (Transparent, Razor Sharp) */}
      <div className="relative w-full aspect-[899/742] max-w-[500px]">
        <Image
          src="/images/about/hero-3d-hd.png"
          alt="Courseyl 3D Graduation Cap, Stacked Books and Structured Learning Checklist"
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 500px"
          className="object-contain drop-shadow-[0_20px_35px_rgba(54,83,20,0.18)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] select-none transition-transform duration-300 hover:scale-[1.01]"
        />
      </div>
    </div>
  );
}
