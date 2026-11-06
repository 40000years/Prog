import Link from "next/link";
import { CompassMark } from "@/components/icons";
export default function NotFound() { return <main id="content" className="not-found"><CompassMark/><span className="section-kicker">FIELD NOTE / 404</span><h1>A little <em>lost?</em></h1><p>เส้นทางนี้ยังไม่มีในแผนที่ กลับไปเริ่มการผจญภัยกันอีกครั้ง</p><Link href="/" className="button button-lime">กลับหน้าสำรวจ ↗</Link></main>; }
