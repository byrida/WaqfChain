import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DonateModal({ asset, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleDonate(e) {
    e.preventDefault();
    setError(null);

    const value = parseFloat(amount);
    if (!value || value <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, amountETH: amount }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Donation failed");

      onSuccess(data.asset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Donate to {asset.name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-800">Category:</span>{" "}
            {asset.beneficiaryCategory}
          </p>
          <p>
            <span className="font-medium text-gray-800">Raised so far:</span>{" "}
            {asset.totalDonatedETH} ETH / {asset.fundingGoalETH} ETH
          </p>
        </div>

        <form onSubmit={handleDonate}>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Amount (ETH)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 1.5"
            className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-waqf-500 focus:outline-none focus:ring-2 focus:ring-waqf-500/20"
            autoFocus
          />

          {error && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-waqf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-waqf-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Processing..." : "Confirm Donation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
