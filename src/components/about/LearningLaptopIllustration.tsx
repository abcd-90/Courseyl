import React from "react";

interface LearningLaptopIllustrationProps {
  className?: string;
}

export function LearningLaptopIllustration({
  className = "",
}: LearningLaptopIllustrationProps) {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Decorative ambient glow */}
      <div className="absolute inset-0 bg-[#a3b86c]/20 dark:bg-[#365314]/30 rounded-full blur-xl -z-10 scale-90" />

      {/* Floating soft green particles/sparkles */}
      <div className="absolute -top-1 -right-2 text-[#4d6b1f] dark:text-[#a3b86c] opacity-80 animate-pulse">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-2 -left-2 text-[#4d6b1f] dark:text-[#a3b86c] opacity-60">
        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
        </svg>
      </div>

      {/* 3D Angled Vector Laptop */}
      <svg
        viewBox="0 0 180 130"
        className="w-full h-auto max-w-[140px] sm:max-w-[160px] drop-shadow-lg overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Courseyl Video Player Laptop"
      >
        <defs>
          {/* Ground drop shadow */}
          <radialGradient id="laptopShadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>

          {/* Laptop Metal Gradients */}
          <linearGradient id="laptopLid" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2c332e" />
            <stop offset="50%" stopColor="#1e2420" />
            <stop offset="100%" stopColor="#141815" />
          </linearGradient>

          <linearGradient id="laptopScreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#151d16" />
            <stop offset="50%" stopColor="#0d140e" />
            <stop offset="100%" stopColor="#080c09" />
          </linearGradient>

          <linearGradient id="laptopBase" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#303832" />
            <stop offset="50%" stopColor="#232a25" />
            <stop offset="100%" stopColor="#181e1a" />
          </linearGradient>

          <linearGradient id="screenPlayGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6b8d26" />
            <stop offset="100%" stopColor="#435e16" />
          </linearGradient>

          <linearGradient id="screenGlassReflect" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.12" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient Ground Shadow */}
        <ellipse cx="90" cy="116" rx="72" ry="10" fill="url(#laptopShadow)" />

        {/* =========================================================
            LAPTOP DISPLAY (UPRIGHT ANGLED BACK 3D PERSPECTIVE)
           ========================================================= */}
        {/* Outer Lid Bezel */}
        <polygon
          points="28,26 138,12 144,80 34,92"
          fill="url(#laptopLid)"
          stroke="#424c44"
          strokeWidth="0.8"
        />

        {/* Inner Screen Area */}
        <polygon
          points="32,29 134,16 140,78 38,88"
          fill="url(#laptopScreen)"
        />

        {/* Screen Glass Light Reflection */}
        <polygon
          points="32,29 134,16 90,65 38,88"
          fill="url(#screenGlassReflect)"
        />

        {/* Screen Content: Centered Glowing Green Play Button */}
        <g transform="translate(82, 46) rotate(-5)">
          <circle cx="0" cy="0" r="14" fill="url(#screenPlayGlow)" opacity="0.9" />
          <polygon points="-3,-6 7,0 -3,6" fill="#ffffff" />
        </g>

        {/* Web Camera Dot */}
        <circle cx="83" cy="21" r="1" fill="#4d6b1f" opacity="0.8" />

        {/* =========================================================
            LAPTOP KEYBOARD BASE DECK (3/4 ISOMETRIC FLAT DECK)
           ========================================================= */}
        {/* Base top surface */}
        <polygon
          points="34,92 144,80 162,106 50,118"
          fill="url(#laptopBase)"
          stroke="#3d4740"
          strokeWidth="0.8"
        />

        {/* Base front chamfer edge */}
        <polygon
          points="50,118 162,106 162,110 50,122"
          fill="#111613"
        />
        <polygon
          points="34,92 50,118 50,122 34,96"
          fill="#1a201c"
        />

        {/* Subtle Keyboard Well Indentation */}
        <polygon
          points="46,95 138,85 146,101 54,110"
          fill="#111612"
          opacity="0.85"
        />

        {/* Keyboard Key Rows (Stylized 3D keys) */}
        <line x1="49" y1="99" x2="140" y2="89" stroke="#252d27" strokeWidth="1.5" />
        <line x1="51" y1="103" x2="142" y2="93" stroke="#252d27" strokeWidth="1.5" />
        <line x1="53" y1="107" x2="144" y2="97" stroke="#252d27" strokeWidth="1.5" />

        {/* Trackpad */}
        <polygon
          points="88,111 114,108 116,115 90,117"
          fill="#1d241f"
          stroke="#313b33"
          strokeWidth="0.5"
        />
      </svg>
    </div>
  );
}
