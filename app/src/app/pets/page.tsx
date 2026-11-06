import type {Metadata} from "next";
import {CompanionsPage} from "@/components/companions-page";
export const metadata:Metadata={title:"สัตว์เลี้ยง — The Companion Collection",description:"สำรวจสัตว์เลี้ยง Evergarden ทั้ง 32 ชนิด ดูภาพ อาหารที่ชอบ ถิ่นอาศัย สกิล และการเติบโต 3 วัย พร้อมตัวกรองและลิสต์ส่วนตัว"};
export default function Page(){return <CompanionsPage/>;}
