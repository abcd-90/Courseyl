import React from "react";
import Image from "next/image";

export function LearningLaptopIllustration() {
  return (
    <div className="relative select-none flex items-center justify-center w-[160px] sm:w-[200px] md:w-[230px] shrink-0">
      {/* Ambient soft glow */}
      <div className="absolute inset-0 bg-[#a3b86c]/25 dark:bg-[#365314]/35 rounded-full blur-xl -z-10 scale-95 pointer-events-none" />

      {/* Floating soft green sparkles as in reference design */}
      <div className="absolute -top-2 right-2 text-[#5c8024] dark:text-[#a3b86c] opacity-90 animate-pulse pointer-events-none">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-3 -left-2 text-[#5c8024] dark:text-[#a3b86c] opacity-75 pointer-events-none">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      </div>

      {/* Ultra-HD 3D Angled Laptop Visual (Transparent, Responsive) */}
      <div className="relative w-full aspect-[791/542]">
        <Image
          src="/images/about/laptop-hd.png"
          alt="Courseyl 3D Video Player Laptop"
          fill
          priority
          sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, 230px"
          className="object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.15)] select-none transition-transform duration-300 hover:scale-[1.03]"
        />
      </div>
    </div>
  );
}
