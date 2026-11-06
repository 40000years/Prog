import defaults from "../../content/forge.json";
export const forgeSource=defaults.source;
export type GemGear="weapon"|"bow"|"armor"|"shield"|"tool"|"staff";
export const gemEffects:Record<string,Record<GemGear,{stat:string;base:number;percent:boolean}>>=defaults.effects;
export const upgradeCosts=defaults.upgrade;
export const forgeGrades = [
  {id:"common",name:"Worn",en:"เดิม: ธรรมดา",color:"#b8b5ad",material:"เศษเหล็กหลอม",slots:"0 ช่อง",guaranteed:0,possible:0,materials:2,levels:3},
  {id:"good",name:"Tempered",en:"เดิม: ดี",color:"#86ce94",material:"ผลึกใบหยก",slots:"0–1 ช่อง",guaranteed:0,possible:1,materials:2,levels:6},
  {id:"rare",name:"Arcane",en:"เดิม: หายาก",color:"#81bff3",material:"ชิ้นคริสตัลคราม",slots:"1 ช่อง",guaranteed:1,possible:0,materials:3,levels:10},
  {id:"epic",name:"Exalted",en:"เดิม: มหากาพย์",color:"#c5a0ef",material:"เกล็ดอาคมม่วง",slots:"1–2 ช่อง",guaranteed:1,possible:1,materials:3,levels:15},
  {id:"legendary",name:"Divine",en:"เดิม: ปรัมปรา",color:"#f7b163",material:"อำพันหลอมเทพ",slots:"2–3 ช่อง",guaranteed:2,possible:1,materials:4,levels:25},
];
export const forgeGems = [
  {id:"fire",name:"เพลิง",color:"#fa9b65",symbol:"✦"},
  {id:"water",name:"วารี",color:"#87c9f4",symbol:"◈"},
  {id:"wind",name:"วายุ",color:"#a2dad3",symbol:"≋"},
  {id:"earth",name:"ปฐพี",color:"#dcb785",symbol:"⬡"},
  {id:"lightning",name:"อสนี",color:"#f3d272",symbol:"ϟ"},
  {id:"light",name:"รัศมี",color:"#f0dfab",symbol:"☼"},
  {id:"dark",name:"ราตรี",color:"#bf9eec",symbol:"☾"},
  {id:"life",name:"ชีวา",color:"#a9d679",symbol:"❧"},
];
export const gemTiers = [
  {number:1,roman:"I",name:"แตกร้าว",multiplier:1},
  {number:2,roman:"II",name:"หยาบ",multiplier:1.5},
  {number:3,roman:"III",name:"เจียระไน",multiplier:2.1},
  {number:4,roman:"IV",name:"ไร้ตำหนิ",multiplier:2.8},
  {number:5,roman:"V",name:"สมบูรณ์แบบ",multiplier:3.6},
];
export const reforgeExamples = [
  {name:"คมกริบ แห่งความว่องไว",stats:["+1.6 ดาเมจโจมตี (45%)","+9% ความเร็วโจมตี (50%)","+3.6% ความเร็วเคลื่อนที่ (40%)"],crystals:3,levels:10},
  {name:"กวาดล้าง แห่งชีวิต",stats:["+32% ดาเมจกวาด (55%)","+1.2 พลังชีวิตสูงสุด (35%)","+1.1 โชค (40%)"],crystals:6,levels:20},
  {name:"หนักหน่วง แห่งความคม",stats:["+0.7 แรงกระแทก (60%)","+1.9 ดาเมจโจมตี (56%)","+1.5 พลังชีวิตสูงสุด (48%)"],crystals:9,levels:30},
];
