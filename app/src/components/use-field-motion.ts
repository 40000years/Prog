"use client";

import {useEffect,useState,type RefObject} from "react";
import {usePathname} from "next/navigation";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

export function useFieldMotion(root:RefObject<HTMLElement|null>) {
  const path=usePathname();const [enabled,setEnabled]=useState(true);
  useEffect(()=>{
    let preference:string|null=null;try{preference=localStorage.getItem("eg-motion");}catch{}
    setEnabled(preference?preference==="on":!matchMedia("(prefers-reduced-motion: reduce)").matches);
    const change=(event:Event)=>setEnabled(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener("eg:motion",change);return()=>window.removeEventListener("eg:motion",change);
  },[]);
  useEffect(()=>{
    if(!root.current||!enabled)return;const element=root.current;
    const context=gsap.context(()=>{
      gsap.fromTo(".field-enter",{y:30,opacity:0},{y:0,opacity:1,stagger:.1,duration:1,ease:"power3.out",clearProps:"all"});
      element.querySelectorAll<HTMLElement>("[data-field-reveal]").forEach(item=>gsap.fromTo(item,{y:35,opacity:.15},{y:0,opacity:1,duration:.85,ease:"power3.out",clearProps:"all",scrollTrigger:{trigger:item,start:"top 94%",once:true}}));
      element.querySelectorAll<HTMLElement>("[data-field-drift]").forEach((item,index)=>gsap.to(item,{y:index%2?75:-65,rotation:index%2?5:-5,ease:"none",scrollTrigger:{trigger:".field-hero",start:"top top",end:"bottom top",scrub:1}}));
    },element);
    let active=true;document.fonts.ready.then(()=>{if(active)ScrollTrigger.refresh();});
    return()=>{active=false;context.revert();};
  },[root,path,enabled]);
}
