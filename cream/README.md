# Cream

Cream is a Canva-style visual design platform that runs entirely in the browser. You don't need an account: designs, uploads and brand kits are saved in this browser's storage (IndexedDB). The asset library comes from open, keyless sources.

## Run it

```bash
npm install
npm run dev          # http://localhost:5400
npm run build        # production build → dist/
npm run preview      # serve the build on http://localhost:4174
npm test             # Playwright end-to-end suite (18 tests)
```

## What's inside

| Area | Features |
|---|---|
| **Home** | Navigation you can pin and reorder; search plus an "Ask Cream AI" box; design-type shortcuts; "Create a design" menu with 50+ size presets; custom size (px/in/mm/cm, 40–8000 px); Edit photo; import a file; recent designs in a grid or list; notifications; light, dark or system theme |
| **Projects** | Folders and subfolders, drag-to-move, star, rename, make a copy, bulk actions, filters (owner, type, date), sorting, Starred, Uploads, Trash (30 days, restore or delete forever) |
| **Templates** | 5,040 generated templates in 52 kinds covering every preset, including presentations, social posts, video, print, docs, whiteboards, websites, email and logos. Filters by category, style, theme, feature, topic and colour; a preview carousel; "Customize this template" |
| **Editor shell** | File menu (settings, rulers and guides, margins, bleed, accessibility, find and replace, version history, offline, download, print, trash), Resize (Magic Switch), Editing/Commenting/Viewing modes, undo and redo, autosave, Share, Present |
| **Canvas** | Select, shift-select, box-select, drag with smart guides, Alt-drag to duplicate, resize (rotation-aware, text scales its font), rotate (Shift snaps to 15°), line endpoints, crop or reposition (double-click), text editing in place, draw with shape assist, drag elements between pages, scroll/thumbnail/grid views, zoom |
| **Elements** | 35 shapes, 16 line and connector presets, icons, graphics, stickers and 3D emoji (Iconify), photos (Openverse), videos (Wikimedia Commons), audio (Openverse), 14 chart types, tables, 15 frames plus letters A–Z, 12 photo grids, gradients, mockups, sticky notes, QR codes, dynamic text (page number, date) |
| **Toolbars** | A toolbar for every element type. Text: fonts (2,100+ from Fontsource), size, colour or gradient, B/I/U/S, case, align, lists, spacing, 10 effects and curved text. Images: filters, adjust, duotone, shadows, crop, border, rounding. Also colour pickers with document, brand and photo colours, the Position and Layers panel, animations with Magic Animate, page transitions, chart data, tables, video trim and speed, and audio fades |
| **Brand** | Brand kits with logos, palettes, fonts (including uploads), brand voice, photos and graphics, guidelines, and brand templates |
| **Share & export** | Share panel (roles, link access, public view link, template link, embed, QR code, social, schedule, approval, publish website, print). Downloads: PNG, JPG, PDF Standard and PDF Print (bleed and crop marks), SVG, MP4/WebM with animations and audio, GIF, PPTX with editable text, and `.cream` files |
| **Present** | Full screen, presenter view (synced second window with notes, timers and next slide), autoplay, present and record (webcam bubble), transitions, Magic Shortcuts (B C D M O Q U, 1–9, X), clickable links |
| **Collaboration** | Comments (pins, replies, @mentions, assign, reactions, resolve), version history (restore, make a copy, named versions), accessibility checker with contrast fixes, find and replace, notes, timer, insights |
| **Cream AI** | Design for me, Create an image, Draft a doc, Code widgets, conversational editing, Magic Write, Translate (117 languages), Magic Media, Dream Lab. Photo tools: background remover, Magic Eraser, Magic Expand, Magic Grab, Grab Text (OCR), upscale |
| **Other** | Content Planner calendar, Print Shop, Apps directory, timeline with clips, audio tracks and split, rulers and guides, keyboard shortcuts (`Ctrl/⌘ + /`) |

## Open asset library (no API keys)

| Source | What | Size |
|---|---|---|
| [Openverse](https://openverse.org) | Creative Commons photos, music and sound effects | ~800M images, ~3M audio |
| [Iconify](https://iconify.design) | Icons, illustrations, emoji and sticker sets | ~411,000 icons in 243 sets |
| [Fontsource](https://fontsource.org) | Open-licence fonts | 2,100+ families |
| [Wikimedia Commons](https://commons.wikimedia.org) | Video clips | Millions of media files |
| [Picsum](https://picsum.photos) | Placeholder photos used in templates | n/a |
| [AI Horde](https://aihorde.net) | Community-run open image models for AI images | Free queue |

Every inserted asset keeps its attribution (creator, licence, source); right-click → Info shows it.

## AI: what works with and without a key

**No key needed:**
- Image generation through the AI Horde queue (it can take from about a minute to several minutes)
- Translation through MyMemory
- Text recognition (tesseract.js)
- Background removal (@imgly/background-removal)
- Magic Eraser, Magic Expand, Magic Grab and upscale
- Template-based "Design for me"
- Rule-based edit commands such as "dark mode" or "make headlines blue"

**Needs your own key** (Claude, ChatGPT or Gemini, added in *Settings → AI*): LLM design generation, free-form edits, Magic Write, doc drafting, custom Code widgets and brainstorming.

Keys stay in your browser and are sent only to that provider.

## Architecture

- `src/model`: document types, presets, factories, geometry
- `src/store`: zustand stores (`app`: designs, folders, assets, brand kits, settings; `editor`: open design, selection, undo history) and IndexedDB persistence
- `src/render`: shared renderer (`PageView`, element views, charts, shapes, filters, text effects, animations), used by the canvas, thumbnails, present mode and export
- `src/editor`: editor shell, canvas interactions, shortcuts, timeline, context menu, drag-and-drop/insert API
- Feature modules: `home`, `brand`, `templates`, `panels` + `assets` (asset library), `toolbar`, `export`, `present`, `collab`, `ai`
- `window.cream.app` and `window.cream.editor` expose the stores for debugging and tests

## Known limits

- **No backend:**
  - Sharing works through self-contained links (`#/view/…`) and `.cream` files.
  - "People with access", teams, printing orders and social scheduling are local simulations.
  - Real-time co-editing between different machines isn't possible.
- **Export:**
  - CMYK isn't available in the browser; PDF Print is RGB.
  - DOCX export isn't implemented.
  - Video elements export as still frames in GIF and MP4.
- **Not built yet:**
  - Canva Sheets.
  - Magic Edit.
  - Text-to-video: there's no free keyless model; "Animate image" is offered instead.
  - Motion paths and "animate by letter/word" are saved but not yet played back.
- **Openverse:** anonymous search is capped at about 240 results per query.
