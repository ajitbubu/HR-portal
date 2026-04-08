"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import type { User, TokenResponse } from "@/types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
  isRole: () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.get<User>("/auth/me")
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("access_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<TokenResponse>("/auth/login", { email, password });
    localStorage.setItem("access_token", res.access_token);
    // Set a non-sensitive role cookie for middleware-based route protection
    document.cookie = `user_role=${res.role}; path=/; max-age=86400; SameSite=Lax`;
    setUser({
      id: res.user_id,
      email,
      role: res.role,
      is_active: true,
      employee_id: res.employee_id,
      name: res.name,
    });
    router.push("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    // Clear the role cookie
    document.cookie = "user_role=; path=/; max-age=0";
    setUser(null);
    router.push("/login");
  };

  const isRole = (...roles: string[]) => !!user && roles.includes(user.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
