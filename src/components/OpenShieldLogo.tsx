import React from 'react';

export interface OpenShieldLogoProps {
  size?: number;
  className?: string;
  testId?: string;
}

/**
 * Simple, recognizable OpenShield brand mark:
 * A clean geometric shield with a central AI neural node and three subtle circuit traces.
 * Designed to stay crisp from 16px (favicon) to 36px (navbar/auth/footer).
 */
export const OpenShieldLogo: React.FC<OpenShieldLogoProps> = ({
  size = 32,
  className = '',
  testId = 'openshield-brand-logo',
}) => {
  const rawId = React.useId().replace(/:/g, '');
  const bgId = `osLogoBg_${rawId}`;
  const strokeId = `osLogoStroke_${rawId}`;
  const coreId = `osCoreGrad_${rawId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      data-testid={testId}
      aria-hidden="true"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id={bgId} x1="4" y1="2" x2="32" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0B132B" />
          <stop offset="60%" stopColor="#0F172A" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id={strokeId} x1="6" y1="4" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#0EA5E9" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id={coreId} x1="14" y1="13" x2="22" y2="23" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67E8F9" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>
      </defs>

      {/* Outer Shield Silhouette */}
      <path
        d="M18 3.2L29.6 7.6V16.8C29.6 24.4 24.6 30.5 18 33C11.4 30.5 6.4 24.4 6.4 16.8V7.6L18 3.2Z"
        fill={`url(#${bgId})`}
        stroke={`url(#${strokeId})`}
        strokeWidth="2.1"
        strokeLinejoin="round"
      />

      {/* Subtle Inner Bevel Shield Hairline */}
      <path
        d="M18 6.3L26.6 9.6V16.5C26.6 22.3 22.9 27.1 18 29.3C13.1 27.1 9.4 22.3 9.4 16.5V9.6L18 6.3Z"
        stroke="#38BDF8"
        strokeOpacity="0.28"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* AI Digital Circuit Traces */}
      <path
        d="M18 10.2V14.4M18 21.2V25.2M12.4 15.2L15.1 16.8M23.6 15.2L20.9 16.8"
        stroke="#38BDF8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Top & Side Micro Circuit Nodes */}
      <circle cx="18" cy="9.6" r="1.35" fill="#67E8F9" />
      <circle cx="11.8" cy="14.8" r="1.25" fill="#A78BFA" />
      <circle cx="24.2" cy="14.8" r="1.25" fill="#A78BFA" />
      <circle cx="18" cy="25.6" r="1.25" fill="#38BDF8" />

      {/* Central AI Neural Core */}
      <polygon
        points="18,13.6 21.6,17.8 18,22 14.4,17.8"
        fill={`url(#${coreId})`}
        stroke="#E0F2FE"
        strokeWidth="0.9"
      />
    </svg>
  );
};
