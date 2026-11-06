const regions={sword:{x:65,y:321,label:"ดาบ"},bow:{x:235,y:321,label:"ธนู"},shield:{x:405,y:321,label:"โล่"},armor:{x:575,y:321,label:"ชุดเกราะ"}};
export type ForgeEquipment=keyof typeof regions;
/** SVG viewport reveals an original icon without changing the source poster. */
export function ForgeIcon({type}:{type:ForgeEquipment}){const region=regions[type];return <svg className="forge-source-icon" viewBox={`${region.x} ${region.y} 148 148`} role="img" aria-label={region.label}><image href="/images/forge/forge-guide.webp" width="1600" height="4915"/></svg>;}
