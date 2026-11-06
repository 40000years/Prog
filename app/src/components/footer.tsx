import Link from "next/link";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { GardenMark } from "./icons";

export function Footer() {
  return <footer className="site-footer">
    <div className="footer-top"><Link href="/" className="brand"><GardenMark/><span>EVERGARDEN<span className="brand-note">A WORLD WORTH EXPLORING.</span></span></Link><p>ทุกการผจญภัย เริ่มจากความสงสัยเล็ก ๆ<br/><span>คู่มือภาษาไทยสำหรับนักเดินทางทุกคน</span></p><Link href="/guide/getting-started/world" className="text-link">ออกเดินทางด้วยกัน <ArrowUpRight size={18}/></Link></div>
    <div className="footer-wordmark" aria-hidden="true">EVERGARDEN<span>✦</span></div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} EVERGARDEN WIKI</span><span>CRAFTED FOR THE CURIOUS.</span><a href="#top">กลับขึ้นด้านบน <ArrowUp size={12}/></a></div>
  </footer>;
}
