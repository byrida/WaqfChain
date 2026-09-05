import { useState } from "react";
import KhatamStar from "./KhatamStar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

/**
 * Reusable AI report section — impact summary + safety check.
 * Used in donor and beneficiary portals.
 */
export default function AIReportSection({ assetId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/assets/${assetId}/ai-report`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          AI report &amp; checks
        </h4>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center justify-center text-left gap-2 rounded-lg bg-gilt/60 px-4 py-2 text-xs font-semibold text-mihrab transition hover:bg-gilt/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <KhatamStar className="h-3.5 w-3.5" />
          {loading ? "Generating..." : "Generate AI report"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-ink-soft">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-mihrab/10 border-t-gilt" />
          Checking with AI...
        </div>
      )}

      {report && !loading && (
        <div className="space-y-4">
          {/* Impact report */}
          <div className="rounded-xl bg-gilt-pale p-4">
            <h5 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-mihrab">
              <KhatamStar className="h-3 w-3 text-gilt" />
              Impact report
            </h5>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
              {report.impactReport}
            </p>
          </div>

          {/* Safety check */}
          {report.flags && report.flags.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-800">
                Safety check — {report.complianceCheck}
              </h5>
              <ul className="space-y-1.5">
                {report.flags.map((flag, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-amber-900"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-xl border border-zellige/25 bg-porcelain p-4">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-zellige"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0Z"
                />
              </svg>
              <p className="text-sm text-ink">
                <span className="font-semibold text-zellige">
                  Safety check:
                </span>{" "}
                {report.complianceCheck || "No issues found"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
