"use client";

import { useEffect, useState } from "react";
import { Bookmark, Check, Copy } from "lucide-react";

export function SaveArticle({ path }: { path: string }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem("evergarden-saved") || "[]").includes(path)); } catch { /* Reading still works without local storage. */ } }, [path]);
  function toggle() {
    try {
      const current: string[] = JSON.parse(localStorage.getItem("evergarden-saved") || "[]");
      const next = current.includes(path) ? current.filter(p => p !== path) : [...current, path];
      localStorage.setItem("evergarden-saved", JSON.stringify(next)); setSaved(next.includes(path));
    } catch { setError(true); }
  }
  return <div><button className={`save-article ${saved ? "saved" : ""}`} onClick={toggle} aria-pressed={saved}><Bookmark size={15} fill={saved ? "currentColor" : "none"}/>{saved ? "บันทึกแล้ว" : "บันทึกบทความ"}</button>{error && <small role="status">เบราว์เซอร์ไม่อนุญาตให้บันทึกในเครื่องนี้</small>}</div>;
}

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(command); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError(true); }
  }
  return <button className="article-copy-command" onClick={copy} aria-label={`คัดลอก ${command}`} title={error ? "เลือกข้อความคำสั่งเพื่อคัดลอกด้วยตนเอง" : undefined}><code>{command}</code>{copied ? <Check size={14}/> : <Copy size={14}/>}</button>;
}
