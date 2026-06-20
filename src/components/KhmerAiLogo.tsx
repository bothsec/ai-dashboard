interface KhmerAiLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
  'aria-label'?: string;
}

const sizeClass = {
  sm: 'w-9 h-9 rounded-2xl',
  md: 'w-12 h-12 rounded-2xl',
  lg: 'w-16 h-16 rounded-3xl',
  xl: 'w-20 h-20 rounded-[1.75rem]',
};

const iconSizeClass = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-12 h-12',
  xl: 'w-14 h-14',
};

export function KhmerAiLogo({
  size = 'md',
  className = '',
  showGlow = true,
  'aria-label': ariaLabel = 'Khmer AI logo',
}: KhmerAiLogoProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${className}`} role="img" aria-label={ariaLabel}>
      {showGlow && (
        <div
          className="absolute -inset-2 rounded-[2rem] bg-gradient-to-br from-blue-500/25 via-red-500/20 to-amber-400/20 blur-xl"
          aria-hidden="true"
        />
      )}
      <div className={`${sizeClass[size]} relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-700 via-red-600 to-blue-950 shadow-xl shadow-blue-950/25 ring-1 ring-white/20`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.32),transparent_34%),radial-gradient(circle_at_70%_82%,rgba(252,211,77,0.28),transparent_34%)]" aria-hidden="true" />
        <svg
          viewBox="0 0 64 64"
          className={`${iconSizeClass[size]} relative z-10 drop-shadow-lg`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Angkor-inspired center tower: Cambodian identity and trust */}
          <path
            d="M32 10L38 19H35V27H29V19H26L32 10Z"
            fill="white"
            fillOpacity="0.96"
          />
          <path
            d="M20 22L25 29H23V38H17V29H15L20 22Z"
            fill="white"
            fillOpacity="0.88"
          />
          <path
            d="M44 22L49 29H47V38H41V29H39L44 22Z"
            fill="white"
            fillOpacity="0.88"
          />
          <path
            d="M17 38H47V43H17V38Z"
            fill="white"
            fillOpacity="0.94"
          />
          <path
            d="M21 43H43V48H21V43Z"
            fill="white"
            fillOpacity="0.9"
          />
          {/* Chat bubble baseline: assistant / conversation */}
          <path
            d="M14 49C14 46.8 15.8 45 18 45H46C48.2 45 50 46.8 50 49V50C50 52.2 48.2 54 46 54H29L22 58V54H18C15.8 54 14 52.2 14 50V49Z"
            fill="#FBBF24"
            fillOpacity="0.98"
          />
          {/* Career path / success check */}
          <path
            d="M24 50.5L29 53.5L40 48"
            stroke="#172554"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* AI spark */}
          <path
            d="M51 12L52.7 16.3L57 18L52.7 19.7L51 24L49.3 19.7L45 18L49.3 16.3L51 12Z"
            fill="#FDE68A"
          />
        </svg>
      </div>
    </div>
  );
}
