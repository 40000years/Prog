"use client";

import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useCinematicMotion(root: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = root.current;if(!element || !enabled) return;
    const cleanup: (()=>void)[] = [];
    const context = gsap.context(() => {
      const enter = gsap.timeline({ defaults:{ease:"expo.out"} });
      enter.fromTo(".hero-letter",{yPercent:115,rotate:8},{yPercent:0,rotate:0,duration:1.6,stagger:.065},.05)
        .fromTo(".hero-script",{y:40,opacity:0,rotate:-5},{y:0,opacity:1,rotate:-3,duration:1.4},.6)
        .fromTo(".collage-frame",{scale:.55,opacity:0,yPercent:35},{scale:1,opacity:1,yPercent:0,duration:1.7,stagger:.09},.25)
        .fromTo(".hero-center-copy,.hero-chapter-label",{y:20,opacity:0},{y:0,opacity:1,duration:1.1,stagger:.1},1.05);
      gsap.to(".scroll-progress>span",{scaleX:1,ease:"none",scrollTrigger:{trigger:element,start:"top top",end:"bottom bottom",scrub:true}});
      const hero = element.querySelector<HTMLElement>(".kinetic-hero")!;
      const heroScroll = gsap.timeline({scrollTrigger:{trigger:hero,start:"top top",end:"bottom top",scrub:1}});
      heroScroll.to(".hero-letter-line",{scale:1.14,yPercent:-45,opacity:.2,ease:"none"},0)
        .to(".hero-script",{y:-110,opacity:0,ease:"none"},0).to(".hero-center-copy",{y:70,opacity:0,ease:"none"},0);
      element.querySelectorAll<HTMLElement>(".collage-frame").forEach((frame,index) => {
        heroScroll.to(frame,{x:Number(frame.dataset.scatter)*(110+index*15),y:(index%3-1)*150,rotation:Number(frame.dataset.scatter)*12,ease:"none"},0);
      });
      if(matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const movers=Array.from(element.querySelectorAll<HTMLElement>(".collage-frame")).map(frame=>({depth:Number(frame.dataset.depth),x:gsap.quickTo(frame.querySelector(".collage-parallax"),"x",{duration:1.2,ease:"power3.out"}),y:gsap.quickTo(frame.querySelector(".collage-parallax"),"y",{duration:1.2,ease:"power3.out"})}));
        const move=(event:PointerEvent)=>{const r=hero.getBoundingClientRect();const x=(event.clientX-r.left)/r.width-.5;const y=(event.clientY-r.top)/r.height-.5;movers.forEach(m=>{m.x(x*55*m.depth);m.y(y*42*m.depth);});};
        const leave=()=>movers.forEach(m=>{m.x(0);m.y(0);});
        hero.addEventListener("pointermove",move);hero.addEventListener("pointerleave",leave);
        cleanup.push(()=>{hero.removeEventListener("pointermove",move);hero.removeEventListener("pointerleave",leave);});
        element.querySelectorAll<HTMLElement>(".magnetic").forEach(button=>{
          const x=gsap.quickTo(button,"x",{duration:.35,ease:"power3.out"}),y=gsap.quickTo(button,"y",{duration:.35,ease:"power3.out"});
          const onMove=(e:PointerEvent)=>{const r=button.getBoundingClientRect();x((e.clientX-r.left-r.width/2)*.14);y((e.clientY-r.top-r.height/2)*.2);};
          const onLeave=()=>{x(0);y(0);};button.addEventListener("pointermove",onMove);button.addEventListener("pointerleave",onLeave);
          cleanup.push(()=>{button.removeEventListener("pointermove",onMove);button.removeEventListener("pointerleave",onLeave);});
        });
      }
      gsap.fromTo(".film-frame",{scale:.78,clipPath:"inset(8% 0% 8% 0% round 180px)"},{scale:1,clipPath:"inset(0% 0% 0% 0% round 4px)",ease:"none",scrollTrigger:{trigger:".film-section",start:"top 75%",end:"top 5%",scrub:1}});
      gsap.fromTo(".manifesto-word",{color:"#344438"},{color:"#e4eadd",stagger:.12,ease:"none",scrollTrigger:{trigger:".manifesto",start:"top 78%",end:"bottom 65%",scrub:1}});
      element.querySelectorAll<HTMLElement>(".split-copy").forEach(copy=>{gsap.fromTo(copy.querySelectorAll(".split-word"),{yPercent:110,rotate:4},{yPercent:0,rotate:0,duration:.9,stagger:.06,ease:"power3.out",scrollTrigger:{trigger:copy,start:"top 92%",once:true}});});
      element.querySelectorAll<HTMLElement>(".biome-panel").forEach((panel,index)=>{
        gsap.fromTo(panel,{y:index%2?90:30},{y:0,ease:"none",scrollTrigger:{trigger:".biome-panels",start:"top bottom",end:"bottom 55%",scrub:1}});
        gsap.fromTo(panel.querySelector("img"),{scale:1.18,yPercent:-5},{scale:1.04,yPercent:5,ease:"none",scrollTrigger:{trigger:panel,start:"top bottom",end:"bottom top",scrub:1}});
      });
      gsap.fromTo(".finale-line",{xPercent:(i:number)=>i?12:-12},{xPercent:0,ease:"none",scrollTrigger:{trigger:".kinetic-finale",start:"top bottom",end:"top 25%",scrub:1}});
      const media=gsap.matchMedia();
      media.add("(min-width: 901px)",()=>{
        element.classList.add("cinema-enhanced");
        const panels=gsap.utils.toArray<HTMLElement>(".cinema-panel"),buttons=gsap.utils.toArray<HTMLButtonElement>("[data-chapter-jump]");
        const counter=element.querySelector<HTMLElement>("[data-chapter-counter]");
        gsap.set(panels,{autoAlpha:0});gsap.set(panels[0],{autoAlpha:1});
        const timeline=gsap.timeline({scrollTrigger:{id:"eg-boss-cinema",trigger:".boss-cinema",start:"top top",end:()=>`+=${window.innerHeight*4.5}`,pin:".cinema-stage",scrub:1.05,anticipatePin:1,invalidateOnRefresh:true,onUpdate:self=>{
          const active=Math.min(3,Math.floor(self.progress*4));
          buttons.forEach((button,index)=>{button.classList.toggle("is-current",index===active);button.setAttribute("aria-pressed",String(index===active));const bar=button.querySelector<HTMLElement>("i");if(bar)bar.style.transform=`scaleX(${gsap.utils.clamp(0,1,self.progress*4-index)})`;});
          if(counter)counter.textContent=String(active+1).padStart(2,"0");
        }}});
        panels.forEach((panel,index)=>{
          if(index>0){timeline.fromTo(panel,{autoAlpha:0},{autoAlpha:1,duration:.22},index-.12);timeline.fromTo(panel.querySelector(".cinema-content"),{y:70,opacity:0},{y:0,opacity:1,duration:.34,ease:"power2.out"},index-.08);}
          timeline.fromTo(panel.querySelector(".cinema-image"),{scale:1.13,xPercent:2},{scale:1,xPercent:-2,duration:1,ease:"none"},index);
          if(index<3)timeline.to(panel,{autoAlpha:0,duration:.2},index+.92);
        });
        const handlers=buttons.map((button,index)=>{const handler=()=>{const trigger=ScrollTrigger.getById("eg-boss-cinema");if(trigger)window.scrollTo({top:trigger.start+(trigger.end-trigger.start)*((index+.12)/4),behavior:"smooth"});};button.addEventListener("click",handler);return()=>button.removeEventListener("click",handler);});
        return()=>{handlers.forEach(fn=>fn());element.classList.remove("cinema-enhanced");};
      });
      media.add("(max-width: 900px)",()=>{element.querySelectorAll<HTMLElement>(".cinema-panel").forEach(panel=>{
        gsap.fromTo(panel.querySelector(".cinema-image"),{scale:1.15},{scale:1,ease:"none",scrollTrigger:{trigger:panel,start:"top bottom",end:"bottom top",scrub:1}});
        gsap.fromTo(panel.querySelector(".cinema-content"),{y:35,opacity:.35},{y:0,opacity:1,duration:.8,scrollTrigger:{trigger:panel,start:"top 70%",once:true}});
      });});
      cleanup.push(()=>media.revert());
    },element);
    const refresh=()=>ScrollTrigger.refresh();document.fonts.ready.then(refresh);const timer=setTimeout(refresh,800);
    return()=>{clearTimeout(timer);cleanup.forEach(fn=>fn());context.revert();};
  },[root,enabled]);
}
