import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { FeaturesProvider } from "@/contexts/FeaturesContext";
import { BannerProvider } from "@/contexts/BannerContext";
import AnnouncementBanner from "@/components/layout/AnnouncementBanner";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "DataSafeguard HR Portal",
  description: "DataSafeguard HR Portal - Enterprise Human Resources Management Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <FeaturesProvider>
            <BannerProvider>
              <AnnouncementBanner />
              {children}
            </BannerProvider>
          </FeaturesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
