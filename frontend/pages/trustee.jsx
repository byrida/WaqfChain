import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Hardhat Account #0 — the default trustee for local demo
const DEFAULT_TRUSTEE = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

export default function TrusteePortal() {
  const [trusteeAddress, setTrusteeAddress] = useState(DEFAULT_TRUSTEE);
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/assets`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch assets");
      setAllAssets(data.assets);
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

  // Filter assets where this address is the trustee
  const trusteeAssets = allAssets.filter(
    (a) => a.trustee.toLowerCase() === trusteeAddress.toLowerCase()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WaqfChain</h1>
            <p className="text-sm text-gray-500">Trustee Portal</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-800">Home</a>
            <a href="/donor" className="text-gray-500 hover:text-gray-800">Donor</a>
            <a href="/trustee" className="font-medium text-waqf-700 underline underline-offset-4">Trustee</a>
            <a href="/beneficiary" className="text-gray-500 hover:text-gray-800">Beneficiary</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Wallet address input */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Trustee Wallet Address
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={trusteeAddress}
              onChange={(e) => setTrusteeAddress(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-waqf-500 focus:outline-none focus:ring-2 focus:ring-waqf-500/20"
              placeholder="0x..."
            />
            <button
              onClick={fetchAssets}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Showing assets where this address is the appointed trustee.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center text-gray-400">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-waqf-500" />
            Loading assets...
          </div>
        )}

        {/* Empty */}
        {!loading && trusteeAssets.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg text-gray-500">No assets found for this trustee.</p>
            <p className="mt-1 text-sm text-gray-400">
              Make sure the address matches a Waqf asset's trustee.
            </p>
          </div>
        )}

        {/* Asset cards */}
        {!loading && trusteeAssets.length > 0 && (
          <div className="space-y-6">
            {trusteeAssets.map((asset) => (
              <TrusteeAssetCard
                key={asset.id}
                asset={asset}
                onDisbursed={fetchAssets}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Single trustee asset card with disburse form + history ─────────────────────

function TrusteeAssetCard({ asset, onDisbursed }) {
  const [disburseAmount, setDisburseAmount] = useState("");
  const [disburseTo, setDisburseTo] = useState("");
  const [disbursePurpose, setDisbursePurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [history, setHistory] = useState([]);

  const donated = parseFloat(asset.totalDonatedETH);
  const goal = parseFloat(asset.fundingGoalETH);
  const progress = goal > 0 ? Math.min((donated / goal) * 100, 100) : 0;

  // Fetch disbursement history for this asset
  useEffect(() => {
    fetch(`${API_URL}/api/disbursements/history/${asset.id}`)
      .then((res) => res.json())
      .then((data) => setHistory(data.history || []))
      .catch(() => {});
  }, [asset.id, success]);

  async function handleDisburse(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!disburseTo || !disburseAmount || !disbursePurpose) {
      setError("All fields are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/disbursements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          to: disburseTo,
          amountETH: disburseAmount,
          purpose: disbursePurpose,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disbursement failed");

      setSuccess(`Disbursed ${disburseAmount} ETH for "${disbursePurpose}"`);
      setDisburseAmount("");
      setDisburseTo("");
      setDisbursePurpose("");
      onDisbursed();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* Asset details */}
      <div className="border-b border-gray-100 p-5">
        <div className="mb-2 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{asset.name}</h3>
          <span className="rounded-full bg-waqf-100 px-2.5 py-0.5 text-xs font-medium text-waqf-800">
            {asset.beneficiaryCategory}
          </span>
        </div>
        {asset.description && (
          <p className="mb-3 text-sm text-gray-500">{asset.description}</p>
        )}
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="font-medium text-gray-700">
            {asset.totalDonatedETH} ETH{" "}
            <span className="font-normal text-gray-400">available</span>
          </span>
          <span className="text-gray-400">goal: {asset.fundingGoalETH} ETH</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-waqf-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Disburse form */}
      <div className="border-b border-gray-100 p-5">
        <h4 className="mb-3 text-sm font-semibold text-gray-800">Disburse Funds</h4>
        <form onSubmit={handleDisburse} className="space-y-3">
          <input
            type="text"
            value={disburseTo}
            onChange={(e) => setDisburseTo(e.target.value)}
            placeholder="Recipient address (0x...)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-waqf-500 focus:outline-none focus:ring-2 focus:ring-waqf-500/20"
          />
          <div className="flex gap-3">
            <input
              type="number"
              step="0.01"
              min="0"
              value={disburseAmount}
              onChange={(e) => setDisburseAmount(e.target.value)}
              placeholder="Amount (ETH)"
              className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-waqf-500 focus:outline-none focus:ring-2 focus:ring-waqf-500/20"
            />
            <input
              type="text"
              value={disbursePurpose}
              onChange={(e) => setDisbursePurpose(e.target.value)}
              placeholder="Purpose (e.g. school supplies)"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-waqf-500 focus:outline-none focus:ring-2 focus:ring-waqf-500/20"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-waqf-50 px-3 py-2 text-sm text-waqf-700">{success}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-waqf-600 px-4 py-2 text-sm font-semibold text-white hover:bg-waqf-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Processing..." : "Disburse Funds"}
          </button>
        </form>
      </div>

      {/* Disbursement history */}
      <div className="p-5">
        <h4 className="mb-3 text-sm font-semibold text-gray-800">Disbursement History</h4>
        {history.length === 0 ? (
          <p className="text-sm text-gray-400">No disbursements yet.</p>
        ) : (
          <ul className="space-y-2">
            {history.map((d, i) => (
              <li
                key={i}
                className="flex items-start justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-gray-800">{d.purpose}</p>
                  <p className="text-xs text-gray-400">
                    to {d.to.slice(0, 6)}...{d.to.slice(-4)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-800">{d.amountETH} ETH</p>
                  <p className="text-xs text-gray-400">
                    {new Date(d.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
