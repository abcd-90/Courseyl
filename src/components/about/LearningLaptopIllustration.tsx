import React from "react";
import Image from "next/image";

export function LearningLaptopIllustration() {
  return (
    <div className="relative select-none flex items-center justify-center w-full max-w-[200px] sm:max-w-[240px]">
      {/* Ambient soft glow */}
      <div className="absolute inset-0 bg-[#a3b86c]/25 dark:bg-[#365314]/35 rounded-full blur-xl -z-10 scale-95 pointer-events-none" />

      {/* Ultra-HD 3D Angled Laptop Visual (Transparent, 1024px Source) */}
      <div className="relative w-full aspect-[791/542]">
        <Image
          src="/images/about/laptop-hd.png"
          alt="Courseyl 3D Video Player Laptop"
          fill
          sizes="(max-width: 640px) 180px, 240px"
          className="object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.15)] select-none transition-transform duration-300 hover:scale-[1.02]"
        />
      </div>
    </div>
  );
}
