"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Check, Download, GripVertical, Layers3, RotateCcw, Search, Sparkles, X } from "lucide-react";
import { bosses } from "@/lib/wiki";
import { companions, type Companion } from "@/lib/companions";
import { gameItems, itemCategories, type GameItem } from "@/lib/game-assets";
import { GameTexture } from "./game-texture";
import { PetPortrait } from "./pet-portrait";

type Category = "bosses" | "pets" | "items";
type Tier = "S" | "A" | "B" | "C" | "D";
type Board = Record<Tier, string[]>;
type Boards = Record<Category, Board>;
type Entry = {
  id: string; name: string; detail: string; image: string;
  kind: Category; pet?: Companion; item?: GameItem;
};
const TIERS: Tier[] = ["S", "A", "B", "C", "D"];
const COLORS: Record<Tier, string> = { S: "#e6a393", A: "#e8bd86", B: "#decf91", C: "#a8caa4", D: "#a2bed4" };
const EMPTY = (): Board => ({ S: [], A: [], B: [], C: [], D: [] });
const emptyBoards = (): Boards => ({ bosses: EMPTY(), pets: EMPTY(), items: EMPTY() });
const storageKey = "evergarden-tierlist-v1";
const entries: Record<Category, Entry[]> = {
  bosses: bosses.map(b => ({ id: b.id, name: b.name, detail: b.subtitle, image: `/images/bosses/${b.image}.webp`, kind: "bosses" })),
  pets: companions.map(p => ({ id: p.id, name: p.name, detail: p.thai, image: `/images/companions/pets-${p.sheet}.webp`, kind: "pets", pet: p })),
  items: gameItems.map(i => ({ id: i.id, name: i.name, detail: i.thai || itemCategories.find(c => c.id === i.category)?.name || "ไอเท็ม", image: i.texture.src, kind: "items", item: i })),
};
const categories: { id: Category; label: string; description: string; note: string }[] = [
  { id: "bosses", label: "บอส", description: "จัดอันดับบอสที่คุณชอบ หรือจัดตามความยากที่เคยเจอ", note: "มีบอส 13 ตัวที่มีภาพใน wiki ยังไม่รวมบอส Vault" },
  { id: "pets", label: "สัตว์เลี้ยง", description: "เลือกคู่หูที่ชอบ แล้วจัดอันดับในแบบของคุณ", note: "มีสัตว์เลี้ยงทั่วไป 32 ชนิด ยังไม่รวมสัตว์ตำนาน" },
  { id: "items", label: "ไอเท็ม", description: "จัดอันดับคทา อาวุธ ชุดเกราะ และไอเท็มที่มีในคลัง", note: "แสดงไอเท็ม 65 ชนิดตามข้อมูลที่มีใน wiki" },
];

function restoreBoards(value: unknown): Boards {
  const result = emptyBoards();
  if (!value || typeof value !== "object") return result;
  for (const { id } of categories) {
    const group = (value as Record<string, unknown>)[id];
    if (!group || typeof group !== "object") continue;
    const allowed = new Set(entries[id].map(e => e.id));
    const seen = new Set<string>();
    for (const tier of TIERS) {
      const raw = (group as Record<string, unknown>)[tier];
      if (!Array.isArray(raw)) continue;
      result[id][tier] = raw.filter((x): x is string => {
        if (typeof x !== "string" || !allowed.has(x) || seen.has(x)) return false;
        seen.add(x); return true;
      });
    }
  }
  return result;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("โหลดภาพไม่สำเร็จ"));
    img.src = src;
  });
}

async function downloadBoard(category: Category, board: Board) {
  const categoryInfo = categories.find(c => c.id === category)!;
  const lookup = new Map(entries[category].map(e => [e.id, e]));
  const allIds = TIERS.flatMap(t => board[t]);
  const selected = allIds.map(id => lookup.get(id)).filter((e): e is Entry => !!e);
  const images = new Map<string, HTMLImageElement>();
  await Promise.all([...new Set(selected.map(e => e.image))].map(async src => images.set(src, await loadImage(src))));
  await document.fonts.ready;
  const width = 1400, margin = 62, left = 124, columns = 10, cellW = 114, cellH = 130;
  const heights = TIERS.map(t => Math.max(145, Math.ceil(board[t].length / columns) * cellH + 22));
  const height = 190 + heights.reduce((sum, h) => sum + h, 0) + 65;
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("ไม่สามารถสร้างภาพได้");
  ctx.fillStyle = "#101b15"; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#c7df9b"; ctx.font = "600 18px 'IBM Plex Sans Thai', sans-serif"; ctx.fillText("EVERGARDEN WIKI  /  TIER LIST", margin, 65);
  ctx.fillStyle = "#f2f0dc"; ctx.font = "600 40px 'IBM Plex Sans Thai', sans-serif"; ctx.fillText(`จัดอันดับ${categoryInfo.label}`, margin, 123);
  ctx.fillStyle = "#9ba997"; ctx.font = "18px 'IBM Plex Sans Thai', sans-serif"; ctx.fillText("จัดอันดับโดยผู้เล่น · ไม่ใช่การจัดอันดับทางการ", margin, 160);
  let y = 190;
  for (let t = 0; t < TIERS.length; t++) {
    const tier = TIERS[t], rowH = heights[t];
    ctx.fillStyle = "#1a2a20"; ctx.fillRect(margin, y, width - margin * 2, rowH - 5);
    ctx.fillStyle = COLORS[tier]; ctx.fillRect(margin, y, left, rowH - 5);
    ctx.fillStyle = "#152119"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "700 50px Archivo, sans-serif"; ctx.fillText(tier, margin + left / 2, y + (rowH - 5) / 2);
    board[tier].forEach((id, index) => {
      const entry = lookup.get(id); if (!entry) return;
      const image = images.get(entry.image); if (!image) return;
      const x = margin + left + 10 + (index % columns) * cellW, cy = y + 12 + Math.floor(index / columns) * cellH;
      ctx.fillStyle = "#24382b"; ctx.fillRect(x, cy, 104, 102);
      ctx.save(); ctx.beginPath(); ctx.rect(x + 2, cy + 2, 100, 75); ctx.clip();
      if (entry.pet) {
        const pet = entry.pet, sx = 64 + pet.column * 374, sy = 378 + pet.row * 435;
        ctx.drawImage(image, sx, sy, 350, 292, x + 2, cy + 2, 100, 75);
      } else if (entry.item) {
        const tex = entry.item.texture;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, tex.width, tex.frameHeight, x + 21, cy + 4, 62, 70);
        ctx.imageSmoothingEnabled = true;
      } else {
        const cropW = Math.min(image.naturalWidth, image.naturalHeight * 100 / 75);
        const cropH = Math.min(image.naturalHeight, image.naturalWidth * 75 / 100);
        ctx.drawImage(image, (image.naturalWidth - cropW) / 2, (image.naturalHeight - cropH) / 2, cropW, cropH, x + 2, cy + 2, 100, 75);
      }
      ctx.restore(); ctx.fillStyle = "#eef1df"; ctx.font = "12px 'IBM Plex Sans Thai', sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let label = entry.name; while (label.length > 3 && ctx.measureText(label).width > 96) label = label.slice(0, -1);
      if (label !== entry.name) label = label.slice(0, -1) + "…";
      ctx.fillText(label, x + 52, cy + 89);
    });
    y += rowH;
  }
  ctx.textAlign = "left"; ctx.fillStyle = "#92a58d"; ctx.font = "16px 'IBM Plex Sans Thai', sans-serif"; ctx.fillText("bowrxn.com/evergardenwiki/tierlist", margin, height - 28);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("ไม่สามารถสร้างภาพได้");
  const objectUrl = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = objectUrl; link.download = `evergarden-tierlist-${category}.png`; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function TierList() {
  const [category, setCategory] = useState<Category>("bosses");
  const [boards, setBoards] = useState<Boards>(emptyBoards);
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [resetting, setResetting] = useState(false);
  const [status, setStatus] = useState("");
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    try { const saved = localStorage.getItem(storageKey); if (saved) setBoards(restoreBoards(JSON.parse(saved))); }
    catch { setStorageAvailable(false); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify(boards)); }
    catch { setStorageAvailable(false); }
  }, [boards, ready]);
  const board = boards[category], list = entries[category];
  const lookup = useMemo(() => new Map(list.map(e => [e.id, e])), [list]);
  const placed = new Set(TIERS.flatMap(t => board[t]));
  const pool = list.filter(e => !placed.has(e.id) && `${e.name} ${e.detail}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const info = categories.find(c => c.id === category)!;
  const selectedEntry = selected ? lookup.get(selected) : undefined;

  function move(id: string, target: Tier | "pool", before?: string) {
    if (!lookup.has(id)) return;
    setBoards(previous => {
      const next: Board = { S: [], A: [], B: [], C: [], D: [] };
      for (const tier of TIERS) next[tier] = previous[category][tier].filter(existing => existing !== id);
      if (target !== "pool") {
        const index = before ? next[target].indexOf(before) : -1;
        if (index >= 0) next[target].splice(index, 0, id); else next[target].push(id);
      }
      return { ...previous, [category]: next };
    });
    setSelected(null);
    setStatus(`${lookup.get(id)?.name} ${target === "pool" ? "กลับไปยังรายการที่ยังไม่จัด" : `อยู่ในระดับ ${target} แล้ว`}`);
  }
  function onDrop(event: DragEvent, target: Tier | "pool", before?: string) {
    event.preventDefault(); event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain"); if (id) move(id, target, before);
  }
  function card(entry: Entry, inTier?: Tier) {
    return <button key={entry.id} type="button" className={`tier-card tier-card-${entry.kind} ${selected === entry.id ? "is-selected" : ""}`} draggable
      title={`${entry.name} · ${entry.detail}`} aria-pressed={selected === entry.id} aria-label={`${entry.name} ${inTier ? `ระดับ ${inTier}` : "ยังไม่จัดอันดับ"} เลือกเพื่อย้าย`}
      onClick={() => { setSelected(selected === entry.id ? null : entry.id); setStatus(""); }}
      onDragStart={event => { event.dataTransfer.setData("text/plain", entry.id); event.dataTransfer.effectAllowed = "move"; setSelected(entry.id); }}
      onDragEnd={() => setSelected(null)}
      onDragOver={event => { if (inTier) event.preventDefault(); }} onDrop={event => { if (inTier) onDrop(event, inTier, entry.id); }}>
      <span className="tier-card-art">{entry.pet ? <PetPortrait pet={entry.pet}/> : entry.item ? <GameTexture texture={entry.item.texture} alt="" animate="off"/> : <img src={entry.image} alt="" loading="lazy"/>}</span>
      <span className="tier-card-name">{entry.name}</span>{entry.kind !== "bosses" && <span className="tier-card-detail">{entry.detail}</span>}<span className="tier-card-grip" aria-hidden="true"><GripVertical size={12}/></span>
    </button>;
  }

  return <main id="content" className="tier-page">
    <section className="tier-hero">
      <div className="tier-hero-glow" aria-hidden="true"/>
      <div className="tier-hero-inner">
        <div className="tier-intro"><div className="tier-breadcrumb"><Link href="/">EVERGARDEN</Link><span>/</span><span>TIER LIST</span></div>
          <span className="tier-eyebrow"><Sparkles size={14}/> พื้นที่จัดอันดับของคุณ</span>
          <h1>จัดอันดับ<br/><em>ในแบบของคุณ</em><span className="tier-title-star">✳</span></h1>
          <p>ชอบตัวไหน เล่นตัวไหนบ่อย หรืออยากจัดตามความยาก?<br/>เลือกเกณฑ์ของคุณ แล้วเริ่มจัด Tier List ได้เลย</p>
          <a href="#tier-workspace" className="tier-start">เริ่มจัดอันดับ <ArrowDown size={16}/></a>
          <span className="tier-intro-note">จัดได้ตามความคิดเห็นของคุณ ไม่มีอันดับที่ถูกหรือผิด</span>
        </div>
        <div className="tier-hero-art" aria-hidden="true"><div className="tier-orbit orbit-a"/><div className="tier-orbit orbit-b"/><span className="tier-art-star art-star-a">✦</span><span className="tier-art-star art-star-b">✳</span>
          <div className="tier-sample sample-s"><span>S</span><img src="/images/bosses/seraphon.webp" alt=""/><small>SERAPHON</small></div>
          <div className="tier-sample sample-a"><span>A</span><img src="/images/bosses/arkhaia.webp" alt=""/><small>ARKHAIA</small></div>
          <div className="tier-sample sample-b"><span>B</span><img src="/images/bosses/cinder-colossus.webp" alt=""/><small>CINDER</small></div>
          <div className="tier-art-caption">ตัวอย่างการจัดอันดับ <span>✦</span> EVERGARDEN</div>
        </div>
      </div>
    </section>

    <section className="tier-workspace" id="tier-workspace">
      <div className="tier-workspace-heading"><div><span className="tier-section-label">01 / เลือกหมวด</span><h2>คุณอยากจัดอันดับอะไร?</h2><p>แต่ละหมวดมีรายการแยกกัน สลับไปมาได้โดยไม่ต้องเริ่มใหม่</p></div><span className="tier-personal-badge"><span/> YOUR PERSONAL LIST</span></div>
      <div className="tier-tabs" role="group" aria-label="เลือกหมวด Tier List">
        {categories.map((c, index) => <button key={c.id} type="button" className={`tier-tab ${category === c.id ? "is-active" : ""}`} aria-pressed={category === c.id} onClick={() => { setCategory(c.id); setSelected(null); setQuery(""); setResetting(false); setStatus(""); }}>
          <span className="tier-tab-number">0{index + 1}</span><span><strong>{c.label}</strong><small>{entries[c.id].length} รายการ</small></span><ArrowUpRight size={17}/>
        </button>)}
      </div>
      <div className="tier-board-heading"><div><span className="tier-section-label">02 / จัดอันดับ {info.label}</span><h2>Tier List <em>{info.label}</em></h2><p>{info.description}</p></div><div className="tier-board-actions"><button type="button" className="tier-action" onClick={() => setResetting(true)} disabled={!placed.size}><RotateCcw size={15}/> เริ่มใหม่</button><button type="button" className="tier-export" disabled={!placed.size || exporting} onClick={async () => { setExporting(true); try { await downloadBoard(category, board); setStatus("ดาวน์โหลดภาพ Tier List แล้ว"); } catch { setStatus("ดาวน์โหลดภาพไม่สำเร็จ ลองอีกครั้ง"); } finally { setExporting(false); } }}><Download size={16}/>{exporting ? "กำลังสร้างภาพ…" : "บันทึกเป็นภาพ"}</button></div></div>
      <p className={`tier-status ${status ? "is-visible" : ""}`} role="status" aria-live="polite">{status}</p>
      {resetting && <div className="tier-reset-confirm" role="alert"><span>ล้างอันดับ{info.label}ทั้งหมดในหมวดนี้?</span><button type="button" onClick={() => { setBoards(prev => ({ ...prev, [category]: EMPTY() })); setSelected(null); setResetting(false); setStatus(`ล้างอันดับ${info.label}แล้ว`); }}>ล้างอันดับ</button><button type="button" onClick={() => setResetting(false)}>ยกเลิก</button></div>}
      <div className="tier-instructions"><div><Layers3 size={17}/><span><strong>วิธีจัดอันดับ</strong> ลากการ์ดไปยังแถวที่ต้องการ หรือแตะการ์ดแล้วกดเลือกระดับ</span></div><span className="tier-progress">จัดแล้ว <strong>{placed.size}</strong> / {list.length}</span></div>
      <div className="tier-selection" aria-live="polite">{selectedEntry ? <><span><Check size={15}/> เลือก <strong>{selectedEntry.name}</strong> แล้ว — กดระดับที่ต้องการ</span><button type="button" onClick={() => setSelected(null)}>ยกเลิก <X size={14}/></button></> : <span>เลือกการ์ดด้านล่างเพื่อเริ่มจัดอันดับ</span>}</div>
      <div className="tier-rows" aria-label="ตารางจัดอันดับ">
        {TIERS.map(tier => <div key={tier} className={`tier-row tier-row-${tier.toLowerCase()} ${selected ? "is-ready" : ""}`} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={event => onDrop(event, tier)}>
          <button type="button" className="tier-rank" onClick={() => { if (selected) move(selected, tier); }} aria-label={selectedEntry ? `ย้าย ${selectedEntry.name} ไประดับ ${tier}` : `ระดับ ${tier} เลือกการ์ดก่อน`}><strong>{tier}</strong><small>{board[tier].length} รายการ</small></button>
          <div className="tier-row-cards">{board[tier].map(id => lookup.get(id)).filter((e): e is Entry => !!e).map(entry => card(entry, tier))}{!board[tier].length && <span className="tier-row-placeholder">วางการ์ดที่นี่ หรือกด {tier} หลังเลือกการ์ด</span>}</div>
        </div>)}
      </div>
      <div className="tier-pool" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={event => onDrop(event, "pool")}>
        <div className="tier-pool-top"><div><span className="tier-section-label">03 / รายการที่ยังไม่จัด</span><h2>เลือกการ์ด <span>{list.length - placed.size}</span></h2><p>{info.note}</p></div><div className="tier-pool-tools"><label className="tier-search"><Search size={16}/><span className="tier-visually-hidden">ค้นหารายการ</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`ค้นหา${info.label}…`}/></label><button type="button" className="tier-return" disabled={!selected || !placed.has(selected)} onClick={() => { if (selected) move(selected, "pool"); }}>นำกลับรายการ</button></div></div>
        <div className="tier-pool-grid">{pool.map(entry => card(entry))}{!pool.length && <p className="tier-empty">{query ? "ไม่พบรายการที่ตรงกับคำค้น" : "จัดอันดับครบทุกใบแล้ว"}</p>}</div>
      </div>
      {selectedEntry && <div className="tier-quick-move" role="group" aria-label={`เลือกระดับสำหรับ ${selectedEntry.name}`}>
        <div className="tier-quick-label"><span>เลือกแล้ว</span><strong>{selectedEntry.name}</strong></div>
        <div className="tier-quick-buttons">{TIERS.map(tier => <button type="button" key={tier} className={`tier-quick-${tier.toLowerCase()}`} onClick={() => move(selectedEntry.id, tier)} aria-label={`จัด ${selectedEntry.name} เป็นระดับ ${tier}`}>{tier}</button>)}</div>
        <button type="button" className="tier-quick-close" onClick={() => setSelected(null)} aria-label="ยกเลิกการเลือก"><X size={17}/></button>
      </div>}
      <div className="tier-endnote"><span><span className="tier-saved-dot"/> {storageAvailable ? "บันทึกอัตโนมัติในเบราว์เซอร์นี้" : "เบราว์เซอร์ไม่อนุญาตให้บันทึก ผลจะอยู่เฉพาะหน้านี้"}</span><span>ข้อมูลอ้างอิง e2.183 · Advance Magic 1.38.3 · Forge 0.6.0</span></div>
    </section>
  </main>;
}
