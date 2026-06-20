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
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
};

export const KHMER_AI_SPARK_PATH = 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z';

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.30),transparent_36%),radial-gradient(circle_at_72%_82%,rgba(252,211,77,0.30),transparent_36%)]" aria-hidden="true" />
        <svg
          viewBox="0 0 24 24"
          className={`${iconSizeClass[size]} relative z-10 drop-shadow-lg`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d={KHMER_AI_SPARK_PATH} fill="white" />
          <path d={KHMER_AI_SPARK_PATH} fill="#FDE68A" fillOpacity="0.28" transform="translate(0.6 0.6) scale(0.95)" />
        </svg>
      </div>
    </div>
  );
}
