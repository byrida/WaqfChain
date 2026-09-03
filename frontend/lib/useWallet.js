import { useState, useEffect } from "react";

/**
 * Hook for MetaMask wallet connection.
 * Returns { address, connecting, connect, hasMetaMask }
 */
export default function useWallet() {
  const [address, setAddress] = useState(null);
  const [connecting, setConnecting] = useState(false);

  const hasMetaMask = typeof window !== "undefined" && window.ethereum;

  useEffect(() => {
    if (!hasMetaMask) return;

    // Check if already connected
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
        }
      })
      .catch(() => {});

    // Listen for account changes
    const handler = (accounts) => {
      setAddress(accounts[0] || null);
    };
    window.ethereum.on("accountsChanged", handler);
    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener("accountsChanged", handler);
      }
    };
  }, [hasMetaMask]);

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
