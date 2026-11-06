"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [enabled,setEnabled] = useState(true);
  useEffect(()=>{
    const media=window.matchMedia("(prefers-reduced-motion: reduce)");
    const read=()=>{let preference:string|null=null;try{preference=localStorage.getItem("eg-motion");}catch{}setEnabled(preference?preference==="on":!media.matches);};
    const onMotion=(event:Event)=>setEnabled(Boolean((event as CustomEvent<boolean>).detail));
    read();window.addEventListener("eg:motion",onMotion);media.addEventListener("change",read);
    return()=>{window.removeEventListener("eg:motion",onMotion);media.removeEventListener("change",read);};
  },[]);
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ lerp: .085, smoothWheel: true, anchors: { offset: -90 } });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach(el => {
        gsap.fromTo(el, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: "power2.out", clearProps: "all", scrollTrigger: { trigger: el, start: "top 96%", once: true } });
      });
    });
    const timer = setTimeout(() => ScrollTrigger.refresh(), 450);
    return () => { clearTimeout(timer); context.revert(); gsap.ticker.remove(tick); lenis.destroy(); };
  }, [pathname,enabled]);
  return <>{children}</>;
}
