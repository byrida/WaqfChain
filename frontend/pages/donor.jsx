import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import DonorCard from "../components/DonorCard";
import KhatamStar from "../components/KhatamStar";
import useWallet from "../lib/useWallet";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Demo conversion rate — this is a sandbox flow, not a real exchange rate.
const PKR_PER_ETH = 350000;

function ethToPkr(eth) {
  return (parseFloat(eth) * PKR_PER_ETH).toFixed(0);
}

export default function DonorPortal() {
  const { address, connecting, connect, hasMetaMask } = useWallet();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [donations, setDonations] = useState({});

  // Off-chain / mobile money lookup
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneDonations, setPhoneDonations] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneError, setPhoneError] = useState(null);

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

  // Fetch connected wallet's donations across all assets
  const fetchDonations = useCallback(async (assetList, walletAddress) => {
    if (!walletAddress || assetList.length === 0) return;
    const donationMap = {};
    await Promise.all(
      assetList.map(async (asset) => {
        try {
          const res = await fetch(
            `${API_URL}/api/donations/${asset.id}/${walletAddress}`
          );
          const data = await res.json();
          if (data.amountETH && parseFloat(data.amountETH) > 0) {
            donationMap[asset.id] = data;
          }
        } catch {
          // ignore
        }
      })
    );
    setDonations(donationMap);
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Fetch donations when wallet connects or assets load
  useEffect(() => {
    if (address && assets.length > 0) {
      fetchDonations(assets, address);
    } else {
      setDonations({});
    }
  }, [address, assets, fetchDonations]);

  function handleDonationSuccess(updatedAsset) {
    setAssets((prev) =>
      prev.map((a) => (a.id === updatedAsset.id ? updatedAsset : a))
    );
    setSuccessMessage(
      `Donation of ₨${Number(ethToPkr(updatedAsset.totalDonatedETH)).toLocaleString()} confirmed for "${updatedAsset.name}".`
    );
    setTimeout(() => setSuccessMessage(null), 4000);
    // Refresh donation history after successful donation
    if (address) {
      fetchDonations(
        assets.map((a) =>
          a.id === updatedAsset.id ? updatedAsset : a
        ),
        address
      );
    }
  }

  // Calculate totals for "Your Donations"
  const donationEntries = Object.entries(donations);
  const totalDonated = donationEntries.reduce(
    (sum, [, d]) => sum + (parseFloat(d.amountETH) || 0),
    0
  );

  // Off-chain lookup handler
  async function handlePhoneLookup(e) {
    e.preventDefault();
    setPhoneError(null);
    const digits = phoneInput.replace(/\D/g, "");
    if (!/^03\d{9}$/.test(digits)) {
      setPhoneError("Enter a valid Pakistani mobile number (03XX XXXXXXX)");
      setPhoneDonations(null);
      return;
    }

    setPhoneLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/donations/offchain/${digits}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed");
      setPhoneDonations(data.donations || []);
    } catch (err) {
      setPhoneError(err.message);
      setPhoneDonations(null);
    } finally {
      setPhoneLoading(false);
    }
  }

  const totalPhoneDonated = (phoneDonations || []).reduce(
    (sum, d) => sum + (parseFloat(d.amountETH) || 0),
    0
  );
  const totalPhonePKR = (phoneDonations || []).reduce(
    (sum, d) => sum + (Number(d.amountPKR) || 0),
    0
  );

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
              Available waqf projects
            </h1>
            <p className="mt-2 max-w-lg text-sm text-ink-soft">
              Each project is a waqf endowment — donate and watch it grow.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {hasMetaMask && !address && (
              <button
                onClick={connect}
                disabled={connecting}
                className="btn-primary text-sm"
              >
                {connecting ? "Connecting..." : "Connect wallet"}
              </button>
            )}
            <button onClick={fetchAssets} className="btn-ghost text-zellige-deep">
              Refresh
            </button>
          </div>
        </div>

        {/* Connected wallet badge */}
        {address && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-ink/10 bg-white px-4 py-2.5 shadow-sm text-xs text-ink-soft">
            <span className="h-2 w-2 rounded-full bg-zellige" />
            Connected:{" "}
            <span className="font-ledger text-ink">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          </div>
        )}

        {/* Wallet donations section */}
        {address && donationEntries.length > 0 && (
          <div className="mb-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-mihrab">
                  Your wallet donations
                </h2>
                <p className="mt-0.5 text-xs text-ink-soft">
                  On-chain giving history for your connected wallet
                </p>
              </div>
              <p className="font-ledger text-xl font-semibold text-gilt">
                ₨{Number(ethToPkr(totalDonated)).toLocaleString()}{" "}
                <span className="text-xs font-sans text-ink-soft">total</span>
              </p>
            </div>
            <ul className="divide-y divide-ink/10">
              {donationEntries.map(([assetId, d]) => {
                const asset = assets.find((a) => a.id === Number(assetId));
                return (
                  <li
                    key={assetId}
                    className="flex items-center justify-between gap-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {asset ? asset.name : `Asset #${assetId}`}
                      </p>
                      <p className="text-xs text-ink-soft">
                        {asset ? asset.beneficiaryCategory : ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-ledger text-sm font-medium text-mihrab">
                      ₨{Number(ethToPkr(d.amountETH)).toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Mobile money lookup section */}
        <div className="mb-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-mihrab">
            Paid with JazzCash / Easypaisa?
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">
            Enter your mobile number to see your donations
          </p>

          <form
            onSubmit={handlePhoneLookup}
            className="mt-4 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="tel"
              inputMode="numeric"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="03XX XXXXXXX"
              className="field font-ledger sm:flex-1"
              aria-label="Mobile number"
            />
            <button
              type="submit"
              disabled={phoneLoading}
              className="btn-primary whitespace-nowrap disabled:opacity-50"
            >
              {phoneLoading ? "Looking up..." : "Find my donations"}
            </button>
          </form>

          {phoneError && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {phoneError}
            </p>
          )}

          {phoneDonations && phoneDonations.length === 0 && !phoneLoading && (
            <p className="mt-4 text-sm text-ink-soft">
              No JazzCash / Easypaisa donations found for this number.
            </p>
          )}

          {phoneDonations && phoneDonations.length > 0 && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-ink">
                  Mobile money donations
                </p>
                <p className="font-ledger text-sm font-semibold text-gilt">
                  ₨{Number(ethToPkr(totalPhoneDonated)).toLocaleString()}
                </p>
              </div>
              <ul className="divide-y divide-ink/10">
                {phoneDonations.map((d) => {
                  const asset = assets.find((a) => a.id === Number(d.assetId));
                  return (
                    <li
                      key={d.id}
                      className="flex items-center justify-between gap-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">
                          {asset ? asset.name : `Asset #${d.assetId}`}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {d.paymentMethod} · {new Date(d.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-ledger text-sm font-medium text-mihrab">
                          ₨{Number(ethToPkr(d.amountETH)).toLocaleString()}
                        </p>
                        <p className="text-xs text-ink-soft">
                          ₨{Number(d.amountPKR).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
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
            <p className="text-lg font-medium text-mihrab">
              No waqf projects found.
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Projects will appear here once they are created.
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
