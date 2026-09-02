import Layout from "../components/Layout";
import KhatamStar from "../components/KhatamStar";

const PRINCIPLES = [
  {
    transliteration: "Luzūm",
    arabic: "لزوم",
    name: "Irrevocability",
    summary:
      "Once a waqf is founded, its purpose is fixed. The founder cannot revoke it or change what it was established for.",
    enforcement: [
      "name, beneficiaryCategory and trustee are set once in createAsset()",
      "No setter function for these fields exists anywhere in the contract",
      "The test suite verifies no such setter can be found on the ABI",
    ],
  },
  {
    transliteration: "Ta'bīd",
    arabic: "تأبيد",
    name: "Perpetuity",
    summary:
      "The waqf corpus is permanent and inalienable. Only the yields and donations flowing through it may be spent — never the endowment itself.",
    enforcement: [
      "No function can transfer, withdraw, or delete an asset record",
      "disburseFunds() only reduces the spendable donation balance",
      "The corpus struct remains on-chain, intact, forever",
    ],
  },
  {
    transliteration: "Amīn",
    arabic: "أمين",
    name: "Trusteeship",
    summary:
      "The trustee is a custodian accountable for every dirham. Only the appointed trustee may release funds, always for a stated purpose.",
    enforcement: [
      "disburseFunds() requires msg.sender == asset.trustee",
      "Every disbursement requires a non-empty purpose string",
      "Each one emits FundsDisbursed(to, amount, purpose) on-chain",
    ],
  },
  {
    transliteration: "Sadaqah Jāriyah",
    arabic: "صدقة جارية",
    name: "Ongoing Charity",
    summary:
      "A gift that keeps giving. Every contribution is recorded permanently, and its benefit continues to flow to beneficiaries indefinitely.",
    enforcement: [
      "donate() records donor and amount in an on-chain mapping",
      "DonationReceived(donor, amount) is emitted for every gift",
      "Contribution history is public and tamper-proof",
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
            Principles, written into code
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Classical waqf law rests on duties that trustees were once trusted to
            uphold. On WaqfChain they are not policy — they are enforced by the
            smart contract itself, and verified by the automated test suite
            (20/20 passing).
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
                  Enforced in the contract
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
            because these rules live in the contract rather than in a policy
            document, no administrator — not even the deployer — can bend them.
            Compliance is not a promise; it is a property of the code.
          </p>
        </div>
      </div>
    </Layout>
  );
}
