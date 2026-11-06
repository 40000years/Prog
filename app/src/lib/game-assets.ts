import data from "../../content/game-assets.json";
export const gameSource=data.source;
export const gameItems=data.items;
export const spells=data.spells;
export const elementIcons=data.elementIcons;
export type GameItem=typeof gameItems[number];
export type Spell=typeof spells[number];
export const staffFor=(element:string)=>gameItems.find(item=>item.id===`staff-${element}`)!;
export const itemCategories=[
  {id:"staff",name:"คทา",en:"STAFFS"},
  {id:"legendary",name:"อาวุธตำนาน",en:"LEGENDARY WEAPONS"},
  {id:"adventurer",name:"อาวุธนักผจญภัย",en:"ADVENTURER WEAPONS"},
  {id:"armor",name:"ชุดเกราะ",en:"ARMOR"},
  {id:"drops",name:"วัตถุดิบ / ดรอป",en:"MATERIALS & DROPS"},
  {id:"supplies",name:"ของใช้ / คัมภีร์",en:"SUPPLIES"},
];
