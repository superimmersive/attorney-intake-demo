import type { Metadata } from "next";
import { Playfair_Display, Work_Sans } from "next/font/google";
import "./globals.css";

const sans = Work_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
const serif = Playfair_Display({
  subsets: ["latin"],
  weight: "500",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "New matter enquiry | Odendaal & Co. Attorneys Inc",
  description: "Tell us about your matter. An attorney will review it and contact you.",
  robots: { index: false, follow: false },
};

export const viewport = { themeColor: "#100c0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
