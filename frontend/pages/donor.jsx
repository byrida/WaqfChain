import { useState, useEffect, useCallback } from "react";
import DonorCard from "../components/DonorCard";

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
      `Donation of ${updatedAsset.totalDonatedETH} ETH confirmed for "${updatedAsset.name}"!`
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              WaqfChain
            </h1>
            <p className="text-sm text-gray-500">Donor Portal</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-800">
              Home
            </a>
            <a
              href="/donor"
              className="font-medium text-waqf-700 underline underline-offset-4"
            >
              Donor
            </a>
            <a href="/trustee" className="text-gray-500 hover:text-gray-800">
              Trustee
            </a>
            <a href="/beneficiary" className="text-gray-500 hover:text-gray-800">
              Beneficiary
            </a>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Success toast */}
        {successMessage && (
          <div className="mb-6 rounded-lg border border-waqf-200 bg-waqf-50 px-4 py-3 text-sm text-waqf-800">
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
          <div className="py-20 text-center text-gray-400">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-waqf-500" />
            Loading Waqf assets...
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && assets.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg text-gray-500">No Waqf assets found.</p>
            <p className="mt-1 text-sm text-gray-400">
              Assets will appear here once they are created on-chain.
            </p>
          </div>
        )}

        {/* Asset grid */}
        {!loading && assets.length > 0 && (
          <>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">
                Active Waqf Assets
              </h2>
              <button
                onClick={fetchAssets}
                className="text-sm text-waqf-600 hover:text-waqf-800"
              >
                Refresh
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {assets.map((asset) => (
                <DonorCard
                  key={asset.id}
                  asset={asset}
                  onDonationSuccess={handleDonationSuccess}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
