import type { Companion } from "@/lib/companions";

/** Viewport into the original poster; source artwork stays intact. */
export function PetPortrait({pet,priority=false}:{pet:Companion;priority?:boolean}) {
  const x=64+pet.column*374;
  const y=378+pet.row*435;
  return <div className="pet-portrait" style={{"--pet-color":pet.color} as React.CSSProperties}>
    <img className="pet-sprite" src={`/images/companions/pets-${pet.sheet}.webp`} alt={`${pet.thai} (${pet.name}) ภาพโมเดลร่างเด็กและร่างโต`} width="1600" height="2201" loading={priority?"eager":"lazy"} fetchPriority={priority?"high":"auto"} style={{width:`${1600/350*100}%`,left:`${-x/350*100}%`,top:`${-y/292*100}%`}}/>
  </div>;
}
