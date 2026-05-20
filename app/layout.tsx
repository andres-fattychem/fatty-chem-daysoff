import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fatty Chem · Days Off Planner",
  description: "Internal scheduling tool for employee time off",
  icons: {
    icon: [{ url: "/fatty-chem-mark-orange.png", type: "image/png" }],
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
