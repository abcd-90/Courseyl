import React from "react";
import Image from "next/image";

interface FounderSignatureProps {
  className?: string;
}

export function FounderSignature({ className = "" }: FounderSignatureProps) {
  return (
    <div className={`inline-flex flex-col items-end select-none ${className}`}>
      {/* Exact elegant handwritten signature with transparent background */}
      <div className="relative w-28 sm:w-36 h-12 sm:h-16">
        <Image
          src="/images/about/signature-clean.png"
          alt="Sami Signature"
          fill
          sizes="(max-width: 640px) 112px, 144px"
          className="object-contain object-right brightness-95 contrast-125 dark:invert dark:brightness-150"
        />
      </div>
      <div className="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-widest font-bold text-[#365314]/80 dark:text-[#a3b86c]/80 mt-0.5">
        Sami • Founder
      </div>
    </div>
  );
}
