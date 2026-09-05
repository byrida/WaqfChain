import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import KhatamStar from "../components/KhatamStar";
import CategoryChip from "../components/CategoryChip";
import ProgressBar from "../components/ProgressBar";
import useWallet from "../lib/useWallet";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// Demo conversion rate — this is a sandbox flow, not a real exchange rate.
const PKR_PER_ETH = 350000;

function ethToPkr(eth) {
  return (parseFloat(eth) * PKR_PER_ETH).toFixed(0);
}

function pkrToEth(pkr) {
  return (pkr / PKR_PER_ETH).toFixed(6);
}

export default function TrusteePortal() {
  // No autoConnect — address is only set when user explicitly clicks Connect Wallet
  const { address, connecting, connect, hasMetaMask } = useWallet();

  const [allAssets, setAllAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View routing: null (landing) | "register" | "login" | "wallet"
  const [entryMode, setEntryMode] = useState(null);
  // Register sub-type: null (show sub-options) | "email" | "wallet"
  const [regType, setRegType] = useState(null);

  // Connected wallet state (only populated via Connect Wallet path)
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [isApproved, setIsApproved] = useState(null);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [needsRegister, setNeedsRegister] = useState(false);

  // Post-login state (email login)
  const [loginInfo, setLoginInfo] = useState(null);

  function resetView() {
    setEntryMode(null);
    setRegType(null);
    setNeedsRegister(false);
    setLoginInfo(null);
  }

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

  // Check approval status whenever connectedAddress changes (Connect Wallet path)
  useEffect(() => {
    if (!connectedAddress || entryMode !== "wallet") {
      setIsApproved(null);
      setApplicationStatus(null);
      setNeedsRegister(false);
      return;
    }
    async function check() {
      setCheckingApproval(true);
      try {
        const [chainRes, appRes] = await Promise.all([
          fetch(`${API_URL}/api/assets/check-trustee/${connectedAddress}`),
          fetch(`${API_URL}/api/trustee/status/${connectedAddress}`),
        ]);
        const chainData = await chainRes.json();
        const appData = await appRes.json();
        setIsApproved(chainData.isApproved === true);
        const status = appData.status || "unknown";
        setApplicationStatus(status);
        setNeedsRegister(status === "unknown");
      } catch {
        setIsApproved(false);
        setApplicationStatus("unknown");
        setNeedsRegister(true);
      } finally {
        setCheckingApproval(false);
      }
    }
    check();
  }, [connectedAddress, entryMode]);

  // Assets managed by the connected wallet (used only by Connect Wallet path for loading checks)
  const trusteeAssets = connectedAddress
    ? allAssets.filter(
        (a) => a.trustee.toLowerCase() === connectedAddress.toLowerCase()
      )
    : [];

  async function handleConnect() {
    await connect();
  }

  // After connect, useWallet sets address; sync it to connectedAddress
  useEffect(() => {
    if (address && entryMode === "wallet") {
      setConnectedAddress(address);
    }
  }, [address, entryMode]);

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
            Register as a trustee, sign in to your account, or connect a wallet
            to manage waqf projects and send funds.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-medium">Error:</span> {error}
          </div>
        )}

        {/* ══════════ LANDING — 3 choices ══════════ */}
        {!entryMode && (
          <div className="grid gap-4 sm:grid-cols-3">
            <button
              onClick={() => setEntryMode("register")}
              className="group flex flex-col items-start rounded-2xl border border-ink/10 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zellige/40 hover:shadow-md"
            >
              <KhatamStar className="mb-3 h-8 w-8 text-zellige" />
              <h3 className="font-display text-lg font-semibold text-mihrab">
                Register as Trustee
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                Create an account to manage waqf funds. Choose email-based
                registration or use your own MetaMask wallet.
              </p>
            </button>

            <button
              onClick={() => setEntryMode("login")}
              className="group flex flex-col items-start rounded-2xl border border-ink/10 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zellige/40 hover:shadow-md"
            >
              <svg className="mb-3 h-8 w-8 text-zellige" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <h3 className="font-display text-lg font-semibold text-mihrab">
                Login
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                Sign in with your email and password to check your application
                status and account details.
              </p>
            </button>

            <button
              onClick={() => setEntryMode("wallet")}
              className="group flex flex-col items-start rounded-2xl border border-ink/10 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zellige/40 hover:shadow-md"
            >
              <svg className="mb-3 h-8 w-8 text-zellige" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
              <h3 className="font-display text-lg font-semibold text-mihrab">
                Connect Wallet
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                Connect your MetaMask wallet to manage waqf assets and send
                funds directly on the blockchain.
              </p>
            </button>
          </div>
        )}

        {/* ══════════ REGISTER ══════════ */}
        {entryMode === "register" && !regType && (
          <div>
            <button onClick={resetView} className="mb-4 text-sm font-medium text-zellige transition hover:text-zellige-deep">
              ← Back to options
            </button>
            <h2 className="mb-4 font-display text-lg font-semibold text-mihrab">
              Choose a registration method
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => setRegType("email")}
                className="group flex flex-col items-start rounded-2xl border border-ink/10 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zellige/40 hover:shadow-md"
              >
                <KhatamStar className="mb-3 h-7 w-7 text-zellige" />
                <h3 className="font-display text-base font-semibold text-mihrab">
                  Register with Email
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  A blockchain wallet will be generated for you automatically.
                  Log in with email and password.
                </p>
              </button>

              <button
                onClick={() => {
                  if (!hasMetaMask) {
                    setError("MetaMask is required for wallet-based registration. Install the MetaMask browser extension or use email registration instead.");
                    return;
                  }
                  setError(null);
                  setRegType("wallet");
                }}
                className="group flex flex-col items-start rounded-2xl border border-ink/10 bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-zellige/40 hover:shadow-md"
              >
                <svg className="mb-3 h-7 w-7 text-zellige" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
                <h3 className="font-display text-base font-semibold text-mihrab">
                  Register with My Own Wallet
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Use your existing MetaMask wallet address. You keep full
                  control of your private key.
                </p>
              </button>
            </div>
          </div>
        )}

        {entryMode === "register" && regType === "email" && (
          <div>
            <button onClick={() => setRegType(null)} className="mb-4 text-sm font-medium text-zellige transition hover:text-zellige-deep">
              ← Back to registration options
            </button>
            <EmailRegisterForm onRegistered={resetView} />
          </div>
        )}

        {entryMode === "register" && regType === "wallet" && (
          <div>
            <button onClick={() => setRegType(null)} className="mb-4 text-sm font-medium text-zellige transition hover:text-zellige-deep">
              ← Back to registration options
            </button>
            <WalletRegisterForm onRegistered={resetView} />
          </div>
        )}

        {/* ══════════ LOGIN ══════════ */}
        {entryMode === "login" && !loginInfo && (
          <div>
            <button onClick={resetView} className="mb-4 text-sm font-medium text-zellige transition hover:text-zellige-deep">
              ← Back to options
            </button>
            <TrusteeAuthForm
              onLogin={(info) => {
                setLoginInfo(info);
                localStorage.setItem("trustee_token", info.token);
              }}
            />
          </div>
        )}

        {entryMode === "login" && loginInfo && (
          <div>
            <button onClick={resetView} className="mb-4 text-sm font-medium text-zellige transition hover:text-zellige-deep">
              ← Back to options
            </button>

            {loginInfo.status === "approved" && (
              <TrusteeDashboard
                walletAddress={loginInfo.walletAddress}
                orgName={loginInfo.orgName}
                token={loginInfo.token}
                allAssets={allAssets}
                fetchAssets={fetchAssets}
                loading={loading}
              />
            )}

            {loginInfo.status === "pending" && (
              <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm text-center">
                <KhatamStar className="mx-auto mb-4 h-10 w-10 text-zellige/40" />
                <p className="text-lg font-medium text-mihrab">Your application is under review.</p>
                <p className="mt-1 max-w-sm mx-auto text-sm text-ink-soft">
                  The platform admin is reviewing your trustee application. You will
                  be able to create waqf assets and manage funds once approved.
                </p>
              </div>
            )}

            {loginInfo.status === "rejected" && (
              <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm text-center">
                <KhatamStar className="mx-auto mb-4 h-10 w-10 text-red-300" />
                <p className="text-lg font-medium text-mihrab">Your application was not approved.</p>
                <p className="mt-1 max-w-sm mx-auto text-sm text-ink-soft">
                  The platform admin has rejected this trustee application.
                  Please contact the platform for more information.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════ CONNECT WALLET ══════════ */}
        {entryMode === "wallet" && (
          <div>
            <button onClick={resetView} className="mb-4 text-sm font-medium text-zellige transition hover:text-zellige-deep">
              ← Back to options
            </button>

            {/* Not connected yet */}
            {!address && (
              <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
                {!hasMetaMask ? (
                  <div>
                    <p className="text-sm font-medium text-mihrab">MetaMask not found</p>
                    <p className="mt-1 text-sm text-ink-soft">
                      Install the MetaMask browser extension to connect a wallet.
                      You can also register with email and password instead.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button onClick={handleConnect} disabled={connecting} className="btn-primary">
                      {connecting ? "Connecting..." : "Connect MetaMask"}
                    </button>
                    <p className="text-xs text-ink-soft">
                      Connect the wallet that manages your waqf projects.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Connected — checking status */}
            {address && checkingApproval && (
              <div className="rounded-2xl border border-ink/10 bg-white p-6 text-center shadow-sm">
                <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-mihrab/10 border-t-zellige" />
                <p className="text-sm text-ink-soft">Checking trustee status...</p>
              </div>
            )}

            {/* Connected — not registered at all → prompt to register */}
            {address && !checkingApproval && needsRegister && (
              <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm text-center">
                <KhatamStar className="mx-auto mb-4 h-10 w-10 text-zellige/40" />
                <p className="text-lg font-medium text-mihrab">
                  This wallet isn&apos;t registered yet.
                </p>
                <p className="mt-1 max-w-md mx-auto text-sm text-ink-soft">
                  To use this wallet as your trustee identity, register first. You
                  can use this same wallet address during registration.
                </p>
                <button
                  onClick={() => {
                    setEntryMode("register");
                    setRegType("wallet");
                    setNeedsRegister(false);
                  }}
                  className="btn-primary mt-4"
                >
                  Register with this wallet
                </button>
              </div>
            )}

            {/* Connected — registered but pending */}
            {address && !checkingApproval && !needsRegister && applicationStatus === "pending" && (
              <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm text-center">
                <KhatamStar className="mx-auto mb-4 h-10 w-10 text-zellige/40" />
                <p className="text-lg font-medium text-mihrab">
                  Your application is under review.
                </p>
                <p className="mt-1 max-w-sm mx-auto text-sm text-ink-soft">
                  The platform admin is reviewing your trustee application. You
                  will be able to create waqf assets and manage funds once
                  approved.
                </p>
              </div>
            )}

            {/* Connected — rejected */}
            {address && !checkingApproval && !needsRegister && applicationStatus === "rejected" && (
              <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm text-center">
                <KhatamStar className="mx-auto mb-4 h-10 w-10 text-red-300" />
                <p className="text-lg font-medium text-mihrab">
                  Your application was not approved.
                </p>
                <p className="mt-1 max-w-sm mx-auto text-sm text-ink-soft">
                  The platform admin has rejected this trustee application.
                  Please contact the platform for more information.
                </p>
              </div>
            )}

            {/* Connected — approved trustee dashboard */}
            {address && !checkingApproval && !needsRegister && isApproved && (
              <TrusteeDashboard
                walletAddress={address}
                orgName={null}
                token={null}
                allAssets={allAssets}
                fetchAssets={fetchAssets}
                loading={loading}
              />
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── Login form (email + password) ──────────────────────────────────────────────

function TrusteeAuthForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/trustee/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      localStorage.setItem("trustee_token", data.token);
      onLogin({ ...data.trustee, token: data.token });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-mihrab">Trustee login</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Sign in with your email and password to check your account status.
      </p>

      <form onSubmit={handleLogin} className="mt-4 space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            required
            className="field"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </section>
  );
}

// ─── Email registration form (auto-generated wallet) ────────────────────────────

function EmailRegisterForm({ onRegistered }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/trustee/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, orgName, description, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      setSuccess(
        "Registration successful! Your application is now pending admin approval. " +
          "You will be able to manage waqf funds once your account is approved."
      );
      setTimeout(() => onRegistered(), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-mihrab">
        Register with email
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        A new blockchain wallet will be generated for you automatically. Your
        application must be approved by the admin before you can create assets.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="reg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="reg-orgname" className="mb-1.5 block text-sm font-medium text-ink">
            Organization name
          </label>
          <input
            id="reg-orgname"
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. Al-Khidmat Foundation"
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="reg-description" className="mb-1.5 block text-sm font-medium text-ink">
            Organization description
          </label>
          <textarea
            id="reg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe your organization and its work..."
            className="field min-h-[80px]"
          />
        </div>

        <div>
          <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-ink">
            Contact phone
          </label>
          <input
            id="reg-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92-3XX-XXXXXXX"
            className="field"
          />
        </div>

        <p className="mt-1 text-xs text-ink-soft">
          You will log in with your email and password. A blockchain wallet will
          be created automatically for your account.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="flex items-start gap-2 rounded-lg bg-gilt-pale px-3 py-2 text-sm text-ink">
            <KhatamStar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gilt" />
            {success}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Registering..." : "Submit registration"}
        </button>
      </form>
    </section>
  );
}

// ─── Wallet registration form (user's own MetaMask address) ─────────────────────

function WalletRegisterForm({ onRegistered }) {
  const { address, connecting, connect, hasMetaMask } = useWallet();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!address) {
      setError("Please connect your MetaMask wallet first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/trustee/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          orgName,
          description,
          phone,
          walletAddress: address,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");

      setSuccess(
        "Registration successful! Your application is now pending admin approval. " +
          "Use the Connect Wallet option to manage assets once approved."
      );
      setTimeout(() => onRegistered(), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-mihrab">
        Register with your own wallet
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Connect your MetaMask wallet to use its address as your trustee identity.
        You keep full control of your private key.
      </p>

      {/* Wallet connection */}
      {!address ? (
        <div className="mt-4 rounded-xl border border-zellige/20 bg-zellige/5 p-4">
          {!hasMetaMask ? (
            <p className="text-sm text-ink-soft">
              MetaMask is not installed. Install the extension to use this option,
              or go back and register with email instead.
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button onClick={connect} disabled={connecting} className="btn-primary">
                {connecting ? "Connecting..." : "Connect MetaMask"}
              </button>
              <p className="text-xs text-ink-soft">
                Connect the wallet you want to use as your trustee identity.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-zellige/20 bg-zellige/5 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Connected wallet
          </p>
          <p className="mt-0.5 font-ledger text-sm text-ink">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label htmlFor="wreg-email" className="mb-1.5 block text-sm font-medium text-ink">
            Email address
          </label>
          <input
            id="wreg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="wreg-password" className="mb-1.5 block text-sm font-medium text-ink">
            Password
          </label>
          <input
            id="wreg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="wreg-orgname" className="mb-1.5 block text-sm font-medium text-ink">
            Organization name
          </label>
          <input
            id="wreg-orgname"
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. Al-Khidmat Foundation"
            required
            className="field"
          />
        </div>

        <div>
          <label htmlFor="wreg-description" className="mb-1.5 block text-sm font-medium text-ink">
            Organization description
          </label>
          <textarea
            id="wreg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe your organization and its work..."
            className="field min-h-[80px]"
          />
        </div>

        <div>
          <label htmlFor="wreg-phone" className="mb-1.5 block text-sm font-medium text-ink">
            Contact phone
          </label>
          <input
            id="wreg-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92-3XX-XXXXXXX"
            className="field"
          />
        </div>

        <p className="mt-1 text-xs text-ink-soft">
          Your MetaMask wallet address will be your trustee identity. You will log
          in with email and password. No private key is stored on the server.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="flex items-start gap-2 rounded-lg bg-gilt-pale px-3 py-2 text-sm text-ink">
            <KhatamStar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gilt" />
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !address}
          className="btn-primary disabled:opacity-50"
        >
          {submitting ? "Registering..." : "Submit registration"}
        </button>
      </form>
    </section>
  );
}

// ─── Trustee Dashboard (post-login or post-wallet-connect) ─────────────────────

function TrusteeDashboard({ walletAddress, orgName, token, allAssets, fetchAssets, loading }) {
  const trusteeAssets = allAssets.filter(
    (a) => a.trustee.toLowerCase() === walletAddress.toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Wallet info */}
      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              {orgName || "Trustee account"}
            </p>
            <p className="mt-0.5 font-ledger text-xs text-ink-soft">
              Platform wallet: {walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
            </p>
          </div>
          <button onClick={fetchAssets} className="btn-ghost">
            Refresh
          </button>
        </div>
      </div>

      <CreateAssetForm address={walletAddress} token={token} onCreated={fetchAssets} />

      {loading ? (
        <div className="py-16 text-center text-ink-soft">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-mihrab/10 border-t-zellige" />
          Loading assets...
        </div>
      ) : trusteeAssets.length === 0 ? (
        <div className="py-16 text-center">
          <KhatamStar className="mx-auto mb-4 h-10 w-10 text-mihrab/25" />
          <p className="text-lg font-medium text-mihrab">
            No assets to manage yet.
          </p>
          <p className="mt-1 max-w-sm mx-auto text-sm text-ink-soft">
            Use the form above to create your first waqf asset. It will appear
            in the donor portal right away.
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
              <TrusteeAssetCard asset={asset} token={token} onDisbursed={fetchAssets} />
            </div>
          ))}
        </div>
      )}
    </div>
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

function CreateAssetForm({ address, token, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [goalPKR, setGoalPKR] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  const goalETH = parseFloat(goalPKR) > 0 ? pkrToEth(parseFloat(goalPKR)) : "0";
  const goalPKRDisplay = parseFloat(goalPKR) > 0 ? Number(goalPKR).toLocaleString() : "0";

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
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/api/assets`, {
        method: "POST",
        headers,
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
                  (1 ETH = ₨{PKR_PER_ETH.toLocaleString()})
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

function TrusteeAssetCard({ asset, token, onDisbursed }) {
  const [disburseAmount, setDisburseAmount] = useState("");
  const [disbursePhone, setDisbursePhone] = useState("");
  const [disburseName, setDisburseName] = useState("");
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

    if (!disbursePhone || !disburseName || !disburseAmount || !disbursePurpose) {
      setError("All fields are required.");
      return;
    }

    const amount = parseFloat(disburseAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    // Convert PKR to ETH for the backend call
    const amountETH = pkrToEth(amount);

    setSubmitting(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_URL}/api/disbursements`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          assetId: asset.id,
          recipientPhone: disbursePhone,
          recipientName: disburseName,
          amountETH,
          purpose: disbursePurpose,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disbursement failed");

      const recipientInfo = data.recipient
        ? ` to ${data.recipient.name}`
        : "";
      setSuccess(
        `Sent ₨${Number(disburseAmount).toLocaleString()} for "${disbursePurpose}"${recipientInfo}.`
      );
      setDisburseAmount("");
      setDisbursePhone("");
      setDisburseName("");
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
            ₨{Number(ethToPkr(asset.totalDonatedETH)).toLocaleString()}{" "}
            <span className="text-sm font-sans text-porcelain/60">
              available
            </span>
          </p>
          <p className="font-ledger text-sm text-porcelain/60">
            goal ₨{Number(ethToPkr(asset.fundingGoalETH)).toLocaleString()}
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
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="tel"
              value={disbursePhone}
              onChange={(e) => setDisbursePhone(e.target.value)}
              placeholder="Recipient phone (e.g. 0321-1234567)"
              aria-label="Recipient phone number"
              className="field"
            />
            <input
              type="text"
              value={disburseName}
              onChange={(e) => setDisburseName(e.target.value)}
              placeholder="Recipient name (e.g. Al-Noor School)"
              aria-label="Recipient name"
              className="field"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="number"
              step="0.01"
              min="0"
              value={disburseAmount}
              onChange={(e) => setDisburseAmount(e.target.value)}
              placeholder="Amount (PKR)"
              aria-label="Amount in PKR"
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
                  <p className="text-xs text-ink-soft">
                    {d.recipientName ? (
                      <>
                        Paid to <span className="font-medium text-ink">{d.recipientName}</span>
                      </>
                    ) : (
                      <span className="font-ledger">
                        to {d.to.slice(0, 6)}...{d.to.slice(-4)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-ledger text-sm font-medium text-mihrab">
                    ₨{Number(ethToPkr(d.amountETH)).toLocaleString()}
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
