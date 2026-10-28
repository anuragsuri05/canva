# Cream: shared brief for build agents

Cream is a Canva-style design platform: a local-first SPA built with Vite, React 19, TypeScript, zustand v5, immer and IndexedDB (idb-keyval). There is no backend. The asset library comes only from open, keyless sources.

The full Canva feature reference is `../CANVA_KNOWLEDGE_BASE.md`. Read the sections that match your area and **match Canva's buttons, labels and flows as closely as you can**. Brand names are always "Cream" and never "Canva" (for example "Cream AI", "Print with Cream").

## Ground rules
1. **Only create or edit files you own** (your ownership list is in your task). The core files are read-only for you: `src/model/*`, `src/store/*`, `src/render/*`, `src/editor/*`, `src/ui/*`, `src/styles.css`, `src/App.tsx` and `src/main.tsx`.
   - If you need a core change, mention it in your final report, don't make it yourself.
   - You may add a new CSS file inside your own folder and import it from your module.
2. A stub already exists for each file you own. Replace it, keeping the default-export name and its props (`{ onClose }` for modals).
3. **zustand v5 gotcha:** a selector must never return a new array or object, or React will loop forever.
   - Use `useShallow` from `zustand/react/shallow`, or select primitives or stable references.
   - Use `useSelected()` and `useCurrentPage()` from `src/store/editor.ts`.
   - Read imperatively with `useEditor.getState()` inside handlers.
4. Typecheck with `npx tsc -b`. Fix errors in **your** files only, since other agents' files are changing while you work.
5. A dev server is **already running** at http://localhost:5400 with hot reload, so don't start another on that port.
   - `window.cream.app` and `window.cream.editor` expose the stores.
   - To verify, write a Playwright script in `scripts/<your-area>-*.mjs` (copy the pattern in `scripts/smoke.mjs`) and run it with `node scripts/<file>.mjs <outdir>`.
   - Save screenshots to `/private/tmp/claude-501/-Users-lakshsharma-Downloads-100-projects-canva/f77d3f7e-3d63-4c05-8067-5f04aa96a149/scratchpad/shots/`.
   - **Look at your screenshots.** You're done when the UI works in the browser, not when it compiles.
6. Don't run `npm install`. The installed packages are react, zustand, immer, idb-keyval, html-to-image, jspdf, pptxgenjs, qrcode, gifenc, lucide-react, lz-string, nanoid, tesseract.js and @imgly/background-removal. If you truly need something else, say so in your report.
7. Don't `git commit`.
8. Add `data-testid` attributes to key buttons, so a later agent can write the end-to-end suite.

## Architecture cheat sheet
- **Document model:** `src/model/types.ts`.
  - A `Design` contains `pages[]`, each with `elements[]`.
  - Element types: `text | image | shape | line | svg | video | chart | table | frame | grid | sticky | draw | embed`.
  - Image `src` can be a URL, a `data:` URL, or `asset:<id>` (a blob in IndexedDB). Resolve it with `useSrc(src)` or `resolveSrc(src)` from `src/store/blobs.ts`.
- **Factories:** `src/model/defaults.ts` (`makeText`, `makeShape`, `makeImage`, `makeSvg`, `makeChart`, `makeTable`, `makeFrame`, `makeGrid`, `makeSticky`, `newDesign`, `newPage`, `uid`, `GRID_LAYOUTS`, `STICKY_COLORS`). Presets and sizes are in `src/model/presets.ts`.
- **App store `useApp`** (`src/store/app.ts`):
  - Data: `designs`, `folders`, `assets` (uploads), `brandKits`, `settings`, `notifications`, `route`.
  - Actions: `navigate(route)`, `toast(text)`, `createDesign`, `addDesign`, `patchDesign`, `duplicateDesign`, `trashDesign`, `restoreDesign`, `deleteDesignForever`, `emptyTrash`, folder CRUD, `addAssetFromFile`, `addAssetFromBlob`, brand kit CRUD, `updateSettings`, `notify`, `saveVersion`, `listVersions`.
  - Routes: `{name:'home', section}` | `{name:'editor', id}` | `{name:'present', id, mode}` | `{name:'view', id}`.
- **Editor store `useEditor`** (`src/store/editor.ts`):
  - State: `design`, `pageId`, `selection`, `editingId`, `cropId`, `zoom`, `fit`, `view`, `side` (left panel id), `right` (right panel id), `modal`, `mode`, `draw`, `playing`, `time`, `showTimeline`, `colorTarget`.
  - Mutations go through `update(recipe, {coalesce?, history?})` with immer drafts and undo/redo, or `updateEl(id, patch|fn)` / `updateSelected(patch|fn)`. Use `begin()` / `commit()` around drags (sliders: `begin` on pointerdown and `commit` on pointerup, or pass `coalesce: 'some-key'`).
  - Other actions: `addElements`, `addPage`, `duplicatePage`, `deletePage`, `patchPage`, `reorderPage`, `arrange`, `alignToPage`, `alignSelection`, `distribute`, `tidyUp`, `group`, `ungroup`, `toggleLock`, `flip`, `copyStyle`, `pasteStyle`, `select`, `deselect`.
  - Helpers: `findEl`, `selectedEls`, `currentPage`, `useSelected`, `useCurrentPage`.
- **Insert API** (`src/editor/dnd.ts`): `insertImage`, `insertImageSmart` (fills the selected frame or grid), `insertSvg`, `insertVideo`, `insertAudio`, `insertText`, `insertShape`, `insertLine`, `insertChart`, `insertTable`, `insertFrame`, `insertGrid`, `insertSticky`, `insertElements`, `setPageBackgroundImage`, `fillFrame`.
  - For drag sources, call `setDragPayload(e, payload)` in `onDragStart`. The canvas accepts these drops, and image or video drops onto frames and grids fill them.
- **Renderer** (`src/render/`): `PageView` draws a page at any scale for the canvas, thumbnails, present mode and export.
  - Pass `ctx={{mode:'static'|'present'|'export'|'edit', pageIndex, pageCount}}`.
  - `animation.ts` has the `ANIMATIONS` list and `animStyle()`. `filters.ts` has `FILTER_PRESETS`, `cssFilter` and `mergeFilters`. `textEffects.ts` has `TEXT_EFFECT_DEFAULTS`. `shapes.ts` has `SHAPE_LIST` and `shapePath`. `Elements.tsx` has `svgColors` and `recolorSvg`.
- **Fonts:** `src/assets/fonts.ts` handles Fontsource (2,100+ fonts) with `loadCatalogue()`, `ensureFont(family, weight, italic)`, `POPULAR_FONTS`, `fontFaceCss()` (for export embedding) and `onFontsChange`.
- **UI kit** (`src/ui/ui.tsx`): `Icon` (any lucide name), `Menu`, `MenuButton`, `PopoverButton`, `Floating`, `Modal`, `Slider`, `Toggle`, `Segmented`, `Spinner`, `LoadMore` (infinite scroll), `useDebounced`, `fmtDate`, `MOD`, `ALT`.
- **CSS classes** (`src/styles.css`): `btn` (with `primary`, `grad`, `ghost`, `sm`, `lg`, `block`), `icon-btn`, `input`, `select`, `textarea`, `search`, `field`, `row`, `col`, `grow`, `chip`, `chips`, `tabs`, `tab`, `seg`, `menu-*`, `popover`, `modal-*`, `asset-grid` (with `two` / `four`), `asset-tile`, `masonry`, `section-head`, `hscroll`, `swatches`, `swatch`, `checker`, `faint`, `muted`, `empty`, `badge`, `credit`, `design-grid`, `design-card`, `nav-item`, `home-*`, `toggle`, `slider-row`.
  - Theme tokens: `--primary`, `--surface`, `--surface-2`, `--surface-3`, `--border`, `--text`, `--text-2`, `--text-3`, `--brand-grad`.

## Open asset sources (keyless, CORS-enabled — verified)
- **Openverse** (CC images ~800M, audio ~3M): `https://api.openverse.org/v1/images/?q=…&page=…&page_size=20` and `/v1/audio/`.
  - Thumbnail proxy with CORS: `https://api.openverse.org/v1/images/{id}/thumb/`. Fields include `license`, `creator`, `foreign_landing_url`, `width` and `height`.
  - Anonymous access is capped at about 240 results per query.
- **Iconify** (~411k open-source icons in 243 sets, including emoji sets like `noto`, `twemoji`, `fluent-emoji-flat` and `openmoji` for stickers):
  - Search: `https://api.iconify.design/search?query=…&limit=…`
  - Sets: `https://api.iconify.design/collections`
  - Single icon: `https://api.iconify.design/{prefix}/{name}.svg`
- **Fontsource:** see `src/assets/fonts.ts`.
- **Wikimedia Commons** (videos, images, audio):
  - Video search: `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrsearch=<q>%20filetype:video&gsrlimit=20&prop=imageinfo&iiprop=url|mime|size|dimensions&iiurlwidth=320&origin=*`
  - The `thumburl` field gives a poster image.
- **Pollinations** (keyless AI image generation): `https://image.pollinations.ai/prompt/{encoded}?width=&height=&seed=&nologo=true&model=flux`
- **Picsum** (random photos): `https://picsum.photos/seed/{seed}/{w}/{h}`
- Always store attribution in `credit` (title, creator, license, source, landingUrl).
