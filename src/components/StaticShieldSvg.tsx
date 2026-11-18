import React from 'react';
import type { Shield3DVisualMode } from '../components/OpenShield3DScene';

export interface StaticShieldSvgProps {
  mode?: Shield3DVisualMode;
  installedInBrowser?: boolean;
  reducedMotion?: boolean;
  isVisible: boolean;
  stageLabel?: string;
}

/**
 * Lightweight, immediate-render Static SVG Shield that matches the 3D hero shield design.
 * Displayed immediately on page load (zero spinner, zero blank canvas, zero layout shift)
 * and smoothly crossfaded out only after the 3D WebGL scene renders its first frame.
 * Remains permanently visible if WebGL is unavailable or fails.
 */
export const StaticShieldSvg: React.FC<StaticShieldSvgProps> = ({
  mode = 'idle',
  installedInBrowser = false,
  reducedMotion = false,
  isVisible,
}) => {
  const isScanning = mode === 'scanning' || mode === 'neutralizing';
  const primaryGlow = installedInBrowser ? '#10B981' : '#38BDF8';
  const secondaryAccent = '#8B5CF6';

  return (
    <div
      data-testid="hero-static-shield-svg"
      data-visible={isVisible ? 'true' : 'false'}
      role="img"
      aria-label="OpenShield AI Consumer Protection Shield — Static Vector Preview"
      className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none transition-opacity duration-500 ease-out ${
        isVisible ? 'opacity-100 z-10' : 'opacity-0 z-0'
      }`}
    >
      <svg
        viewBox="0 0 420 420"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] max-w-full max-h-full drop-shadow-[0_20px_45px_rgba(56,189,248,0.22)]"
      >
        <defs>
          {/* Ambient radial aura */}
          <radialGradient id="staticHeroAura" cx="50%" cy="48%" r="50%">
            <stop offset="0%" stopColor={primaryGlow} stopOpacity="0.28" />
            <stop offset="52%" stopColor={secondaryAccent} stopOpacity="0.12" />
            <stop offset="100%" stopColor="#050814" stopOpacity="0" />
          </radialGradient>

          {/* Outer metallic midnight-navy armor gradient */}
          <linearGradient id="staticOuterArmor" x1="90" y1="50" x2="330" y2="370" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="45%" stopColor="#0B132B" />
            <stop offset="100%" stopColor="#050814" />
          </linearGradient>

          {/* Brushed cyan-violet titanium rim */}
          <linearGradient id="staticTitaniumRim" x1="100" y1="60" x2="320" y2="355" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#67E8F9" />
            <stop offset="50%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>

          {/* Inner forensic dark glass plate */}
          <linearGradient id="staticInnerGlass" x1="130" y1="90" x2="290" y2="330" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="60%" stopColor="#090D1A" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>

          {/* Glowing AI crystal core */}
          <linearGradient id="staticAiCore" x1="175" y1="155" x2="245" y2="255" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A5F3FC" />
            <stop offset="50%" stopColor={primaryGlow} />
            <stop offset="100%" stopColor={secondaryAccent} />
          </linearGradient>

          {/* Holographic scan line gradient */}
          <linearGradient id="staticScanBeam" x1="95" y1="0" x2="325" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0" />
            <stop offset="20%" stopColor="#38BDF8" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#E0F2FE" stopOpacity="0.95" />
            <stop offset="80%" stopColor="#8B5CF6" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft Ground Contact Shadow */}
        <ellipse cx="210" cy="378" rx="112" ry="16" fill="#020617" fillOpacity="0.75" />
        <ellipse cx="210" cy="378" rx="76" ry="9" fill={primaryGlow} fillOpacity="0.18" />

        {/* Ambient Backlight Glow */}
        <circle cx="210" cy="202" r="168" fill="url(#staticHeroAura)" />

        {/* Outer Gyroscopic Holographic Ring */}
        <ellipse
          cx="210"
          cy="205"
          rx="164"
          ry="68"
          transform="rotate(-18 210 205)"
          stroke="#38BDF8"
          strokeOpacity="0.38"
          strokeWidth="1.75"
          strokeDasharray="8 6"
        />

        {/* Inner Violet Gyroscopic Ring */}
        <ellipse
          cx="210"
          cy="205"
          rx="148"
          ry="58"
          transform="rotate(22 210 205)"
          stroke="#8B5CF6"
          strokeOpacity="0.42"
          strokeWidth="1.5"
        />

        {/* Primary Beveled 3D-Matched Shield Silhouette */}
        <path
          d="M210 48C268 50 312 68 322 96C326 192 292 284 210 352C128 284 94 192 98 96C108 68 152 50 210 48Z"
          fill="url(#staticOuterArmor)"
          stroke="url(#staticTitaniumRim)"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Metallic Inner Frame Bevel */}
        <path
          d="M210 68C258 70 294 85 302 108C305 188 276 266 210 326C144 266 115 188 118 108C126 85 162 70 210 68Z"
          fill="url(#staticInnerGlass)"
          stroke="#38BDF8"
          strokeOpacity="0.55"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Subtle AI Circuit Board Lines Inside Shield */}
        <g stroke="#38BDF8" strokeOpacity="0.45" strokeWidth="1.6" strokeLinecap="round">
          <path d="M210 92V144" />
          <path d="M210 256V302" />
          <path d="M142 142L176 168" />
          <path d="M278 142L244 168" />
          <path d="M146 236L178 216" />
          <path d="M274 236L242 216" />
        </g>

        {/* Circuit Nodes (Cyan & Violet) */}
        <circle cx="210" cy="92" r="4" fill="#67E8F9" />
        <circle cx="142" cy="142" r="4" fill="#A78BFA" />
        <circle cx="278" cy="142" r="4" fill="#A78BFA" />
        <circle cx="146" cy="236" r="3.5" fill="#38BDF8" />
        <circle cx="274" cy="236" r="3.5" fill="#38BDF8" />
        <circle cx="210" cy="302" r="4" fill="#67E8F9" />

        {/* Central Glowing AI Core (Octahedral Faceted Gem + Neural Ring) */}
        <circle
          cx="210"
          cy="198"
          r="46"
          fill="#0B132B"
          stroke="#38BDF8"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <polygon
          points="210,152 246,198 210,244 174,198"
          fill="url(#staticAiCore)"
          stroke="#E0F2FE"
          strokeWidth="1.8"
        />
        <polygon
          points="210,168 232,198 210,228 188,198"
          fill="#E0F2FE"
          fillOpacity="0.28"
          stroke="#A5F3FC"
          strokeWidth="1"
        />

        {/* Holographic Scanning Beam */}
        <rect
          x="106"
          y={isScanning && !reducedMotion ? '176' : '195'}
          width="208"
          height="5"
          rx="2.5"
          fill="url(#staticScanBeam)"
        />

        {/* Floating Satellite Clause Inspection Nodes */}
        <g>
          <rect
            x="56"
            y="108"
            width="44"
            height="26"
            rx="6"
            fill="#0F172A"
            stroke="#38BDF8"
            strokeOpacity="0.65"
            strokeWidth="1.4"
          />
          <circle cx="68" cy="121" r="3.5" fill="#38BDF8" />
          <line x1="76" y1="121" x2="92" y2="121" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

          <rect
            x="320"
            y="108"
            width="44"
            height="26"
            rx="6"
            fill="#0F172A"
            stroke="#8B5CF6"
            strokeOpacity="0.65"
            strokeWidth="1.4"
          />
          <circle cx="332" cy="121" r="3.5" fill="#A78BFA" />
          <line x1="340" y1="121" x2="356" y2="121" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

          <rect
            x="64"
            y="264"
            width="44"
            height="26"
            rx="6"
            fill="#0F172A"
            stroke="#10B981"
            strokeOpacity="0.65"
            strokeWidth="1.4"
          />
          <circle cx="76" cy="277" r="3.5" fill="#34D399" />
          <line x1="84" y1="277" x2="100" y2="277" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

          <rect
            x="312"
            y="264"
            width="44"
            height="26"
            rx="6"
            fill="#0F172A"
            stroke="#38BDF8"
            strokeOpacity="0.65"
            strokeWidth="1.4"
          />
          <circle cx="324" cy="277" r="3.5" fill="#38BDF8" />
          <line x1="332" y1="277" x2="348" y2="277" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Subtle Ambient Particles */}
        <circle cx="88" cy="186" r="2.2" fill="#67E8F9" fillOpacity="0.8" />
        <circle cx="334" cy="190" r="2.5" fill="#A78BFA" fillOpacity="0.8" />
        <circle cx="136" cy="68" r="2" fill="#38BDF8" fillOpacity="0.65" />
        <circle cx="288" cy="72" r="2.2" fill="#8B5CF6" fillOpacity="0.7" />
        <circle cx="122" cy="328" r="2" fill="#34D399" fillOpacity="0.7" />
        <circle cx="298" cy="324" r="2.2" fill="#38BDF8" fillOpacity="0.7" />
      </svg>
    </div>
  );
};
