import { useEffect, useState } from "react";
import KhatamStar from "./KhatamStar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const QUICK_AMOUNTS = ["0.1", "0.25", "0.5", "1"];

export default function DonateModal({ asset, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-mihrab-deep/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Donate to ${asset.name}`}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl motion-safe:animate-rise"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 bg-mihrab px-6 py-5 text-porcelain">
          <div className="flex items-center gap-3">
            <KhatamStar className="h-6 w-6 shrink-0 text-gilt" />
            <div>
              <h2 className="font-display text-lg font-semibold leading-snug">
                Donate to {asset.name}
              </h2>
              <p className="mt-0.5 text-xs text-porcelain/65">
                {asset.beneficiaryCategory}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-porcelain/60 transition hover:bg-white/10 hover:text-porcelain"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Current funding */}
          <div className="mb-5 rounded-lg bg-porcelain px-4 py-3 text-sm">
            <span className="text-ink-soft">Raised so far: </span>
            <span className="font-ledger font-medium text-ink">
              {asset.totalDonatedETH} / {asset.fundingGoalETH} ETH
            </span>
          </div>

          <form onSubmit={handleDonate}>
            <label htmlFor="donation-amount" className="mb-1.5 block text-sm font-medium text-ink">
              Amount (ETH)
            </label>
            <input
              id="donation-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1.5"
              className="field mb-3 font-ledger"
              autoFocus
            />

            {/* Quick amounts */}
            <div className="mb-5 flex flex-wrap gap-2">
              {QUICK_AMOUNTS.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setAmount(quick)}
                  className={`rounded-full border px-3 py-1 font-ledger text-xs transition ${
                    amount === quick
                      ? "border-zellige bg-zellige text-white"
                      : "border-ink/15 text-ink-soft hover:border-zellige hover:text-zellige-deep"
                  }`}
                >
                  {quick} ETH
                </button>
              ))}
            </div>

            {error && (
              <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="btn-ghost flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1">
                {loading ? "Processing..." : "Confirm donation"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
