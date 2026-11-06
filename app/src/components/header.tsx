"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Bookmark, Command, Menu, Search, X } from "lucide-react";
import { articles, articleHref, groups } from "@/lib/wiki";
import { GardenMark } from "./icons";

export function Header() {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [saved, setSaved] = useState<string[]>([]);
  const [savedOnly, setSavedOnly] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);

  const showSearch = useCallback((onlySaved = false) => {
    setSavedOnly(onlySaved); setQuery(""); setFilter("all"); setOpen(true); setMobile(false);
    try { setSaved(JSON.parse(localStorage.getItem("evergarden-saved") || "[]")); } catch { setSaved([]); }
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const editing = /INPUT|TEXTAREA|SELECT/.test((event.target as HTMLElement)?.tagName) || (event.target as HTMLElement)?.isContentEditable;
      if ((event.key === "/" && !editing) || ((event.metaKey || event.ctrlKey) && event.key === "k")) { event.preventDefault(); showSearch(); }
      if (event.key === "Escape") { setMobile(false); setOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showSearch]);

  useEffect(() => {
    if (open) { dialog.current?.showModal(); input.current?.focus(); }
    else dialog.current?.close();
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLocaleLowerCase().trim();
    return articles.filter(article => {
      if (savedOnly && !saved.includes(article.path)) return false;
      if (filter !== "all" && article.group !== filter) return false;
      return !q || `${article.title} ${article.lead} ${JSON.stringify(article.blocks)}`.toLocaleLowerCase().includes(q);
    }).sort((a, b) => Number(b.title.toLocaleLowerCase().includes(q)) - Number(a.title.toLocaleLowerCase().includes(q)));
  }, [query, filter, savedOnly, saved]);

  return <>
    <header className="site-header">
      <Link href="/" className="brand" aria-label="Evergarden Wiki หน้าแรก"><GardenMark /><span>EVERGARDEN<span className="brand-note">คู่มือภาษาไทย</span></span></Link>
      <nav className="desktop-nav" aria-label="เมนูหลัก">
        <Link href="/#explore">สำรวจโลก</Link><Link href="/#bosses">คลังบอส</Link><Link href="/magic">เวทมนตร์</Link><Link href="/pets">สัตว์เลี้ยง</Link><Link href="/forge">Forge</Link>
      </nav>
      <div className="header-actions">
        <button className="header-search" onClick={() => showSearch()} aria-label="ค้นหาคู่มือ"><Search size={16} /><span>ค้นหาคู่มือ</span><kbd>⌘ K</kbd></button>
        <button className="icon-button save-header" onClick={() => showSearch(true)} aria-label="เปิดบทความที่บันทึกไว้"><Bookmark size={18} /></button>
        <Link href="/guide/getting-started/portal" className="header-cta">เริ่มต้นเล่น <ArrowUpRight size={15}/></Link>
        <button className="icon-button mobile-menu-button" onClick={() => setMobile(!mobile)} aria-expanded={mobile} aria-label={mobile ? "ปิดเมนู" : "เปิดเมนู"}>{mobile ? <X size={22}/> : <Menu size={22}/>}</button>
      </div>
    </header>
    {mobile && <nav className="mobile-nav" aria-label="เมนูมือถือ"><Link href="/#explore" onClick={() => setMobile(false)}>สำรวจโลก</Link><Link href="/#bosses" onClick={() => setMobile(false)}>คลังบอส</Link><Link href="/magic" onClick={() => setMobile(false)}>เวทมนตร์</Link><Link href="/pets" onClick={() => setMobile(false)}>สัตว์เลี้ยง</Link><Link href="/forge" onClick={() => setMobile(false)}>ระบบ Forge</Link><button onClick={() => showSearch()}>ค้นหาคู่มือ <Search size={18}/></button></nav>}
    <dialog ref={dialog} className="search-dialog" onCancel={close} onClose={close} aria-label={savedOnly ? "บทความที่บันทึกไว้" : "ค้นหา Evergarden Wiki"} onClick={e => { if(e.target === e.currentTarget) close(); }}>
      <div className="search-box" data-lenis-prevent>
        <div className="search-input-wrap"><Search size={23}/><input ref={input} value={query} onChange={e => setQuery(e.target.value)} placeholder={savedOnly ? "ค้นหาในบทความที่บันทึก…" : "ค้นหาบอส เวทมนตร์ หรือสิ่งที่สงสัย…"} aria-label="คำค้นหา"/><button className="icon-button" onClick={close} aria-label="ปิดการค้นหา"><X size={20}/></button></div>
        <div className="search-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>ทั้งหมด</button>{groups.map(g => <button key={g.id} className={filter === g.id ? "active" : ""} onClick={() => setFilter(g.id)}>{g.title}</button>)}</div>
        <div className="search-results">
          <p className="search-count">{savedOnly ? "หน้าที่บันทึก" : "บทความ"} <span>{results.length} บทความ</span></p>
          {results.length ? results.map(a => <Link href={articleHref(a.path)} key={a.path} onClick={close} className="search-result"><div><span className="search-result-group">{a.groupTitle}</span><strong>{a.title}</strong><p>{a.lead}</p></div><ArrowUpRight size={19}/></Link>) : <div className="search-empty"><Bookmark size={30}/><h3>{savedOnly ? "ยังไม่มีบทความที่บันทึก" : "ยังไม่พบสิ่งที่ค้นหา"}</h3><p>{savedOnly ? "เปิดบทความแล้วกดปุ่มบันทึก เพื่อกลับมาอ่านได้ง่ายขึ้น" : "ลองใช้ชื่อบอส ชื่อธาตุ หรือคำสั้น ๆ เช่น มานา"}</p><button onClick={() => { setSavedOnly(false); setQuery(""); setFilter("all"); }}>สำรวจคู่มือทั้งหมด <ArrowUpRight size={15}/></button></div>}
        </div>
        <div className="search-footer"><span><Command size={12}/> K เพื่อค้นหาจากทุกหน้า</span><span>ESC เพื่อปิด</span></div>
      </div>
    </dialog>
  </>;
}
