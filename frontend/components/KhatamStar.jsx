export default function KhatamStar({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="5.7" y="5.7" width="12.6" height="12.6" fill="currentColor" />
      <rect
        x="5.7"
        y="5.7"
        width="12.6"
        height="12.6"
        fill="currentColor"
        opacity="0.55"
        transform="rotate(45 12 12)"
      />
    </svg>
  );
}
