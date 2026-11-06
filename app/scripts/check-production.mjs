import { readFileSync } from "node:fs";

const base = new URL(process.argv[2] || "http://localhost:3090");
const wiki = JSON.parse(readFileSync(new URL("../content/wiki.json", import.meta.url), "utf8"));
const errors = [];
const response = await fetch(base);
const html = await response.text();
if(response.status !== 200) errors.push(`Home returned ${response.status}`);
for(const expected of ["kinetic-hero", "running-track", "reel-track", "boss-cinema", "cinema-panel-3", "evergarden-gameplay.mp4", "arkhaia-art.webp", "cinder-art.webp", "moth-art.webp", "home-new-chapters"]) {
  if(!html.includes(expected)) errors.push(`Home did not serve the motion edition: missing ${expected}`);
}
const cssPaths = [...new Set([...html.matchAll(/href="([^\"]+\.css)"/g)].map(match => match[1]))];
const css = (await Promise.all(cssPaths.map(async path => (await fetch(new URL(path, base))).text()))).join("\n");
for(const expected of ["collage-drift", "running-left", "cinema-enhanced", "magic-diamond", "data-motion", "field-tape", "pet-hover", "forge-ember", "game-sprite"]) {
  if(!css.includes(expected)) errors.push(`Production CSS missing ${expected}`);
}
const paths = Object.keys(wiki.pages);
let pagesPassed = 0;
for(let start = 0; start < paths.length; start += 6) {
  await Promise.all(paths.slice(start,start+6).map(async path => {
    const r = await fetch(new URL(`/guide/${path}`,base));const body = await r.text();
    if(r.status === 200 && body.includes("wiki-article")) pagesPassed++;
    else errors.push(`Article ${path}: ${r.status}`);
  }));
}
const video = await fetch(new URL("/videos/evergarden-gameplay.mp4",base),{headers:{Range:"bytes=0-1023"}});
const videoBytes = (await video.arrayBuffer()).byteLength;
if(video.status !== 206 || videoBytes !== 1024 || !video.headers.get("content-type")?.includes("video/mp4")) errors.push("Gameplay MP4 byte-range delivery failed");
const missing = await fetch(new URL("/guide/this-article-does-not-exist",base));
if(missing.status !== 404) errors.push("Missing article did not return 404");
for(const [path,marker] of [["/pets","companion-collection"],["/forge","forge-workbench"],["/magic","spell-library"],["/items","item-collection"]]) {
  const r=await fetch(new URL(path,base)),body=await r.text();
  if(r.status!==200||!body.includes(marker))errors.push(`Chapter ${path}: ${r.status}, missing ${marker}`);
  if(path==="/pets" && [...body.matchAll(/class="companion-card"/g)].length!==32)errors.push("Companion catalog must render all 32 original creatures");
  if(path==="/forge" && !body.includes("forge-latest-note"))errors.push("Forge release correction is missing");
  if(path==="/magic" && [...body.matchAll(/class="spell-card(?: ultimate)?"/g)].length!==58)errors.push("Grimoire must render all 58 spell icons");
  if(path==="/items" && [...body.matchAll(/class="item-card"/g)].length!==65)errors.push("Armory must render all 65 item icons");
}
for(const path of ["/images/companions/pets-1.webp","/images/companions/pets-2.webp","/images/forge/forge-guide.webp","/images/forge/items/gem/fire_1.png","/images/forge/items/gem/life_5.png"]) {
  const r=await fetch(new URL(path,base),{method:"HEAD"});
  if(r.status!==200||!r.headers.get("content-type")?.startsWith("image/"))errors.push(`Chapter artwork unavailable: ${path}`);
}
const assets=JSON.parse(readFileSync(new URL("../content/game-assets.json",import.meta.url),"utf8"));
const gamePaths=[...new Set([...assets.items.map(i=>i.texture.src),...assets.spells.flatMap(s=>[s.texture.src,s.effect.src]),...Object.values(assets.elementIcons).map(t=>t.src)])];
for(let start=0;start<gamePaths.length;start+=8){
 await Promise.all(gamePaths.slice(start,start+8).map(async path=>{const r=await fetch(new URL(path,base),{method:"HEAD"});if(r.status!==200||!r.headers.get("content-type")?.startsWith("image/"))errors.push(`Game texture unavailable: ${path}`);}));
}
console.log(JSON.stringify({gameTextures:gamePaths.length,home:"Motion Edition",articleRoutesPassed:pagesPassed,expectedArticles:paths.length,chapters:["/pets","/forge","/magic","/items"],videoStatus:video.status,videoRange:video.headers.get("content-range"),errors},null,2));
if(errors.length) process.exitCode = 1;
