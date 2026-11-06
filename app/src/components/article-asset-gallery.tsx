import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {gameItems} from "@/lib/game-assets";
import {GameTexture} from "./game-texture";
export function ArticleAssetGallery({path}:{path:string}){
 const items=gameItems.filter(i=>path==="magic/staffs"?i.category==="staff":path==="magic/mana"?i.id.startsWith("mana-potion-"):false);
 if(!items.length)return null;
 return <aside className="article-asset-gallery"><div><span>ภาพไอเท็มจาก resource pack</span><Link href={`/items?category=${path==="magic/staffs"?"staff":"supplies"}`}>เปิดคอลเลกชัน <ArrowUpRight size={12}/></Link></div><div>{items.map(i=><Link key={i.id} href={`/items?category=${i.category}`}><GameTexture texture={i.texture} alt={i.thai}/><span>{i.thai}</span></Link>)}</div></aside>;
}
