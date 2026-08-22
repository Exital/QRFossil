export default function Icon({ name, filled = false, size = 24, className = "" }) {
  return (
    <span
      className={`material-symbols-outlined inline-flex items-center justify-center ${filled ? "fill" : ""} ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
