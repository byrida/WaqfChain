import { createContext, useContext, useEffect, useState } from "react";

/**
 * Role mode context for WaqfChain's role-based navigation.
 *
 * - null  : user is on the homepage / hasn't picked a role
 * - "donor"    : user clicked "Continue as Donor"
 * - "trustee"  : user clicked "Continue as Trustee / Login"
 *
 * The mode is stored in sessionStorage so navigating between pages
 * within a role doesn't reset it. Returning to the homepage clears it.
 */

const STORAGE_KEY = "waqfchain_role_mode";

const RoleModeContext = createContext({
  roleMode: null,
  setRoleMode: () => {},
});

export function RoleModeProvider({ children }) {
  const [roleMode, setRoleModeState] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  // Read from sessionStorage on mount (client-side only)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "donor" || stored === "trustee") {
        setRoleModeState(stored);
      }
    } catch {
      // sessionStorage may be disabled in some browsers — ignore
    }
    setHydrated(true);
  }, []);

  const setRoleMode = (mode) => {
    if (mode !== null && mode !== "donor" && mode !== "trustee") return;
    setRoleModeState(mode);
    try {
      if (mode === null) {
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, mode);
      }
    } catch {
      // ignore storage errors
    }
  };

  // Avoid rendering mismatched nav during hydration
  if (!hydrated) {
    return (
      <RoleModeContext.Provider value={{ roleMode: null, setRoleMode }}>
        {children}
      </RoleModeContext.Provider>
    );
  }

  return (
    <RoleModeContext.Provider value={{ roleMode, setRoleMode }}>
      {children}
    </RoleModeContext.Provider>
  );
}

export function useRoleMode() {
  const ctx = useContext(RoleModeContext);
  if (!ctx) {
    throw new Error("useRoleMode must be used inside a RoleModeProvider");
  }
  return ctx;
}
