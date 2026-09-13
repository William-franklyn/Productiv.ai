import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "iRABU",
    template: "%s | iRABU",
  },
  description:
    "iRABU — ask questions across your team's knowledge and get cited answers, with an assistant that can act on them.",
};

// Light is the unconditional default, matching getirabu.com and irabu.ai —
// NOT whatever the visitor's OS happens to prefer. Reading the OS here meant
// a system-dark browser's first-ever visit rendered dark before anyone had
// actually chosen it. Dark now only applies through an explicit stored choice.
const themeInit = `
(function () {
  try {
    var stored = localStorage.getItem("irabu-theme");
    document.documentElement.setAttribute("data-theme", stored === "dark" ? "dark" : "light");
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
