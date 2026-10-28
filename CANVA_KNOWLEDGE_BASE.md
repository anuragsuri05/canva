# Canva Knowledge Base

> Reference document covering Canva's product surface: navigation, editor UI button-by-button, design types, AI features, sharing/export, brand, apps, developer platform, plans and limits.
>
> **Compiled:** 2026-10-13 from 5 parallel research passes.
> **Confidence legend:** unmarked = consistent across sources · **[?]** = uncertain / sources conflict / may vary by A/B variant or region · **[old]** = possibly outdated.
> **Caveat:** canva.com/help blocks direct fetching, so most help-center facts came via search snippets, a reader proxy, or Canva's own MCP `help` tool. Developer-platform facts (§12) came verbatim from canva.dev's OpenAPI spec and are the most reliable. Canva runs A/B UI variants (e.g. `glow-up` vs `glow-up-variantb`), so labels can differ between accounts.

---

## Table of contents
1. [Timeline & product eras](#1-timeline--product-eras)
2. [Home / dashboard & navigation](#2-home--dashboard--navigation)
3. [Projects, folders, trash](#3-projects-folders-trash)
4. [Templates browsing](#4-templates-browsing)
5. [Editor: header / top bar](#5-editor-header--top-bar)
6. [Editor: left side panel tabs](#6-editor-left-side-panel-tabs)
7. [Editor: contextual toolbar per element](#7-editor-contextual-toolbar-per-element)
8. [Editor: right-click & "…" menus](#8-editor-right-click--more-menus)
9. [Editor: canvas, pages, layers, position](#9-editor-canvas-pages-layers-position)
10. [Animation & transitions](#10-animation--transitions)
11. [Keyboard shortcuts](#11-keyboard-shortcuts)
12. [Design types / product editors](#12-design-types--product-editors)
13. [AI features (Canva AI, Magic Studio, etc.)](#13-ai-features)
14. [Share panel, collaboration, comments, versions, approvals](#14-share-panel-collaboration-comments-versions-approvals)
15. [Download / export options](#15-download--export-options)
16. [Brand Kit / Brand Hub / brand controls](#16-brand-kit--brand-hub--brand-controls)
17. [Content Planner / social scheduling](#17-content-planner--social-scheduling)
18. [Apps marketplace & integrations](#18-apps-marketplace--integrations)
19. [Developer platform (Apps SDK, REST API, MCP)](#19-developer-platform)
20. [Uploads: formats, limits, storage](#20-uploads-formats-limits-storage)
21. [Account settings, teams & roles](#21-account-settings-teams--roles)
22. [Plans & pricing](#22-plans--pricing)
23. [Platforms (web, desktop, mobile, offline)](#23-platforms)
24. [Accessibility, privacy, security](#24-accessibility-privacy-security)
25. [Notifications & help](#25-notifications--help)
26. [Open questions / conflicts](#26-open-questions--conflicts)
27. [Clone-builder cheat sheet](#27-clone-builder-cheat-sheet)
28. [Sources](#28-sources)

---

## 1. Timeline & product eras

| Date | Event |
|---|---|
| Dec 2022 | Magic Write launches |
| Oct 2023 | **Magic Studio** (Magic Design, Switch, Grab, Expand, Morph, Animate, Media…); Canva Shield |
| Mar 2024 | Acquires Serif (Affinity) ~$380M |
| May 2024 | **"Glow up"** redesign (Canva Create 2024): new homepage, floating context toolbar, Editing/Commenting/Viewing mode switcher, restyled side panel |
| Jul/Aug 2024 | Acquires Leonardo.Ai |
| Oct 2024 | **Dream Lab** (Leonardo Phoenix model) |
| Apr 10, 2025 | **Visual Suite 2.0** (Canva Create 2025): Canva AI (conversational), Canva Code, Canva Sheets (Magic Formulas/Insights/Charts), "One Design" unified editor, Photo Editor, Background Generator, Magic Studio at Scale |
| Jun 2025 | Canva MCP server + ChatGPT deep-research connector |
| Jul 2025 | Docs-to-Decks discontinued (from Jul 1); Canva AI "Create a video clip" (Google Veo 3) |
| Oct 2025 | Canva app in ChatGPT (OpenAI DevDay) |
| Oct 30, 2025 | **"Creative Operating System"**: Canva Design Model, Ask @Canva, Video 2.0 (multi-track timeline) + Magic Video, Canva Grow (ads), Forms, Email Design, Affinity relaunched free, **Business plan** (replaces Teams for new signups) |
| Feb 2026 | Image to Video, Style Match, deeper Claude/ChatGPT integrations, Magic Insights narratives, secondary recovery email, split Present button; acquires Cavalry, MangoAI |
| Mar 11, 2026 | **Magic Layers** beta (flat image → editable layers) |
| Apr 16, 2026 | **Canva Create 2026 / Canva AI 2.0** (agentic, research preview), Canva Code 2.0, **Canva Offline** (14 days), **Print Shop**, Learn Grid, Cavalry free; Claude Design "Send to Canva" |
| May–Sep 2026 | Monthly updates: website nav & buttons, Google Analytics for sites, live mobile preview, Sheets tags/filters/conditional formatting, whiteboard sections, Brand Kit approvals (Jul), brand kit from URL, hand-drawn frames (Sep), right-click pan in whiteboards |
| Aug 2026 | Growth forecast cut 30%→20% due to AI serving cost; AI rollout slowed |

---

## 2. Home / dashboard & navigation

### 2.1 Left sidebar ("primary navigation") — web/desktop
Current help-center list: **Canva AI, Create, Projects, Brand, Print Shop, More**. Variants also show:

| Item | Purpose / notes |
|---|---|
| **Home / Create** | Landing dashboard. Can't be moved or unpinned. (Mobile renamed Home→Create.) [label ?] |
| **Canva AI** | Conversational AI (2.0): generate/edit/brainstorm. Position varies by plan/device |
| **Projects** | Folders, designs, uploads (images, videos) |
| **Templates** | Template browser (sometimes under More) |
| **Brand** | Brand Kits, Brand Templates, brand controls (Free gets 1 limited kit) |
| **Apps** | Apps marketplace |
| **Print Shop** | 2026; replaces/extends "Print" |
| **Dream Lab** | AI image gen, URL `canva.com/dream-lab` (often under More) [?] |
| **Approvals** | Approval requests/submissions, filter by status (Business/Enterprise) |
| **Trash** | Under More/Projects [?] |
| **More** | Overflow for unpinned tabs |
| **Available offline** | List of designs made available offline (2026) |
| **Your starred** | Starred designs/folders, sits under "Available offline"; supports **custom sections** |
| Bottom | Avatar/profile menu + team switcher, notifications bell, "Try Pro/Upgrade" CTA [?] |

**Customize navigation:** desktop web + Android tablets only (not phones). Hover tab → **pin icon** pin/unpin (unpinned → More). **Drag** to reorder. Auto-saves, per-user. Uncustomized navs may be auto-reordered by Canva.

### 2.2 Profile / avatar menu
- Name + email; **team switcher** (personal + teams; create/join team)
- **Your account** (personal settings) and **Settings** (team/org) — two separate entry points
- **Theme:** Light / Sync with system / Dark
- Help, Refer friends [?], **Sign out**

### 2.3 Search + Canva AI bar (top of homepage)
- Combined search + AI prompt bar (help: `search-ai-bar`). Mode tabs like Search / Ask Canva AI / Design [?].
- Searches your content, templates, Canva media.
- When scoped to "all your content" → filters: **Owner** (Any owner / Owned by others / you), **Date modified**, **Category** (design type). Filters reset on leaving page.
- **Sort:** newer = Last activity (default), A–Z, Z–A (alphabetical only over 200 most recently opened); older = Most relevant, Newest edited, Oldest edited, A–Z, Z–A.

### 2.4 Category shortcut row (homepage banner)
Round icons, roughly: **For you / Your designs, Templates, Canva AI, Presentation, Social media, Video, Print, Docs, Whiteboard, Sheets, Website, Code, Custom size, Upload, More** [order/set ?].

### 2.5 "Create a design" button / Quick create
- Top-right (older) or sidebar "+ / Create" (newer).
- Menu: search design types; suggested (Presentation, Doc, Whiteboard, Sheet, Instagram post, Video, Poster, Logo…); **Custom size**; **Edit photo**; **Import file** (PDF/PPTX/AI/DOCX/PSD).
- **Quick create** area on homepage: start design, pick template, starred items, Brand Templates.

### 2.6 Custom size dialog
- **Units:** px, in, mm, cm
- Width / Height fields (+ lock aspect ratio [?])
- Limits: min **40 px**; max **8000 px** per side (newer help: max area 8000×3125 px [?]); invalid fields turn **red**
- Button: **Create new design**
- Recently used custom sizes [?]

### 2.7 Home body
- **Recent designs** (grid/list toggle, hover **star**, "…" menu)
- "For you" template suggestions, Brand Templates (Business/Enterprise), promo banners (Canva AI, What's New)

---

## 3. Projects, folders, trash

### Structure
- Tabs/filters: **All, Folders, Designs, Images, Videos** (+ Brand Templates sometimes)
- **Shared with you**: direct shares, group shares, link-opened. Shared folder shows as folder only.
- **Starred** via sidebar "Your starred".
- Folders don't appear in Recents.

### Folders
- Folders & subfolders; **pin** designs/templates/subfolders to top of a folder
- Pin folders in editor side panel (hover → X removes shortcut only)
- **Limits:** Free = 200 designs per folder; paid = 5,000 items per folder
- Share folders with people/groups/team (**Can view / Can edit / Can edit and share**)
- Team folders; copy folders between teams (bulk-copy route; Brand Templates excluded)

### Views, filters, sort
- Grid / list toggle
- Filters: **Owner**, **Category/Type**, **Date modified**
- Sort: Last activity / A–Z / Z–A

### Per-item "…" menu
Open in new tab · **Star/Unstar** · **Make a copy** · **Move** (to folder) · **Share** · **Download** · Rename · Copy link · **Make available offline** (2026) · **Move to Trash** [exact list ?]
- Shared designs can't be removed from your Projects—use Owner filter.

### Bulk actions
Hover → tick **checkbox** → select more → **bottom action bar**: Move (folder icon), Star, Make a copy, Trash.

### Trash
- Retention **30 days**; tabs **Designs / Images / Videos**
- **Restore** (action bar) → back to Projects/Uploads; **Delete forever**; **Empty trash**
- After permanent delete: contact Support within **14 days**
- Images/videos used in a design aren't fully deleted until the design is.
- Lost edits → use Version history, not Trash.

---

## 4. Templates browsing
- Entry: sidebar **Templates**, homepage shortcut, or editor **Design** tab.
- Categories: Presentations, Social media (IG, FB, TikTok, YouTube, LinkedIn), Video, Print (flyers, posters, cards, business cards, invitations), Docs, Whiteboards, Sheets, Websites, Education, Marketing, Events, seasonal collections.
- **Filters** (vary by category): **Style**, **Theme**, **Feature** (animated, video…), **Topic**, **Color**, **Price** (Free/Pro), language.
- **Crown icon** = paid (Pro) element/template; free users get watermark unless swapped.
- Preview modal: page thumbnails, creator ("by …"), related templates, star, primary CTA **"Customize this template"** (Free on Pro template → "Try Pro").
- In editor: click template → **"Apply all N pages"** or single page.
- **Brand Templates** separate (published by admins/brand designers; found under Brand).
- **Color themes**: one-click palettes (paid plans).

---

## 5. Editor: header / top bar

Layout L→R: **Home/menu · File · Resize (Magic Switch) · mode dropdown · Undo/Redo · save status · title … avatars · Insights · Timer · Comments · Share · Present / Print · Avatar**

### Left
- **Home / Menu icon** — back to Home or open homepage nav without leaving editor.
- **File menu** (order approx.):
  - **Create new design** (submenu of types / custom size)
  - **Import files / Upload files**
  - **Settings** (older: **View settings**):
    - **Show rulers and guides** (Shift+R) — desktop only
    - **Add guides** → dialog: presets (3 columns, 6 columns, 12 columns, 3×3 grid), custom columns/rows, gap, margin
    - Lock guides [?]
    - **Show margins** (may be missing in some doc types)
    - **Show print bleed** (bleed size fixed ≈0.125 in / 3 mm)
  - **Accessibility**: Check design accessibility (contrast, text size, alt text), Show captions, Reduce motion/Pause animations, Theme [?]
  - **Design checker** (spelling, low-res images, contrast) [?]
  - **Find and replace text** (Ctrl/Cmd+F)
  - Translate [?]
  - **Make a copy**
  - **Save** (autosave; "All changes saved"; Ctrl/Cmd+S)
  - **Move to folder / Save to folder**
  - **Version history** (paid) → side panel of timestamped versions → **Restore this version** / **Make a copy**
  - **Download**
  - **Print** (Print with Canva)
  - Help / Keyboard shortcuts
  - **Move to Trash**
- **Resize (Magic Switch)** [Pro]: search types or custom size (px/in/mm/cm); **Translate**; **Transform into Doc** (summary, blog post, email, social caption, poem…); then **Copy & resize** or **Resize this design**. Multi-size resize goes to a new folder. Not available for Docs.
- **Mode dropdown:** Editing / Commenting / Viewing (+ **Suggesting** in Docs)
- **Undo / Redo** arrows
- **Save status** (cloud icon, "All changes saved")
- **Design title** (click to rename)

### Right
- **Collaborator avatars** (click → jump to their position)
- **Insights / Analytics** (chart icon, Pro): views/visitors for presentations, websites, public links
- **Timer** (stopwatch): collaborative timer (whiteboards/presentations), presets, play/pause, music
- **Comments** (speech bubble): sidebar with filter/sort/resolved
- **Share** (see §14)
- **Present** (split button + dropdown, Feb 2026): Present full screen · Presenter view · Present and record · Autoplay · Canva Live
- **Print with Canva** (shown for print design types)
- **Ask Canva** button (toolbar; paid plans) → opens Canva AI side panel with quick actions "Design this page", "Generate background", "Create a layout"
- **Canva AI** tab/button (side panel; also top-left entry) [placement ?]

---

## 6. Editor: left side panel tabs

Default order: **Design, Elements, Text, Brand, Uploads, Tools/Draw, Projects, Apps** (+ **Canva AI**). Optional (add via Apps): **Photos, Videos, Audio, Charts, Magic Media, Backgrounds, Styles, Logos, Folders, Notes, Sticky notes**. Overflow → **More**. Hover a tab = preview; click = pin open. Tabs can be pinned/unpinned/reordered. Admins can hide tabs via brand controls; hidden tabs re-addable from Apps.

### Design
- **Templates:** search + filters (style, theme, color, language, Free/Pro); "Templates for this design"; Apply all pages / one page
- **Layouts:** suggested layouts from current content (presentations/docs)
- **Styles:** **Color palettes** (click apply, click again shuffle), **Font sets/combinations**, **Apply brand kit**

### Elements
Search + **Recently used**, then sections:
- **Shapes** (rectangle, rounded rect, circle, triangle, arrows, stars, polygons, speech bubbles, blobs)
- **Graphics** (illustrations, icons, stickers)
- **Lines** (Line, Arrow, Elbow connector, Curve connector)
- **Stickers** (animated)
- **Photos**, **Videos**, **Audio**
- **Charts** (bar, column, line, pie, donut, area, scatter, bubble, radar, funnel, pictogram, progress bar/ring/dial, number, table; "Generate chart from data")
- **Tables**
- **Frames** (circles, shapes, devices, film, letters, polaroid)
- **Grids** (multi-cell photo grids)
- **Mockups** (devices, apparel, print)
- **3D** (shapes, objects), **Gradients**
- **Forms** (polls, quizzes, forms)
- **AI generate** (Magic Media: image/video/graphic, icons, 3D, Shape Generator)
- Collections, Brand elements, data embeds (Google Maps, YouTube)
- Filters: color, animated/static, Free/Pro, orientation

### Text
- **Add a text box** (shortcut T)
- **Magic Write**
- Brand Kit text styles
- Defaults: **Add a heading**, **Add a subheading**, **Add a little bit of body text**
- **Dynamic text**: page numbers, date, **Captions**
- **Font combinations** (search/filter)

### Brand
Brand Kit selector → logos, colors, fonts, brand templates, graphics, photos, icons, brand voice, guidelines.

### Uploads
- **Upload files** button + "…" (Google Drive, Dropbox, Instagram, Facebook, Google Photos…)
- **Record yourself** (camera/screen recording studio)
- Sub-tabs **Images / Videos / Audio**, folders

### Tools / Draw
- **Pen, Marker, Highlighter, Glow pen** (Pro?), **Eraser**
- Per-tool **color, size/thickness, transparency**
- **Shape assist**: hold stroke ~1s → snaps to rectangle/arrow/circle/star/heart
- **Select** cursor to exit
- Whiteboards also: Shapes, Sticky notes, Connectors, Tables

### Projects
Recent designs, folders, images, starred, team-shared.

### Apps
**Discover**, **Your apps**, search. Popular: Magic Media, Mockups, Translate, QR Code, Google Drive, YouTube, Bitmoji, D-ID, Charts, Brand Voice, Magic Morph, Typecraft.

### Canva AI tab
Prompt box (text/voice mic), **"+"** menu (Upload, Add from Canva, Apply brand, Connect apps), Web Research toggle, **Stop** button. See §13.

---

## 7. Editor: contextual toolbar per element

Floating **quick-actions toolbar** above the selection; **">>"** at end opens full **Edit panel**. Nothing selected → page options: **Background color**, **Animate** (page), **Duration** (video), **Position**.

### 7.1 Text
| Control | Details |
|---|---|
| **Font family** | Search; Brand fonts, Recently used, Popular, uploaded; filters. Shift+Ctrl/Cmd+F |
| **Font size** | − / + / number field. Shift+Ctrl/Cmd+, / . |
| **Text color** | Panel: search, Document colors, Brand colors, Photo colors, Default colors, "Change all"; "+" picker (hex), eyedropper, **gradient** (linear/radial) |
| **B / I / U / S** | Strikethrough in overflow |
| **aA case** | Uppercase toggle (Shift+Ctrl/Cmd+K) |
| **Alignment** | Cycles Left/Center/Right/Justify |
| **List** | Bulleted (Shift+Ctrl/Cmd+8) / Numbered (…+7) |
| **Spacing** | Letter spacing, Line spacing, **Anchor text box** Top/Middle/Bottom |
| **Effects** | see below |
| **Animate**, **Position**, **Transparency** (0–100), **Copy style** (paint roller) | |
| **Magic Write** | Rewrite, Shorten, Expand, Summarize, Fix spelling, More fun/formal, custom prompt, Generate in brand voice |
| **"…"** | Link (Ctrl+K), Lock, Comment, Alt text, Translate, Strikethrough, Show timing |

**Text Effects panel**
- **Style:** None · **Shadow** (offset, direction, blur, transparency, color) · **Lift** (intensity) · **Hollow** (thickness) · **Splice** (thickness, offset, direction, color) · **Echo** (offset, direction, color) · **Glitch** (offset, direction, color scheme blue-red / cyan-magenta) · **Neon** (intensity) · **Background** (roundness, spread, transparency, color) · Outline [?]
- **Shape:** **Curve** (slider −100…100)
- Gradient text renders fully with Shadow/Lift/Curve/Echo only.
- AI text effects [?]

### 7.2 Image / photo
- **Edit** (in-place photo editor since 2025), groups:
  - **Magic Studio / Tools:** **Background Remover** (Pro; erase/restore brush, size, show original) · **Magic Eraser** (Brush/Click/Foreground/Text; Reset, Compare, Save as copy) · **Magic Edit** (All/Brush/Click/Deselect + prompt → Generate) · **Magic Grab** (not in frames/grids) · **Grab Text** · **Magic Expand** (Free-form / Whole page / 1:1, 16:9, 9:16, 4:3, 3:2…) · Magic Morph · Upscale · **Magic Layers**
  - **Effects:** Shadows (Glow, Drop, Angled, Page lift, Curved, Backdrop), **Duotone**, **Blur** (brush/whole), **Auto Focus**, **Face retouch**, app effects (Liquify, Pixelate, Glitch, Frame, Halftone, Colormix, Screen)
  - **Filters:** presets + intensity (Epic, Festive, Summer, Retro, Selfie, Street, Whimsical, Cali, Drama, Edge, Nordic, Solar, Bliss, Fresco, Grayscale…)
  - **Adjust:** **Auto adjust**, Reset; **White balance** (Temperature, Tint); **Light** (Brightness, Contrast, Highlights, Shadows, Whites, Blacks); **Color** (Vibrance, Saturation); **Texture** (Clarity, Sharpness [?], Vignette); **Select area** (Foreground/Background); **Color edit** (per-color hue)
- **Crop** (handles, rotate slider, aspect presets, Done/Reset)
- **Flip** (horizontal/vertical)
- **Border** (none/solid/dashed/dotted, weight, color), **Corner rounding**
- Animate, Position, Transparency, Copy style
- **"…"**: Replace, **Set image as background**, Detach image from background, Alt text, Info (credits), Link, Lock, Comment, **Apply colors to page**

### 7.3 Shapes / graphics
- **Color swatches** (one per recolorable SVG color, "Change all"; gradients)
- **Border style** (solid/dashed/dotted), weight, corner rounding
- Double-click to type text inside shape
- Flip, Animate, Position, Transparency, Copy style, "…"
- **Lines:** color; style (solid/dashed/dotted), weight, rounded ends; **start/end markers** (arrow, circle, square, bar, diamond); **line type** Straight / Elbowed / Curved

### 7.4 Video
- **Edit video:** **BG Remover** (Pro), Effects (filters, shadows, duotone), Adjust sliders, **Enhance Voice** (strength slider)
- **Crop, Flip, Trim** (kept section highlighted) + **Highlights** (AI best moments → separate scenes) + auto-trim pauses
- **Playback:** Autoplay, **Loop video**, **Speed** 0.25×–2×
- **Volume** slider/mute (M); **Audio tools**: Fade in/out, **Extract audio**
- Captions (auto-generate)
- Animate, Position, Transparency

### 7.5 Audio
Trim (drag segment), **Volume** (+ **Balance all**), **Fade in / Fade out**, **Beat Sync** (Show beat markers / Sync now), Delete.

### 7.6 Charts
- **Edit** → data table panel (**Expand data table**; row/column "…" insert before/after, delete, sort A–Z/Z–A; import XLSX/CSV/TSV/paste/Google Sheets; link to Canva Sheets)
- **Settings:** Legend, Labels, Grid lines, Line weight, Spacing, Corner rounding, Show values, Smooth lines, Points
- Switch chart type (keeps data), colors, label font/size, Animate, Position

### 7.7 Tables
Cell color, border weight/style, cell spacing, text toolbar in cells. Row/col "…": Add row above/below, Add column left/right, Delete row/column, Merge/Unmerge, Move, Clear cell, Fit to content, Distribute rows/columns.

### 7.8 Frames / grids
Drag media in; double-click to reposition/crop inside; **Detach image**; grid **Spacing** slider; color fill for empty cells.

---

## 8. Editor: right-click & "…" More menus

**Element right-click**
- Copy (Ctrl+C) · **Copy style** (Ctrl+Alt+C) · Paste (Ctrl+V) · **Paste style**
- **Duplicate** (Ctrl+D) · **Delete**
- **Layer** ▸ Bring forward, Bring to front, Send backward, Send to back, Show layers
- **Align to page** ▸ Left, Center, Right, Top, Middle, Bottom (multi: Align elements)
- **Group / Ungroup**
- **Comment** (Ctrl+Alt+N)
- **Link** (Ctrl+K)
- **Lock** ▸ Lock / Lock position only
- **Alternative text** (or mark decorative)
- **Show timing** (video timeline)
- **Apply colors to page** (images) · **Set image as background** · **Replace**
- **Info** · Edit image/video · **Translate** (text) · **Split** (video) · **Extract audio** (video) · **Connect data** (Bulk Create)
- Search for similar / See more like this / View collection (library items)

**Empty canvas/page right-click**
Paste · **Add page** · **Duplicate page** · **Delete page** · **Hide page** · Add notes · Show/Hide rulers · Add guides · Background color · Comment · **Lock page** · **Expand to whiteboard** (presentations)

**"…" on floating toolbar** = same as element right-click.

---

## 9. Editor: canvas, pages, layers, position

### Page header (above each page in scroll view)
**Page title** ("Add page title") · Move up / Move down · **Hide page** (eye) · **Lock page** · Duplicate · Delete · Add page · Add notes. **"+ Add page"** below last page (video: "+" on timeline).

### Footer / bottom bar (L→R)
- **Notes** (speaker notes)
- **Duration / timer** (video)
- **Page counter** ("Page 1/5")
- **Zoom slider** + **% box** (presets 10–300%, **Fit**, **Fill**)
- **View switcher:** **Scroll view** (Alt+Ctrl+1) · **Thumbnail view** (Alt+Ctrl+2; filmstrip; thumbnail "…" → Add / Duplicate / Delete / Hide / Lock / Copy link to page) · **Grid view** (Alt+Ctrl+3; drag reorder)
- **Full screen** (Ctrl/Cmd+Alt+P)
- **Help "?"** (Help, Keyboard shortcuts, What's new, Send feedback)

### Rulers, guides, snapping
- Rulers: Shift+R; drag from ruler to create guide; Add guides grid presets
- **Smart guides:** pink alignment lines (centers/edges), equal-spacing indicators
- Rotation snaps; Shift = 15° steps [?]

### Selection
Shift+click, marquee drag, Ctrl/Cmd+A; Tab/Shift+Tab cycle; Alt+drag duplicate; Shift+corner = keep proportions.

### Position panel
- **Arrange tab:** Forward / Backward / To front / To back · **Align to page** (Top, Middle, Bottom, Left, Center, Right) · multi-select: **Align elements**, **Space evenly** (Vertically/Horizontally), **Tidy up** (Alt+Shift+T) · **Advanced:** Width, Height, **Ratio lock**, **X**, **Y**, **Rotate**°
- **Layers tab:** **All / Overlapping**; drag reorder; per-layer menu (lock, delete, duplicate…) [?]; expandable groups; hover highlights element

### Locking
**Lock** (Alt/Opt+Shift+L) = full lock; **Lock position only** = content still editable. Padlock icon on locked elements.

### Video timeline (Video 2.0)
Multi-track; scenes as clips; separate tracks for audio (waveforms) and elements; playhead; Space play/pause; **S** split; drag handles trim; scene duration chip; "+" transition between clips; timeline zoom; enlargeable timeline; pin element across full video.

---

## 10. Animation & transitions

### Animate panel
- Select page/element → **Animate**. Tabs: **Page / Element / Text**. Hover = preview.
- Speed presets **Slow / Medium / Fast** or exact intro/outro duration. Max 10 s per animation; max 50 animations per design.
- **Animate on:** Enter / Exit / Both (exit can mirror enter)
- **Direction** ↑↓←→ for directional styles
- Text **Animate by:** Letter / Word / Line / Element [?]
- **Remove animation**

### Groups / style names
- **Page tab:** Magic Animate · Combinations · Basic · Exaggerate · Photo Movement
- **Basic:** Rise, Pan, Fade, Pop, Wipe, Blur, Succession, Breathe, Baseline, Drift, Tectonic, Block, Ascend, Shift, Merge
- **Exaggerate:** Tumble, Neon, Scrapbook, Stomp, Bounce, Roll, Skate, Burst, Clarify [?]
- **Photo movement:** Photo flow, Photo rise, Photo zoom, Pan, Slide [?]
- **Text-only:** **Typewriter**, Ascend, Shift, Merge, Block, Burst, Bounce, Roll, Skate, Spread [?]
- **Emphasis (loop):** Pulse, Wiggle, Flicker, Rotate, Bounce [?]

### Magic Animate
Animate → Page → **Magic Animate** → Recommended style + Alternative styles; **Remove Magic Animation**. Presentation/social/video only; paid.

### Create an animation (motion path)
Select element → **Create an animation** → drag along path (Shift = straight). **Movement style:** Original / Smooth / Steady; **Speed** slider; **Orient element to path** toggle; **Done**.

### Transitions (between pages/scenes)
Hover between pages → **Add transition**. Types: **Match & Move** (animates identical elements across pages), **Dissolve**, **Slide**, **Circle wipe**, **Color wipe**, **Line wipe**, **Flow**, **Stack and crop** (+ others [?]). **Duration** 0.1–2.5 s; **Direction**; **Apply between all pages**. Carry into MP4/GIF.

### Show timing
Right-click element → Show timing → drag its bar on the timeline.

---

## 11. Keyboard shortcuts
Windows uses Ctrl/Alt; Mac uses Cmd/Option.

### General
| Action | Win | Mac |
|---|---|---|
| Undo / Redo | Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) | Cmd+Z / Cmd+Y (Cmd+Shift+Z) |
| Copy / Cut / Paste | Ctrl+C/X/V | Cmd+C/X/V |
| Duplicate | Ctrl+D | Cmd+D |
| Select all / Deselect | Ctrl+A / Esc | Cmd+A / Esc |
| Delete | Del/Backspace | Delete |
| Save | Ctrl+S | Cmd+S |
| Quick actions / assistant search | / | / |
| Focus toolbar / back to canvas | Ctrl+F1 / Ctrl+F2 | Cmd+F1 / Cmd+F2 |
| Find & replace | Ctrl+F | Cmd+F |
| Link | Ctrl+K | Cmd+K |

### Add elements
**T** text box · **R** rectangle · **C** circle · **L** line · (whiteboard sticky note **S** [?]; draw **D** [?])

### Arrange
| Action | Win | Mac |
|---|---|---|
| Group / Ungroup | Ctrl+G / Ctrl+Shift+G | Cmd+G / Cmd+Shift+G |
| Forward / Backward | Ctrl+] / Ctrl+[ | Cmd+] / Cmd+[ |
| To front / To back | Ctrl+Alt+] / Ctrl+Alt+[ | Cmd+Opt+] / [ |
| Lock / unlock | Alt+Shift+L | Opt+Shift+L |
| Tidy up | Alt+Shift+T | Opt+Shift+T |
| Next / prev element | Tab / Shift+Tab | same |
| Nudge / big nudge | Arrows / Shift+Arrows | same |
| Duplicate by drag | Alt+drag | Opt+drag |

### Text
| Action | Win | Mac |
|---|---|---|
| Bold / Italic / Underline | Ctrl+B/I/U | Cmd+B/I/U |
| Uppercase | Ctrl+Shift+K | Cmd+Shift+K |
| Align L/C/R/J | Ctrl+Shift+L/C/R/J | Cmd+Shift+L/C/R/J |
| Font size −/+ | Ctrl+Shift+, / . | Cmd+Shift+, / . |
| Line spacing −/+ | Ctrl+Alt+↓/↑ | Cmd+Opt+↓/↑ |
| Letter spacing −/+ | Ctrl+Alt+, / . | Cmd+Opt+, / . |
| Anchor top/mid/bottom | Ctrl+Shift+H/M/B | Cmd+Shift+H/M/B |
| Numbered / bulleted list | Ctrl+Shift+7 / 8 | Cmd+Shift+7 / 8 |
| Copy / paste style | Ctrl+Alt+C / V | Cmd+Opt+C / V |
| Font menu | Ctrl+Shift+F | Cmd+Shift+F |

### Video / audio
Space play/pause · M mute · S split · Ctrl+Alt+L loop [?] · [ / ] trim at playhead [?] · , . seek frame / Shift+, . 5 s [?]

### Zoom / view
| Action | Win | Mac |
|---|---|---|
| Zoom in / out | Ctrl+= / Ctrl+- | Cmd+= / Cmd+- |
| Actual / Fit / Fill | Ctrl+0 / Alt+Ctrl+0 / Shift+Ctrl+0 | Cmd+0 / Opt+Cmd+0 / Shift+Cmd+0 |
| Rulers & guides | Shift+R | Shift+R |
| Toggle side panel | Ctrl+/ | Cmd+/ |
| Scroll / Thumbnail / Grid view | Alt+Ctrl+1/2/3 | Opt+Cmd+1/2/3 |
| Present full screen | Ctrl+Alt+P | Cmd+Opt+P |
| Pan (whiteboard) | Space+drag / right-click drag | same |

### Pages
Add page Ctrl/Cmd+Enter · Delete empty page Ctrl/Cmd+Backspace · Next/prev slide (presenting) → / ←

### Comments
Add Ctrl+Alt+N (Cmd+Opt+N) · Next/prev N / Shift+N · Focus comment Ctrl/Cmd+5 · emoji Shift+: in comment mode

### Magic Shortcuts (while presenting, desktop only)
**B** blur · **C** confetti · **D** drumroll · **M** mic drop · **O** bubbles · **Q** quiet · **U** curtain call · **1–9** countdown timer of N minutes (0 = ? [?]) · **X** clear effects [?] · **Shift+?** open Magic Shortcuts menu

### Desktop app
| Action | Win | Mac |
|---|---|---|
| New design tab | Ctrl+T | Cmd+T |
| Close / reopen tab | Ctrl+W / Ctrl+Shift+T | Cmd+W / Cmd+Shift+T |
| Go to tab 1–8 / last | Ctrl+1–8 / Ctrl+9 | Cmd+1–8 / Cmd+9 |
| Next / prev tab | Alt+Ctrl+→/← | Opt+Cmd+→/← |
| Settings | Ctrl+, | Cmd+, |
| Home | Ctrl+Shift+H | Cmd+Shift+H |
| Reload / Quit | Ctrl+R / Ctrl+Q | Cmd+R / Cmd+Q |
| UI zoom in/out/reset | Ctrl+Shift+= / - / 0 | Cmd+Shift+= / - / 0 |
| Full screen | — | Ctrl+Cmd+F |

---

## 12. Design types / product editors

Visual Suite 2.0 uses one unified editor ("One Design") where a single design can hold multiple page types (e.g. a Presentation page inside a Doc).

### 12.1 Presentations
**Present modes** (Present button dropdown, or Share → Present):
1. **Present full screen** — arrow keys / on-screen arrows
2. **Presenter view** — two windows: audience slides + presenter window (notes, next slides, clock, count-up timer, Countdown, AutoPlay, notes font size [labels ?])
3. **Present and record** ("Talking presentations") — Recording studio: **Camera / Camera & Screen / Screen**; Pause / Restart / End recording; auto public view link + Download; 1 recording per design; desktop only; unavailable in India
4. **Autoplay** — auto-advance (kiosks)
- Presentation toolbar: Prev/Next, Pause/Play, Full screen, Magic Shortcuts, settings gear; remote control via QR/link.

**Canva Live** (audience Q&A): Present → Canva Live icon → **Start new session** → join code (6-digit vs 8-char [?]) + QR; audience at **canva.live**. Settings: Q&A on/off, Reactions on/off. Q&A panel sort Newest / Oldest / Top voted. Must click **End**. Desktop only; Free OK.

**Timer:** default 5 min, +/−, Play/Pause/Reset.
**Notes:** footer Notes button; shown in Presenter view.
**Transitions:** §10.
**Interactive:** Forms/Polls/Quizzes in Elements → Forms; AI quiz generation; ≤10 options/question, 10 forms/page, 20/design; responses only via Canva link; insights Pro.
**AI:** Magic Design for Presentations / Guided Presentations (Canva AI).
**Docs to Decks:** discontinued from Jul 1 2025 (workaround: Presentation page type inside a Doc).
**Export PPTX:** Share → Download → Microsoft PowerPoint (Free). Animations don't transfer; fonts/spacing may shift.

### 12.2 Video (Video 2.0, Oct 2025)
- **Multi-track timeline** (layers, overlays, titles, audio waveforms), enlargeable; pin element across whole video; videos added as layers by default. Opt-out toggle "Use new multi-track video editor (beta)" [old ?].
- **Trim** (drag handles) · **Split** (S / right-click) · **Speed** 0.25×–2× · move timing by dragging.
- **Audio:** Volume, Balance all, Fade in/out, Extract audio, **Beat Sync** (≤10 min audio; presentations/social/video; auto mode Pro).
- **Captions:** Text → Dynamic text → **Captions** (or Apps) → pick tracks → style pack (20+) → spoken language (auto) → translate-to → **Generate captions**; burned in on MP4 only. **Video Translator** (Pro, 100+ langs).
- **Recording studio:** Uploads → Record yourself (Camera / Screen / Camera & Screen) → saves to page + Uploads → Videos.
- **Effects/AI:** Video BG Remover (Pro), transitions, Animate, Magic Video, AI voiceover, Enhance Voice, Highlights.
- **Export:** MP4 480p / 720p / 1080p / **4K** (desktop only); GIF size 0.2×–1×/custom.

### 12.3 Canva Docs
- **"/"** or **"+"** beside cursor → quick insert: Heading, Subheading, Body, bulleted/numbered/checklist, Table, Chart, Embeds, Divider, Banner, Date, Magic Write.
- Page types: **Digital / Pageless / A4 / Letter**; page breaks; **Columns** (≤4); **Outline** side nav.
- Add page type (e.g. Presentation page in a Doc).
- Tables, charts (link to Sheets), Magic Write (Rewrite, Shorten, Transform text, Create summary, tone), Translate, Magic Switch, comments, **Suggesting mode**, real-time co-editing.
- Export: PDF (A4/A3/Letter/Legal size), DOCX.

### 12.4 Whiteboards
- Create → Whiteboard, or right-click a presentation slide → **Expand to whiteboard** (collapse again).
- **Infinite canvas:** Space+drag / right-click drag to pan; Ctrl/Cmd+scroll zoom; fit; "Back to content".
- **Sticky notes:** colors, author name, reactions. **Sort** (select → floating toolbar): By color / By name / By topic (AI) / By reactions. **Create summary** (AI). Transform into Doc.
- **Connectors** (straight/elbow, arrowheads, snap to shapes), Draw tools, shapes, tables, charts, **sections** (2026), hand-drawn frames.
- **Timer** synced for all collaborators (alerts at 10 s and end).
- Templates: mind map, flowchart, Kanban, brainstorm, retro, SWOT, affinity map, timeline, Venn.

### 12.5 Canva Sheets (Apr 2025)
- Grid cells; **=** formulas (60+ functions); sort; freeze rows; number formats; images/videos/icons in cells; tags, filters, **conditional formatting** (2026). Import CSV/XLSX; export CSV/XLSX/PDF.
- **Actions menu** (select cells): **Magic Insights**, **Magic Charts** (25+ chart types, embed in designs, live-linked), **Magic Formulas** (plain language → formula), Magic Write fill empty cells, **Translate**, **Bulk Create**, Bulk Magic Resize, Background Remover on image cells.
- **Data connectors:** Google Analytics, HubSpot (Business/Enterprise), Statista, Snowflake.
- Forms responses sync to Sheets; Canva Code can publish Sheets data.

### 12.6 Bulk Create & Data Autofill
- **Bulk Create** (desktop; paid): template with placeholders → data (Sheet range → Actions → Bulk Create, upload CSV/XLSX/TSV, or manual) → **Auto-match fields** (AI) or drag field onto element / right-click → **Connect data** → generate one page per row. Limits: **300 rows × 150 columns**, one media per cell, no web image URLs.
- **Data Autofill:** single template from live source, up to 150 fields.

### 12.7 Websites
- Any design publishable; pages = **sections** (or **multi-page sites up to 45 pages**, each its own path).
- Free: design 20 sections/page but publish only 10.
- **Navigation:** "Include navigation menu" (anchor links from page titles), customize colors/fonts/items, custom links, buttons (2026).
- **Preview** desktop/mobile ("Resize on mobile"; live mobile preview 2026).
- **Publish Website panel:** domain = free **my.canva.site/…** (link-in-bio/mobile → **canva.link**) / **Buy a new domain** / **Connect existing domain** (paid). Settings: **Site** tab (search engine visibility, **password protection**, **favicon** 280×280 JPG/PNG ≤25 MB, description); **Pages** tab (per-page URL, SEO title/description). Manage at Settings → Web domains.
- **Google Analytics** integration (2026), Insights, Forms, Canva Code embeds.

### 12.8 Print / Print Shop
- **PDF Print** download: crop marks & bleed, flatten PDF, RGB/CMYK (paid). View → Show print bleed.
- **Ordering:** **Print with Canva** (top bar or Share) → product → size, paper/material, finish (matte/gloss), quantity (bulk discounts) → **auto-proofer** → cart → checkout. Cancel/edit address within 2 h.
- **Shipping:** Economy (≤14 business days), Standard (≤8), Express (≤3) — US: 9–18 / 7–10 / 3; free option; pickup in some regions; **Happiness Guarantee** 30 days.
- **Products:** business cards, flyers, posters, brochures, invitations, cards, stickers, labels, banners, retractable banners, yard signs, t-shirts, hoodies, sweatshirts, totes, mugs, tumblers, bottles, pint glasses, coasters, pillows, photo books, magazines, calendars.
- **Print Shop** (2026): dedicated browse/design/order hub. Business plan = 10% off print.

### 12.9 Social media
- Share → **Share on social** (post now; Free OK) / **Schedule** (Pro+). See §17.
- Common sizes: IG post 1080×1350 (4:5) or 1080×1080; IG/FB Story 1080×1920; YouTube thumbnail 1280×720; FB cover 1125×633 vs 820×312 [?].
- **Canva Grow** (Oct 2025): AI ad campaigns, publishes to Meta, performance insights.

### 12.10 Email Design (Oct 2025)
Email design type, 100+ templates or AI; buttons/banners/images; preview desktop/mobile; **send test email**; **export HTML**; Share → **Klaviyo** (lands in Content → Templates); Yotpo.

### 12.11 Forms (Oct 2025)
10 question types: short/long answer, multiple choice, checkboxes, star rating, scale, number, email (validated), poll, mood meter, quiz (single/multi). Responses → Canva Sheets. Share via link. Insights Pro.

### 12.12 Canva Code
- Homepage → **Code**, or Canva AI → **</> Code** → **Use in a design** (embed) or **Publish** (site).
- Per-page chat history; diff-based edits; version per prompt; Edit panel (title, toggles for export button/search/tags, colors, brand fonts, animations, media swap); **Show code → Copy code** (no file export, no direct edit).
- **Code 2.0 (2026):** Free/Pro/Business/Enterprise/Edu; 50+ templates; **HTML import**; responsive + mobile preview; collab/comments; forms → Sheets; publish to free/custom domain or **SSO-protected**; 75% faster.

### 12.13 Brand templates
Share → **Brand Template** → choose folder → **Publish**. Locks: position lock, full lock, granular (lock text formatting but allow wording; lock image effects but allow crop). Locks hold under AI generation.

### 12.14 Other tools
- **Charts:** Apps → Charts (types §6/§7.6); AI charts from CSV.
- **Mockups** (Smartmockups): Apps → Mockups; device/print/apparel/3D scenes; apparel color; adjust image; some Pro.
- **Photo Editor:** standalone design type (Visual Suite 2.0), point-and-click object editing.
- **Logo maker:** logo templates + AI logo via Dream Lab.
- **QR code:** Elements/Apps → QR code → URL → optional background color, foreground color, margin → Save (static); dynamic QR codes in newer help [?].
- **Courses** (Teams/Edu): Projects → Add new → Course (or convert folder); ordered activities (Resource or Template); **Assign course** (group, notify, copy link); **Reporting** tab (Not started / In progress / Completed). Lessons; **Learn Grid** (2026, free for schools).
- **Affinity** (free, Oct 2025): vector + pixel + layout app; Canva AI Studio inside it (paid).
- **Flourish** (data viz; included in Business).

---

## 13. AI features

### 13.1 AI allowance system (Help: "AI access in Canva")
- **Standard tools** (unmetered on paid; counted on Free/Pro Lite): Canva AI text & Magic Write, photo/video animations, AI Voice, Image Upscaler, basic image gen, Magic Formulas, Affinity on-device ML.
- **Premium tools** (draw from pool): Magic Layers, "Generate a design", "Create an image", Canva Code, generate elements (shapes, 3D, charts, forms), Music & SFX generator, form generator, Affinity Premium AI.
- **Ultra tools** (heaviest): Canva AI 2.0 conversational design, "Create a video clip" (Veo 3), advanced image models.

| Plan | Premium/mo | Ultra/mo |
|---|---|---|
| Free | ~20 (combined Standard+Premium) [conflict: older "200 Standard/20 Premium"] | none |
| Pro / Teams / Edu / Nonprofit | ~200 | ~20 |
| Business / Enterprise | ~400 | ~40 |

- Per person, not pooled. Paid resets on billing date; Free resets 00:00 UTC on the 1st. Track at Settings → Billing → **AI usage**. Over limit: Premium continues with pauses (paid); Ultra blocked. Failed generations count. **AI Pass** $100/person/mo (40× Pro); **AI top-ups** (Business, 30-day validity). Generations from ChatGPT/Claude/Copilot draw from the same allowance.

### 13.2 Canva AI (conversational assistant)
**Where:** homepage sidebar "Canva AI" (mobile bottom tab); editor sidebar Canva AI tab; homepage search/AI bar; Ask Canva toolbar button.
**Input:** text or **voice mic**; **"+"** (Upload, Add from Canva, Apply brand, Connect apps); **Web Research** toggle.
**Modes (1.0, Apr 2025):**
- **Design for me / Generate a design** → up to 8 editable drafts (presentations, posters, cards, flyers, invitations, business cards, docs, IG/FB/Pinterest/YouTube/X formats, social videos). Absorbed Magic Design.
- **Create an image** (Dream Lab engine; style refs, aspect ratios)
- **Draft a doc** (Magic Write)
- **</> Code** (Canva Code)
- **Create a video clip** (Google Veo 3, 8 s with audio, 1280×720)
- **Guided Presentations**, brainstorming/Q&A
- Models: Canva's own (Design Model, Lucid Origin, Proteus, I2V), Leonardo Phoenix, OpenAI, Anthropic (Code built on Claude 3.7 Sonnet).

**Canva Design Model** (Oct 2025): "design-aware" foundation model producing layered, editable designs; also in ChatGPT/Claude.

**Canva AI 2.0** (Apr 16 2026, research preview; Pro+; rollout slowed Aug 2026 [?]):
- Layers: conversational design · agentic orchestration (multi-format campaigns) · layered object intelligence (edits only named element) · **Memory Library** (preferences, "About Me", past designs)
- Six workflows: **Connectors** (Slack, Gmail, Google Drive, Calendar, Notion, Zoom, HubSpot, Asana, Gong…; MCP-based, read-only; Canva AI → Connect apps) · **Scheduling** (recurring background tasks) · **Web Research** · **Brand Intelligence** (auto-apply brand, refresh old designs) · **Canva Code 2.0** · **Sheets AI**
- **Template Remix**
- **Conversational editing in editor:** e.g. "Make all headlines blue"; restyle, variations (new pages), resize, add slides from doc, bulk edits across pages, re-theme, Gantt charts; **Stop** button.

**Ask Canva:** originally @Canva in comments (Oct 2025); now an **Ask Canva toolbar button** → side panel; quick actions Design this page / Generate background / Create a layout. Not on Free/Edu toolbar.

### 13.3 Magic Studio — design & text
| Tool | What / where | Plan |
|---|---|---|
| **Magic Design** | Prompt/image/logo → designs; Design tab prompt; **Magic Design for Video** (3–10 clips) | Premium |
| **Magic Write** | Draft, rewrite, shorten, summarize, tone; Docs "/" or "+", text toolbar, Sheets fill cells | Standard |
| **Magic Switch** | Resize menu: **Resize** (multi-size → new folder), **Transform into doc** (summary/blog/email/poem…), **Translate** | Pro+ |
| **Translate** | Right-click text → Translate text / Magic Switch / Translate app. Options: target language (100+), tone (Original, Conversational, Informative, Professional, Friendly, Inspirational), reduce font size to fit, duplicate page, mirror for RTL, translate without copy. 2,000 chars/run | Pro+ |
| **Bulk Create** | §12.6; AI auto-match | Pro+ |
| **Magic Animate** | §10 | Paid |
| **Magic Morph** | Apps → Magic Morph; AI textures/styles on text/shapes | [?] |
| **Brand Voice** | Brand Kit → Add your brand voice (500 chars vs words [?]); "Generate in this brand voice" | Pro+ |
| **Brand Assist** | Real-time off-brand flags (colors, fonts, logos) | Teams+ |

### 13.4 Image AI
| Tool | Where / options | Notes |
|---|---|---|
| **Magic Media** | Side panel/Apps; tabs **Images / Graphics / Videos**; "Inspire me"; styles (photography, digital art, fine art: Watercolor, Filmic, Neon, Color Pencil, Retrowave…); reference image; square/landscape/portrait; Generate again / more like this | Video = 4 s silent; Premium |
| **Dream Lab** | Homepage → More → Dream Lab (not in editor); 4 images/prompt; 15+ styles; reference image; quality tiers; Edit image; Boost resolution; History; AI label | Leonardo Phoenix → Lucid Origin; Premium |
| **Magic Edit** | Edit → Tools → Magic Edit; All/Brush/Click/Deselect + prompt | Google "Nano Banana" [?] |
| **Magic Eraser** | Brush/Click/Foreground/Text → Erase; Reset/Compare/Save as copy | Pro |
| **Magic Grab** | Edit → Tools → See all → Magic Grab; separates subject, fills background | Not in frames/grids |
| **Grab Text** | Makes image text editable; no bold/italic/rotated/non-Latin | Pro+ |
| **Magic Expand** | Preset ratio or drag crop → Expand | struggles w/ faces |
| **Background Remover** | "BG Remover" toolbar; Projects; folder bulk (50 imgs); Sheets; Canva AI; erase/restore brushes. Image <9 MB, output ≤10 MP; video <10 min (or 90 s [?]) | Paid |
| **Background Generator / Magic Background** | Place subject into generated scene | 2025 |
| **Magic Layers** | Flat PNG/JPG → editable layers (live text, objects, bg) | Premium, beta Mar 2026 |
| **Style Match** | New graphics adopt design's look | Feb 2026 |
| **Image Upscaler** | | Standard |
| **Image to Video** | 3 s clip from still | Feb 2026 |
| **Element generators** | Elements tab: photos, video, icons, 3D, Shape Generator | Premium |

### 13.5 Video & audio AI
- **Magic Video:** 1–10 clips/photos + prompt/style → 60 s vertical multi-scene video with transitions + music; Replace media; "Try a different vibe"; all plans; hourly cap.
- **Create a video clip** (Veo 3, Ultra) vs **Magic Media video** (4 s silent, Premium).
- **Highlights** (trim → Highlights; Pro), **Auto-trim** pauses.
- **Beat Sync** (Display beat markers / Sync now; Pro).
- **Enhance Voice** (noise removal, strength slider; Pro+).
- **AI Voice / Text to Speech** (Elements/Apps → AI Voice; language + voice; 1,000–2,000 chars [?]; Standard).
- **Music & Sound Effect Generator** (Premium).
- **Auto captions** + Video Translator.

### 13.6 Sheets AI
Magic Formulas (Standard), Magic Insights (Premium; summaries/formulas/charts; narratives 2026), Magic Charts (Premium; live data), Magic Studio at scale, Sheets AI 2.0 (whole designed spreadsheets).

### 13.7 External AI integrations
- **Canva AI Connector** (remote MCP `mcp.canva.com/mcp`): ChatGPT, Claude, Gemini, Copilot; all plans (brand templates/autofill gated); admins can disable (Controls and Permissions → Third-party integrations).
- ChatGPT: Canva GPT (Jan 2024), deep research connector (Jun 2025), Canva app in ChatGPT (Oct 2025).
- Claude: connector; **Claude Design → Send to Canva** (Apr 2026; decks → editable Presentations; HTML → Code designs, no JS).
- **Canva Shield:** AI safety, $200M creator fund, opt-out of training, IP indemnity (Enterprise).

---

## 14. Share panel, collaboration, comments, versions, approvals

### 14.1 Share panel (top-right **Share**)
- **People with access:** add names/emails/groups/team; per-person permission dropdown.
- **Collaboration link — access:** 🔒 **Only you can access** (default) · **Anyone in [team]** · 🌐 **Anyone with the link**
- **Permission:** **Can edit** · **Can comment** · **Can view** (folders also **Can edit and share**). Guests with edit link can edit without signing in, but can't comment until logged in.
- **Copy link** button.
- **Quick-action tiles** + **See all**:

| Option | Notes |
|---|---|
| **Download** | §15 |
| **Share on social** | IG, FB, LinkedIn, Pinterest, X, TikTok, YouTube, Slack, Tumblr… (post now Free; schedule Pro) |
| **Present** / **Present and record** | §12.1 |
| **Public view link** | Read-only webpage link ("Create public view link") |
| **Template link** | Recipients get their own copy |
| **Print with Canva** | §12.8 |
| **Embed** | Makes design public → **Smart embed link** or **HTML embed code**; can unpublish |
| **QR code** | QR to design |
| **Send to phone** | QR or SMS |
| **Email** | |
| **Request approval** | §14.5 |
| **Brand Template** | §12.13 |
| **Publish website** | §12.7 |
| **Schedule** | §17 |
| **More** | Google Drive, Dropbox, OneDrive, Mailchimp, HubSpot, Klaviyo, Slack, MS Teams, social platforms… (varies) |

### 14.2 Real-time collaboration
Collaborator **avatars** in top bar; colored selection outlines / name-tag cursors on elements being edited; live sync; click avatar to jump [partly ?].

### 14.3 Comments
- Add: toolbar comment icon / right-click → Comment (pin to element or page).
- **@mention** (email + homepage notification; Docs: click **Send notification**; person needs access).
- **Assign task:** tick checkbox next to mentioned name (assignee must be mentioned).
- **Resolve:** hover ✓; **Resolved** filter → **Restore**.
- **Reactions:** Add emoji (Shift+: in comment mode); stickers.
- Filters: Current page / All / For you / Unread / Resolved; sort by Page / Recent; **Hide comments** (eye-slash).
- **Suggestions** (Docs suggesting mode).
- Ask Canva (§13.2).

### 14.4 Version history
File → **Version history** (mobile: ⋯) → preview → **Restore this version** / **Make a copy**. Auto-saved, **can't name versions**. Up to **1,000 versions** on paid; **not on Free**.

### 14.5 Request approval (Teams/Business/Edu/NFP/Enterprise)
Share → **Request approval** → reviewer, due date, notes → **Request approval** (**Withdraw submission** later). Reviewer: email / **Approvals** tab / notifications → **Awaiting review → Review** → **Approve** / **Request changes** / **Change decision**. Admin can make approval Required/Optional; multiple approvers Enterprise only; editing an approved design re-requires approval. Brand Kit approvals + tiered approvals (Jul 2026).

### 14.6 Locking & view-only
Lock / Lock position only (§9); Can view permission; public view link; presenting hides chrome.

---

## 15. Download / export options
Share → **Download**. Common: **File type** dropdown, **Select pages** (All / Current / pick), **Save download settings** checkbox, **Download** button.

| Type | Options | Plan notes |
|---|---|---|
| **JPG** | **Size** slider (×), **Quality** 1–100, **Limit file size** (KB; single page) | Size/quality Pro+ |
| **PNG** (Recommended) | **Size**, **Transparent background**, **Compress file**, **Limit file size** | Transparent/compress Pro+ |
| **PDF Standard** | 96 dpi; **Flatten PDF**; compress (Pro) | |
| **PDF Print** | 300 dpi; **Crop marks and bleed**; **Flatten PDF**; **Color profile RGB / CMYK** | CMYK Pro+ |
| **SVG** | Transparent background, size | Pro+ |
| **MP4 Video** | **Quality** 480p / 720p / 1080p / **4K** (desktop) | |
| **GIF** | Size 0.2×–1×/custom; transparency [?] | Free ~1 min, Pro ~2 min [?] |
| **PPTX** | Select pages; animations lost | All plans |
| **DOCX** | Docs only | |
| **CSV / XLSX** | Sheets only (XLSX keeps formatting/formulas) | |
| **HTML** | Email designs (API: `html_bundle`, `html_standalone`) [editor ?] | |
| **MP3** | audio-only designs [?] | |

Multi-page JPG/PNG → zip of images. Free upscaling capped (API: 1.125×). Accessible (tagged) PDF export.

---

## 16. Brand Kit / Brand Hub / brand controls
- **Where:** homepage **Brand** (Brand Hub) → kit; editor **Brand** tab.
- **Contents:** **Logos** (variants) · **Colors** (named palettes) · **Fonts** (heading/subheading/body roles; upload OTF/TTF/WOFF, Pro+) · **Brand voice** · **Photos / Graphics / Icons** · **Brand templates** · **Brand guidelines** pages.
- **Kit counts:** Free 1 (3 colors) · Pro 5 · Business 100 · Enterprise 1,000 [counts ?].
- Brand kit from URL (2026); Brand Kit approvals (2026).
- **Brand controls** (Teams/Business/Enterprise): restrict to brand colors/fonts, require approval before publishing, restrict uploads/templates, lock template elements, hide editor tabs.
- Roles that manage brand: owner, admin, brand designer (org admin/org brand designer on Enterprise).

---

## 17. Content Planner / social scheduling
- Homepage **Content Planner** (calendar) or editor Share → **Schedule** → date/time, account, caption → **Schedule post**.
- Platforms: Facebook Pages/Groups, Instagram Business (linked to FB Page), LinkedIn profile/page, Pinterest, X, Slack, Tumblr, YouTube, TikTok [TikTok/YouTube ?]. **Not Threads/Bluesky.**
- Pro+ (Free = post now only); up to **80 connected accounts per brand**; **one design → one account/post** at a time; multi-page docs not supported; Stories/Reels/carousels limited [?]; Edu needs admin enablement.

---

## 18. Apps marketplace & integrations
- Editor **Apps** tab (Featured / Discover / Your apps / search); homepage **Apps**. Apps open in side panel; OAuth for connectors.
- App capabilities: add images/video/audio/text/tables/shapes/embeds; drag & drop; **image overlays** (in-place image editing); selection-based edits; **Design Editor** intent; **Data Connectors** (Sheets/charts/Bulk Create); **Content Publishers** (Share destinations); **URL Expanders**.
- Admin: Settings → **Apps** → Manage → app ⋯ → **Override access** (Everyone / admins & brand designers / admins only / No one). Private team apps.
- Popular: Google Drive, Dropbox, OneDrive, Box, Instagram, YouTube, Facebook, Giphy, Bitmoji, Pexels, Pixabay, Mockups, Charts, **QR Code**, **Typecraft**, **Brandfetch**, D-ID, HeyGen, Murf/AI Voice, Google Maps, Jotform, Mailchimp, HubSpot, Slack, MS Teams, PayPal (2026). 1,000+ apps.

---

## 19. Developer platform
Rebranded "Canva Developers SDK" with three surfaces:

| Old | New |
|---|---|
| Apps SDK | **Apps inside Canva** |
| Connect APIs | **Canva REST APIs** |
| Canva MCP | **Canva for AI assistants** |

### 19.1 Apps inside Canva (Apps SDK)
CLI `@canva/cli`, `@canva/app-scripts`; **App UI Kit** v5 (React components + tokens); ICU localization; review → publish (public or team-private), versioning, analytics; Premium Apps Program (monetization).
- `@canva/design`: `addElementAtPoint` / `addElementAtCursor`, `addNativeElement`, `addPage`, `addAudioTrack`, `setCurrentPageBackground`, `initAppElement`, `getDesignMetadata`, `getDesignToken`, `getBrandKitColors`, `getDesignColors`, `getCurrentPageContext`, `editContent` (Design Editing API), `selection.registerOnChange`, `createRichtextRange`, `ui.startDrag*`, `requestExport`, `publish.launch`, `bulkCreate.launch`, `openDesign`, `overlay.registerOnCanOpen`
- `@canva/asset`: `upload`, `getTemporaryUrl`, `findFonts`, `requestFontSelection`, `openColorSelector`
- `@canva/intents`: `prepareDesignEditor`, `prepareDataConnector`, `prepareContentPublisher`, URL Expander
- `@canva/platform`: `appProcess`, `features.isSupported`, `notification.addToast`, `requestOpenExternalUrl`
- `@canva/user`: `auth.getCanvaUserToken` (JWT), `auth.initOauth`, `monetization.*`

### 19.2 Canva REST APIs — base `https://api.canva.com/rest/v1`, OAuth 2.0 + PKCE
- **Designs:** `GET/POST /designs` (preset doc/email/presentation/whiteboard, custom dims, or asset), `GET /designs/{id}`, `/pages`, `/export-formats`, `/dataset`
- **Async jobs** (POST + GET `/{jobId}`): `/exports` (pdf, jpg, png, pptx, gif, mp4, html_bundle, html_standalone, csv), `/imports`, `/url-imports`, `/image-to-design-imports`, `/autofills`, `/resizes`, `/merges`, `/generations`, `/image-generations`, `/image-transformations`
- **Assets:** `/asset-uploads`, `/url-asset-uploads`, `GET/PATCH/DELETE /assets/{id}`
- **Brand templates:** list, get, `/dataset`, publish
- **Folders:** CRUD, `/items`, `/folders/move`
- **Comments:** `POST /designs/{id}/comments` (threads), replies (mentions/assignees)
- **Users:** `/users/me`, `/users/me/profile`, `/users/me/capabilities` (resize, design_generation, image_to_design_imports, analytics)
- **OIDC / OAuth:** `/oidc/userinfo`, `/oidc/jwks`, `/oauth/token`, `/introspect`, `/revoke`
- **Print Partner**, **Design Analytics** (Enterprise, preview: analytics, viewers, views-over-time, page-views, links)
- Export: `export_quality` regular|pro; image 40–25,000 px; PDF size (a4/a3/letter/legal) Docs only.
- **Scopes:** `asset:read/write`, `brandtemplate:content:read/write`, `brandtemplate:meta:read`, `collaboration:event`, `comment:read/write`, `design:content:read/write`, `design:meta:read`, `design:permission:read`, `folder:read/write`, `folder:permission:write`, `profile:read`, `openid email profile`. Write ≠ read.
- **Webhooks** (`collaboration:event`): comment, suggestion, design_mention, share_design, share_folder, design_access_requested, folder_access_requested, design_approval_requested, design_approval_response, design_approval_reviewer_invalidated, team_invite.
- Gating: autofill & brand templates need paid; analytics Enterprise.

### 19.3 Canva for AI assistants (MCP)
`mcp.canva.com/mcp`, OAuth, 300 req/min/user. Tools: search-designs, get-design(-content/-pages/-thumbnail), get-presenter-notes, resolve-shortlink, generate-design, create-design-from-candidate, create-design, generate-image, remove-background, separate-image-layers, editing transactions (start/perform/commit/cancel), copy/resize/merge-designs, import-design-from-url, brand template & autofill tools, folder tools, comment tools, asset uploads, get-export-formats, export-design, help. Per-tool limits e.g. generate-image 10/min, generate-design 20/min, export 20/min. Separate local **Dev MCP server** for SDK docs.

### 19.4 Other
**Canva Button** is China-only now; no GA Embed SDK; use REST APIs + "Return users to your platform". Enterprise: SCIM, Audit Logs API.

---

## 20. Uploads: formats, limits, storage

| Type | Formats | Limit |
|---|---|---|
| Images | JPEG, PNG, HEIC/HEIF, WebP (static) | 25 MB / 100 MP **or** 50 MB / 250 MP [?] |
| SVG | SVG 1.1 | 3 MB |
| Video | MOV, GIF, MP4, MPEG, MKV, WEBM | 1 GB (Free compresses 250 MB–1 GB; 4K→1080p) |
| Audio | AAC, M4A, MP3, OGG, WMA, WAV, WEBM | 250 MB |
| PDF import | PDF | 300 MB, 500 pages, ~1,400 elements |
| PowerPoint | PPT (100 MB), PPTX/POTX (300 MB) | no SmartArt/3D/WordArt/some charts |
| Word | DOC (100 MB), DOCX/DOTX (300 MB) | comments imported |
| Excel | XLS, XLSX, CSV | → Canva Sheets |
| Illustrator | AI (PDF-compatible) | 100–300 MB [?]; may flatten |
| Photoshop | PSD | 300 MB |
| Fonts | OTF, TTF, WOFF | Pro+ |
| HTML | HTML import → Code design | no JS |

**Storage:** Free 5 GB · Pro/Edu/NFP 100 GB · Business 500 GB · Enterprise 1 TB+ [?].

---

## 21. Account settings, teams & roles

### "Your account" (personal)
- **Your profile** — name, email, photo, language [?]
- **Account and security** — password, login methods (Google, Facebook, Apple, Microsoft), 2-step verification, sessions / sign out everywhere, **secondary recovery email**, download content, **delete account**
- **Accessibility** — Theme Light / Sync with system / Dark; **High color contrast**; reduce motion
- **Message preferences** — email notifications/subscriptions
- **Privacy controls** — AI training/personalization, cookies (`canva.com/settings/privacy-preferences`)
- **Data and storage** — usage vs quota
- **Your teams** — leave/create team
- **AI personalization** — Canva AI memory

### "Settings" (team/org)
- **Team details** (name, avatar) · **People and members** · **Groups** · **Permissions** (AI features, sharing/publishing, leaving team → Everyone / Admins & brand designers / Admins only / No one) · **Brand controls** · **Apps** · **SSO** · **Billing and plans** (incl. AI usage) · **Orders and invoices** (filter, search invoice ID, View/Download invoice PDF; print orders) · **Web domains**
- **Enterprise "Controls and permissions"**: org-wide defaults, join/leave/invite, SAML SSO, **SCIM**, **audit logs**, domain controls, third-party integrations (AI connector)

### Roles
| Role | Rights |
|---|---|
| **Owner** | Full control incl. billing & deletion |
| **Admin** | Members, roles, content, permissions, billing |
| **Brand designer** | Brand Kits & Brand Templates, template usage reports |
| **Member** | Create & collaborate |
| Org admin / Org brand designer | Enterprise multi-team orgs |

Invite by email / invite link / domain joining; Business bills accepted invites only; groups; team folders.

---

## 22. Plans & pricing (US; verify at canva.com/pricing)

| Plan | Price | Storage | Brand kits | Notable |
|---|---|---|---|---|
| **Free** | $0 | 5 GB | 1 | 1.6M+ templates, watermark on premium; ~20 AI uses |
| **Pro Lite** | India/Indonesia (~₹199/mo) [?] | | | |
| **Pro** | **$18/mo or $180/yr** (older sources: $15/mo, $120 or $144/yr) [?] | 100 GB | 5 | 1 seat; BG remover, Magic Switch, translate, scheduling, version history, 141M+ premium assets, Canva AI 2.0 |
| **Business** | **$25/person/mo or $250/yr** (older: $20) | 500 GB | 100 | Replaces Teams; admin, approvals, Flourish, Leonardo Essential, 10% off print |
| **Teams** (legacy) | grandfathered (was $100/yr/user, 3-seat min) | | | closed to new signups |
| **Enterprise** | contact sales | 1 TB | 1,000 | SSO, SCIM, audit logs, multi-team, IP indemnity |
| **Education** | free (K-12, verified); Canva Campus quoted | 100 GB | | Learn Grid |
| **Nonprofits** | free, 1 team ≤50 users | 100 GB | | |

Trials once per account (auto-renew); pause up to 3 months; annual ≈16% saving; 60-day price-change notice; AI Pass $100/mo.

---

## 23. Platforms
- **Web** (canva.com) — full feature set.
- **Desktop apps** (Mac/Windows; Electron): **tabs** for multiple designs, desktop shortcuts (§11).
- **Canva Offline** (2026): "Make available offline" → edit up to **14 days** offline, sync on reconnect; free.
- **Mobile (iOS/Android)** bottom tabs: **Canva AI · Create (was Home) · Templates · Your Designs (was Projects) · More** (profile, Brand Kit, Apps, Print cart). "+" create button; bottom toolbar with swipe-up panels; no nav pinning on phones; recording/Canva Live/Magic Shortcuts desktop-only.

---

## 24. Accessibility, privacy, security
- **Alt text** (⋯ → Alt text, or mark decorative); **Check design accessibility** (contrast with one-click fixes, small text, missing alt text); **tagged PDF** export (reading order from layers); captions; screen reader support; reduce motion; dark mode; high contrast.
- SSO/SAML, SCIM, 2FA, audit logs, data residency (Enterprise); privacy preferences for AI training (opt-out default for private content; team content not used).
- **Canva Shield**: AI moderation, $200M creator fund, opt-out, IP indemnification (Enterprise).

---

## 25. Notifications & help
- **Bell:** comments/tasks, @mentions, access requests, shares, approvals, team joins. In-app can't be disabled; email via Message preferences.
- **Help "?"** (homepage sidebar / editor bottom-right): search, Help Center, keyboard shortcuts, What's New, contact support (chat on paid), feedback.
- **What's New:** monthly newsroom posts + Design School videos.

---

## 26. Open questions / conflicts
1. Exact sidebar labels/order (Home vs Create; pinned Templates/Apps/Dream Lab/Trash) — A/B variants.
2. Search bar mode labels and homepage shortcut row composition.
3. Custom size max: 8000 px/side vs 8000×3125 area.
4. Free AI allowance (20 combined vs 200 Standard/20 Premium); current Pro/Business prices ($18/$25 vs $15/$20).
5. Image upload cap (25 MB/100 MP vs 50 MB/250 MP); Enterprise storage.
6. Brand kit counts; HTML download in editor; GIF transparency/length.
7. File menu label "Settings" vs "View settings"; Canva AI button placement in editor.
8. Full animation style lists; video shortcut keys; Magic Shortcut "0" and "X".
9. Canva Live code length; Canva AI 2.0 GA status after Aug 2026 slowdown.
10. TikTok/YouTube scheduling support.

---

## 27. Clone-builder cheat sheet
If building a Canva-like editor, the minimum viable surface mirrors:
- **Shell:** left icon rail (Design, Elements, Text, Brand, Uploads, Draw, Projects, Apps, AI) + expandable panel; top bar (File, Resize, Undo/Redo, title, Share, Download/Present); bottom bar (Notes, page count, zoom slider, view switcher).
- **Canvas model:** design → pages[] → elements[] (type: text|image|shape|line|group|frame|grid|chart|table|video|audio|sticky|embed), each with x, y, width, height, rotation, opacity, locked, zIndex, animation{enter,exit,speed}, link, altText.
- **Interactions:** select/multi-select/marquee, drag, resize handles (Shift = keep ratio, Alt = from center), rotate handle, snapping + pink smart guides, group/ungroup, layer order, align/distribute/tidy up, copy/paste style, lock, keyboard shortcuts (§11), undo/redo history.
- **Floating contextual toolbar** that changes by element type (§7), with ">>" full edit panel.
- **Page ops:** add/duplicate/delete/hide/lock/reorder/title/notes; scroll/thumbnail/grid views.
- **Export:** PNG/JPG/PDF/SVG (+ size, transparency, page selection); templates; custom size (40–8000 px; px/in/mm/cm).
- **Collab layer:** share link roles (view/comment/edit), comments with mentions/resolve, presence avatars, version history.

---

## 28. Sources
Primary: canva.com/help (search snippets / proxy / Canva MCP help tool), canva.com/newsroom, canva.com/pricing, canva.dev docs & OpenAPI spec (`canva.dev/sources/connect/api/latest/api.yml`).
Key pages: help/keyboard-shortcuts · help/glow-up · help/customize-primary-navigation · help/search-ai-bar · help/design-from-scratch · help/filter-sort-homepage · help/deleted-designs · help/navigating-account-team-settings · help/roles-and-permissions · help/get-approval · help/text-effects · help/animate-designs · help/using-magic-animate · help/image-settings · help/page-view-settings · help/lock-and-unlock-elements · help/draw-in-canva · help/presentation-modes · help/canva-live · help/talking-presentations · help/page-transitions · help/polls-quizzes · help/docs-to-decks · help/creating-and-editing-videos · help/generate-edit-captions-on-videos · help/syncing-audio-with-video · help/using-sticky-notes · help/magic-insights · help/bulk-create · help/website-settings · help/publishing-canva-websites · help/order-prints · help/content-planner · help/canva-code · help/brand-template-locks · help/charts · help/create-qr-code · help/courses-in-canva · help/ai-access · help/canva-design-assistant · help/ask-canva-comments · help/using-magic-media · help/generate-with-dreamlab · help/using-magic-edit · help/magic-eraser · help/using-magic-grab · help/using-grab-text · help/using-magic-expand · help/background-remover-variantb · help/translate-canva-designs · help/brand-voice · help/using-brand-assist · help/mcp-agent-setup · help/connect-apps-canva-ai · help/import-html · help/download-file-types · help/upload-formats-requirements · help/comments · help/version-history · help/embed-designs · help/pdf-accessibility-features · help/free-affinity-access.
Newsroom: canva-create-2025 · canva-ai-launches · creative-operating-system · canva-create-2026-ai · canva-create-2026-launches · Canva-Code · magic-layers · whats-new-february-2026 · whats-new-may-2026 · safe-ai-canva-shield.
Developer: canva.dev/docs/apps/rest-apis (scopes, webhooks, capabilities) · canva.dev/docs/apps/mcp · canva.dev/docs/button.
Third-party: moda.app/blog/canva-pricing (Sep 2026) · fortune.com (Apr & Aug 2026) · businesswire Creative OS release · petapixel Magic Layers · flexclip Video 2.0 review · zapier Canva website · techradar Canva Offline · en.wikipedia.org/wiki/Canva · shortcut compilations (jennifermaker, theanewcomb, kstanchev) · brendacadman.com guides.
