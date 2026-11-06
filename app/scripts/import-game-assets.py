"""Import unchanged, selected PNGs and Minecraft animation metadata from a pinned release.
Downloads the pinned public release packs when missing, verifies checksums,
and reads pinned Java source files for authoritative names/IDs.
"""
from pathlib import Path
import json,zipfile,struct,hashlib,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
RELEASE='resources-e2.183-am1.38.3'
SHA='4c12523bc5949731e6e48aa410c243778bc0c8f6'
expected={'magic':'82167f061a3bbf4c067719a55aa1ae4cfa32bb4c','world':'01756997c5e3e117e4a8b0227a26a8f2f22ffeb6'}
for name,filename in [('magic','advance-magic-java.zip'),('world','evergarden-java.zip')]:
 dest=Path('/tmp/eg-'+name+'-pack.zip')
 if not dest.exists():subprocess.run(['curl','-fsSL','https://github.com/40000years/Evergarden2/releases/download/'+RELEASE+'/'+filename,'-o',str(dest)],check=True)
 assert hashlib.sha1(dest.read_bytes()).hexdigest()==expected[name], 'Release pack checksum changed'
source_dir=Path('/tmp/eg-forge-audit');source_dir.mkdir(exist_ok=True)
for filename,location in {'LegendaryWeaponService.java':'advance-magic/src/main/java/com/example/advancemagic/item/','AdventurerWeaponService.java':'evergarden/src/main/java/com/example/voidscape/item/','ElementalSpell.java':'advance-magic/src/main/java/com/example/advancemagic/elemental/'}.items():
 dest=source_dir/filename
 subprocess.run(['curl','-fsSL','https://raw.githubusercontent.com/40000years/Evergarden2/'+SHA+'/'+location+filename,'-o',str(dest)],check=True)
packs={name:zipfile.ZipFile('/tmp/eg-'+name+'-pack.zip') for name in ['magic','world']}
wiki=json.loads((ROOT/'content/wiki.json').read_text())
textures={}
def texture(pack,path):
 key=pack+':'+path
 if key in textures:return textures[key]
 z=packs[pack];blob=z.read(path);width,height=struct.unpack('>II',blob[16:24]);meta=json.loads(z.read(path+'.mcmeta')) if path+'.mcmeta' in z.namelist() else {}
 animation=meta.get('animation',{});frame_height=animation.get('height',width if animation else height)
 frames=height//frame_height
 assert not animation.get('frames'), 'Explicit frame-order needs support before import'
 rel=path.removeprefix('assets/');dest=ROOT/'public/game'/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(blob)
 if meta:dest.with_suffix('.png.mcmeta').write_bytes(z.read(path+'.mcmeta'))
 value={'src':'/game/'+rel,'width':width,'height':height,'frameHeight':frame_height,'frames':frames,'frametime':animation.get('frametime',1),'sha256':hashlib.sha256(blob).hexdigest()}
 textures[key]=value;return value
magic='assets/advance_magic/textures/item/'
world='assets/voidscape/textures/item/'
items=[]
def item(id,name,thai,category,pack,path,guide,description='',element=None):
 v={'id':id,'name':name,'thai':thai,'category':category,'texture':texture(pack,path),'guide':guide,'description':description}
 if element:v['element']=element
 items.append(v)
elements={'fire':'ไฟ','water':'น้ำ','ice':'น้ำแข็ง','wind':'ลม','earth':'ดิน','lightning':'สายฟ้า','light':'แสง','dark':'มืด'}
for id,thai in elements.items():item('staff-'+id,id.title()+' Staff','คทาธาตุ'+thai,'staff','magic',magic+'elemental_staffs/'+id+'_icon.png','/guide/magic/staffs','คทาธาตุเริ่มที่ Apprentice อัปเกรดเป็น Arcane และ Mythic ได้',id)
item('staff-wood','Amethystwood Staff','คทาไม้','staff','magic',magic+'wooden_staff/wood_icon.png','/guide/magic/staffs','คทาเริ่มต้นที่ไม่มีธาตุ คราฟต์ด้วย Amethyst Shard และ Blaze Rod')
leg=Path('/tmp/eg-forge-audit/LegendaryWeaponService.java').read_text()
for enum,name,desc in re.findall(r'^        (\w+)\(Material\.[^,]+,"([^"]+)",NamedTextColor\.\w+,0x\w+,"([^"]+)"\)',leg,re.M):
 item(enum.lower(),name,desc,'legendary','magic',magic+'legendary_weapons/'+enum.lower()+'_icon.png','/forge','อาวุธตำนานของ Advance Magic รองรับรีฟอร์จและ Gem ใน Forge 0.6.0 แต่ย่อยไม่ได้')
adv=Path('/tmp/eg-forge-audit/AdventurerWeaponService.java').read_text()
for id,name,thai,subtitle in re.findall(r'^        \w+\("([^"]+)", Material\.[^\n]+\n\s+"([^"]+)", "([^"]+)", "([^"]+)"',adv,re.M):
 item(id,name,thai,'adventurer','world',world+'adventurer_weapons/'+id+'_icon.png','/guide/bosses/vault-bosses',subtitle)
for armor,thai in [('seraph','เซราฟ'),('revenant','เรเวแนนต์')]:
 for piece,label in [('helm','หมวก'),('chestplate','เสื้อเกราะ'),('leggings','กางเกงเกราะ'),('boots','รองเท้า')]:
  item(armor+'-'+piece,armor.title()+' '+piece.title(),label+thai,'armor','magic',magic+armor+'/'+piece+'_icon.png','/forge','ชุด Seraph / Revenant รองรับรีฟอร์จและ Gem ใน Forge 0.6.0 แต่ย่อยไม่ได้')
for id,thai in [('low','ระดับต่ำ'),('medium','ระดับกลาง'),('good','ระดับดี'),('supreme','ระดับสูงสุด')]:item('mana-potion-'+id,'Mana Potion · '+id.title(),'ยามานา'+thai,'supplies','magic',magic+'mana_potion_'+id+'.png','/guide/magic/mana')
for id in ['acheron','phlegethon','cocytus','banshee','malefeasance','styx']:item('orb-'+id,id.title()+' Soul Orb','Soul Orb · '+id.title(),'drops','world',world+'boss_orb_'+id+'.png','/guide/bosses/'+id)
for id,label,guide in [('cinder_colossus','Cinder Colossus','cinder-colossus'),('soul_hound','Soul-Eater Hound','soul-hound'),('crystal_moth','Crystal Moth Queen','crystal-moth'),('unlit_sun','Unlit Sun','unlit-sun')]:item('core-'+id,label+' Core','แกนมิติ · '+label,'drops','world',world+'realm_core_'+id+'.png','/guide/bosses/'+guide)
for id,label,guide in [('seraph','Core of Seraph','/guide/bosses/seraphon'),('revenant','Core of Revenant','/forge'),('legend','Core of Legend','/forge')]:item('core-'+id,label,label,'drops','world',world+'core_of_'+id+'.png',guide)
for id,label in [('seraph_feather','ขนนกเซราฟ'),('seraph_feather_golden','ขนนกเซราฟสีทอง')]:item(id,id.replace('_',' ').title(),label,'drops','world',world+id+'.png','/guide/bosses/seraphon')
for id,label,guide in [('scroll_eternity','Scroll of Eternity','/guide/magic/scrolls'),('scroll_limit_break','Limit Break Scroll','/guide/magic/spell-levels'),('scroll_unique','Unique Scroll','/guide/magic/scrolls'),('pet_egg','ไข่สัตว์เลี้ยง','/guide/pets/breeding')]:item(id,id.replace('_',' ').title(),label,'supplies','world',world+id+'.png',guide)
source=Path('/tmp/eg-forge-audit/ElementalSpell.java').read_text()
spell_ids={name:(enum.lower(),element.lower()) for enum,name,element in re.findall(r'^    (\w+)\("([^"]+)",Element\.(\w+),',source,re.M)}
spells=[]
for element in elements:
 page=wiki['pages']['magic/spells-'+element]
 rows=next(b['rows'] for b in page['blocks'] if b['type']=='table')
 for row in rows:
  id,source_element=spell_ids[row[0]];assert source_element==element
  spells.append({'id':id,'name':row[0],'element':element,'rarity':row[1],'mana':row[2],'cooldown':row[3],'multiplier':row[4],'damage':row[5],'description':row[6],'guide':'/guide/magic/spells-'+element,'texture':texture('magic',magic+'scroll_'+id+'.png'),'effect':texture('magic','assets/advance_magic/textures/effect/elemental_'+id+'.png')})
icons={id:texture('magic',magic+'skilltree/icon_'+id+'.png') for id in elements}
assert len(spells)==58 and len(items)==65 and len(set(x['id'] for x in items))==65
result={'source':{'release':RELEASE,'url':'https://github.com/40000years/Evergarden2/releases/tag/'+RELEASE,'commit':SHA,'packSha1':{k:hashlib.sha1(Path('/tmp/eg-'+k+'-pack.zip').read_bytes()).hexdigest() for k in packs},'checked':'2026-11-04'},'items':items,'spells':spells,'elementIcons':icons}
(ROOT/'content/game-assets.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print({'items':len(items),'spells':len(spells),'textures':len(textures),'animated':sum(t['frames']>1 for t in textures.values())})
