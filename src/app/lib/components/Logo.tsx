// Inline-SVG logo, reused across login + dashboard pages.
// Matches the apartment-building motif used on apartmenthub.nl.

export function Logo({
  variant = "light",
  size = 22,
}: {
  variant?: "light" | "dark";
  size?: number;
}) {
  const stroke = variant === "light" ? "#fff" : "#007A6D";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={stroke}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <line x1="8" y1="4" x2="8" y2="20" />
      <line x1="16" y1="4" x2="16" y2="20" />
      <line x1="3.5" y1="9" x2="20.5" y2="9" />
      <line x1="3.5" y1="14" x2="20.5" y2="14" />
      <rect x="10.5" y="16.2" width="3" height="3.8" rx="0.4" />
    </svg>
  );
}
