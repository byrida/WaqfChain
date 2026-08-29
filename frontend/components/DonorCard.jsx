import { useState } from "react";
import DonateModal from "./DonateModal";

export default function DonorCard({ asset, onDonationSuccess }) {
  const [showModal, setShowModal] = useState(false);

  const donated = parseFloat(asset.totalDonatedETH);
  const goal = parseFloat(asset.fundingGoalETH);
  const progress = goal > 0 ? Math.min((donated / goal) * 100, 100) : 0;

  return (
    <>
      <div className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
          <span className="rounded-full bg-waqf-100 px-2.5 py-0.5 text-xs font-medium text-waqf-800">
            {asset.beneficiaryCategory}
          </span>
        </div>

        {/* Description */}
        {asset.description && (
          <p className="mb-4 text-sm text-gray-500">{asset.description}</p>
        )}

        {/* Funding stats */}
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-medium text-gray-700">
            {asset.totalDonatedETH} ETH{" "}
            <span className="font-normal text-gray-400">raised</span>
          </span>
          <span className="text-gray-400">
            goal: {asset.fundingGoalETH} ETH
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-waqf-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Percentage label */}
        <p className="mb-4 text-xs text-gray-400">
          {progress.toFixed(1)}% funded
        </p>

        {/* Donate button */}
        <button
          onClick={() => setShowModal(true)}
          className="mt-auto w-full rounded-lg bg-waqf-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-waqf-700 active:scale-[0.98]"
        >
          Donate
        </button>
      </div>

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
