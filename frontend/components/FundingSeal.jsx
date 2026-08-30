import { useId } from "react";

export default function FundingSeal({ progress = 0, className = "" }) {
  const rawId = useId();
  const id = `seal-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const p = Math.max(0, Math.min(progress, 100));
  const fillHeight = (32 * p) / 100;

  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      role="img"
      aria-label={`${p.toFixed(0)}% funded`}
    >
      <defs>
        <clipPath id={id}>
          <rect x="0" y={32 - fillHeight} width="32" height={fillHeight} />
        </clipPath>
        <g id={`${id}-star`}>
          <rect x="9" y="9" width="14" height="14" />
          <rect x="9" y="9" width="14" height="14" transform="rotate(45 16 16)" />
        </g>
      </defs>
      <use
        href={`#${id}-star`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <g clipPath={`url(#${id})`}>
        <use href={`#${id}-star`} fill="#C9A227" />
      </g>
    </svg>
  );
}
