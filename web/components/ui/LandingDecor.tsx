type StarProps = {
  className?: string;
  size: number;
  tone: 'purple' | 'cyan' | 'light';
};

function Star({ className, size, tone }: StarProps) {
  return (
    <svg
      className={`landing-decor__star landing-decor__star--${tone}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        d="M12 1.5 14.2 9.8 22.5 12 14.2 14.2 12 22.5 9.8 14.2 1.5 12 9.8 9.8Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** GitDiagram-style outlined sparkle cluster around public pages. */
export function LandingDecor({ variant = 'full' }: { variant?: 'full' | 'top' }) {
  return (
    <div className="landing-decor" aria-hidden>
      <Star className="landing-decor__pos--tl-lg" size={52} tone="purple" />
      <Star className="landing-decor__pos--tl-md" size={26} tone="light" />
      <Star className="landing-decor__pos--tl-sm" size={18} tone="light" />

      <Star className="landing-decor__pos--tr-lg" size={40} tone="cyan" />
      <Star className="landing-decor__pos--tr-sm" size={20} tone="light" />

      {variant === 'full' ? (
        <>
          <Star className="landing-decor__pos--bl-lg" size={44} tone="cyan" />
          <span className="landing-decor__plus">+</span>
          <span className="landing-decor__dot" />
        </>
      ) : null}
    </div>
  );
}
