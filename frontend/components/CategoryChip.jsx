export default function CategoryChip({ children, dark = false }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
        dark ? "bg-white/10 text-gilt-soft" : "bg-zellige/10 text-zellige-deep"
      }`}
    >
      {children}
    </span>
  );
}
