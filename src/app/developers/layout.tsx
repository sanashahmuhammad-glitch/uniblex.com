import type { Metadata } from "next";
import { DeveloperFooter, DeveloperHeader } from "@/components/developers/DeveloperHeader";

export const metadata: Metadata = {
  title: { default: "Uniblex Developer Portal", template: "%s | Uniblex Developers" },
  description: "Build, validate, submit, and manage browser games for Uniblex.",
  metadataBase: new URL("https://www.uniblex.com"),
  openGraph: { title: "Uniblex Developer Portal", description: "Professional browser-game publishing tools and documentation.", type: "website", url: "/developers", images: ["/og-image.png"] }
};

export default function DeveloperLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-[#0D1118] text-white"><DeveloperHeader />{children}<DeveloperFooter /></div>;
}
