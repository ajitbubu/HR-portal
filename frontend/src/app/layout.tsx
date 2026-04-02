import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "DataSafeguard HR Portal",
  description: "DataSafeguard HR Portal - Enterprise Human Resources Management Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
