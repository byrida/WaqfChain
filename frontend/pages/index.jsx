import { useEffect, useState } from "react";
import Link from "next/link";
import KhatamStar from "../components/KhatamStar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Demo conversion rate — this is a sandbox flow, not a real exchange rate.
const PKR_PER_ETH = 350000;

function ethToPkr(eth) {
  return (parseFloat(eth) * PKR_PER_ETH).toFixed(0);
}

const NAV = [
  { href: "/", label: "Home" },
  { href: "/donor", label: "Donor" },
  { href: "/trustee", label: "Trustee" },
  { href: "/beneficiary", label: "Beneficiary" },
  { href: "/shariah", label: "Shariah" },
];

const STAGES = [
  {
    number: "01",
    title: "Donate",
    role: "Donor portal",
    href: "/donor",
    body: "See active waqf projects and give to them.",
  },
  {
    number: "02",
    title: "Manage",
    role: "Trustee portal",
    href: "/trustee",
    body: "Trusted people send funds and record how the money is used.",
  },
  {
    number: "03",
    title: "See results",
    role: "Beneficiary portal",
    href: "/beneficiary",
    body: "See how much was collected and exactly how it was spent.",
  },
];

function GirihPattern() {
  return (
    <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full">
      <defs>
        <g id="home-star">
          <rect x="-11" y="-11" width="22" height="22" />
          <rect x="-11" y="-11" width="22" height="22" transform="rotate(45)" />
        </g>
        <pattern id="home-girih" width="88" height="88" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#B38A5E" strokeWidth="1">
            <use href="#home-star" transform="translate(44 44)" />
            <use href="#home-star" />
            <use href="#home-star" transform="translate(88 0)" />
            <use href="#home-star" transform="translate(0 88)" />
            <use href="#home-star" transform="translate(88 88)" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#home-girih)" opacity="0.1" />
    </svg>
  );
}

export default function Home() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/assets`);
        if (!res.ok) return;
        const data = await res.json();
        const assets = data.assets || [];

        const raised = assets.reduce(
          (sum, a) => sum + (parseFloat(a.totalDonatedETH) || 0),
          0
        );

        const disbursedPerAsset = await Promise.all(
          assets.map(async (a) => {
            try {
              const r = await fetch(`${API_URL}/api/disbursements/history/${a.id}`);
              const d = await r.json();
              return (d.history || []).reduce(
                (sum, x) => sum + (parseFloat(x.amountETH) || 0),
                0
              );
            } catch {
              return 0;
            }
          })
        );

        if (!cancelled) {
          setStats({
            assets: assets.length,
            raised: Number(ethToPkr(raised)).toLocaleString(),
            disbursed: Number(ethToPkr(disbursedPerAsset.reduce((sum, x) => sum + x, 0))).toLocaleString(),
          });
        }
      } catch {
        // Stats strip is optional — the hero stands without it.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-mihrab text-porcelain">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <GirihPattern />
        <div className="relative mx-auto w-full max-w-6xl px-6">
          <div className="flex items-center justify-between gap-4 py-5">
            <div className="flex items-center gap-2.5">
              <KhatamStar className="h-7 w-7 text-gilt" />
              <span className="font-display text-xl font-semibold tracking-tight">
                WaqfChain
              </span>
            </div>
            <nav aria-label="Portals" className="flex items-center gap-3 text-xs sm:gap-5 sm:text-sm">
              {NAV.map((item) => {
                const active = item.href === "/";
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "font-semibold text-porcelain underline decoration-gilt decoration-2 underline-offset-8"
                        : "text-porcelain/65 transition-colors hover:text-porcelain"
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pb-16 pt-14 sm:pb-20 sm:pt-16">
            <p className="font-ledger text-xs tracking-[0.2em] text-gilt">
              WAQF ON BLOCKCHAIN
            </p>
            <h1 className="mt-5 max-w-3xl font-display text-4xl font-semibold leading-tight sm:text-6xl">
              Your donation lives forever.
              <br />
              Its benefits never stop.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-porcelain/75 sm:text-lg">
              WaqfChain puts Islamic endowments on the blockchain. Donors
              give, trustees manage, and everyone can see where every rupee
              goes.
            </p>

            {stats && (
              <dl className="mt-12 flex max-w-2xl flex-wrap gap-x-12 gap-y-6 border-t border-white/10 pt-8">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-porcelain/55">
                    Waqf projects
                  </dt>
                  <dd className="mt-1 font-ledger text-3xl text-gilt">{stats.assets}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-porcelain/55">
                    Total collected
                  </dt>
                  <dd className="mt-1 font-ledger text-3xl text-gilt">
                    ₨{stats.raised}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-porcelain/55">
                    Spent
                  </dt>
                  <dd className="mt-1 font-ledger text-3xl text-gilt">
                    ₨{stats.disbursed}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      </div>

      {/* The flow: three portals */}
      <section className="bg-porcelain text-ink">
        <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
          <h2 className="font-display text-2xl font-semibold text-mihrab sm:text-3xl">
            How it works
          </h2>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            See how money moves — from donation to spending to public record.
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STAGES.map((stage, i) => (
              <Link
                key={stage.href}
                href={stage.href}
                className="group flex flex-col rounded-2xl border border-ink/10 bg-white p-6 shadow-sm transition motion-safe:animate-rise hover:-translate-y-0.5 hover:shadow-md"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="font-display text-sm font-semibold text-gilt">
                  {stage.number}
                </span>
                <span className="mt-3 font-display text-2xl font-semibold text-mihrab">
                  {stage.title}
                </span>
                <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-zellige">
                  {stage.role}
                </span>
                <span className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                  {stage.body}
                </span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-zellige-deep">
                  Open
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M2 8h11m0 0-4-4m4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-porcelain/55">
          <p>WaqfChain — waqf, fully transparent.</p>
        </div>
      </footer>
    </div>
  );
}
