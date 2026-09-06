import Link from "next/link";
import { useRouter } from "next/router";
import KhatamStar from "./KhatamStar";
import { useRoleMode } from "../lib/useRoleMode";

const PUBLIC_NAV = [
  { href: "/", label: "Home" },
  { href: "/donor", label: "Donor" },
  { href: "/beneficiary", label: "Beneficiary" },
  { href: "/shariah", label: "Shariah" },
];

const TRUSTEE_NAV = [
  { href: "/", label: "Home" },
  { href: "/trustee", label: "Trustee" },
];

export default function Layout({ children }) {
  const { pathname } = useRouter();
  const { roleMode } = useRoleMode();

  // Trustee mode hides donor-facing pages; otherwise show public nav.
  // Admin is never shown in the navbar.
  const nav = roleMode === "trustee" ? TRUSTEE_NAV : PUBLIC_NAV;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="group flex items-center gap-2.5">
            <KhatamStar className="h-7 w-7 text-mihrab transition-transform duration-300 group-hover:rotate-45" />
            <span className="font-display text-xl font-semibold tracking-tight text-mihrab">
              WaqfChain
            </span>
          </Link>
          <nav aria-label="Portals" className="flex items-center gap-3 text-xs sm:gap-5 sm:text-sm">
            {nav.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={
                    active
                      ? "font-semibold text-mihrab underline decoration-plum decoration-2 underline-offset-8"
                      : "text-ink-soft transition-colors hover:text-ink"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-ink-soft">
          <p>WaqfChain — waqf, fully transparent.</p>
        </div>
      </footer>
    </div>
  );
}
