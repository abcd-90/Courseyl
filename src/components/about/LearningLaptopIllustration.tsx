import React from "react";
import Image from "next/image";

export function LearningLaptopIllustration() {
  return (
    <div className="relative select-none flex items-center justify-center w-full max-w-[170px] sm:max-w-[200px]">
      {/* Ambient soft glow */}
      <div className="absolute inset-0 bg-[#a3b86c]/25 dark:bg-[#365314]/35 rounded-full blur-xl -z-10 scale-95 pointer-events-none" />

      {/* Floating soft green particles/sparkles */}
      <div className="absolute -top-1 -right-1 text-[#4d6b1f] dark:text-[#a3b86c] opacity-90 animate-pulse pointer-events-none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-2 -left-2 text-[#4d6b1f] dark:text-[#a3b86c] opacity-70 pointer-events-none">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      </div>

      {/* 3D Angled Laptop Visual (Transparent, High-Res) */}
      <div className="relative w-full aspect-[345/270]">
        <Image
          src="/images/about/laptop-reference-clean.png"
          alt="Courseyl 3D Video Player Laptop"
          fill
          sizes="(max-width: 640px) 140px, 180px"
          className="object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.15)] select-none"
        />
      </div>
    </div>
  );
}
