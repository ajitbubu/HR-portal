"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type BannerType = "info" | "warning" | "critical" | "success";

interface BannerState {
  enabled: boolean;
  type: BannerType;
  message: string;
  dismissed: boolean;
  bannerHeight: number; // 40 when visible, 0 otherwise
  dismiss: () => void;
}

const BannerContext = createContext<BannerState>({
  enabled: false,
  type: "info",
  message: "",
  dismissed: false,
  bannerHeight: 0,
  dismiss: () => {},
});

export function BannerProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [type, setType] = useState<BannerType>("info");
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/admin/banner`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => {
        setEnabled(d.enabled ?? false);
        setType(d.type ?? "info");
        setMessage(d.message ?? "");
      })
      .catch(() => {}); // silent failure — banner stays disabled
  }, []);

  const bannerHeight = enabled && !dismissed && message.trim() !== "" ? 40 : 0;

  // Keep --banner-h CSS variable on <html> in sync so Sidebar/Header can reference it
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--banner-h", `${bannerHeight}px`);
    }
  }, [bannerHeight]);

  return (
    <BannerContext.Provider
      value={{
        enabled,
        type,
        message,
        dismissed,
        bannerHeight,
        dismiss: () => setDismissed(true),
      }}
    >
      {children}
    </BannerContext.Provider>
  );
}

export function useBanner() {
  return useContext(BannerContext);
}
