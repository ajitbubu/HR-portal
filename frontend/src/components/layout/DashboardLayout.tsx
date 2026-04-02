"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { SidebarProvider, useSidebar } from "./SidebarContext";

function Layout({ children, title }: { children: React.ReactNode; title: string }) {
  const { user, loading } = useAuth();
  const { collapsed } = useSidebar();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      {/* Mobile: no left margin. Desktop: margin matches sidebar width */}
      <div className={`transition-all duration-300 ${collapsed ? "md:ml-16" : "md:ml-60"}`}>
        <Header title={title} />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
  title = "Dashboard",
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <SidebarProvider>
      <Layout title={title}>{children}</Layout>
    </SidebarProvider>
  );
}
