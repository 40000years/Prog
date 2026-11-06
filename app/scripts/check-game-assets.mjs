import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const data=JSON.parse(readFileSync(new URL('../content/game-assets.json',import.meta.url),'utf8'));
const wiki=JSON.parse(readFileSync(new URL('../content/wiki.json',import.meta.url),'utf8'));
const textures=new Map();
for(const item of [...data.items,...data.spells]){
 assert(wiki.pages[item.guide.replace('/guide/','')]||['/forge'].includes(item.guide),`Missing guide for ${item.id}`);
 for(const t of [item.texture,item.effect].filter(Boolean))textures.set(t.src,t);
}
for(const t of Object.values(data.elementIcons))textures.set(t.src,t);
let animated=0;
for(const [path,t] of textures){
 assert(path.startsWith('/game/')&&!path.includes('..'));
 const file=new URL('../public'+path,import.meta.url),bytes=readFileSync(file);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),t.sha256,`Changed source pixels: ${path}`);
 assert.equal(bytes.readUInt32BE(16),t.width);assert.equal(bytes.readUInt32BE(20),t.height);
 assert.equal(t.height/t.frameHeight,t.frames);
 if(t.frames>1){animated++;const meta=JSON.parse(readFileSync(new URL(file.href+'.mcmeta')));assert.equal(meta.animation.frametime,t.frametime);assert.equal(meta.animation.height,t.frameHeight);}
}
for(const spell of data.spells){
 const page=wiki.pages[spell.guide.replace('/guide/','')],row=page.blocks.find(b=>b.type==='table').rows.find(r=>r[0]===spell.name);
 assert.deepEqual([spell.rarity,spell.mana,spell.cooldown,spell.multiplier,spell.damage,spell.description],row.slice(1));
}
assert.equal(data.items.length,65);assert.equal(data.spells.length,58);assert.equal(animated,31);
assert.equal(new Set(data.items.map(i=>i.id)).size,65);assert.equal(new Set(data.spells.map(i=>i.id)).size,58);
console.log(JSON.stringify({items:65,spells:58,originalTextures:textures.size,animatedIcons:animated,spellStats:'match source wiki tables'},null,2));
