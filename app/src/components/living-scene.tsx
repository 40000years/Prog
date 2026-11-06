"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

const fragment = `
  uniform float uTime; uniform vec2 uPointer; varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.+vec2(1.7,9.2);a*=.5;}return v;}
  void main(){vec2 p=vUv*vec2(3.8,2.5);float t=uTime*.065;float q=fbm(p+vec2(t,-t));float n=fbm(p+q*3.+uPointer*.15-t);float center=1.-smoothstep(.05,.68,length((vUv-.5)*vec2(1.3,1.)));float veins=pow(1.-abs(sin(n*15.+q*3.)),13.);vec3 color=mix(vec3(.027,.065,.042),vec3(.18,.30,.14),n);color+=vec3(.38,.57,.24)*veins*.35;gl_FragColor=vec4(color,center*.68);}
`;

function LivingInk() {
  const material = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const uniforms=useMemo(()=>({uTime:{value:0},uPointer:{value:new THREE.Vector2()}}),[]);
  useFrame((state,delta)=>{if(material.current){material.current.uniforms.uTime.value+=Math.min(delta,.05);material.current.uniforms.uPointer.value.lerp(state.pointer,.025);}});
  return <mesh><planeGeometry args={[viewport.width,viewport.height]}/><shaderMaterial ref={material} transparent depthWrite={false} uniforms={uniforms} vertexShader="varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}" fragmentShader={fragment}/></mesh>;
}

function PortalRings() {
  const group=useRef<THREE.Group>(null);
  useFrame((_,delta)=>{if(group.current){group.current.rotation.z+=delta*.035;group.current.rotation.y=Math.sin(performance.now()*.00012)*.3;}});
  return <group ref={group} rotation={[.3,0,0]}>{[1.8,2.05,2.45].map((radius,index)=><mesh key={radius} rotation={[index*.65,index*.3,index*.5]}><torusGeometry args={[radius,.002,3,120]}/><meshBasicMaterial color="#b6d291" transparent opacity={.15-index*.025}/></mesh>)}</group>;
}

class Boundary extends Component<{children:React.ReactNode},{failed:boolean}> {
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?null:this.props.children;}
}

export default function LivingScene({enabled}:{enabled:boolean}) {
  const wrapper=useRef<HTMLDivElement>(null);
  const [supported,setSupported]=useState(false);
  const [visible,setVisible]=useState(true);
  useEffect(()=>{
    const screen=matchMedia("(min-width:701px)");let webgl=false;
    try {const canvas=document.createElement("canvas");const context=canvas.getContext("webgl2");webgl=!!context;context?.getExtension("WEBGL_lose_context")?.loseContext();}catch{}
    const resize=()=>setSupported(webgl&&screen.matches);resize();screen.addEventListener("change",resize);
    let intersecting=true;
    const update=()=>setVisible(intersecting&&!document.hidden);
    const observer=new IntersectionObserver(([entry])=>{intersecting=entry.isIntersecting;update();});
    if(wrapper.current)observer.observe(wrapper.current);
    document.addEventListener("visibilitychange",update);
    return()=>{observer.disconnect();document.removeEventListener("visibilitychange",update);screen.removeEventListener("change",resize);};
  },[]);
  return <div className="living-scene" ref={wrapper} aria-hidden="true">{enabled&&supported&&<Boundary><Canvas camera={{position:[0,0,6],fov:55}} dpr={[1,1.25]} frameloop={visible?"always":"never"} gl={{alpha:true,antialias:false,powerPreference:"low-power"}}><LivingInk/><PortalRings/></Canvas></Boundary>}</div>;
}
