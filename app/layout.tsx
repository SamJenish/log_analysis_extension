import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Log Failure Analyzer",
  description: "AI-assisted deployment diagnostics for CI/CD and container logs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
