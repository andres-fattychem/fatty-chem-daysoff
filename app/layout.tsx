import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fatty Chem · Days Off Planner",
  description: "Internal scheduling tool for employee time off",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
