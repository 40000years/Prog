import type {CSSProperties} from "react";

export interface GameTextureData {src:string;width:number;height:number;frameHeight:number;frames:number;frametime:number;}
/** Original PNG pixels and frame timing from the resource pack's .png.mcmeta. */
export function GameTexture({texture,alt,animate="hover",priority=false,className=""}:{texture:GameTextureData;alt:string;animate?:"always"|"hover"|"off";priority?:boolean;className?:string}){
  return <span className={`game-texture ${className}`} data-animation={texture.frames>1?animate:"off"} style={{aspectRatio:`${texture.width}/${texture.frameHeight}`,"--texture-frames":texture.frames,"--texture-duration":`${texture.frames*texture.frametime/20}s`} as CSSProperties}><img src={texture.src} alt={alt} width={texture.width} height={texture.height} loading={priority?"eager":"lazy"} fetchPriority={priority?"high":"auto"}/></span>;
}
