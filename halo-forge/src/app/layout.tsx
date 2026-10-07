import type { Metadata } from "next";
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
import "./research-identity.css";
import "./lab.css";

export const metadata: Metadata = {
  title: "Halo Forge · Cryptography research",
  description:
    "Launch a research agent. Follow the evidence. Improve Zcash proving performance.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
