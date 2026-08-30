import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import DonorCard from "../components/DonorCard";
import KhatamStar from "../components/KhatamStar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DonorPortal() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/assets`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch assets");
      setAssets(data.assets);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  function handleDonationSuccess(updatedAsset) {
    // Update the specific asset in the list with fresh data
    setAssets((prev) =>
      prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a))
    );
    setSuccessMessage(
      `Donation of ${updatedAsset.totalDonatedETH} ETH confirmed for "${updatedAsset.name}".`
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Masthead */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zellige">
              Donor portal
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-mihrab">
              Active waqf assets
            </h1>
            <p className="mt-2 max-w-lg text-sm text-ink-soft">
              Every asset is a tokenized endowment — contribute to the corpus
              and watch it grow.
            </p>
          </div>
          <button onClick={fetchAssets} className="btn-ghost text-zellige-deep">
            Refresh
          </button>
        </div>

        {/* Success toast */}
        {successMessage && (
          <div
            role="status"
            className="mb-6 flex items-center gap-3 rounded-lg border border-gilt/40 bg-gilt-pale px-4 py-3 text-sm text-ink motion-safe:animate-rise"
          >
            <KhatamStar className="h-4 w-4 shrink-0 text-gilt" />
            {successMessage}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
            <button
              onClick={fetchAssets}
              className="ml-3 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="py-24 text-center text-ink-soft">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-mihrab/10 border-t-zellige" />
            Loading waqf assets...
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && assets.length === 0 && (
          <div className="py-24 text-center">
            <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
            <p className="text-lg font-medium text-mihrab">No waqf assets found.</p>
            <p className="mt-1 text-sm text-ink-soft">
              Assets will appear here once they are created on-chain.
            </p>
          </div>
        )}

        {/* Asset grid */}
        {!loading && assets.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((asset, i) => (
              <div
                key={asset.id}
                className="motion-safe:animate-rise"
                style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
              >
                <DonorCard
                  asset={asset}
                  onDonationSuccess={handleDonationSuccess}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
