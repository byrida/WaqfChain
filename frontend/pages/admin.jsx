import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import KhatamStar from "../components/KhatamStar";
import useWallet from "../lib/useWallet";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminPanel() {
  const { address, connecting, connect, hasMetaMask } = useWallet({ autoConnect: true });
  const [isAdmin, setIsAdmin] = useState(null);
  const [trustees, setTrustees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // email being processed

  // Check if the connected wallet is the contract owner
  const checkAdmin = useCallback(async () => {
    if (!address) {
      setIsAdmin(null);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/owner`, {
        headers: { "X-Admin-Address": address },
      });
      const data = await res.json();
      setIsAdmin(data.ownerAddress?.toLowerCase() === address.toLowerCase());
    } catch {
      setIsAdmin(false);
    }
  }, [address]);

  // Fetch trustee applications
  const fetchTrustees = useCallback(async () => {
    if (!address || !isAdmin) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/trustees`, {
        headers: { "X-Admin-Address": address },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch");
      setTrustees(data.trustees || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address, isAdmin]);

  useEffect(() => {
    checkAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    fetchTrustees();
  }, [fetchTrustees]);

  async function handleApprove(email) {
    setActionLoading(email);
    try {
      const res = await fetch(`${API_URL}/api/admin/trustees/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Address": address,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Approve failed");
      fetchTrustees();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(email) {
    setActionLoading(email);
    try {
      const res = await fetch(`${API_URL}/api/admin/trustees/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Address": address,
        },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reject failed");
      fetchTrustees();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const pending = trustees.filter((t) => t.status === "pending");
  const reviewed = trustees.filter((t) => t.status !== "pending");

  return (
    <Layout>
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        {/* Masthead */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-zellige">
            Admin panel
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-mihrab">
            Trustee applications
          </h1>
          <p className="mt-2 max-w-lg text-sm text-ink-soft">
            Review and approve trustee registrations. Only the contract owner
            can access this panel.
          </p>
        </div>

        {/* Wallet connection */}
        <div className="mb-8 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          {!hasMetaMask ? (
            <p className="text-sm text-ink-soft">
              MetaMask is required to access the admin panel.
            </p>
          ) : !address ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button onClick={connect} disabled={connecting} className="btn-primary">
                {connecting ? "Connecting..." : "Connect wallet"}
              </button>
              <p className="text-xs text-ink-soft">
                Connect the contract owner wallet to manage trustee applications.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                  Connected
                </p>
                <p className="mt-0.5 font-ledger text-sm text-ink">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {isAdmin === null
                    ? "Checking admin access..."
                    : isAdmin
                    ? "Contract owner"
                    : "Not the contract owner"}
                </p>
              </div>
              <button onClick={fetchTrustees} className="btn-ghost">
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

        {/* Not admin */}
        {address && isAdmin === false && (
          <div className="py-24 text-center">
            <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
            <p className="text-lg font-medium text-mihrab">
              This page is for the platform administrator only.
            </p>
            <p className="mt-1 max-w-sm mx-auto text-sm text-ink-soft">
              If you believe you should have access, please contact the platform
              team.
            </p>
          </div>
        )}

        {/* Admin view */}
        {address && isAdmin && !loading && (
          <div className="space-y-8">
            {/* Pending applications */}
            <section>
              <h2 className="mb-4 font-display text-lg font-semibold text-mihrab">
                Pending applications{" "}
                <span className="text-ink-soft">({pending.length})</span>
              </h2>
              {pending.length === 0 ? (
                <p className="rounded-xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">
                  No pending applications.
                </p>
              ) : (
                <div className="space-y-4">
                  {pending.map((t) => (
                    <article
                      key={t.email}
                      className="rounded-2xl border border-gilt/30 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-base font-semibold text-mihrab">
                            {t.orgName || "No organization name"}
                          </h3>
                          <p className="mt-0.5 text-sm text-ink-soft">{t.email}</p>
                          {t.phone && (
                            <p className="mt-0.5 text-xs text-ink-soft">
                              Phone: {t.phone}
                            </p>
                          )}
                          {t.description && (
                            <p className="mt-2 text-sm text-ink">{t.description}</p>
                          )}
                          <p className="mt-2 font-ledger text-xs text-ink-soft">
                            Wallet: {t.walletAddress}
                            {t.registrationType && (
                              <span
                                className={
                                  t.registrationType === "wallet"
                                    ? "ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                                    : "ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                                }
                              >
                                {t.registrationType === "wallet" ? "own wallet" : "email"}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            Applied: {new Date(t.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            onClick={() => handleApprove(t.email)}
                            disabled={actionLoading === t.email}
                            className="rounded-lg bg-mihrab px-4 py-2 text-sm font-medium text-porcelain transition-colors hover:bg-mihrab/90 disabled:opacity-50"
                          >
                            {actionLoading === t.email ? "..." : "Approve"}
                          </button>
                          <button
                            onClick={() => handleReject(t.email)}
                            disabled={actionLoading === t.email}
                            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                          >
                            {actionLoading === t.email ? "..." : "Reject"}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Reviewed applications */}
            {reviewed.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-lg font-semibold text-mihrab">
                  Reviewed{" "}
                  <span className="text-ink-soft">({reviewed.length})</span>
                </h2>
                <div className="space-y-3">
                  {reviewed.map((t) => (
                    <div
                      key={t.email}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {t.orgName || t.email}
                        </p>
                        <p className="font-ledger text-xs text-ink-soft">
                          {t.walletAddress.slice(0, 10)}...{t.walletAddress.slice(-6)}
                        </p>
                      </div>
                      <span
                        className={
                          t.status === "approved"
                            ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                            : "rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700"
                        }
                      >
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Loading */}
        {address && isAdmin && loading && (
          <div className="py-24 text-center text-ink-soft">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-mihrab/10 border-t-zellige" />
            Loading applications...
          </div>
        )}
      </div>
    </Layout>
  );
}
