import React from "react";
import Image from "next/image";

export function AboutHeroIllustration() {
  return (
    <div className="relative w-full max-w-[500px] mx-auto select-none flex items-center justify-center">
      {/* Soft ambient lime-green radial glow behind 3D render (exactly like reference) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#ecf5d6] via-[#f4f9e6]/70 to-transparent dark:from-[#365314]/30 dark:via-transparent dark:to-transparent rounded-full blur-3xl -z-10 scale-125 pointer-events-none" />

      {/* Floating Sparkle Stars */}
      <div className="absolute -top-3 left-6 text-[#5a7924] dark:text-[#a3b86c] animate-pulse pointer-events-none z-10">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-28 -left-2 text-[#5a7924] dark:text-[#a3b86c] opacity-80 pointer-events-none z-10">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-6 right-8 text-[#5a7924] dark:text-[#a3b86c] opacity-70 pointer-events-none z-10">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>

      {/* Primary 3D Educational Illustration (Transparent, High-Res, Cinematic 3D) */}
      <div className="relative w-full aspect-[720/615] max-w-[480px]">
        <Image
          src="/images/about/hero-reference-clean.png"
          alt="Courseyl 3D Graduation Cap, Learning Books and Interactive Checklist"
          fill
          priority
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 480px"
          className="object-contain drop-shadow-[0_20px_35px_rgba(54,83,20,0.18)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.6)] select-none"
        />
      </div>
    </div>
  );
}
