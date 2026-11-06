import { wiki, type Block } from "./wiki";

export const habitats = [
  {id:"garden",name:"สวน Evergarden",short:"สวน",color:"#d4b4dc"},
  {id:"glacier",name:"เทือกเขาธารน้ำแข็ง",short:"ธารน้ำแข็ง",color:"#a0d4e7"},
  {id:"forest",name:"ป่าโบราณ",short:"ป่าโบราณ",color:"#afd398"},
  {id:"lunar",name:"นครจันทราที่สาบสูญ",short:"นครจันทรา",color:"#bfadf1"},
];
function rows(path:string,predicate:(block:Block)=>boolean) {
  return (wiki.pages[path].blocks.find(predicate)?.rows || []) as string[][];
}
const wild = rows("pets/wild",b=>b.type==="table" && b.rows?.length===32);
const food = new Map(rows("pets/taming",b=>b.type==="table" && b.rows?.length===32).map(row=>[row[0],row[1]]));
const skills = new Map(rows("pets/skills",b=>b.type==="table" && b.rows?.length===37).map(row=>[row[0],{passive:row[1],combat:row[2]}]));
const airborne = new Set(["Frost Wyvern","Astral Owl","Blood Gargoyle","Abyssal Manta","Chrono Fairy","Clover Bumble","Titan Beetle","Bone Drake","Jade Lung","Luna Moth","Celestial Koi","Aurora Jelly"]);
export const companions = wild.map(([name,thai,region],index)=>({
  id:name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""),name,thai,region,index,
  habitats:habitats.filter(h=>region.includes(h.short)).map(h=>h.id),
  food:food.get(name) || "ดูคู่มือการเทม",passive:skills.get(name)?.passive || "",combat:skills.get(name)?.combat || "",
  flying:airborne.has(name),sheet:index<16?1:2,column:index%4,row:Math.floor((index%16)/4),
  color:["#cbb8ed","#a0d5e8","#e5dbaf","#e6a28b","#b7afe7","#dda7bb","#a1d6d0","#bad994"][index%8],
}));
export type Companion = typeof companions[number];
export const legendaryCompanions = rows("pets/wild",b=>b.type==="table" && b.rows?.length===5).map(row=>({name:row[0],thai:row[1],habitat:row[2],condition:row[3]}));

export const lifeStages = [
  {name:"ร่างเด็ก",en:"BABY",threshold:0,hp:12,bite:2},
  {name:"ร่างกลาง",en:"JUVENILE",threshold:120,hp:24,bite:4},
  {name:"โตเต็มวัย",en:"ADULT",threshold:360,hp:40,bite:6},
];
