import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import KhatamStar from "../components/KhatamStar";
import CategoryChip from "../components/CategoryChip";
import ProgressBar from "../components/ProgressBar";
import useWallet from "../lib/useWallet";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function TrusteePortal() {
  const { address, connecting, connect, hasMetaMask } = useWallet();
  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isApproved, setIsApproved] = useState(null);
  const [checkingApproval, setCheckingApproval] = useState(false);

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

  // Check whether the connected wallet is an approved trustee
  useEffect(() => {
    async function checkApproval() {
      if (!address) {
        setIsApproved(null);
        return;
      }
      setCheckingApproval(true);
      try {
        const res = await fetch(`${API_URL}/api/assets/check-trustee/${address}`);
        const data = await res.json();
        setIsApproved(data.isApproved === true);
      } catch {
        setIsApproved(false);
      } finally {
        setCheckingApproval(false);
      }
    }
    checkApproval();
  }, [address]);

  // Filter assets where the connected wallet is the trustee
  const trusteeAssets = address
    ? allAssets.filter(
        (a) => a.trustee.toLowerCase() === address.toLowerCase()
      )
    : [];

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Masthead */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zellige">
            Trustee portal
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-mihrab">
            Manage waqf funds
          </h1>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            Send funds from waqf projects and keep a record of every payment.
          </p>
        </div>

        {/* Wallet connection */}
        <div className="mb-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          {!hasMetaMask ? (
            <div>
              <p className="text-sm font-medium text-mihrab">MetaMask not found</p>
              <p className="mt-1 text-xs text-ink-soft">
                Install MetaMask browser extension to use the trustee portal.
              </p>
            </div>
          ) : !address ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={connect}
                disabled={connecting}
                className="btn-primary"
              >
                {connecting ? "Connecting..." : "Connect wallet"}
              </button>
              <p className="text-xs text-ink-soft">
                Connect the wallet that manages waqf projects.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Connected wallet
                </p>
                <p className="mt-0.5 font-ledger text-sm text-ink">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {checkingApproval
                    ? "Checking trustee approval..."
                    : isApproved
                    ? "Approved trustee"
                    : "Not an approved trustee"}
                </p>
              </div>
              <button onClick={fetchAssets} className="btn-ghost">
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {/* No MetaMask installed */}
        {!hasMetaMask && !loading && (
          <div className="py-24 text-center">
            <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
            <p className="text-lg font-medium text-mihrab">
              MetaMask is required
            </p>
            <p className="mt-2 max-w-sm mx-auto text-sm text-ink-soft">
              Install the MetaMask browser extension, then refresh this page.
              MetaMask acts as your wallet and login — it connects your identity
              to the blockchain.
            </p>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-6 inline-block"
            >
              Install MetaMask
            </a>
          </div>
        )}

        {/* MetaMask available but not connected */}
        {hasMetaMask && !address && !loading && (
          <div className="py-24 text-center">
            <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
            <p className="text-lg font-medium text-mihrab">
              Connect your wallet
            </p>
            <p className="mt-2 max-w-sm mx-auto text-sm text-ink-soft">
              Click the button above to connect MetaMask. Your wallet address
              identifies which waqf projects you manage.
            </p>
          </div>
        )}

        {/* Loading */}
        {address && loading && (
          <div className="py-24 text-center text-ink-soft">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-mihrab/10 border-t-zellige" />
            Loading assets...
          </div>
        )}

        {/* Not approved trustee */}
        {address && !loading && !checkingApproval && isApproved === false && (
          <div className="py-24 text-center">
            <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
            <p className="text-lg font-medium text-mihrab">
              Your wallet isn&apos;t an approved trustee yet — contact the platform to get verified.
            </p>
            <p className="mt-1 max-w-sm mx-auto text-sm text-ink-soft">
              Once the platform approves your wallet, you can create waqf assets
              and manage funds here.
            </p>
          </div>
        )}

        {/* Approved trustee: create form + asset cards */}
        {address && !loading && !checkingApproval && isApproved && (
          <div className="space-y-8">
            <CreateAssetForm address={address} onCreated={fetchAssets} />

            {trusteeAssets.length === 0 ? (
              <div className="py-16 text-center">
                <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
                <p className="text-lg font-medium text-mihrab">
                  No assets to manage yet.
                </p>
                <p className="mt-1 max-w-sm mx-auto text-sm text-ink-soft">
                  Use the form above to create your first waqf asset. It will
                  appear in the donor portal right away.
                </p>
              </div>
            ) : (
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
        )}
      </div>
    </Layout>
  );
}

// ─── Create new waqf asset form ─────────────────────────────────────────────────

const CATEGORIES = [
  "education",
  "orphan care",
  "mosque construction",
  "healthcare",
  "food security",
  "water & sanitation",
  "livelihood",
  "emergency relief",
];

const PKR_PER_ETH = 350000;

function pkrToEth(pkr) {
  return (pkr / PKR_PER_ETH).toFixed(6);
}

function CreateAssetForm({ address, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [goalPKR, setGoalPKR] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const goalETH = parseFloat(goalPKR) > 0 ? pkrToEth(parseFloat(goalPKR)) : "0";

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const pkr = parseFloat(goalPKR);
    if (!name.trim() || !category || !pkr || pkr <= 0) {
      setFormError("Please fill all fields and enter a funding goal greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          beneficiaryCategory: category,
          trustee: address,
          fundingGoalETH: goalETH,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create asset");

      setFormSuccess(
        `Created "${data.asset.name}". It will appear in the donor portal.`
      );
      setName("");
      setDescription("");
      setCategory("");
      setGoalPKR("");
      onCreated();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-mihrab">
        Create new waqf asset
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Register a new project on the blockchain. The connected wallet will be
        its trustee.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="asset-name" className="mb-1.5 block text-sm font-medium text-ink">
            Asset name
          </label>
          <input
            id="asset-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Al-Noor School Endowment"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="asset-description" className="mb-1.5 block text-sm font-medium text-ink">
            Description
          </label>
          <textarea
            id="asset-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will this waqf fund do?"
            className="field min-h-[80px]"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="asset-category" className="mb-1.5 block text-sm font-medium text-ink">
              Beneficiary category
            </label>
            <select
              id="asset-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="field"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="asset-goal" className="mb-1.5 block text-sm font-medium text-ink">
              Funding goal (PKR)
            </label>
            <input
              id="asset-goal"
              type="number"
              inputMode="numeric"
              min="0"
              value={goalPKR}
              onChange={(e) => setGoalPKR(e.target.value)}
              placeholder="e.g. 2,500,000"
              className="field font-ledger"
            />
            {parseFloat(goalPKR) > 0 && (
              <p className="mt-1 text-xs text-ink-soft">
                ≈ {goalETH} ETH{" "}
                <span className="text-ink/50">
                  (demo rate: 1 ETH = ₨{PKR_PER_ETH.toLocaleString()})
                </span>
              </p>
            )}
          </div>
        </div>

        {formError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}
        {formSuccess && (
          <p className="flex items-center gap-2 rounded-lg bg-gilt-pale px-3 py-2 text-sm text-ink">
            <KhatamStar className="h-3.5 w-3.5 shrink-0 text-gilt" />
            {formSuccess}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Creating..." : "Create waqf asset"}
        </button>
      </form>
    </section>
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

    const amount = parseFloat(disburseAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Amount must be greater than 0.");
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

      setSuccess(`Sent ${disburseAmount} ETH for "${disbursePurpose}".`);
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
            <span className="text-sm font-sans text-porcelain/60">
              ETH available
            </span>
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
          Send funds
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
              placeholder="Reason (e.g. school supplies)"
              aria-label="Reason"
              className="field flex-1"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {success && (
            <p className="flex items-center gap-2 rounded-lg bg-gilt-pale px-3 py-2 text-sm text-ink">
              <KhatamStar className="h-3.5 w-3.5 shrink-0 text-gilt" />
              {success}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? "Processing..." : "Send funds"}
          </button>
        </form>
      </div>

      {/* Disbursement history */}
      <div className="p-6">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Payment history
        </h4>
        {history.length === 0 ? (
          <p className="text-sm text-ink-soft/70">No payments sent yet.</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {history.map((d, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">
                    {d.purpose}
                  </p>
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
