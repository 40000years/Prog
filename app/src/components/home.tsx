"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, Anvil, BookOpen, Shield, Check, ChevronDown, Compass, Copy, Expand, Pause, Play, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { articleHref, articles, bosses, elements, groups, wiki } from "@/lib/wiki";
import { CompassMark, GardenMark } from "./icons";
import { useCinematicMotion } from "./use-cinematic-motion";
import { GameTexture } from "./game-texture";
import { staffFor, elementIcons } from "@/lib/game-assets";
import { NewChapters } from "./new-chapters";

const guides = (id: string) => groups.find(group => group.id === id)?.pages.length ?? 0;
const LivingScene = dynamic(() => import("./living-scene"), { ssr: false });
const chapters = [
  { id: "seraphon", name: "Seraphon", title: "World Boss", line: "Supreme\nSanctuary", art: "/images/evergarden-hero.webp", capture: "seraphon", tag: "THE CELESTIAL GUARDIAN", color: "#d5ed9d", location: "SUPREME SANCTUARY" },
  { id: "arkhaia", name: "Arkhaia", title: "World Boss", line: "Dreadrose\nCastle", art: "/images/arkhaia-art.webp", capture: "arkhaia", tag: "THE DREADROSE KING", color: "#ed9ba6", location: "DREADROSE CASTLE" },
  { id: "cinder-colossus", name: "Cinder Colossus", title: "บอสมิติ", line: "Realm\nBoss", art: "/images/cinder-art.webp", capture: "cinder-colossus", tag: "THE MOLTEN COLOSSUS", color: "#eeb47d", location: "THE REALM BOSSES" },
  { id: "crystal-moth", name: "Crystal Moth Queen", title: "บอสมิติ", line: "Realm\nBoss", art: "/images/moth-art.webp", capture: "crystal-moth-queen", tag: "THE CRYSTAL MOTH QUEEN", color: "#d4b5f5", location: "THE REALM BOSSES" },
];
const collage = [
  { image: "seraphon", name: "SERAPHON", rotation: -12, depth: 1.1 },
  { image: "arkhaia", name: "ARKHAIA", rotation: 11, depth: -.9 },
  { image: "crystal-moth-queen", name: "CRYSTAL MOTH QUEEN", rotation: -6, depth: .6 },
  { image: "cinder-colossus", name: "CINDER COLOSSUS", rotation: 9, depth: -1.2 },
  { image: "cocytus", name: "COCYTUS", rotation: -9, depth: .8 },
  { image: "unlit-sun", name: "UNLIT SUN", rotation: 7, depth: -.7 },
];

function SplitWords({ text }: { text: string }) {
  return <span className="split-copy" aria-label={text}>{text.split(" ").map((word,index) => <span className="word-mask" aria-hidden="true" key={index}><span className="split-word">{word}</span></span>)}</span>;
}

function RunningType({ reverse = false, outline = false }: { reverse?: boolean; outline?: boolean }) {
  return <div className={`running-type ${reverse ? "reverse" : ""} ${outline ? "outlined" : ""}`} aria-hidden="true"><div className="running-track">{[0,1].map(i => <div className="running-copy" key={i}><span>บอสและการต่อสู้</span><GardenMark/><span>เวทมนตร์และการสำรวจ</span><GardenMark/></div>)}</div></div>;
}

function Gameplay({ motion }: { motion: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const fullVideo = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const manualPause = useRef(false);
  useEffect(() => {
    const element = video.current; if (!element) return;
    let inView = false;
    const sync = () => {
      if(inView && motion && !manualPause.current && !document.hidden && !expanded) element.play().catch(() => {});
      else element.pause();
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting; sync();
    }, { threshold: .2 });
    observer.observe(element);
    const visibility = sync;
    document.addEventListener("visibilitychange", visibility);
    if(!motion) element.pause();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, [motion, expanded]);
  useEffect(() => {
    if(expanded) { modal.current?.showModal(); fullVideo.current?.play().catch(() => {}); }
    else { modal.current?.close(); fullVideo.current?.pause(); }
  }, [expanded]);
  function toggle() {
    const element = video.current; if(!element) return;
    if(element.paused) { manualPause.current = false; element.play().catch(() => {}); }
    else { manualPause.current = true; element.pause(); }
  }
  return <>
    <section className="film-section" id="film">
      <div className="film-heading"><span className="section-kicker">01 / ภาพจากเกม</span><h2><SplitWords text="สำรวจ Evergarden"/><br/><em><SplitWords text="ในเกม"/></em></h2><p>ดูบรรยากาศภายในโลก Evergarden</p></div>
      <div className="film-frame">
        <div className="film-background"><img src="/images/arkhaia-art.webp" alt="" loading="lazy"/></div>
        <div className="film-side film-side-left"><span className="film-coordinate">EVERGARDEN / IN MOTION</span><div className="film-title-stack"><span>EXPLORE.</span><span>CAST.</span><span>CONQUER.</span></div><p>เกาะลอยฟ้า เวทมนตร์<br/>และการต่อสู้กับบอส</p><span className="film-source-label">ACTUAL GAMEPLAY / 00:20</span></div>
        <div className="film-portrait"><video ref={video} src="/videos/evergarden-gameplay.mp4" poster="/images/gameplay-poster.webp" muted={muted} loop playsInline preload="metadata" aria-label="วิดีโอการเล่น Evergarden" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}/><div className="video-controls"><button onClick={toggle} aria-label={playing ? "หยุดวิดีโอชั่วคราว" : "เล่นวิดีโอ"}>{playing ? <Pause size={15}/> : <Play size={15}/>}</button><button onClick={() => setMuted(!muted)} aria-label={muted ? "เปิดเสียงวิดีโอ" : "ปิดเสียงวิดีโอ"}>{muted ? <VolumeX size={15}/> : <Volume2 size={15}/>}</button><span>EVERGARDEN · FILM 01</span><button onClick={() => setExpanded(true)} aria-label="เปิดวิดีโอขนาดใหญ่"><Expand size={15}/></button></div></div>
        <div className="film-side film-side-right"><CompassMark/><span>ชมภาพ<br/><em>ในเกม</em></span><button className="film-play" onClick={() => setExpanded(true)}><Play size={15} fill="currentColor"/><span>ชมวิดีโอ</span><ArrowUpRight size={15}/></button></div>
      </div>
      <div className="film-under"><span>ภาพจาก Evergarden</span><span>ตัวอย่างการเล่นในเกม</span><span>วิดีโอความยาว 20 วินาที ↗</span></div>
    </section>
    <dialog ref={modal} className="film-dialog" onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)} onClick={e => { if(e.target === e.currentTarget) setExpanded(false); }} aria-label="วิดีโอ Evergarden แบบขยาย"><button className="film-close" aria-label="ปิดวิดีโอ" onClick={() => setExpanded(false)}><X size={22}/></button><video ref={fullVideo} controls playsInline preload="none" src="/videos/evergarden-gameplay.mp4" aria-label="วิดีโอ gameplay Evergarden แบบเต็ม"/></dialog>
  </>;
}

function BossCinema() {
  const [captures, setCaptures] = useState<Record<string, boolean>>({});
  return <section className="boss-cinema" id="boss-cinema" aria-label="บอสเด่นใน Evergarden"><div className="cinema-stage">
    <div className="cinema-top"><span>02 / บอสเด่น</span><span className="cinema-count"><span data-chapter-counter>01</span> — 04</span></div>
    {chapters.map((chapter,index) => <article className={`cinema-panel cinema-panel-${index}`} key={chapter.id} style={{ "--chapter-color": chapter.color } as React.CSSProperties}>
      <div className="cinema-image"><img src={captures[chapter.id] ? `/images/bosses/${chapter.capture}.webp` : chapter.art} alt={chapter.name + (captures[chapter.id] ? " ภาพในเกม" : " ภาพคอนเซปต์")} width="1672" height="941" loading="lazy"/></div><div className="cinema-shade"/>
      <div className="cinema-content"><span className="chapter-tag">✦ {chapter.tag}</span><h2>{chapter.line.split("\n").map((line,i) => <span className="cinema-line" key={i}>{i === 1 ? <em>{line}</em> : line}</span>)}</h2><div className="chapter-identity"><span className="chapter-number">0{index+1}</span><div><h3>{chapter.name}</h3><p>{chapter.title}</p></div></div><p className="chapter-description">{wiki.pages[`bosses/${chapter.id}`].lead}</p><Link href={articleHref(`bosses/${chapter.id}`)} className="button chapter-button magnetic">อ่านคู่มือบอส <ArrowUpRight size={17}/></Link></div>
      <div className="chapter-bottom"><span>{chapter.location}</span><button onClick={() => setCaptures(current => ({ ...current, [chapter.id]: !current[chapter.id] }))}>{captures[chapter.id] ? "ภาพในเกม" : "ภาพคอนเซปต์"}<span>สลับภาพ <ArrowLeft size={11}/><ArrowRight size={11}/></span></button></div>
    </article>)}
    <nav className="cinema-chapters" aria-label="เลือกฉากบอส">{chapters.map((chapter,index) => <button key={chapter.id} data-chapter-jump={index}><span>0{index+1}</span>{chapter.name}<span className="chapter-progress"><i/></span></button>)}</nav><span className="cinema-scroll-hint"><ArrowDown size={13}/> เลื่อนเพื่อดูเพิ่มเติม</span>
  </div></section>;
}

function Archive() {
  const [filter, setFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const filtered = bosses.filter(b => filter === "all" || b.family === filter);
  const visible = showAll ? filtered : filtered.slice(0, 6);
  return <section className="archive-section section-shell" id="bosses"><div className="section-heading"><div><span className="section-kicker">03 / คลังบอส</span><h2><SplitWords text="รู้จักบอส"/><br/><em>ก่อนออกสู้</em></h2></div><Link className="text-link" href="/guide/bosses/overview">เปิดคู่มือบอส <ArrowUpRight size={17}/></Link></div><div className="boss-toolbar"><p>ดูภาพบอสและอ่านวิธีรับมือ</p><div className="filter-tabs" role="group" aria-label="กรองประเภทบอส">{[{ id:"all",name:"บอสที่มีภาพ",count:13 },{id:"world",name:"World Boss",count:3},{id:"rivers",name:"Six Rivers",count:6},{id:"realm",name:"บอสมิติ",count:4}].map(item => <button key={item.id} onClick={() => {setFilter(item.id);setShowAll(false);}} className={filter === item.id ? "active" : ""} aria-pressed={filter === item.id}>{item.name}<span>{String(item.count).padStart(2,"0")}</span></button>)}</div></div><div className="boss-grid" aria-live="polite">{visible.map((boss,index) => <Link href={articleHref(`bosses/${boss.id}`)} className="boss-card kinetic-card" key={boss.id} style={{ "--boss-color": boss.color } as React.CSSProperties}><div className="boss-image"><img src={`/images/bosses/${boss.image}.webp`} alt={`${boss.name} ภาพในเกม`} loading="lazy" width="1920" height="1080"/><span className="boss-label"><span/>{boss.label}</span><span className="boss-open"><ArrowUpRight size={20}/></span><span className="card-index">{String(bosses.indexOf(boss)+1).padStart(2,"0")}</span></div><div className="boss-info"><div><h3>{boss.name}</h3><p>{boss.subtitle}</p></div><span className="boss-read">บอส {String(index+1).padStart(2,"0")} <ArrowRight size={13}/></span></div></Link>)}</div><div className="boss-section-bottom"><span>แสดง {visible.length} จาก {filtered.length} ตัว</span>{filtered.length>6 && <button className="outline-button" onClick={() => setShowAll(!showAll)}>{showAll ? "แสดงน้อยลง" : "แสดงบอสที่เหลือ"}<ChevronDown size={15} style={{ transform:showAll ? "rotate(180deg)" : undefined }}/></button>}<span>ภาพบอสจากในเกม</span></div></section>;
}

export function Home() {
  const root = useRef<HTMLElement>(null);
  const [motion, setMotion] = useState(true);
  const [element, setElement] = useState("fire");
  const [copied, setCopied] = useState(false);
  const selected = elements.find(e => e.id === element)!;
  useEffect(() => {
    let preference: string | null = null;
    try { preference = localStorage.getItem("eg-motion"); } catch {}
    const enabled = preference ? preference === "on" : !matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMotion(enabled); document.documentElement.dataset.motion = enabled ? "on" : "off";
    window.dispatchEvent(new CustomEvent("eg:motion",{ detail:enabled }));
  }, []);
  useCinematicMotion(root, motion);
  function toggleMotion() {
    const next = !motion;setMotion(next);document.documentElement.dataset.motion = next ? "on" : "off";
    try { localStorage.setItem("eg-motion",next ? "on" : "off"); } catch {}
    window.dispatchEvent(new CustomEvent("eg:motion",{detail:next}));
  }
  async function copyGuide() { try { await navigator.clipboard.writeText("/evergarden guide");setCopied(true);setTimeout(()=>setCopied(false),2000); } catch { setCopied(false); } }
  return <main id="content" ref={root} className="kinetic-home">
    <div className="scroll-progress" aria-hidden="true"><span/></div>
    <section className="kinetic-hero" id="hero" aria-labelledby="kinetic-title"><div className="hero-noise"/><LivingScene enabled={motion}/>
      <div className="hero-topline"><span><i className="status-dot"/> คู่มือ Evergarden ภาษาไทย</span><button onClick={toggleMotion} className="motion-switch" aria-pressed={motion}>{motion ? <Pause size={10}/> : <Play size={10}/>} MOTION {motion ? "ON" : "OFF"}</button></div>
      <div className="hero-collage" aria-hidden="true">{collage.map((item,index) => <div className={`collage-frame frame-${index}`} key={item.image} data-depth={item.depth} data-scatter={index%2 ? 1 : -1}><div className="collage-parallax"><div className="collage-float" style={{ "--tilt":`${item.rotation}deg`,"--delay":`${index * -.85}s` } as React.CSSProperties}><img src={`/images/bosses/${item.image}.webp`} alt="" width="1920" height="1080" fetchPriority={index<2?"high":"auto"}/><span><i/> {item.name}<ArrowUpRight size={9}/></span></div></div></div>)}</div>
      <div className="hero-center"><div className="hero-chapter-label"><span>✦</span> คู่มือสำหรับผู้เล่น <span>✦</span></div><h1 id="kinetic-title" aria-label="Evergarden"><span className="hero-letter-line" aria-hidden="true">{"EVERGARDEN".split("").map((letter,index)=><span className="hero-letter-mask" key={index}><span className="hero-letter">{letter}</span></span>)}</span><em className="hero-script">คู่มือ Evergarden</em></h1><div className="hero-center-copy"><span className="hero-thai">ข้อมูลสำหรับผู้เล่น Evergarden</span><p>รวมวิธีเริ่มเล่น ข้อมูลบอส เวทมนตร์<br/>สัตว์เลี้ยง และระบบ Forge</p><div className="hero-new-actions"><a href="#boss-cinema" className="button button-lime magnetic">ดูบอสเด่น <ArrowUpRight size={17}/></a><a href="#film" className="watch-link"><span><Play size={11} fill="currentColor"/></span> ชมวิดีโอ</a></div></div></div>
      <div className="hero-bottomline"><a href="#film"><span className="scroll-pill"><ArrowDown size={14}/></span> เลื่อนลงเพื่อดูเพิ่มเติม</a><span>4 ไบโอม · ภาพบอส 13 ตัว · เวท 58 ชนิด</span><span>e2.195 <span className="mini-cross">+</span></span></div>
    </section>
    <RunningType/><Gameplay motion={motion}/>
    <section className="living-reel" aria-label="ภาพบอส 13 ตัว"><div className="reel-track">{[0,1].map(copy=><div className="reel-copy" key={copy} aria-hidden={copy===1 ? true : undefined}>{bosses.map((boss,index)=><Link href={articleHref(`bosses/${boss.id}`)} className="reel-frame" key={boss.id} tabIndex={copy===1 ? -1 : undefined} style={{"--reel-rotation":`${index%2 ? 5 : -5}deg`} as React.CSSProperties}><img src={`/images/bosses/${boss.image}.webp`} alt={copy===0?`${boss.name} ภาพในเกม`:""} loading="lazy" width="1920" height="1080"/><span>{boss.name}<ArrowUpRight size={10}/></span></Link>)}</div>)}</div><div className="reel-caption"><span>ภาพบอสในเกม</span><span>บอสที่มีภาพประกอบ 13 ตัว</span></div></section>
    <section className="manifesto" id="explore"><span className="section-kicker">คู่มือ Evergarden</span><h2><span className="manifesto-word">เริ่มต้น</span>{" "}<span className="manifesto-word">สำรวจ</span>{" "}<span className="manifesto-word">Evergarden</span><br/><em><span className="manifesto-word">ดูข้อมูล</span>{" "}<span className="manifesto-word">ที่ต้องใช้</span>{" "}<span className="manifesto-word">ได้ที่นี่</span></em></h2><p>อ่านวิธีเดินทาง ต่อสู้กับบอส<br/>และใช้งานระบบต่าง ๆ ในเกม</p><span className="manifesto-mark"><GardenMark/></span></section>
    <BossCinema/><RunningType reverse outline/><Archive/><NewChapters/>
    <section id="magic" className="magic-section kinetic-magic"><div className="magic-left"><span className="section-kicker">04 / เวทมนตร์</span><h2><SplitWords text="คทาและคัมภีร์"/><br/><em><SplitWords text="เวทมนตร์"/></em></h2><p>ดูเวท 58 ชนิดจาก 8 ธาตุ<br/>พร้อมข้อมูลคทาและคัมภีร์</p><Link href="/magic" className="button button-lime magnetic">เปิดคลังเวทมนตร์ <ArrowUpRight size={17}/></Link><span className="magic-footnote"><BookOpen size={13}/> ADVANCE MAGIC · v1.40.0</span></div><div className="magic-right"><div className="magic-orbit" aria-hidden="true"><div className="orbit-ring orbit-one"/><div className="orbit-ring orbit-two"/><div className="orbit-ring orbit-three"/><div className="magic-rune-ring">✦ &nbsp; ᛟ &nbsp; ✧ &nbsp; ᚱ &nbsp; ✦ &nbsp; ᛞ &nbsp; ✧ &nbsp; ᚦ</div><div className="magic-diamond magic-staff-display" style={{"--element-color":selected.color} as React.CSSProperties}><GameTexture key={element} texture={staffFor(element).texture} alt={`คทาธาตุ${selected.name}`} animate="always"/></div><span className="orbit-label label-top">ARS MAGICA</span><span className="orbit-label label-bottom">VIII ELEMENTS · LVIII SPELLS</span><span className="orbit-point point-one">✧</span><span className="orbit-point point-two">+</span><span className="orbit-point point-three">✦</span></div><div className="element-picker" role="group" aria-label="เลือกธาตุเวทมนตร์">{elements.map(item=><button key={item.id} onClick={()=>setElement(item.id)} className={element===item.id?"active":""} aria-pressed={element===item.id} aria-label={`เวทธาตุ${item.name}`} style={{"--element-color":item.color} as React.CSSProperties}><GameTexture texture={elementIcons[item.id as keyof typeof elementIcons]} alt="" animate="off"/></button>)}</div><Link className="selected-element" href={articleHref(`magic/spells-${element}`)}><span><strong>{selected.english}</strong> / ธาตุ{selected.name}<span className="element-count">{selected.count} เวทมนตร์</span></span><ArrowUpRight size={18}/></Link></div></section>
    <section className="biome-exploration section-shell" id="world"><div className="section-heading"><div><span className="section-kicker">05 / ไบโอม</span><h2><SplitWords text="ไบโอม"/> <em>ทั้งสี่</em></h2></div><Link className="text-link" href="/guide/getting-started/biomes">รู้จักไบโอมทั้งสี่ <ArrowUpRight size={17}/></Link></div><div className="biome-panels">{[{name:"The Evergarden",th:"สวน Evergarden",image:"hanging-garden",number:"01"},{name:"Glacier Peaks",th:"เทือกเขาธารน้ำแข็ง",image:"biome-glacier",number:"02"},{name:"Ancient Forest",th:"ป่าโบราณ",image:"biome-ancient-forest",number:"03"},{name:"Lunar City",th:"นครจันทราที่สาบสูญ",image:"biome-lunar-city",number:"04"}].map((biome)=><Link href="/guide/getting-started/biomes" className="biome-panel" key={biome.image}><div className="biome-image"><img src={`/assets/img/world/${biome.image}.webp`} alt={biome.number === "01" ? "ภาพสวนแขวนใน Evergarden" : `ภาพประกอบ${biome.th}`} width="1000" height="902" loading="lazy"/></div><span className="biome-tag">ภาพประกอบ · ไบโอม {biome.number} / 04</span><div><h3>{biome.name}</h3><p>{biome.th}</p></div><ArrowUpRight size={23}/></Link>)}</div></section>
    <section className="guide-index section-shell"><div className="guide-index-title"><span className="section-kicker">06 / หมวดคู่มือ</span><h2>เลือกหัวข้อ<br/><em>ที่ต้องการอ่าน</em></h2><p>รวมคู่มือภาษาไทย {articles.length} บทความ<br/>ข้อมูลอ้างอิงจากรุ่น e2.195 และค่าตั้งต้น<br/>รายละเอียดอาจต่างกันตามเซิร์ฟเวอร์</p><div className="guide-count"><span>{articles.length}</span><span>FIELD<br/>NOTES</span><GardenMark/></div></div><div className="guide-index-rows">{[{title:"เริ่มต้นการเดินทาง",en:"THE WORLD",path:"getting-started/world",count:guides("getting-started"),icon:Compass},{title:"บอสและการต่อสู้",en:"THE BESTIARY",path:"bosses/overview",count:guides("bosses"),icon:Sparkles},{title:"ชุดเกราะเซต",en:"THE ARMORY",path:"gear/armor-sets",count:guides("gear"),icon:Shield},{title:"เวทมนตร์และคัมภีร์",en:"THE GRIMOIRE",path:"magic/overview",href:"/magic",count:guides("magic"),icon:BookOpen},{title:"เพื่อนร่วมการผจญภัย",en:"THE COMPANIONS",path:"pets/overview",href:"/pets",count:guides("pets"),icon:GardenMark},{title:"โรงตีและอัญมณี",en:"THE FORGE",path:"forge/overview",href:"/forge",count:guides("forge"),icon:Anvil}].map((item,index)=><Link href={item.href || articleHref(item.path)} key={item.path}><span className="guide-row-index">{String(index+1).padStart(2,"0")}</span><item.icon/><div><span>{item.en}</span><h3>{item.title}</h3></div><span className="guide-row-count">{item.count} GUIDES</span><ArrowUpRight size={22}/></Link>)}</div></section>
    <section className="first-step"><span className="section-kicker">เริ่มต้นเล่น / 3 ขั้นตอน</span><div className="first-step-grid"><div><span>01 / BUILD</span><h3>สร้างกรอบควอตซ์</h3><p>กรอบนอก 4 × 5 บล็อก<br/>เว้นช่องว่างด้านใน 2 × 3 บล็อก</p></div><div><span>02 / OPEN</span><h3>เปิดประตูด้วยดอกไม้</h3><p>โยนหรือแตะดอกไม้ใส่กรอบ<br/>แล้วเดินเข้าประตูสู่ Evergarden</p></div><div><span>03 / DISCOVER</span><h3>เปิดคู่มือในเกม</h3><p>รับหนังสือคู่มือเมื่อเข้าครั้งแรก<br/>หรือเปิดอ่านซ้ำด้วยคำสั่ง</p><button className="copy-command" onClick={copyGuide}><code>/evergarden guide</code>{copied?<Check size={13}/>:<Copy size={13}/>}<span>{copied?"คัดลอกแล้ว":"คัดลอก"}</span></button></div></div><Link href="/guide/getting-started/portal" className="text-link">อ่านวิธีเริ่มต้นฉบับเต็ม <ArrowUpRight size={17}/></Link></section>
    <section className="kinetic-finale"><img src="/images/moth-art.webp" alt="" loading="lazy" width="1672" height="941"/><div className="finale-shade"/><span className="section-kicker">เริ่มต้นเล่น Evergarden</span><h2><span className="finale-line">เริ่มต้น</span><em className="finale-line">เดินทาง</em></h2><Link href="/guide/getting-started/portal" className="button button-lime magnetic">อ่านวิธีเข้ามิติ <ArrowUpRight size={18}/></Link><div className="finale-footnote"><GardenMark/><span>EVERGARDEN WIKI<br/>คู่มือสำหรับผู้เล่น</span></div></section>
  </main>;
}
