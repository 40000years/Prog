"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function Fireflies() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const values = new Float32Array(100 * 3);
    for (let i = 0; i < values.length; i++) values[i] = Math.sin(i * 137.5 + 2) * (i % 3 === 2 ? 2 : 8);
    return values;
  }, []);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPointer: { value: new THREE.Vector2() } }), []);
  useFrame((state, delta) => {
    if (!points.current) return;
    const material = points.current.material as THREE.ShaderMaterial;
    material.uniforms.uTime.value += Math.min(delta, .05);
    material.uniforms.uPointer.value.lerp(state.pointer, .04);
  });
  return <points ref={points}>
    <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
    <shaderMaterial transparent depthWrite={false} blending={THREE.AdditiveBlending} uniforms={uniforms}
      vertexShader={`uniform float uTime; uniform vec2 uPointer; varying float vGlow; void main(){ vec3 p=position; p.y += sin(uTime*.25+p.x)*.55; p.x += cos(uTime*.18+p.y)*.35 + uPointer.x*.12; vec4 mv=modelViewMatrix*vec4(p,1.); vGlow=.3+.7*(.5+.5*sin(uTime+p.x*2.)); gl_PointSize=(2.+vGlow*3.)*(4./-mv.z); gl_Position=projectionMatrix*mv; }`}
      fragmentShader={`varying float vGlow; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(.75,.95,.48,a*vGlow*.6); }`}/>
  </points>;
}

class CanvasBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

export default function AmbientCanvas() {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(true);
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const supported = () => {
      try { const canvas = document.createElement("canvas"); return !!canvas.getContext("webgl2"); } catch { return false; }
    };
    const update = () => setEnabled(!reduced.matches && window.innerWidth > 700 && supported());
    update(); reduced.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px" });
    if (wrapper.current) observer.observe(wrapper.current);
    const onVisibility = () => setVisible(!document.hidden && (wrapper.current?.getBoundingClientRect().bottom ?? 0) > 0);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { observer.disconnect(); reduced.removeEventListener("change", update); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return <div className="ambient-canvas" ref={wrapper} aria-hidden="true">{enabled && <CanvasBoundary><Canvas camera={{ position: [0, 0, 6], fov: 60 }} dpr={[1, 1.25]} frameloop={visible ? "always" : "never"} gl={{ alpha: true, antialias: false, powerPreference: "low-power" }}><Fireflies/></Canvas></CanvasBoundary>}</div>;
}
