# Artwork and assets

## Hero artwork

- Tool: built-in ImageGen (not CLI)
- Reference: user-provided `Seraphon.png`
- Final project asset: `public/images/evergarden-hero.webp`
- Generated original: `/Users/user/.codex/generated_images/01a1a0b2-f9c2-7501-ba45-bb1f7831742d/exec-5ee7aaa1-ed17-4e4b-8e56-97a445dc9c64.png`
- Treatment: generated cinematic concept art; WebP encoding at quality 90 for web delivery
- Disclosure: the hero is labelled `SERAPHON · CONCEPT ART`; boss records also include the actual user-supplied in-game captures

### Final prompt

> Use case: stylized-concept. Create one premium panoramic 16:9 website hero illustration for EVERGARDEN, a Thai Minecraft fantasy wiki. Input image 1 is a subject and world reference, not a layout to reproduce. Keep the distinctive block-built Seraphon angel's gold and ivory armor, huge ivory-and-gold wings, cyan gemstones, and voxel geometry recognizable. Reimagine the scene as an exquisite cinematic voxel fantasy key visual: an ancient mossy stone arch portal and ruined floating garden terraces above dark teal clouds, immense deep evergreen forest shapes and old cathedral pillars in the distance, fine emerald magical light and restrained gold motes. The Seraphon angel is on the RIGHT THIRD, full body, with wings reaching toward upper right, backlit by a beautiful narrow luminous ring. Delicate lush ferns and ancient weathered stone at foreground right. LEFT HALF must be very dark near-black forest teal atmospheric negative space with subtle mist and no competing objects, intended for cream website headline overlay. Art-directed, elegant, mysterious, architectural and spacious, very high-quality atmospheric lighting, crafted voxel / block geometry, restrained rich emerald teal and warm gold, no magenta. Wide landscape composition. Do not add any text, letters, UI, HUD, logos, watermark, frame or borders. This is a landscape artwork only, not a website screenshot.

## Other imagery

## Motion Edition artwork additions

Three further artworks were generated with built-in ImageGen using the user's original screenshots as visual references. Final web assets are:

- `public/images/arkhaia-art.webp` from `Arkhaia.png`: obsidian-armored knight, violet core, crimson bat wings and long sword, in a dark rose courtyard beneath a blood-red eclipse.
- `public/images/cinder-art.webp` from `Cinder_Colossus.png`: basalt-armored golem with molten seams and red banner in a volcanic forge cathedral.
- `public/images/moth-art.webp` from `Crystal_Moth_Queen.png`: geometric violet moth with gold-edged ivory crystal wings in a floating amethyst courtyard.

All four boss key visuals are labelled CONCEPT ART and can be switched to the original IN-GAME CAPTURE in the boss scene. They are not presented as game screenshots.

### Shared final prompt

> Use case: stylized-concept. Asset type: premium full-width 16:9 cinematic game website artwork, landscape, no text. Create a spectacular faithful artistic reimagining based on the user's actual Minecraft boss screenshot, used as subject reference. Style: meticulously crafted high-end voxel/block fantasy key art, exquisite atmosphere and depth, crisp geometry and layered cinematic lighting, not photorealistic flesh, consistent with the generated Evergarden Seraphon forest key art. Strong recognizable silhouette, premium editorial game launch site, serious and beautiful. Constraints: one continuous image, NO text, lettering, HUD, labels, logos, watermark, UI, border or frame. Keep the boss's identity and original block geometry.

Each prompt also specified the subject identity, reference details, palette, and environment described above. Original generated PNG filenames:

- Arkhaia: `exec-ef3aa9c7-1864-47e0-a882-0b6e1a37f482.png`
- Cinder: `exec-eb94f6ab-c1d2-48ff-99d1-4e9fedc95472.png`
- Moth: `exec-fd0af82a-b70d-4c49-a906-3fdd5ad1dda3.png`

## Gameplay video

The user-provided `1029.mp4` is preserved in the parent workspace. A web copy is encoded as H.264/AAC with faststart in `public/videos/evergarden-gameplay.mp4` (720×960, 30 fps, about 20 seconds). The original 3:4 aspect ratio and audio are retained. Poster: `public/images/gameplay-poster.webp`, extracted from the actual video. No generated gameplay is substituted.

## Original illustrations

The 14 original screenshots in the user's workspace are preserved untouched. WebP copies are under `public/images/bosses/`, including both Malefeasance phases. The 21 existing wiki illustrations are mirrored under `public/assets/` with their original explanatory captions. Original source: https://evergardenwiki.vercel.app/.

## Fonts

Archivo, Instrument Serif, Inter, Geist Mono, IBM Plex Sans Thai. Font files are self-hosted in `public/fonts/` using Google Fonts stylesheet declarations in `src/app/fonts.css`.

## Companions and Forge — 4 November 2026

- User originals `pets-1.png`, `pets-2.png` (1600×2201) and `forge-guide.png` (1600×4915) are preserved under `public/images/companions/` and `public/images/forge/`. Full-dimension WebP copies retain the source image contents.
- Each companion portrait is a CSS viewport into one of the two original posters, including baby/adult model references. The Forge equipment illustrations use SVG viewports into the original poster. Source image pixels are not repainted.
- Pet posters describe the images as renders of actual game models with simulated lighting, not in-game screenshots. The UI retains this distinction.
- `public/images/forge/items/` contains 46 unchanged PNG textures (40 gem tiers, 5 materials, gem dust), extracted from the [official Forge Java resource pack](https://github.com/40000years/Evergarden2/releases/download/evergarden-forge-v0.6.0/forge-java.zip). They are original game assets, not generated concept art.
- The Forge poster contains outdated exclusions. The page and article label it as the original reference and explain the changes in 0.6.0; see `DATA-AUDIT.md`.
- No new AI artwork was generated for these two chapters.

## Illustrated Grimoire and Armory

- Pinned release: [resources-e2.183-am1.38.3](https://github.com/40000years/Evergarden2/releases/tag/resources-e2.183-am1.38.3), commit `4c12523bc5949731e6e48aa410c243778bc0c8f6`.
- `advance-magic-java.zip` SHA-1: `82167f061a3bbf4c067719a55aa1ae4cfa32bb4c`; `evergarden-java.zip`: `01756997c5e3e117e4a8b0227a26a8f2f22ffeb6`.
- 189 original PNG textures under `public/game/`: 65 item thumbnails, 58 spell scrolls, 58 spell effect textures and 8 element icons. All bytes are unchanged.
- 31 item icons contain eight animation frames. Their original `.png.mcmeta` files are preserved, and `GameTexture` uses a clipped CSS viewport with `steps()` and the original timing (2 game ticks per frame). The PNG sprite sheets are not cropped or repainted. Cards animate on hover/keyboard focus; hero/detail icons animate continuously when motion is enabled.
- The catalog distinguishes GUI icons from spell effect textures. It does not present a flat effect texture as footage of a live spell cast. UV material palettes and deprecated wand models are not substituted for item thumbnails.
- English/Thai item names come from the pinned `AdventurerWeaponService`, `LegendaryWeaponService` and the source wiki. Spell IDs/elements match `ElementalSpell`; all 58 stat rows match the retained wiki tables.
- `/magic`, `/items`, the home element selector, Forge magic equipment previews and article tables use these original game assets. No generated item artwork was used.
