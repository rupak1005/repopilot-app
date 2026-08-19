type IconProps = {
  name: string;
  size?: number;
  filled?: boolean;
  className?: string;
};

export function Icon({ name, size = 20, filled = false, className }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined${filled ? ' filled' : ''}${className ? ` ${className}` : ''}`}
      style={{ fontSize: size }}
      aria-hidden
    >
      {name}
    </span>
  );
}
