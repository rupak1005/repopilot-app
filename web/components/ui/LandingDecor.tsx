const SPARKLE_PATH =
  'M12 1.5 14.2 9.8 22.5 12 14.2 14.2 12 22.5 9.8 14.2 1.5 12 9.8 9.8Z';

type SparkleProps = {
  className?: string;
  size: number;
  variant: 'purple' | 'white';
};

function Sparkle({ className, size, variant }: SparkleProps) {
  return (
    <svg
      className={`landing-decor__sparkle landing-decor__sparkle--${variant}${className ? ` ${className}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d={SPARKLE_PATH} strokeLinejoin="round" />
    </svg>
  );
}

export function LandingDecor({ variant = 'full' }: { variant?: 'full' | 'top' }) {
  return (
    <div className="landing-decor" aria-hidden>
      <Sparkle className="landing-decor__pos--tl-lg" size={54} variant="purple" />
      <Sparkle className="landing-decor__pos--tl-md" size={24} variant="white" />
      <Sparkle className="landing-decor__pos--tl-sm" size={18} variant="white" />

      <Sparkle className="landing-decor__pos--tr-lg" size={50} variant="purple" />
      <Sparkle className="landing-decor__pos--tr-md" size={22} variant="white" />
      <Sparkle className="landing-decor__pos--tr-sm" size={17} variant="white" />

      {variant === 'full' ? (
        <>
          <Sparkle className="landing-decor__pos--bl-lg" size={58} variant="purple" />
          <span className="landing-decor__plus">+</span>
          <span className="landing-decor__dot" />
        </>
      ) : null}
    </div>
  );
}
