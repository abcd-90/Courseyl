import React from "react";
import Image from "next/image";

export function AboutHeroIllustration() {
  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[420px] lg:max-w-[500px] mx-auto select-none flex items-center justify-center">
      {/* Soft ambient lime-green radial glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#eef5db] via-[#f7fbf2]/80 to-transparent dark:from-[#365314]/35 dark:via-transparent dark:to-transparent rounded-full blur-3xl -z-10 scale-125 pointer-events-none" />

      {/* Floating Sparkle Stars */}
      <div className="absolute -top-2 left-4 sm:left-6 text-[#5a7924] dark:text-[#a3b86c] animate-pulse pointer-events-none z-10">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-20 -left-2 text-[#5a7924] dark:text-[#a3b86c] opacity-80 pointer-events-none z-10 hidden sm:block">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-4 right-4 sm:right-8 text-[#5a7924] dark:text-[#a3b86c] opacity-70 pointer-events-none z-10">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>

      {/* Ultra-HD 3D Hero Artwork (Transparent, Responsive) */}
      <div className="relative w-full aspect-[899/742]">
        <Image
          src="/images/about/hero-3d-hd.png"
          alt="Courseyl 3D Graduation Cap, Stacked Books and Structured Learning Checklist"
          fill
          priority
          sizes="(max-width: 640px) 320px, (max-width: 1024px) 420px, 500px"
          className="object-contain drop-shadow-[0_16px_30px_rgba(54,83,20,0.16)] dark:drop-shadow-[0_16px_35px_rgba(0,0,0,0.55)] select-none"
        />
      </div>
    </div>
  );
}
