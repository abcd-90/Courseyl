import React from "react";
import Image from "next/image";

export function LearningLaptopIllustration() {
  return (
    <div className="relative select-none flex items-center justify-center w-full max-w-[150px] sm:max-w-[190px] md:max-w-[220px]">
      {/* Ambient soft glow */}
      <div className="absolute inset-0 bg-[#a3b86c]/25 dark:bg-[#365314]/35 rounded-full blur-xl -z-10 scale-95 pointer-events-none" />

      {/* Ultra-HD 3D Angled Laptop Visual (Transparent, Responsive) */}
      <div className="relative w-full aspect-[791/542]">
        <Image
          src="/images/about/laptop-hd.png"
          alt="Courseyl 3D Video Player Laptop"
          fill
          sizes="(max-width: 640px) 150px, 220px"
          className="object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.14)] select-none"
        />
      </div>
    </div>
  );
}
