interface KhmerAiLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showGlow?: boolean;
  'aria-label'?: string;
}

const sizeClass = {
  sm: 'w-9 h-9',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
};

export function KhmerAiLogo({
  size = 'md',
  className = '',
  showGlow = true,
  'aria-label': ariaLabel = 'Khmer AI logo',
}: KhmerAiLogoProps) {
  return (
    <div className={`relative inline-flex shrink-0 ${sizeClass[size]} ${className}`} role="img" aria-label={ariaLabel}>
      {showGlow && (
        <div
          className="absolute -inset-1 rounded-2xl bg-violet-500/20 blur-lg"
          aria-hidden="true"
        />
      )}
      <img
        src="/favicon.svg"
        alt=""
        className="relative z-10 h-full w-full object-contain drop-shadow-sm"
        aria-hidden="true"
        draggable={false}
      />
    </div>
  );
}
