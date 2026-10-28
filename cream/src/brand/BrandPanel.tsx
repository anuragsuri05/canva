// Editor "Brand" side panel: kit selector, logos, colors, fonts, photos/graphics/icons.
import { useEffect, useState } from 'react';
import { useApp } from '../store/app';
import { useEditor, useSelected } from '../store/editor';
import type { BrandFontRole, BrandKit, El, TextEl } from '../model/types';
import { makeText, solid } from '../model/defaults';
import { ensureFont } from '../assets/fonts';
import { insertImage, insertText, setDragPayload } from '../editor/dnd';
import { Icon } from '../ui/ui';
import { svgColors } from '../render/Elements';
import { pickFiles } from '../home/actions';
import { SrcImg, registerUploadedFonts, updateKit } from './shared';
import './brand.css';

/** The kit for the open design (design.brandKitId, else the first kit). */
export function useActiveKit(): [BrandKit | undefined, (id: string) => void] {
  const kits = useApp((s) => s.brandKits);
  const kitId = useEditor((s) => s.design?.brandKitId);
  const kit = kits.find((k) => k.id === kitId) ?? kits[0];
  const setKit = (id: string) => useEditor.getState().update((d) => void (d.brandKitId = id), { history: false });
  return [kit, setKit];
}

export function KitSelect({ kit, setKit }: { kit?: BrandKit; setKit: (id: string) => void }) {
  const kits = useApp((s) => s.brandKits);
  return (
    <div className="row" style={{ marginBottom: 12 }}>
      <select className="select grow" value={kit?.id ?? ''} onChange={(e) => setKit(e.target.value)} data-testid="brand-kit-select">
        {kits.map((k) => (
          <option key={k.id} value={k.id}>
            {k.name}
          </option>
        ))}
      </select>
      <button
        className="icon-btn"
        title="Edit brand kit"
        data-testid="brand-edit-kit"
        onClick={() => useApp.getState().navigate({ name: 'home', section: 'brand', param: kit?.id })}
      >
        <Icon name="PenLine" size={16} />
      </button>
    </div>
  );
}

/** Apply a brand color to the selection, or the page background if nothing is selected. */
export function applyBrandColor(color: string) {
  const st = useEditor.getState();
  if (!st.selection.length) {
    if (st.pageId) st.patchPage(st.pageId, { background: solid(color) });
    return;
  }
  st.updateSelected((e) => {
    const el = e as El;
    switch (el.type) {
      case 'text':
        (el as TextEl).color = color;
        delete (el as TextEl).gradient;
        // Strip inline colours so the whole text box takes the brand color.
        (el as TextEl).html = (el as TextEl).html.replace(/color:\s*[^;"]+;?/gi, '');
        break;
      case 'shape':
        el.fill = solid(color);
        break;
      case 'line':
      case 'sticky':
        el.color = color;
        break;
      case 'svg': {
        const first = svgColors(el.svg)[0];
        if (first) el.colorMap = { ...(el.colorMap ?? {}), [first]: color };
        break;
      }
      case 'table':
      case 'chart':
      case 'frame':
      case 'grid':
      default:
        break;
    }
  });
}

function insertBrandText(role: 'heading' | 'subheading' | 'body', f: BrandFontRole) {
  const d = useEditor.getState().design;
  if (!d) return;
  const text = { heading: 'Add a heading', subheading: 'Add a subheading', body: 'Add a little bit of body text' }[role];
  const scale = Math.max(0.4, Math.min(d.width, d.height * 1.4) / 1080);
  const size = Math.max(8, Math.round(f.size * scale));
  const w = Math.min(d.width * 0.8, text.length * size * 0.55 + 20);
  const el = makeText(text, (d.width - w) / 2, d.height / 2 - size / 2, w, { fontSize: size, fontWeight: f.weight, fontFamily: f.family, align: 'center' }, role);
  ensureFont(f.family, f.weight);
  insertText(el);
}

function ImgTile({ src, contain }: { src: string; contain?: boolean }) {
  return (
    <button
      className={'asset-tile' + (contain ? ' contain checker-soft' : '')}
      draggable
      onDragStart={(e) => setDragPayload(e, { kind: 'image', src })}
      onClick={() => insertImage(src)}
      data-testid="brand-image"
    >
      <SrcImg src={src} />
    </button>
  );
}

export default function BrandPanel() {
  const [kit, setKit] = useActiveKit();
  const sel = useSelected();
  const [tab, setTab] = useState<'all' | 'photos' | 'graphics' | 'icons'>('all');
  useEffect(() => {
    registerUploadedFonts();
  }, []);
  useEffect(() => {
    if (!kit) return;
    (['heading', 'subheading', 'body'] as const).forEach((r) => ensureFont(kit.fonts[r].family, kit.fonts[r].weight));
  }, [kit?.fonts.heading.family, kit?.fonts.subheading.family, kit?.fonts.body.family]);

  if (!kit)
    return (
      <div className="empty">
        No brand kit yet.
        <div style={{ marginTop: 10 }}>
          <button className="btn primary" onClick={() => useApp.getState().navigate({ name: 'home', section: 'brand' })}>
            Create a brand kit
          </button>
        </div>
      </div>
    );

  const uploadLogo = async () => {
    const files = await pickFiles('image/*', true);
    const refs: string[] = [];
    for (const f of files) refs.push((await useApp.getState().addAssetFromFile(f)).ref);
    if (refs.length) updateKit(kit.id, (k) => void k.logos.push(...refs));
  };
  const media = tab === 'all' ? [...kit.photos, ...kit.graphics, ...kit.icons] : kit[tab];

  return (
    <div className="brand-panel" data-testid="brand-panel">
      <KitSelect kit={kit} setKit={setKit} />

      <div className="section-head">
        <h3>Logos</h3>
        <button onClick={uploadLogo} data-testid="brand-panel-logo-upload">
          Upload
        </button>
      </div>
      {kit.logos.length ? (
        <div className="asset-grid">
          {kit.logos.map((src, i) => (
            <ImgTile key={src + i} src={src} contain />
          ))}
        </div>
      ) : (
        <button className="kit-drop sm" onClick={uploadLogo}>
          <Icon name="ImagePlus" size={18} /> Add your logo
        </button>
      )}

      <div className="section-head">
        <h3>Colors</h3>
        <span className="faint">{sel.length ? 'Applies to selection' : 'Applies to page background'}</span>
      </div>
      {kit.palettes.map((p) => (
        <div key={p.id} style={{ marginBottom: 10 }}>
          <div className="faint" style={{ marginBottom: 6 }}>
            {p.name}
          </div>
          <div className="swatches">
            {p.colors.map((c, i) => (
              <button key={i} className="swatch" style={{ background: c }} title={c} onClick={() => applyBrandColor(c)} data-testid="brand-panel-swatch" />
            ))}
            {!p.colors.length && <span className="faint">No colors</span>}
          </div>
        </div>
      ))}

      <div className="section-head">
        <h3>Fonts</h3>
      </div>
      <div className="col">
        {(['heading', 'subheading', 'body'] as const).map((r) => {
          const f = kit.fonts[r];
          return (
            <button
              key={r}
              className={'brand-font ' + r}
              style={{ fontFamily: `'${f.family}', system-ui`, fontWeight: f.weight }}
              onClick={() => insertBrandText(r, f)}
              draggable
              onDragStart={(e) => setDragPayload(e, { kind: 'text', preset: r })}
              data-testid={'brand-panel-font-' + r}
            >
              <span className="brand-font-sample">{r === 'heading' ? 'Heading' : r === 'subheading' ? 'Subheading' : 'Body text'}</span>
              <span className="faint" style={{ fontFamily: 'var(--font)', fontWeight: 400 }}>
                {f.family} · {f.size}
              </span>
            </button>
          );
        })}
      </div>

      <div className="section-head">
        <h3>Photos & graphics</h3>
      </div>
      <div className="chips" style={{ marginBottom: 8 }}>
        {(['all', 'photos', 'graphics', 'icons'] as const).map((t) => (
          <button key={t} className={'chip' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {media.length ? (
        <div className="asset-grid">
          {media.map((src, i) => (
            <ImgTile key={src + i} src={src} contain={tab === 'icons' || tab === 'graphics'} />
          ))}
        </div>
      ) : (
        <div className="faint">Add photos, graphics and icons in the Brand Hub.</div>
      )}

      {kit.voice && (
        <>
          <div className="section-head">
            <h3>Brand voice</h3>
          </div>
          <div className="voice-box">{kit.voice}</div>
        </>
      )}

      <button className="btn block" style={{ marginTop: 18 }} onClick={() => useApp.getState().navigate({ name: 'home', section: 'brand', param: kit.id })} data-testid="brand-edit-link">
        <Icon name="Crown" size={16} /> Edit brand kit
      </button>
    </div>
  );
}
