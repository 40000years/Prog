import Link from "next/link";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { GardenMark } from "./icons";

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-top"><Link href="/" className="brand"><GardenMark/><span>EVERGARDEN<span className="brand-note">คู่มือสำหรับผู้เล่น</span></span></Link><p>ข้อมูลและคู่มือการเล่น Evergarden<br/><span>อ่านเรื่องบอส เวทมนตร์ สัตว์เลี้ยง และ Forge</span></p><Link href="/guide/getting-started/world" className="text-link">เริ่มต้นเล่น <ArrowUpRight size={18}/></Link></div>
    <div className="footer-wordmark" aria-hidden="true">EVERGARDEN<span>✦</span></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} EVERGARDEN WIKI</span><span>คู่มือภาษาไทย</span><a href="#top">กลับขึ้นด้านบน <ArrowUp size={12}/></a></div>
  </footer>;
}
