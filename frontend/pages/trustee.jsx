import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import KhatamStar from "../components/KhatamStar";
import CategoryChip from "../components/CategoryChip";
import ProgressBar from "../components/ProgressBar";

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
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Masthead */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zellige">
            Trustee portal
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-mihrab">
            The steward&apos;s ledger
          </h1>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            Disburse endowment funds and put every payment on the record.
          </p>
        </div>

        {/* Wallet address input */}
        <div className="mb-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <label
            htmlFor="trustee-address"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-soft"
          >
            Trustee wallet address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="trustee-address"
              type="text"
              value={trusteeAddress}
              onChange={(e) => setTrusteeAddress(e.target.value)}
              className="field flex-1 font-ledger"
              placeholder="0x..."
            />
            <button onClick={fetchAssets} className="btn-ghost">
              Refresh
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
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
          <div className="py-24 text-center text-ink-soft">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-mihrab/10 border-t-zellige" />
            Loading assets...
          </div>
        )}

        {/* Empty */}
        {!loading && trusteeAssets.length === 0 && (
          <div className="py-24 text-center">
            <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
            <p className="text-lg font-medium text-mihrab">
              No assets found for this trustee.
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Make sure the address matches a waqf asset&apos;s trustee.
            </p>
          </div>
        )}

        {/* Asset cards */}
        {!loading && trusteeAssets.length > 0 && (
          <div className="space-y-6">
            {trusteeAssets.map((asset, i) => (
              <div
                key={asset.id}
                className="motion-safe:animate-rise"
                style={{ animationDelay: `${Math.min(i, 6) * 80}ms` }}
              >
                <TrusteeAssetCard asset={asset} onDisbursed={fetchAssets} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
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

      setSuccess(`Disbursed ${disburseAmount} ETH for "${disbursePurpose}".`);
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
    <article className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
      {/* Asset header */}
      <div className="bg-mihrab p-6 text-porcelain">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <h3 className="font-display text-xl font-semibold leading-snug">
            {asset.name}
          </h3>
          <CategoryChip dark>{asset.beneficiaryCategory}</CategoryChip>
        </div>
        {asset.description && (
          <p className="mb-4 max-w-2xl text-sm leading-relaxed text-porcelain/70">
            {asset.description}
          </p>
        )}
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-ledger text-2xl text-gilt">
            {asset.totalDonatedETH}{" "}
            <span className="text-sm font-sans text-porcelain/60">ETH available</span>
          </p>
          <p className="font-ledger text-sm text-porcelain/60">
            goal {asset.fundingGoalETH} ETH
          </p>
        </div>
        <ProgressBar value={progress} dark />
      </div>

      {/* Disburse form */}
      <div className="border-b border-ink/10 p-6">
        <h4 className="mb-4 font-display text-base font-semibold text-mihrab">
          Disburse funds
        </h4>
        <form onSubmit={handleDisburse} className="space-y-3">
          <input
            type="text"
            value={disburseTo}
            onChange={(e) => setDisburseTo(e.target.value)}
            placeholder="Recipient address (0x...)"
            aria-label="Recipient address"
            className="field font-ledger"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="number"
              step="0.01"
              min="0"
              value={disburseAmount}
              onChange={(e) => setDisburseAmount(e.target.value)}
              placeholder="Amount (ETH)"
              aria-label="Amount in ETH"
              className="field font-ledger sm:w-44"
            />
            <input
              type="text"
              value={disbursePurpose}
              onChange={(e) => setDisbursePurpose(e.target.value)}
              placeholder="Purpose (e.g. school supplies)"
              aria-label="Purpose"
              className="field flex-1"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          {success && (
            <p className="flex items-center gap-2 rounded-lg bg-gilt-pale px-3 py-2 text-sm text-ink">
              <KhatamStar className="h-3.5 w-3.5 shrink-0 text-gilt" />
              {success}
            </p>
          )}
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Processing..." : "Disburse funds"}
          </button>
        </form>
      </div>

      {/* Disbursement history */}
      <div className="p-6">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Disbursement history
        </h4>
        {history.length === 0 ? (
          <p className="text-sm text-ink-soft/70">No disbursements yet.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {history.map((d, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{d.purpose}</p>
                  <p className="font-ledger text-xs text-ink-soft">
                    to {d.to.slice(0, 6)}...{d.to.slice(-4)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-ledger text-sm font-medium text-mihrab">
                    {d.amountETH} ETH
                  </p>
                  <p className="text-xs text-ink-soft">
                    {new Date(d.timestamp).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
