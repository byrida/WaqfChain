import { useState, useEffect } from "react";

/**
 * Hook for MetaMask wallet connection.
 * Returns { address, connecting, connect, hasMetaMask }
 *
 * @param {Object} [options]
 * @param {boolean} [options.autoConnect=false] — if true, silently reads the
 *   already-connected MetaMask account on mount (used by the admin panel).
 *   If false (default), the address is only set when the user explicitly
 *   calls connect() — keeps the trustee portal landing clean.
 */
export default function useWallet({ autoConnect = false } = {}) {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const hasMetaMask = typeof window !== "undefined" && window.ethereum;

  useEffect(() => {
    if (!hasMetaMask) return;

    // Only auto-detect already-connected accounts when autoConnect is true.
    // This keeps the trustee portal landing clean (no auto-popup).
    if (autoConnect) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((accounts) => {
          if (accounts.length > 0) {
            setAddress(accounts[0]);
          }
        })
        .catch(() => {});
    }

    // After first connect, listen for account switches
    const handler = (accounts) => {
      setAddress(accounts[0] || null);
    };
    window.ethereum.on("accountsChanged", handler);
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handler);
      }
    };
  }, [hasMetaMask, autoConnect]);

  async function connect() {
    if (!hasMetaMask) return;
    setConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setAddress(accounts[0]);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    } finally {
      setConnecting(false);
    }
  }

  return { address, connecting, connect, hasMetaMask };
}
