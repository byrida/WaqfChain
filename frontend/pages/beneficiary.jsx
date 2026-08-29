import { useState, useEffect, useCallback } from "react";

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WaqfChain</h1>
            <p className="text-sm text-gray-500">Beneficiary Portal</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="text-gray-500 hover:text-gray-800">Home</a>
            <a href="/donor" className="text-gray-500 hover:text-gray-800">Donor</a>
            <a href="/trustee" className="text-gray-500 hover:text-gray-800">Trustee</a>
            <a href="/beneficiary" className="font-medium text-waqf-700 underline underline-offset-4">Beneficiary</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Intro */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800">Fund Transparency</h2>
          <p className="text-sm text-gray-500">
            See how Waqf endowment funds are being raised and spent, grouped by beneficiary category.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
            <button onClick={fetchData} className="ml-3 underline hover:no-underline">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-20 text-center text-gray-400">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-waqf-500" />
            Loading data...
          </div>
        )}

        {/* Empty */}
        {!loading && categories.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-lg text-gray-500">No Waqf assets registered yet.</p>
          </div>
        )}

        {/* Grouped categories */}
        {!loading && categories.length > 0 && (
          <div className="space-y-10">
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
      </main>
    </div>
  );
}

// ─── Category section ──────────────────────────────────────────────────────────────

function CategorySection({ category, assets, historyMap }) {
  // Prettify category name
  const label = category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, " ");

  return (
    <section>
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-waqf-100 px-3 py-1 text-sm font-semibold text-waqf-800">
          {label}
        </span>
        <span className="text-xs text-gray-400">{assets.length} asset{assets.length !== 1 && "s"}</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((asset) => {
          const history = historyMap[asset.id] || [];
          const totalDisbursed = history.reduce(
            (sum, d) => sum + parseFloat(d.amountETH),
            0
          );

          return (
            <div
              key={asset.id}
              className="flex flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              {/* Asset name + goal */}
              <h3 className="mb-1 text-base font-semibold text-gray-900">{asset.name}</h3>
              {asset.description && (
                <p className="mb-3 text-xs text-gray-500">{asset.description}</p>
              )}

              {/* Funding summary */}
              <div className="mb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total raised</span>
                  <span className="font-medium text-gray-800">{asset.totalDonatedETH} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total disbursed</span>
                  <span className="font-medium text-waqf-700">{totalDisbursed.toFixed(4)} ETH</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Funding goal</span>
                  <span className="text-gray-400">{asset.fundingGoalETH} ETH</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-waqf-500 transition-all duration-500"
                  style={{
                    width: `${parseFloat(asset.fundingGoalETH) > 0
                      ? Math.min(
                          (parseFloat(asset.totalDonatedETH) / parseFloat(asset.fundingGoalETH)) * 100,
                          100
                        )
                      : 0
                    }%`,
                  }}
                />
              </div>

              {/* Disbursement history */}
              <div className="mt-auto">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Fund Usage
                </h4>
                {history.length === 0 ? (
                  <p className="text-xs text-gray-400">No disbursements yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.map((d, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 text-xs"
                      >
                        <span className="text-gray-700">{d.purpose}</span>
                        <span className="ml-2 shrink-0 font-medium text-gray-800">
                          {d.amountETH} ETH
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
