import React from "react";
import Image from "next/image";

interface FounderSignatureProps {
  className?: string;
}

export function FounderSignature({ className = "" }: FounderSignatureProps) {
  return (
    <div className={`inline-flex flex-col items-end select-none ${className}`}>
      {/* Exact Ultra-HD handwritten signature with transparent background */}
      <div className="relative w-36 sm:w-44 h-16 sm:h-20">
        <Image
          src="/images/about/signature-hd.png"
          alt="Sami Signature"
          fill
          sizes="(max-width: 640px) 144px, 176px"
          className="object-contain object-right brightness-95 contrast-110 dark:invert dark:brightness-150"
        />
      </div>
      <div className="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-widest font-bold text-[#365314]/80 dark:text-[#a3b86c]/80 mt-0.5">
        Sami • Founder
      </div>
    </div>
  );
}
