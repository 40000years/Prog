import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Clock3, Info } from "lucide-react";
import { articleHref, articles, bosses, groups, normalizeHref, wiki, type Block, type Column, type Command, type WikiItem } from "@/lib/wiki";
import { ArticleAssetGallery } from "./article-asset-gallery";
import { GameTexture } from "./game-texture";
import { gameItems, spells } from "@/lib/game-assets";
import { SaveArticle, CopyCommand } from "./article-controls";
import { CompassMark } from "./icons";

const itemTextures=new Map([...gameItems.map(i=>[i.name,i.texture] as const),...spells.map(i=>[i.name,i.texture] as const)]);

function Inline({ text = "" }: { text?: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2,-2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1,-1)}</code>;
    const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (match) {
      const href = normalizeHref(match[2]);
      if (href.startsWith("/")) return <Link key={i} href={href}>{match[1]}</Link>;
      if (href.startsWith("https://")) return <a key={i} href={href} target="_blank" rel="noopener noreferrer">{match[1]}</a>;
      return match[1];
    }
    return part;
  })}</>;
}

function WikiFigure({ item }: { item: WikiItem }) {
  return <figure className="wiki-figure"><img src={item.src?.startsWith("assets/") ? `/${item.src}` : item.src} alt={item.alt || "ภาพประกอบคู่มือ Evergarden"} width={item.width} height={item.height} loading="lazy"/><figcaption><Inline text={item.caption}/></figcaption></figure>;
}

function Gate({ outer = [4, 5], caption }: { outer?: number[]; caption?: string }) {
  return <figure className="portal-diagram"><div className="portal-grid" style={{ gridTemplateColumns: `repeat(${outer[0]}, 34px)` }} aria-label={`กรอบประตูควอตซ์กว้าง ${outer[0]} สูง ${outer[1]} บล็อก`}>{Array.from({ length: outer[0] * outer[1] }, (_, i) => <span key={i} className={i < outer[0] || i >= outer[0] * (outer[1]-1) || i % outer[0] === 0 || i % outer[0] === outer[0]-1 ? "quartz-block" : "portal-block"}/>)}</div><div><span className="section-kicker">THE FIRST GATEWAY</span><h3>{outer[0]} × {outer[1]} บล็อก</h3><p><Inline text={caption || "สร้างกรอบควอตซ์ แล้วใช้ดอกไม้เปิดประตูมิติ"}/></p></div></figure>;
}

function RenderBlock({ block: b, index }: { block: Block; index: number }) {
  switch(b.type) {
    case "h2": return <h2 id={`section-${index}`}>{b.text}</h2>;
    case "h3": return <h3 id={`section-${index}`}>{b.text}</h3>;
    case "p": return <p><Inline text={b.text}/></p>;
    case "list": { const Tag = b.ordered ? "ol" : "ul"; return <Tag>{(b.items as string[] || []).map((text, i) => <li key={i}><Inline text={text}/></li>)}</Tag>; }
    case "callout": return <aside className={`article-callout ${b.variant || "info"}`}><Info size={19}/><div>{b.title && <strong>{b.title}</strong>}<p><Inline text={b.text}/></p></div></aside>;
    case "steps": return <ol className="article-steps">{(b.items as WikiItem[] || []).map((item,i) => <li key={i}><span>{String(i+1).padStart(2,"0")}</span><div><strong><Inline text={item.title}/></strong>{item.text && <p><Inline text={item.text}/></p>}</div></li>)}</ol>;
    case "commands": return <div className="article-commands">{(b.rows as Command[] || []).map((item,i) => <div key={i}><CopyCommand command={item.cmd}/><p><Inline text={item.desc}/>{item.note && <small><Inline text={item.note}/></small>}</p></div>)}</div>;
    case "table": { const columns = (b.columns || []).map(column => typeof column === "string" ? { label: column } as Column : column); return <div className="wiki-table-group"><div className="wiki-table-scroll" role="region" aria-label={b.caption || "ตารางข้อมูล"} tabIndex={0}><table>{b.caption && <caption>{b.caption}</caption>}<thead><tr>{columns.map((column,i) => <th key={i} scope="col" className={column.num ? "numeric" : ""}>{column.label}{column.unit && <small>{column.unit}</small>}</th>)}</tr></thead><tbody>{(b.rows as string[][] || []).map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j} className={columns[j]?.num ? "numeric" : ""}>{j===0&&itemTextures.has(cell)?<span className="illustrated-table-cell"><GameTexture texture={itemTextures.get(cell)!} alt=""/><span><Inline text={cell}/></span></span>:<Inline text={cell}/>}</td>)}</tr>)}</tbody></table></div>{b.note && <p className="table-note"><Inline text={b.note}/></p>}</div>; }
    case "image": return <WikiFigure item={b}/>;
    case "images": return <div className="wiki-figures">{(b.items as WikiItem[] || []).map((item,i) => <WikiFigure item={item} key={i}/>)}</div>;
    case "cards": return <div className="article-card-grid">{(b.items as WikiItem[] || []).map((item,i) => <Link href={normalizeHref(item.to || "/")} key={i}><span><strong>{item.title}</strong>{item.text && <p>{item.text}</p>}</span><ArrowUpRight size={18}/></Link>)}</div>;
    case "pending": return <aside className="article-callout pending"><Info size={18}/><div><strong>รอข้อมูล</strong><p>{b.text || "ยังไม่มีข้อมูลส่วนนี้ในต้นฉบับ"}</p></div></aside>;
    case "gate": return <Gate outer={b.outer} caption={b.caption}/>;
    default: return null;
  }
}

export function ArticleView({ path }: { path: string }) {
  const article = wiki.pages[path];
  const group = groups.find(g => path.startsWith(`${g.id}/`))!;
  const boss = bosses.find(b => `bosses/${b.id}` === path);
  const headings = article.blocks.map((block,index) => ({ ...block, index })).filter(b => b.type === "h2");
  const sameGroup = articles.filter(a => a.group === group.id);
  const currentIndex = sameGroup.findIndex(a => a.path === path);
  const previous = sameGroup[currentIndex - 1];
  const next = sameGroup[currentIndex + 1];
  const minutes = Math.max(1, Math.ceil(JSON.stringify(article).length / 1400));
  return <main id="content" className="article-page">
    <div className="article-breadcrumb"><Link href="/">หน้าแรก</Link><span>/</span><Link href={articleHref(`${group.id}/${group.pages[0].id}`)}>{group.title}</Link><span>/</span><span>{article.title}</span></div>
    <div className="article-layout">
      <aside className="article-sidebar"><Link href="/" className="back-home"><ArrowLeft size={14}/> กลับหน้าสำรวจ</Link><span className="sidebar-label">คู่มือภาษาไทย</span><nav aria-label="หมวดบทความ">{groups.map(g => <details key={g.id} open={g.id === group.id}><summary>{g.title}<span>{g.pages.length}</span></summary>{g.pages.map(p => <Link key={p.id} href={articleHref(`${g.id}/${p.id}`)} className={path === `${g.id}/${p.id}` ? "active" : ""} aria-current={path === `${g.id}/${p.id}` ? "page" : undefined}>{p.title}</Link>)}</details>)}</nav><div className="sidebar-note"><CompassMark/><p>คู่มือ Evergarden<br/>เลือกอ่านหัวข้ออื่น</p></div></aside>
      <article className="wiki-article">
        <header className="article-title"><span className="section-kicker">{group.id === "bosses" ? "บอส" : group.id === "magic" ? "เวทมนตร์" : group.id === "pets" ? "สัตว์เลี้ยง" : group.id === "forge" ? "Forge" : "โลก Evergarden"} / คู่มือ</span><h1>{article.title}</h1><p className="article-lead"><Inline text={article.lead}/></p><div className="article-meta"><span><Clock3 size={13}/> ใช้เวลาอ่านประมาณ {minutes} นาที</span><span><BookOpen size={13}/> คู่มือภาษาไทย</span><SaveArticle path={path}/></div></header>
        {boss && <figure className="article-boss-hero"><img src={`/images/bosses/${boss.image}.webp`} alt={`${boss.name} ภาพในเกม`} width="1920" height="1080" fetchPriority="high"/><figcaption><span>{boss.label}</span><span>IN-GAME CAPTURE / {boss.name.toUpperCase()}</span></figcaption></figure>}
        <div className="mobile-toc"><details><summary>สารบัญบทความ <span>{headings.length} หัวข้อ</span></summary>{headings.map(h => <a key={h.index} href={`#section-${h.index}`}>{h.text}</a>)}</details></div>
        <ArticleAssetGallery path={path}/><div className="article-prose">{article.blocks.map((block,index) => <RenderBlock block={block} index={index} key={index}/>)}</div>
        {path === "bosses/malefeasance" && <figure className="wiki-figure"><img src="/images/bosses/malefeasance-phase2.webp" alt="Malefeasance เฟสสอง ภาพในเกม" width="1920" height="1080" loading="lazy"/><figcaption>Malefeasance · ภาพในเกม เฟสสอง</figcaption></figure>}
        <div className="article-source-note"><span className="status-dot"/>{article.source ? <span>แหล่งข้อมูล: <a href={article.source.href}>{article.source.label}</a> · ตรวจข้อมูล {article.source.updated}</span> : <>เนื้อหาจาก Evergarden Wiki ฉบับเดิม · อัปเดตต้นฉบับ {wiki.site.meta.updated}</>}</div>
        <nav className="article-pagination" aria-label="บทความถัดไป">{previous ? <Link href={articleHref(previous.path)}><span><ArrowLeft size={13}/> ก่อนหน้า</span><strong>{previous.shortTitle}</strong></Link> : <Link href="/"><span><ArrowLeft size={13}/> กลับไป</span><strong>หน้าสำรวจโลก</strong></Link>}{next && <Link href={articleHref(next.path)}><span>อ่านต่อ <ArrowRight size={13}/></span><strong>{next.shortTitle}</strong></Link>}</nav>
      </article>
      <aside className="article-toc"><span className="sidebar-label">ในหน้านี้</span><nav aria-label="สารบัญบทความ">{headings.map(h => <a key={h.index} href={`#section-${h.index}`}>{h.text}</a>)}</nav><div className="toc-tip"><span>✦ เคล็ดลับ</span><p>กด <kbd>/</kbd> เพื่อค้นหาจากทุกหน้า<br/>กดบันทึกเพื่อเก็บบทความไว้</p></div></aside>
    </div>
  </main>;
}
