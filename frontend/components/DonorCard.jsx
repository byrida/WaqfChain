import { useState } from "react";
import DonateModal from "./DonateModal";
import FundingSeal from "./FundingSeal";
import CategoryChip from "./CategoryChip";

// Demo conversion rate — this is a sandbox flow, not a real exchange rate.
const PKR_PER_ETH = 350000;

function ethToPkr(eth) {
  return (parseFloat(eth) * PKR_PER_ETH).toFixed(0);
}

export default function DonorCard({ asset, onDonationSuccess }) {
  const [showModal, setShowModal] = useState(false);

  const donated = parseFloat(asset.totalDonatedETH);
  const goal = parseFloat(asset.fundingGoalETH);
  const progress = goal > 0 ? Math.min((donated / goal) * 100, 100) : 0;

  const collectedPKR = ethToPkr(asset.totalDonatedETH);
  const goalPKR = ethToPkr(asset.fundingGoalETH);

  return (
    <>
      <article className="flex h-full flex-col rounded-2xl border border-ink/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-semibold leading-snug text-mihrab">
            {asset.name}
          </h3>
          <CategoryChip>{asset.beneficiaryCategory}</CategoryChip>
        </div>

        {/* Description */}
        {asset.description && (
          <p className="mb-5 text-sm leading-relaxed text-ink-soft">
            {asset.description}
          </p>
        )}

        {/* Funding seal + figures */}
        <div className="mb-5 flex items-center gap-4">
          <FundingSeal
            progress={progress}
            className="h-14 w-14 shrink-0 text-mihrab"
          />
          <div className="min-w-0">
            <p className="font-ledger text-lg leading-tight text-ink">
              ₨{Number(collectedPKR).toLocaleString()}{" "}
              <span className="text-xs text-ink-soft">collected</span>
            </p>
            <p className="mt-1 font-ledger text-xs text-ink-soft">
              goal ₨{Number(goalPKR).toLocaleString()} · {progress.toFixed(1)}% complete
            </p>
          </div>
        </div>

        {/* Donate button */}
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary mt-auto w-full"
        >
          Donate
        </button>
      </article>

      {showModal && (
        <DonateModal
          asset={asset}
          onClose={() => setShowModal(false)}
          onSuccess={(updatedAsset) => {
            setShowModal(false);
            onDonationSuccess(updatedAsset);
          }}
        />
      )}
    </>
  );
}
