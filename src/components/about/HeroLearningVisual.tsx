import React from "react";
import { Check, CheckCircle2, Play } from "lucide-react";

export function HeroLearningVisual() {
  return (
    <div className="relative w-full max-w-[480px] mx-auto select-none">
      {/* Ambient soft glow backdrop (no box border, perfectly blended) */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#ecf5d6]/70 via-[#f4f9e6]/40 to-transparent dark:from-[#365314]/25 dark:via-transparent dark:to-transparent rounded-full blur-3xl -z-10 scale-110" />

      {/* Floating Sparkle Stars */}
      <div className="absolute -top-3 left-10 text-[#5a7924] dark:text-[#a3b86c] animate-pulse">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-24 -left-4 text-[#5a7924] dark:text-[#a3b86c] opacity-75">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>
      <div className="absolute top-8 right-6 text-[#5a7924] dark:text-[#a3b86c] opacity-60">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
        </svg>
      </div>

      {/* Main 3D Composition Container */}
      <div className="relative pt-6 pb-2">
        {/* Top Floating Mini Badge */}
        <div className="absolute top-0 right-4 z-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 dark:bg-[#152018]/95 backdrop-blur-md border border-black/10 dark:border-white/15 text-[#365314] dark:text-[#a3b86c] text-xs font-semibold shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4d6b1f] dark:text-[#a3b86c]" />
            Structured Learning
          </div>
        </div>

        {/* 3D Scene Layer (SVG vector artwork of graduation cap and stacked books) */}
        <div className="relative w-full aspect-[4/3] flex items-center justify-center">
          <svg
            viewBox="0 0 460 340"
            className="w-full h-full drop-shadow-2xl overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Drop Shadows */}
              <radialGradient id="groundShadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </radialGradient>

              {/* Cap Gradients */}
              <linearGradient id="capTop" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2a332d" />
                <stop offset="50%" stopColor="#1e2520" />
                <stop offset="100%" stopColor="#121714" />
              </linearGradient>
              <linearGradient id="capRim" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#181e19" />
                <stop offset="100%" stopColor="#0b0f0c" />
              </linearGradient>
              <linearGradient id="capSkull" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#252d27" />
                <stop offset="100%" stopColor="#0f1411" />
              </linearGradient>

              {/* Tassel Gradients */}
              <linearGradient id="goldTassel" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>

              {/* Books Gradients */}
              <linearGradient id="greenBookCover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#708c2a" />
                <stop offset="50%" stopColor="#556e1e" />
                <stop offset="100%" stopColor="#3d5114" />
              </linearGradient>
              <linearGradient id="blackBookCover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#222823" />
                <stop offset="100%" stopColor="#141815" />
              </linearGradient>
              <linearGradient id="bookPages" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f4f5ee" />
                <stop offset="50%" stopColor="#e9ebd8" />
                <stop offset="100%" stopColor="#dce0c7" />
              </linearGradient>

              {/* Play Button Gradients */}
              <linearGradient id="playBtnBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7ca332" />
                <stop offset="50%" stopColor="#5c7e22" />
                <stop offset="100%" stopColor="#415b16" />
              </linearGradient>
            </defs>

            {/* Base Ambient Ground Shadow */}
            <ellipse cx="230" cy="305" rx="170" ry="22" fill="url(#groundShadow)" />

            {/* =========================================
                BOTTOM BOOK (BLACK BOOK)
               ========================================= */}
            <g transform="translate(10, 0)">
              {/* Bottom Cover Spine & Base */}
              <path
                d="M100 240 L280 278 L260 298 L75 258 Z"
                fill="#0d110e"
              />
              {/* Pages Edge Bottom Book */}
              <path
                d="M280 278 L345 235 L330 252 L260 298 Z"
                fill="url(#bookPages)"
              />
              <path
                d="M75 258 L260 298 L260 305 L72 265 Z"
                fill="#151a16"
              />
              <path
                d="M260 298 L330 252 L332 258 L260 305 Z"
                fill="#cbd3b1"
              />
            </g>

            {/* =========================================
                TOP BOOK (OLIVE GREEN BOOK)
               ========================================= */}
            <g transform="translate(15, -24)">
              {/* Top Book Base Shadow */}
              <path
                d="M110 236 L275 272 L255 288 L88 252 Z"
                fill="#2c3b10"
                opacity="0.6"
              />
              {/* Top Book Green Spine/Cover */}
              <path
                d="M115 220 L285 255 L268 275 L95 238 Z"
                fill="url(#greenBookCover)"
              />
              {/* Pages of Top Book */}
              <path
                d="M285 255 L350 216 L335 234 L268 275 Z"
                fill="url(#bookPages)"
              />
              {/* Spine thickness */}
              <path
                d="M95 238 L268 275 L268 282 L92 245 Z"
                fill="#344612"
              />
              <path
                d="M268 275 L335 234 L337 240 L268 282 Z"
                fill="#cad2ae"
              />
            </g>

            {/* =========================================
                GRADUATION CAP (MORTARBOARD)
               ========================================= */}
            <g transform="translate(20, -18)">
              {/* Cap Skull Cup Base (fits on book) */}
              <ellipse cx="230" cy="180" rx="46" ry="26" fill="url(#capSkull)" />
              <path
                d="M184 180 Q230 216 276 180 L274 196 Q230 232 184 196 Z"
                fill="url(#capRim)"
              />

              {/* Diamond Mortarboard Top */}
              {/* Diamond points: Top(230, 80), Right(340, 130), Bottom(230, 180), Left(120, 130) */}
              {/* Mortarboard 3D Thickness Edge */}
              <path
                d="M120 130 L230 180 L340 130 L340 138 L230 188 L120 138 Z"
                fill="#0f1411"
              />
              <path
                d="M230 180 L340 130 L340 138 L230 188 Z"
                fill="#161c17"
              />

              {/* Top Surface */}
              <polygon
                points="230,82 340,130 230,178 120,130"
                fill="url(#capTop)"
              />

              {/* Central Button */}
              <ellipse cx="230" cy="130" rx="9" ry="5.5" fill="#f59e0b" />
              <ellipse cx="230" cy="129" rx="7" ry="4" fill="#fbbf24" />

              {/* Golden Tassel Draping to the Right */}
              <path
                d="M230 130 Q285 138 305 168 Q318 190 322 230"
                stroke="url(#goldTassel)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
              />
              {/* Tassel Ring / Band */}
              <rect x="318" y="228" width="8" height="4" rx="2" fill="#d97706" />
              {/* Tassel Fringe Brush */}
              <path
                d="M317 232 L327 232 L330 262 L314 262 Z"
                fill="url(#goldTassel)"
              />
              <path
                d="M318 232 L326 232 L328 262 L316 262 Z"
                fill="#fcd34d"
                opacity="0.4"
              />
            </g>

            {/* =========================================
                3D EMERALD PLAY BUTTON TILE (Floating Left)
               ========================================= */}
            <g transform="translate(68, 140)">
              {/* Play tile 3D depth shadow */}
              <rect
                x="4"
                y="6"
                width="64"
                height="64"
                rx="18"
                fill="#273a0e"
                opacity="0.8"
              />
              {/* Play tile surface */}
              <rect
                x="0"
                y="0"
                width="64"
                height="64"
                rx="18"
                fill="url(#playBtnBg)"
                stroke="#8bb539"
                strokeWidth="1.5"
              />
              {/* White Play Triangle */}
              <polygon
                points="26,20 48,32 26,44"
                fill="#ffffff"
              />
            </g>
          </svg>

          {/* =========================================
              FLOATING FROSTED CHECKLIST CARD (Right overlay)
             ========================================= */}
          <div className="absolute -bottom-2 sm:bottom-4 right-0 sm:right-2 z-20 w-48 sm:w-56 p-4 rounded-2xl bg-white/95 dark:bg-[#141d16]/95 backdrop-blur-md border border-black/10 dark:border-white/15 shadow-xl transition-transform hover:scale-[1.02]">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-[#4d6b1f] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#0f1611] dark:text-white">
                  Structured Learning
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-[#4d6b1f] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#0f1611] dark:text-white">
                  Track Progress
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-md bg-[#4d6b1f] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-[#0f1611] dark:text-white">
                  Get Certified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
