import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopBar } from "@/components/layout/TopBar";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "NexusWatch",
  description: "Sales tax nexus visibility from invoice activity.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen flex-col lg:flex-row">
          <AppSidebar />
          <div className="min-w-0 flex-1">
            <TopBar />
            <main className="px-5 py-7 lg:px-8 xl:px-10">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
