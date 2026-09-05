import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import KhatamStar from "./KhatamStar";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const QUICK_PKR = [500, 1000, 2500, 5000, 10000, 25000];

// Demo conversion rate — this is a sandbox flow, not a real exchange rate.
const PKR_PER_ETH = 350000;

function pkrToEth(pkr) {
  return (pkr / PKR_PER_ETH).toFixed(6);
}

function ethToPkr(eth) {
  return (parseFloat(eth) * PKR_PER_ETH).toFixed(0);
}

function maskPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return digits;
  return `•••• ••${digits.slice(-2)}`;
}

export default function DonateModal({ asset, onClose, onSuccess }) {
  // step: "choose" | "wallet" | "mobile" | "processing" | "success"
  const [step, setStep] = useState("choose");

  // wallet flow (existing)
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // mobile money flow (JazzCash / Easypaisa)
  const [phone, setPhone] = useState("");
  const [pkrAmount, setPkrAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("JazzCash");
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && step !== "processing") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  // Lock body scroll while the modal is open so the page behind stays still
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ─── Existing wallet flow (unchanged behaviour) ────────────────────────────

  async function handleWalletDonate(e) {
    e.preventDefault();
    setError(null);

    const pkrValue = parseFloat(amount);
    if (!pkrValue || pkrValue <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    // Convert PKR to ETH for the backend call
    const amountETH = pkrToEth(pkrValue);

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, amountETH }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Donation failed");

      onSuccess(data.asset);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Simulated JazzCash / Easypaisa flow ──────────────────────────────────

  function validateMobileForm() {
    const digits = phone.replace(/\D/g, "");
    if (!/^03\d{9}$/.test(digits)) {
      return "Enter a valid Pakistani mobile number (03XX XXXXXXX)";
    }
    const pkr = parseFloat(pkrAmount);
    if (!pkr || pkr <= 0) {
      return "Enter an amount in PKR greater than 0";
    }
    return null;
  }

  async function handleMobileConfirm(e) {
    e.preventDefault();
    setError(null);

    const validation = validateMobileForm();
    if (validation) {
      setError(validation);
      return;
    }

    const pkr = parseFloat(pkrAmount);
    const amountETH = pkrToEth(pkr);

    setStep("processing");

    // Simulate the mobile payment gateway round-trip...
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // ...then actually record the donation on-chain via our backend,
    // using the platform wallet so the donor needs no crypto wallet.
    try {
      const res = await fetch(`${API_URL}/api/donations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          amountETH,
          amountPKR: pkr,
          phoneNumber: phone.replace(/\D/g, ""),
          paymentMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Payment failed");

      setReceipt({
        pkr,
        amountETH,
        phone: phone.replace(/\D/g, ""),
        paymentMethod,
        txHash: data.txHash,
        asset: data.asset,
      });
      setStep("success");
    } catch (err) {
      setError(err.message);
      setStep("mobile");
    }
  }

  function handleDone() {
    onSuccess(receipt.asset);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  // Render through a portal to document.body. The card grid wraps each card
  // in an animate-rise element that keeps a transform after the animation,
  // creating a stacking context that traps z-index inside the card — cards in
  // later rows would otherwise paint over this modal. At body level, z-50
  // overlays the whole page.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && step !== "processing") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Donate to ${asset.name}`}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col motion-safe:animate-rise"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 bg-mihrab px-6 py-5 text-porcelain">
          <div className="flex items-center gap-3">
            <KhatamStar className="h-6 w-6 shrink-0 text-gilt" />
            <div>
              <h2 className="font-display text-lg font-semibold leading-snug">
                {step === "success" ? "Payment successful" : `Donate to ${asset.name}`}
              </h2>
              <p className="mt-0.5 text-xs text-porcelain/65">
                {step === "success" ? "Recorded on-chain" : asset.beneficiaryCategory}
              </p>
            </div>
          </div>
          {step !== "processing" && (
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1 text-porcelain/60 transition hover:bg-white/10 hover:text-porcelain"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="overflow-y-auto p-6">
          {/* ── Step: choose payment method ── */}
          {step === "choose" && (
            <div>
              <p className="mb-4 text-sm font-medium text-ink">Choose a payment method</p>
              <div className="space-y-3">
                {/* Mobile money */}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("mobile");
                  }}
                  className="flex w-full items-center gap-4 rounded-xl border border-ink/10 bg-white p-4 text-left transition hover:border-zellige/40 hover:bg-porcelain"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#E10E49]/10">
                    <svg className="h-5 w-5 text-[#E10E49]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      Pay with JazzCash / Easypaisa
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      Pay in PKR from your mobile wallet
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-[#E10E49]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#E10E49]">
                        JazzCash
                      </span>
                      <span className="rounded-full bg-[#57BB4C]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4A9E3F]">
                        Easypaisa
                      </span>
                    </span>
                  </span>
                  <svg className="h-4 w-4 shrink-0 text-ink/30" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>

                {/* Crypto wallet */}
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep("wallet");
                  }}
                  className="flex w-full items-center gap-4 rounded-xl border border-ink/10 bg-white p-4 text-left transition hover:border-zellige/40 hover:bg-porcelain"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-zellige/10">
                    <svg className="h-5 w-5 text-zellige" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      Pay with Wallet (MetaMask)
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-soft">
                      Pay in ETH using your crypto wallet
                    </span>
                  </span>
                  <svg className="h-4 w-4 shrink-0 text-ink/30" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 rounded-lg bg-porcelain px-4 py-3 text-sm">
                <span className="text-ink-soft">Collected so far: </span>
                <span className="font-ledger font-medium text-ink">
                  ₨{Number(ethToPkr(asset.totalDonatedETH)).toLocaleString()} / ₨{Number(ethToPkr(asset.fundingGoalETH)).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* ── Step: wallet checkout (existing flow) ── */}
          {step === "wallet" && (
            <form onSubmit={handleWalletDonate}>
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="mb-4 text-xs font-medium text-zellige transition hover:text-zellige-deep"
              >
                ← Go back
              </button>

              <label htmlFor="donation-amount" className="mb-1.5 block text-sm font-medium text-ink">
                Amount (PKR)
              </label>
              <input
                id="donation-amount"
                type="number"
                step="1"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="field mb-3 font-ledger"
                autoFocus
              />

              <div className="mb-5 flex flex-wrap gap-2">
                {QUICK_PKR.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setAmount(String(quick))}
                    className={`rounded-full border px-3 py-1 font-ledger text-xs transition ${
                      amount === String(quick)
                        ? "border-zellige bg-zellige text-white"
                        : "border-ink/15 text-ink-soft hover:border-zellige hover:text-zellige-deep"
                    }`}
                  >
                    ₨{quick.toLocaleString()}
                  </button>
                ))}
              </div>

              {parseFloat(amount) > 0 && (
                <p className="mb-4 rounded-lg bg-porcelain px-3 py-2 text-xs text-ink-soft">
                  You are donating{" "}
                  <span className="font-ledger font-medium text-ink">
                    {pkrToEth(parseFloat(amount))} ETH
                  </span>{" "}
                  <span className="text-ink/50">
                    (1 ETH = ₨{PKR_PER_ETH.toLocaleString()})
                  </span>
                </p>
              )}

              {error && (
                <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={onClose} className="btn-ghost flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "Processing..." : "Confirm donation"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step: simulated JazzCash / Easypaisa checkout ── */}
          {step === "mobile" && (
            <form onSubmit={handleMobileConfirm}>
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="mb-4 text-xs font-medium text-zellige transition hover:text-zellige-deep"
              >
                ← Go back
              </button>

              {/* Checkout strip */}
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-porcelain px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                    Secure checkout
                  </p>
                  <p className="mt-0.5 font-ledger text-sm text-ink">
                    {asset.name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded-full bg-[#E10E49] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    JazzCash
                  </span>
                  <span className="rounded-full bg-[#57BB4C] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Easypaisa
                  </span>
                </div>
              </div>

              <label htmlFor="mobile-phone" className="mb-1.5 block text-sm font-medium text-ink">
                Mobile number
              </label>
              <input
                id="mobile-phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03XX XXXXXXX"
                className="field mb-3 font-ledger"
                autoFocus
              />

              <label className="mb-1.5 block text-sm font-medium text-ink">
                Payment method
              </label>
              <div className="mb-3 flex gap-3">
                {["JazzCash", "Easypaisa"].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      paymentMethod === method
                        ? method === "JazzCash"
                          ? "border-[#E10E49] bg-[#E10E49]/10 text-[#E10E49]"
                          : "border-[#4A9E3F] bg-[#57BB4C]/15 text-[#4A9E3F]"
                        : "border-ink/10 bg-porcelain text-ink-soft hover:border-ink/20"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <label htmlFor="mobile-amount" className="mb-1.5 block text-sm font-medium text-ink">
                Amount (PKR)
              </label>
              <input
                id="mobile-amount"
                type="number"
                inputMode="numeric"
                min="0"
                value={pkrAmount}
                onChange={(e) => setPkrAmount(e.target.value)}
                placeholder="e.g. 2,500"
                className="field font-ledger"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_PKR.map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setPkrAmount(String(quick))}
                    className={`rounded-full border px-3 py-1 font-ledger text-xs transition ${
                      pkrAmount === String(quick)
                        ? "border-[#4A9E3F] bg-[#57BB4C] text-white"
                        : "border-ink/15 text-ink-soft hover:border-[#57BB4C] hover:text-[#4A9E3F]"
                    }`}
                  >
                    ₨{quick.toLocaleString()}
                  </button>
                ))}
              </div>

              {parseFloat(pkrAmount) > 0 && (
                <p className="mt-3 rounded-lg bg-porcelain px-3 py-2 text-xs text-ink-soft">
                  You are donating{" "}
                  <span className="font-ledger font-medium text-ink">
                    {pkrToEth(parseFloat(pkrAmount))} ETH
                  </span>{" "}
                  <span className="text-ink/50">
                    (demo rate: 1 ETH = ₨{PKR_PER_ETH.toLocaleString()})
                  </span>
                </p>
              )}

              {/* Sandbox notice */}
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                <span className="font-semibold">Demo mode.</span> This is a
                test payment — not connected to real JazzCash or
                Easypaisa. Your donation is still recorded on the blockchain
                using the WaqfChain wallet.
              </p>

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-[#4A9E3F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#57BB4C] active:scale-[0.98]"
              >
                Confirm payment
              </button>
            </form>
          )}

          {/* ── Step: processing ── */}
          {step === "processing" && (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-ink/10 border-t-[#4A9E3F]" />
              <p className="text-sm font-semibold text-ink">Processing payment...</p>
              <p className="mt-1 text-xs text-ink-soft">
                Confirming your payment and recording the donation on the blockchain
              </p>
            </div>
          )}

          {/* ── Step: success ── */}
          {step === "success" && receipt && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#57BB4C]/15">
                <svg className="h-7 w-7 text-[#4A9E3F]" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>

              <p className="font-display text-xl font-semibold text-mihrab">
                ₨{receipt.pkr.toLocaleString()} received
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                ₨{Number(ethToPkr(receipt.amountETH)).toLocaleString()} given to {asset.name}
              </p>

              <div className="mt-5 space-y-1.5 rounded-xl bg-porcelain px-4 py-3 text-left font-ledger text-xs text-ink-soft">
                <p className="flex justify-between gap-4">
                  <span>Mobile account</span>
                  <span className="text-ink">{maskPhone(receipt.phone)}</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span>Paid with</span>
                  <span className="text-ink">{receipt.paymentMethod}</span>
                </p>
                <p className="flex justify-between gap-4">
                  <span>On-chain record</span>
                  <span className="truncate text-ink">
                    {receipt.txHash ? `${receipt.txHash.slice(0, 8)}...${receipt.txHash.slice(-6)}` : "confirmed"}
                  </span>
                </p>
                <p className="flex justify-between gap-4">
                  <span>New total collected</span>
                  <span className="text-ink">₨{Number(ethToPkr(receipt.asset.totalDonatedETH)).toLocaleString()}</span>
                </p>
              </div>

              <button type="button" onClick={handleDone} className="btn-primary mt-5 w-full">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
