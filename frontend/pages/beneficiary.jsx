import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import KhatamStar from "../components/KhatamStar";
import ProgressBar from "../components/ProgressBar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function BeneficiaryPortal() {
  const [assets, setAssets] = useState([]);
  const [historyMap, setHistoryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch all assets
      const assetsRes = await fetch(`${API_URL}/api/assets`);
      const assetsData = await assetsRes.json();
      if (!assetsRes.ok) throw new Error(assetsData.error || "Failed to fetch assets");
      setAssets(assetsData.assets);

      // Fetch disbursement history for each asset in parallel
      const historyEntries = await Promise.all(
        assetsData.assets.map(async (asset) => {
          const res = await fetch(`${API_URL}/api/disbursements/history/${asset.id}`);
          const data = await res.json();
          return { assetId: asset.id, history: data.history || [] };
        })
      );

      const map = {};
      historyEntries.forEach(({ assetId, history }) => {
        map[assetId] = history;
      });
      setHistoryMap(map);

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group assets by beneficiary category
  const grouped = assets.reduce((acc, asset) => {
    const cat = asset.beneficiaryCategory || "uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Masthead */}
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-zellige">
            Beneficiary portal
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-mihrab">
            Fund transparency
          </h1>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            See how waqf endowment funds are being raised and spent, grouped by
            beneficiary category.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
            <button onClick={fetchData} className="ml-3 underline hover:no-underline">
              Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-24 text-center text-ink-soft">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-mihrab/10 border-t-zellige" />
            Loading data...
          </div>
        )}

        {/* Empty */}
        {!loading && categories.length === 0 && (
          <div className="py-24 text-center">
            <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
            <p className="text-lg font-medium text-mihrab">No waqf assets registered yet.</p>
          </div>
        )}

        {/* Grouped categories */}
        {!loading && categories.length > 0 && (
          <div className="space-y-12">
            {categories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                assets={grouped[category]}
                historyMap={historyMap}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── Category section ──────────────────────────────────────────────────────────────

function CategorySection({ category, assets, historyMap }) {
  // Prettify category name
  const label = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ");

  const totalRaised = assets.reduce(
    (sum, a) => sum + (parseFloat(a.totalDonatedETH) || 0),
    0
  );
  const totalDisbursed = Object.values(historyMap)
    .flat()
    .filter((d) => assets.some((a) => a.id === d.assetId))
    .reduce((sum, d) => sum + (parseFloat(d.amountETH) || 0), 0);

  return (
    <section>
      {/* Category masthead */}
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3 border-b border-ink/10 pb-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl font-semibold text-mihrab">{label}</h2>
          <span className="text-xs text-ink-soft">
            {assets.length} asset{assets.length !== 1 && "s"}
          </span>
        </div>
        <p className="font-ledger text-xs text-ink-soft">
          raised <span className="text-ink">{totalRaised.toFixed(2)}</span> · disbursed{" "}
          <span className="text-zellige-deep">{totalDisbursed.toFixed(2)}</span> ETH
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset, i) => {
          const history = historyMap[asset.id] || [];
          const disbursed = history.reduce(
            (sum, d) => sum + (parseFloat(d.amountETH) || 0),
            0
          );
          const goal = parseFloat(asset.fundingGoalETH);
          const donated = parseFloat(asset.totalDonatedETH);
          const progress = goal > 0 ? Math.min((donated / goal) * 100, 100) : 0;

          return (
            <article
              key={asset.id}
              className="flex flex-col rounded-2xl border border-ink/10 bg-white p-5 shadow-sm motion-safe:animate-rise"
              style={{ animationDelay: `${Math.min(i, 8) * 60}ms` }}
            >
              {/* Asset name */}
              <h3 className="font-display text-base font-semibold leading-snug text-mihrab">
                {asset.name}
              </h3>
              {asset.description && (
                <p className="mb-4 mt-1 text-xs leading-relaxed text-ink-soft">
                  {asset.description}
                </p>
              )}

              {/* Funding summary */}
              <dl className="mb-4 mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Raised</dt>
                  <dd className="font-ledger font-medium text-ink">
                    {asset.totalDonatedETH} ETH
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Disbursed</dt>
                  <dd className="font-ledger font-medium text-zellige-deep">
                    {disbursed.toFixed(4)} ETH
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">Funding goal</dt>
                  <dd className="font-ledger text-ink-soft">
                    {asset.fundingGoalETH} ETH
                  </dd>
                </div>
              </dl>

              {/* Progress bar */}
              <ProgressBar value={progress} className="mb-5" />

              {/* Disbursement history */}
              <div className="mt-auto">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Fund usage
                </h4>
                {history.length === 0 ? (
                  <p className="text-xs text-ink-soft/70">No disbursements yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.map((d, j) => (
                      <li
                        key={j}
                        className="flex items-start justify-between gap-2 rounded-lg bg-porcelain px-2.5 py-1.5 text-xs"
                      >
                        <span className="text-ink">{d.purpose}</span>
                        <span className="ml-2 shrink-0 font-ledger font-medium text-mihrab">
                          {d.amountETH} ETH
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
