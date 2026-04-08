"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { api } from "@/lib/api";

interface FeaturesContextType {
  features: Record<string, boolean>;
  isEnabled: (key: string) => boolean;
  reload: () => void;
}

const FeaturesContext = createContext<FeaturesContextType>({
  features: {},
  isEnabled: () => true,
  reload: () => {},
});

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (!token) return;
    api.get<Record<string, boolean>>("/admin/features")
      .then(setFeatures)
      .catch(() => {}); // silently fail — defaults to all enabled
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch when localStorage token changes (i.e. after login)
  useEffect(() => {
    const handler = () => load();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [load]);

  const isEnabled = (key: string) => features[key] !== false; // default: enabled

  return (
    <FeaturesContext.Provider value={{ features, isEnabled, reload: load }}>
      {children}
    </FeaturesContext.Provider>
  );
}

export const useFeatures = () => useContext(FeaturesContext);
