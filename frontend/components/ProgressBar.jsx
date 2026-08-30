export default function ProgressBar({ value = 0, dark = false, className = "" }) {
  const width = Math.max(0, Math.min(value, 100));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1.5 w-full overflow-hidden rounded-full ${
        dark ? "bg-white/15" : "bg-mihrab/10"
      } ${className}`}
    >
      <div
        className="h-full rounded-full bg-gilt transition-all duration-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
