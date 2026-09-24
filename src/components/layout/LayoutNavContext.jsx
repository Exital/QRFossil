import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

const LayoutNavContext = createContext(null);

export function useLayoutNav() {
  const ctx = useContext(LayoutNavContext);
  if (!ctx) throw new Error("useLayoutNav must be used within LayoutNavProvider");
  return ctx;
}

export function LayoutNavProvider({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  const closeNav = useCallback(() => setNavOpen(false), []);
  const openNav = useCallback(() => setNavOpen(true), []);
  const toggleNav = useCallback(() => setNavOpen((v) => !v), []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  const value = useMemo(
    () => ({ navOpen, setNavOpen, openNav, closeNav, toggleNav }),
    [navOpen, openNav, closeNav, toggleNav]
  );

  return <LayoutNavContext.Provider value={value}>{children}</LayoutNavContext.Provider>;
}
