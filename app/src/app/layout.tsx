import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MotionProvider } from "@/components/motion-provider";
import { articles } from "@/lib/wiki";
import "./fonts.css";
import "./globals.css";
import "./cinematic.css";
import "./field-pages.css";
import "./game-library.css";

export const metadata: Metadata = {
  title: { default: "Evergarden Wiki — คู่มือภาษาไทย", template: "%s | Evergarden Wiki" },
  description: `คู่มือ Evergarden ภาษาไทย สำรวจโลกเกาะลอยฟ้า บอส เวทมนตร์ สัตว์เลี้ยง 32 ชนิด และระบบ Forge พร้อมบทความ ${articles.length} หน้า`,
  metadataBase: new URL("https://www.bowrxn.com"),
  openGraph: { title: "Evergarden Wiki — คู่มือภาษาไทย", description: "คู่มือบอส เวทมนตร์ สัตว์เลี้ยง และ Forge สำหรับผู้เล่น Evergarden", images: ["/images/evergarden-hero.webp"], locale: "th_TH", type: "website" },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body id="top"><a href="#content" className="skip-link">ข้ามไปเนื้อหา</a><Header/><MotionProvider>{children}</MotionProvider><Footer/></body></html>;
}
