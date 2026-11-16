import React from "react";
import Image from "next/image";

interface FounderSignatureProps {
  className?: string;
}

export function FounderSignature({ className = "" }: FounderSignatureProps) {
  return (
    <div className={`inline-flex items-center justify-end select-none ${className}`}>
      <div className="relative w-32 sm:w-40 md:w-44 h-14 sm:h-16 md:h-18">
        <Image
          src="/images/about/signature-hd.png"
          alt="Sami Signature"
          fill
          sizes="(max-width: 640px) 128px, 176px"
          className="object-contain object-right-bottom brightness-95 contrast-110 dark:invert dark:brightness-150"
        />
      </div>
    </div>
  );
}
