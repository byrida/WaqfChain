import Layout from "../components/Layout";
import KhatamStar from "../components/KhatamStar";

const PRINCIPLES = [
  {
    transliteration: "Luzūm",
    arabic: "لزوم",
    name: "Cannot be changed",
    summary:
      "Once a waqf is created, its purpose is fixed. The founder cannot change or cancel it.",
    enforcement: [
      "name, category and trustee are set once when the waqf is created",
      "No function exists to change these after creation",
      "Our tests confirm no such function can be found",
    ],
  },
  {
    transliteration: "Ta'bīd",
    arabic: "تأبيد",
    name: "Lasts forever",
    summary:
      "The waqf itself is permanent. Only the money donated to it can be spent — the waqf can never be deleted or taken away.",
    enforcement: [
      "No function can delete, transfer, or remove a waqf",
      "Sending funds only reduces the spendable balance, not the waqf itself",
      "The waqf record stays on the blockchain forever",
    ],
  },
  {
    transliteration: "Amīn",
    arabic: "أمين",
    name: "Trusted manager",
    summary:
      "Only the appointed trustee can send funds. They must explain what the money is for.",
    enforcement: [
      "Only the trustee's wallet can send funds from the waqf",
      "Every payment must include a reason",
      "Each payment is recorded on the blockchain with the amount and reason",
    ],
  },
  {
    transliteration: "Sadaqah Jāriyah",
    arabic: "صدقة جارية",
    name: "Ongoing Charity",
    summary:
      "A gift that keeps giving. Every donation is recorded permanently, and its benefit continues to flow to people in need.",
    enforcement: [
      "Every donation records who gave and how much on the blockchain",
      "A public record is created for every gift",
      "Anyone can see the full donation history — nothing is hidden",
    ],
  },
];

export default function ShariahPage() {
  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Masthead */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-zellige">
            Shariah compliance
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-mihrab">
            Shariah rules, built into the code
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Traditional waqf rules depend on people doing the right thing.
            On WaqfChain, these rules are built into the code itself — no one
            can break them, not even the person who created the project. All
            20 automated tests pass.
          </p>
        </div>

        {/* Principle cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <article
              key={p.transliteration}
              className="flex flex-col rounded-2xl border border-ink/10 bg-white p-6 shadow-sm motion-safe:animate-rise"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Card header */}
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-mihrab">
                    {p.transliteration}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-zellige">
                    {p.name}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <span className="font-display text-2xl text-gilt/70" dir="rtl" lang="ar">
                    {p.arabic}
                  </span>
                  <KhatamStar className="h-5 w-5 shrink-0 text-mihrab/20" />
                </span>
              </div>

              {/* Summary */}
              <p className="mb-5 text-sm leading-relaxed text-ink-soft">{p.summary}</p>

              {/* Enforcement */}
              <div className="mt-auto rounded-xl bg-porcelain p-4">
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                  How the code enforces this
                </h3>
                <ul className="space-y-1.5">
                  {p.enforcement.map((line, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs leading-relaxed text-ink">
                      <svg
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zellige"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      <span className="font-ledger">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 flex items-start gap-3 rounded-xl border border-gilt/30 bg-gilt-pale px-5 py-4">
          <KhatamStar className="mt-0.5 h-4 w-4 shrink-0 text-gilt" />
          <p className="text-sm leading-relaxed text-ink">
            <span className="font-semibold text-mihrab">Why this matters:</span>{" "}
            because these rules are in the code, not in a document — no
            person, not even the creator, can change them. The rules are
            followed automatically.
          </p>
        </div>
      </div>
    </Layout>
  );
}
