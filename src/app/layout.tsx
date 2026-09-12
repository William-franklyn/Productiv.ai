import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ProductivAI",
    template: "%s | ProductivAI",
  },
  description:
    "ProductivAI — ask questions across your team's knowledge and get cited answers, with an assistant that can act on them.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
