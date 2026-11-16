import React from "react";

interface FounderSignatureProps {
  className?: string;
}

export function FounderSignature({ className = "" }: FounderSignatureProps) {
  return (
    <div className={`inline-flex flex-col items-end select-none ${className}`}>
      {/* Handcrafted flowing vector signature for "Sami" */}
      <svg
        viewBox="0 0 160 70"
        className="w-28 sm:w-36 h-12 sm:h-14 overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Sami signature"
      >
        <defs>
          <linearGradient id="samiSigStroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#365314" className="dark:stop-[#a3b86c]" />
            <stop offset="60%" stopColor="#4d6b1f" className="dark:stop-[#86a247]" />
            <stop offset="100%" stopColor="#2e4610" className="dark:stop-[#749137]" />
          </linearGradient>
        </defs>

        {/* 
          Bespoke cursive signature paths for 'Sami':
          - S: Elegant tall loop with confident downstroke
          - a: Smooth fluid oval transition
          - m: Double-arched rhythmic flow
          - i: Sharp upward stroke with tapered release
          - Underline flourish: Sweeping dynamic underline
        */}
        <g stroke="currentColor" className="text-[#365314] dark:text-[#a3b86c]">
          {/* Main 'S' glyph */}
          <path
            d="M 22 48 C 16 38 18 20 28 14 C 36 9 44 14 42 24 C 40 33 26 38 20 46 C 14 54 22 58 32 54 C 42 50 48 42 54 36"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Connected 'a' */}
          <path
            d="M 54 36 C 58 32 64 31 68 35 C 72 39 71 47 65 49 C 59 51 55 45 56 40 C 57 34 66 32 70 33 C 74 34 76 42 77 48"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Connected 'm' (two arches) */}
          <path
            d="M 77 48 C 79 40 82 32 87 32 C 92 32 94 40 94 46 C 96 39 100 32 105 32 C 111 32 113 40 114 48"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Connected 'i' and dot */}
          <path
            d="M 114 48 C 116 41 120 33 124 33 C 127 33 128 40 130 46 C 132 50 136 49 140 45"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Dot for 'i' */}
          <circle cx="127" cy="24" r="2" fill="currentColor" />

          {/* Dynamic sweeping underline flourish */}
          <path
            d="M 28 58 C 55 60 95 62 145 52 C 152 50 156 48 158 45"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
        </g>
      </svg>
      <div className="text-[0.68rem] uppercase tracking-widest font-bold text-[#365314]/80 dark:text-[#a3b86c]/80 mt-0.5">
        Sami • Founder
      </div>
    </div>
  );
}
