import type { Metadata } from "next";
import { TierList } from "@/components/tier-list";
import "./tierlist.css";

export const metadata: Metadata = {
  title: "จัด Tier List",
  description: "จัดอันดับบอส สัตว์เลี้ยง และไอเท็ม Evergarden ในแบบของคุณ",
};

export default function Page() {
  return <TierList />;
}
