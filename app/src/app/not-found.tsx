import Link from "next/link";
import { CompassMark } from "@/components/icons";
export default function NotFound() { return <main id="content" className="not-found"><CompassMark/><span className="section-kicker">ไม่พบหน้า / 404</span><h1>ไม่พบ<em>หน้านี้</em></h1><p>ไม่พบหน้าที่คุณต้องการ อาจมีการย้ายหรือลบหน้านี้แล้ว</p><Link href="/" className="button button-lime">กลับหน้าแรก ↗</Link></main>; }
