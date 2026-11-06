import imported from "../../content/wiki.json";

export interface WikiItem { title?: string; text?: string; to?: string; src?: string; alt?: string; caption?: string; width?: number; height?: number; }
export interface Column { label: string; unit?: string; num?: boolean; }
export interface Command { cmd: string; desc: string; note?: string; }
export interface Block {
  type: string; text?: string; title?: string; variant?: string; caption?: string;
  note?: string; src?: string; alt?: string; width?: number; height?: number;
  outer?: number[]; ordered?: boolean; items?: (string | WikiItem)[];
  columns?: (string | Column)[]; rows?: (string[] | Command)[];
}
export interface Article { title: string; lead?: string; blocks: Block[]; source?: { label: string; href?: string; updated: string }; }
export interface Group { id: string; title: string; pages: { id: string; title: string; status?: string }[]; }
interface WikiData { source: string; site: { title: string; meta: { versions: { name: string; version: string }[]; updated: string }; groups: Group[] }; pages: Record<string, Article>; }

export const wiki = imported as unknown as WikiData;
export const groups = wiki.site.groups;
export const articles = groups.flatMap(group => group.pages.map(page => ({
  path: `${group.id}/${page.id}`, shortTitle: page.title, group: group.id,
  groupTitle: group.title, ...wiki.pages[`${group.id}/${page.id}`],
})));
export const articleHref = (path: string) => `/guide/${path}`;
export const normalizeHref = (href: string) => href.startsWith("#/") ? (href === "#/" ? "/" : articleHref(href.slice(2))) : href;

export interface Boss {
  id: string; name: string; subtitle: string; image: string;
  family: "world" | "rivers" | "realm"; label: string; color: string;
}
export const bosses: Boss[] = [
  { id: "seraphon", name: "Seraphon", subtitle: "มหาเทวีบัญชาสวรรค์", image: "seraphon", family: "world", label: "WORLD BOSS", color: "#d9c68d" },
  { id: "arkhaia", name: "Arkhaia", subtitle: "ราชันย์กุหลาบทมิฬ", image: "arkhaia", family: "world", label: "WORLD BOSS", color: "#cc7e87" },
  { id: "ancient-judge", name: "Ancient Judge", subtitle: "ผู้พิพากษาไร้ร่าง", image: "bodiless-judge", family: "world", label: "WORLD BOSS", color: "#c9b9a2" },
  { id: "acheron", name: "Acheron", subtitle: "วิญญาณแห่งสายน้ำ", image: "acheron", family: "rivers", label: "SIX RIVERS", color: "#df8e84" },
  { id: "phlegethon", name: "Phlegethon", subtitle: "วิญญาณแห่งสายน้ำ", image: "phlegethon", family: "rivers", label: "SIX RIVERS", color: "#e4a76e" },
  { id: "cocytus", name: "Cocytus", subtitle: "วิญญาณแห่งสายน้ำ", image: "cocytus", family: "rivers", label: "SIX RIVERS", color: "#a3c6ac" },
  { id: "banshee", name: "Banshee Wail", subtitle: "วิญญาณแห่งสายน้ำ", image: "banshee-wail", family: "rivers", label: "SIX RIVERS", color: "#a5bb9a" },
  { id: "malefeasance", name: "Malefeasance", subtitle: "วิญญาณแห่งสายน้ำ", image: "malefeasance-phase1", family: "rivers", label: "SIX RIVERS", color: "#b5a4ce" },
  { id: "styx", name: "Styx", subtitle: "วิญญาณแห่งสายน้ำ", image: "the-styx", family: "rivers", label: "SIX RIVERS", color: "#c4978c" },
  { id: "cinder-colossus", name: "Cinder Colossus", subtitle: "บอสมิติ", image: "cinder-colossus", family: "realm", label: "REALM BOSS", color: "#dca16b" },
  { id: "soul-hound", name: "Soul-Eater Hound", subtitle: "บอสมิติ", image: "soul-eater-hound", family: "realm", label: "REALM BOSS", color: "#b9b5d9" },
  { id: "crystal-moth", name: "Crystal Moth Queen", subtitle: "บอสมิติ", image: "crystal-moth-queen", family: "realm", label: "REALM BOSS", color: "#bea2de" },
  { id: "unlit-sun", name: "Unlit Sun", subtitle: "บอสมิติ", image: "unlit-sun", family: "realm", label: "REALM BOSS", color: "#d9c789" },
];

export const elements = [
  { id: "fire", name: "ไฟ", english: "Fire", color: "#efa47c", symbol: "✦", count: 10 },
  { id: "water", name: "น้ำ", english: "Water", color: "#80bcdf", symbol: "◈", count: 10 },
  { id: "ice", name: "น้ำแข็ง", english: "Ice", color: "#b0dcdf", symbol: "❄", count: 7 },
  { id: "wind", name: "ลม", english: "Wind", color: "#bed7ad", symbol: "≋", count: 7 },
  { id: "earth", name: "ดิน", english: "Earth", color: "#c6b491", symbol: "⬡", count: 8 },
  { id: "lightning", name: "สายฟ้า", english: "Lightning", color: "#d8c990", symbol: "ϟ", count: 6 },
  { id: "light", name: "แสง", english: "Light", color: "#e9dfae", symbol: "☼", count: 5 },
  { id: "dark", name: "มืด", english: "Dark", color: "#bba6cf", symbol: "☾", count: 5 },
];
