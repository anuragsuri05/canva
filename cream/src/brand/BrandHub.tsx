// Brand Hub (home section 'brand'): brand kits list + kit editor.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useApp } from '../store/app';
import type { BrandFontRole, BrandKit, Design } from '../model/types';
import { uid } from '../model/defaults';
import { ensureFont } from '../assets/fonts';
import { Floating, Icon, Menu, fmtDate, type Anchor } from '../ui/ui';
import { DesignThumb } from '../home/Thumb';
import { openDesign, pickFiles } from '../home/actions';
import { FONT_WEIGHTS, FontPicker, SrcImg, registerUploadedFonts, updateKit, useUploadedFontFamilies } from './shared';
import './brand.css';

const go = (kitId?: string) => useApp.getState().navigate({ name: 'home', section: 'brand', param: kitId });

/* ---------------- Kits list ---------------- */
function KitCard({ k }: { k: BrandKit }) {
  const [menu, setMenu] = useState<Anchor | null>(null);
  const colors = k.palettes.flatMap((p) => p.colors).slice(0, 6);
  const app = useApp.getState;
  return (
    <>
    <div className="kit-card" onClick={() => go(k.id)} data-testid="kit-card">
      <div className="kit-art">
        {k.logos[0] ? <SrcImg src={k.logos[0]} className="kit-logo" /> : <span className="kit-initial" style={{ fontFamily: `'${k.fonts.heading.family}'` }}>{k.name[0]}</span>}
        <div className="kit-colors">
          {colors.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </div>
      </div>
      <div className="row" style={{ padding: '10px 4px 0' }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="ellipsis">
            <b>{k.name}</b>
          </div>
          <div className="faint">
            {k.fonts.heading.family} · {k.palettes.reduce((n, p) => n + p.colors.length, 0)} colors · {k.logos.length} logos
          </div>
        </div>
        <button
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            setMenu(e.currentTarget);
          }}
          data-testid="kit-menu"
        >
          <Icon name="Ellipsis" size={16} />
        </button>
      </div>
    </div>
      {menu && (
        <Menu
          anchor={menu}
          onClose={() => setMenu(null)}
          items={[
            { label: 'Open', icon: 'FolderOpen', onClick: () => go(k.id) },
            {
              label: 'Rename',
              icon: 'PenLine',
              onClick: () => {
                const n = prompt('Rename brand kit', k.name);
                if (n?.trim()) updateKit(k.id, (x) => void (x.name = n.trim()));
              },
            },
            {
              label: 'Duplicate',
              icon: 'Copy',
              onClick: () => {
                const nk = app().addBrandKit(k.name + ' (copy)');
                app().saveBrandKit({ ...structuredClone(k), id: nk.id, name: nk.name, createdAt: Date.now() });
              },
            },
            { sep: true },
            {
              label: 'Delete',
              icon: 'Trash2',
              danger: true,
              testId: 'kit-delete',
              onClick: () => confirm(`Delete brand kit "${k.name}"?`) && app().deleteBrandKit(k.id),
            },
          ]}
        />
      )}
    </>
  );
}

function KitsList() {
  const kits = useApp((s) => s.brandKits);
  const templates = useApp(useShallow((s) => Object.values(s.designs).filter((d) => d.isBrandTemplate && !d.trashedAt)));
  const create = () => {
    const k = useApp.getState().addBrandKit(`Brand Kit ${useApp.getState().brandKits.length + 1}`);
    go(k.id);
  };
  return (
    <div className="home-content" data-testid="brand-hub">
      <div className="brand-hero">
        <div>
          <h1>Brand</h1>
          <p>Keep your logos, colors, fonts and voice in one place — and use them in every design with a click.</p>
        </div>
        <button className="btn primary lg" onClick={create} data-testid="kit-create">
          <Icon name="Plus" size={18} /> Add new brand kit
        </button>
      </div>
      <div className="section-head big">
        <h2>Brand kits</h2>
      </div>
      <div className="kit-grid">
        {kits.map((k) => (
          <KitCard key={k.id} k={k} />
        ))}
        <button className="kit-card kit-new" onClick={create}>
          <Icon name="Plus" size={28} />
          <span>Create a brand kit</span>
        </button>
      </div>
      <div className="section-head big">
        <h2>Brand templates</h2>
      </div>
      <BrandTemplates designs={templates} />
    </div>
  );
}

function BrandTemplates({ designs }: { designs: Design[] }) {
  const all = useApp(useShallow((s) => Object.values(s.designs).filter((d) => !d.trashedAt && !d.isBrandTemplate)));
  const [pick, setPick] = useState<Anchor | null>(null);
  const use = (d: Design) => {
    const copy = useApp.getState().duplicateDesign(d.id);
    if (!copy) return;
    useApp.getState().patchDesign(copy.id, { isBrandTemplate: false, title: d.title });
    openDesign(copy.id);
  };
  return (
    <>
      <div className="design-grid">
        {designs.map((d) => (
          <div key={d.id} className="design-card" onClick={() => use(d)} data-testid="brand-template">
            <div className="thumb">
              <DesignThumb design={d} />
            </div>
            <div className="card-actions">
              <button
                className="mini-btn"
                title="Edit template"
                onClick={(e) => {
                  e.stopPropagation();
                  openDesign(d.id);
                }}
              >
                <Icon name="PenLine" size={14} />
              </button>
              <button
                className="mini-btn"
                title="Remove from brand templates"
                onClick={(e) => {
                  e.stopPropagation();
                  useApp.getState().patchDesign(d.id, { isBrandTemplate: false });
                }}
              >
                <Icon name="X" size={14} />
              </button>
            </div>
            <div className="meta">
              <div className="name">{d.title}</div>
              <div className="faint">Use template · {fmtDate(d.updatedAt)}</div>
            </div>
          </div>
        ))}
        <button className="add-tile" onClick={(e) => setPick(e.currentTarget)} disabled={!all.length} data-testid="brand-template-add">
          <Icon name="Plus" size={24} />
          <span>{all.length ? 'Add a design as a brand template' : 'Create a design first'}</span>
        </button>
      </div>
      {pick && (
        <Menu
          anchor={pick}
          onClose={() => setPick(null)}
          width={280}
          items={[
            { title: 'Choose a design' },
            ...all
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 20)
              .map((d) => ({
                label: d.title,
                icon: 'File',
                onClick: () => {
                  useApp.getState().patchDesign(d.id, { isBrandTemplate: true });
                  useApp.getState().toast('Added to brand templates', 'success');
                },
              })),
          ]}
        />
      )}
    </>
  );
}

/* ---------------- Kit editor ---------------- */
function Section({ id, title, desc, action, children }: { id: string; title: string; desc?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="kit-section" id={'kit-' + id} data-testid={'kit-section-' + id}>
      <div className="kit-section-head">
        <div className="grow">
          <h2>{title}</h2>
          {desc && <p className="muted">{desc}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MediaSection({ kit, field, title, desc, testId }: { kit: BrandKit; field: 'logos' | 'photos' | 'graphics' | 'icons'; title: string; desc: string; testId: string }) {
  const [busy, setBusy] = useState(false);
  const upload = async () => {
    const files = await pickFiles('image/*', true);
    if (!files.length) return;
    setBusy(true);
    const refs: string[] = [];
    for (const f of files) refs.push((await useApp.getState().addAssetFromFile(f)).ref);
    updateKit(kit.id, (k) => void k[field].push(...refs));
    setBusy(false);
  };
  return (
    <Section
      id={field}
      title={title}
      desc={desc}
      action={
        <button className="btn" onClick={upload} disabled={busy} data-testid={testId}>
          <Icon name="CloudUpload" size={16} /> {busy ? 'Uploading…' : `Upload ${title.toLowerCase()}`}
        </button>
      }
    >
      {kit[field].length ? (
        <div className={'kit-media' + (field === 'logos' || field === 'icons' ? ' contain' : '')}>
          {kit[field].map((src, i) => (
            <div key={src + i} className="kit-media-item checker-soft">
              <SrcImg src={src} />
              <button className="mini-btn kit-media-del" title="Remove" onClick={() => updateKit(kit.id, (k) => void k[field].splice(i, 1))}>
                <Icon name="Trash2" size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <button className="kit-drop" onClick={upload}>
          <Icon name="ImagePlus" size={22} />
          <span>Add {title.toLowerCase()}</span>
        </button>
      )}
    </Section>
  );
}

function SwatchEditor({ color, onChange, onDelete, anchor, onClose }: { color: string; onChange: (c: string) => void; onDelete: () => void; anchor: Anchor; onClose: () => void }) {
  const [hex, setHex] = useState(color);
  useEffect(() => setHex(color), [color]);
  return (
    <Floating anchor={anchor} onClose={onClose} width={240}>
      <input type="color" className="color-input" value={/^#[0-9a-f]{6}$/i.test(color) ? color : '#000000'} onChange={(e) => onChange(e.target.value)} data-testid="swatch-color" />
      <div className="row" style={{ marginTop: 10 }}>
        <span className="hex-pre">#</span>
        <input
          className="input sm"
          value={hex.replace('#', '')}
          maxLength={6}
          onChange={(e) => {
            const v = '#' + e.target.value.replace(/[^0-9a-f]/gi, '');
            setHex(v);
            if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) onChange(v.length === 4 ? '#' + [...v.slice(1)].map((c) => c + c).join('') : v);
          }}
          data-testid="swatch-hex"
        />
        <button className="icon-btn" title="Delete color" onClick={onDelete} data-testid="swatch-delete">
          <Icon name="Trash2" size={16} />
        </button>
      </div>
    </Floating>
  );
}

function Colors({ kit }: { kit: BrandKit }) {
  const [edit, setEdit] = useState<{ p: number; c: number; anchor: HTMLElement } | null>(null);
  const addSwatch = (pi: number, anchorEl: HTMLElement) => {
    updateKit(kit.id, (k) => void k.palettes[pi].colors.push('#8b3dff'));
    setTimeout(() => {
      const k = useApp.getState().brandKits.find((b) => b.id === kit.id)!;
      setEdit({ p: pi, c: k.palettes[pi].colors.length - 1, anchor: anchorEl });
    });
  };
  return (
    <Section
      id="colors"
      title="Colors"
      desc="Named palettes appear in the color picker and Brand tab of every design."
      action={
        <button className="btn" onClick={() => updateKit(kit.id, (k) => void k.palettes.push({ id: uid(), name: `Palette ${k.palettes.length + 1}`, colors: [] }))} data-testid="palette-add">
          <Icon name="Plus" size={16} /> Add palette
        </button>
      }
    >
      {kit.palettes.map((p, pi) => (
        <div key={p.id} className="palette" data-testid="palette">
          <div className="row">
            <input className="palette-name" value={p.name} onChange={(e) => updateKit(kit.id, (k) => void (k.palettes[pi].name = e.target.value))} data-testid="palette-name" />
            <span className="grow" />
            <button className="icon-btn" title="Delete palette" onClick={() => confirm(`Delete palette "${p.name}"?`) && updateKit(kit.id, (k) => void k.palettes.splice(pi, 1))}>
              <Icon name="Trash2" size={16} />
            </button>
          </div>
          <div className="palette-swatches">
            {p.colors.map((c, ci) => (
              <button
                key={ci}
                className={'big-swatch' + (edit?.p === pi && edit.c === ci ? ' active' : '')}
                style={{ background: c }}
                title={c}
                onClick={(e) => setEdit({ p: pi, c: ci, anchor: e.currentTarget })}
                data-testid="brand-swatch"
              >
                <span className="swatch-hex">{c.toUpperCase()}</span>
              </button>
            ))}
            <button className="big-swatch add" title="Add a color" onClick={(e) => addSwatch(pi, e.currentTarget)} data-testid="swatch-add">
              <Icon name="Plus" size={20} />
            </button>
          </div>
        </div>
      ))}
      {edit && kit.palettes[edit.p]?.colors[edit.c] !== undefined && (
        <SwatchEditor
          anchor={edit.anchor}
          color={kit.palettes[edit.p].colors[edit.c]}
          onChange={(c) => updateKit(kit.id, (k) => void (k.palettes[edit.p].colors[edit.c] = c))}
          onDelete={() => {
            updateKit(kit.id, (k) => void k.palettes[edit.p].colors.splice(edit.c, 1));
            setEdit(null);
          }}
          onClose={() => setEdit(null)}
        />
      )}
    </Section>
  );
}

function FontRole({ label, role, onChange, sample, testId }: { label: string; role: BrandFontRole; onChange: (r: BrandFontRole) => void; sample: string; testId: string }) {
  useEffect(() => {
    ensureFont(role.family, role.weight);
  }, [role.family, role.weight]);
  return (
    <div className="font-role" data-testid={testId}>
      <div className="font-sample" style={{ fontFamily: `'${role.family}', system-ui`, fontWeight: role.weight, fontSize: Math.min(44, Math.max(16, role.size * 0.6)) }}>
        {sample}
      </div>
      <div className="font-controls">
        <span className="label">{label}</span>
        <div className="grow" style={{ minWidth: 180 }}>
          <FontPicker value={role.family} onChange={(family) => onChange({ ...role, family })} testId={testId + '-family'} />
        </div>
        <input className="input" type="number" min={6} max={800} style={{ width: 80 }} value={role.size} onChange={(e) => onChange({ ...role, size: Math.max(1, Number(e.target.value) || 1) })} title="Size" data-testid={testId + '-size'} />
        <select className="select" style={{ width: 130 }} value={role.weight} onChange={(e) => onChange({ ...role, weight: Number(e.target.value) })} data-testid={testId + '-weight'}>
          {FONT_WEIGHTS.map(([w, n]) => (
            <option key={w} value={w}>
              {n}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Fonts({ kit }: { kit: BrandKit }) {
  const uploaded = useUploadedFontFamilies();
  const setRole = (r: 'heading' | 'subheading' | 'body', v: BrandFontRole) => updateKit(kit.id, (k) => void (k.fonts[r] = v));
  const upload = async () => {
    const files = await pickFiles('.ttf,.otf,.woff,.woff2', true);
    for (const f of files) {
      const { asset } = await useApp.getState().addAssetFromFile(f);
      if (asset.fontFamily) useApp.getState().toast(`Font "${asset.fontFamily}" uploaded`, 'success');
    }
  };
  return (
    <Section
      id="fonts"
      title="Fonts"
      desc="Set heading, subheading and body fonts. They’re used when you add text from the Brand tab."
      action={
        <button className="btn" onClick={upload} data-testid="font-upload">
          <Icon name="Upload" size={16} /> Upload a font
        </button>
      }
    >
      <FontRole label="Heading" role={kit.fonts.heading} sample="Heading" onChange={(v) => setRole('heading', v)} testId="font-heading" />
      <FontRole label="Subheading" role={kit.fonts.subheading} sample="Subheading" onChange={(v) => setRole('subheading', v)} testId="font-subheading" />
      <FontRole label="Body" role={kit.fonts.body} sample="Body text for paragraphs and captions" onChange={(v) => setRole('body', v)} testId="font-body" />
      {uploaded.length > 0 && (
        <div className="faint" style={{ marginTop: 10 }}>
          Uploaded fonts: {uploaded.join(', ')}
        </div>
      )}
    </Section>
  );
}

function Guidelines({ kit }: { kit: BrandKit }) {
  const [preview, setPreview] = useState(false);
  return (
    <Section
      id="guidelines"
      title="Brand guidelines"
      desc="Document how to use your brand. Supports simple Markdown (# headings, - bullets, **bold**)."
      action={
        <div className="seg">
          <button className={!preview ? 'active' : ''} onClick={() => setPreview(false)}>
            Edit
          </button>
          <button className={preview ? 'active' : ''} onClick={() => setPreview(true)} data-testid="guidelines-preview">
            Preview
          </button>
        </div>
      }
    >
      {preview ? (
        <div className="md-preview" dangerouslySetInnerHTML={{ __html: miniMarkdown(kit.guidelines || '_No guidelines yet._') }} />
      ) : (
        <textarea
          className="textarea"
          rows={10}
          value={kit.guidelines}
          placeholder={'# Logo usage\n- Keep clear space around the logo\n- Never stretch or recolor it\n\n# Tone\n**Friendly**, concise and confident.'}
          onChange={(e) => updateKit(kit.id, (k) => void (k.guidelines = e.target.value))}
          data-testid="kit-guidelines"
        />
      )}
    </Section>
  );
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(s: string) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])[*_](.+?)[*_]/g, '$1<i>$2</i>');
}
export function miniMarkdown(md: string) {
  const out: string[] = [];
  let list = false;
  for (const line of md.split('\n')) {
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    const li = /^\s*[-*]\s+(.*)$/.exec(line);
    if (!li && list) {
      out.push('</ul>');
      list = false;
    }
    if (h) out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`);
    else if (li) {
      if (!list) out.push('<ul>');
      list = true;
      out.push(`<li>${inline(li[1])}</li>`);
    } else if (line.trim()) out.push(`<p>${inline(line)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('');
}

const SECTIONS = [
  ['logos', 'Logos'],
  ['colors', 'Colors'],
  ['fonts', 'Fonts'],
  ['voice', 'Brand voice'],
  ['photos', 'Photos'],
  ['graphics', 'Graphics'],
  ['icons', 'Icons'],
  ['templates', 'Brand templates'],
  ['guidelines', 'Guidelines'],
];

function KitPage({ kit }: { kit: BrandKit }) {
  const templates = useApp(useShallow((s) => Object.values(s.designs).filter((d) => d.isBrandTemplate && !d.trashedAt)));
  const [editingName, setEditingName] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  return (
    <div className="home-content kit-page" ref={top} data-testid="kit-page">
      <div className="breadcrumb">
        <button className="crumb" onClick={() => go()}>
          Brand
        </button>
        <Icon name="ChevronRight" size={14} className="faint" />
        <span className="crumb current">{kit.name}</span>
      </div>
      <div className="page-head-row">
        {editingName ? (
          <input
            className="input page-title-input"
            autoFocus
            defaultValue={kit.name}
            data-testid="kit-name-input"
            onBlur={(e) => {
              if (e.target.value.trim()) updateKit(kit.id, (k) => void (k.name = e.target.value.trim()));
              setEditingName(false);
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <h1 className="page-title" onClick={() => setEditingName(true)} title="Click to rename" data-testid="kit-name">
            {kit.name} <Icon name="PenLine" size={16} className="faint" />
          </h1>
        )}
        <span className="grow" />
        <button
          className="btn"
          onClick={() => {
            if (!confirm(`Delete brand kit "${kit.name}"?`)) return;
            useApp.getState().deleteBrandKit(kit.id);
            go();
          }}
        >
          <Icon name="Trash2" size={16} /> Delete kit
        </button>
      </div>
      <div className="kit-nav">
        {SECTIONS.map(([id, label]) => (
          <button key={id} className="chip" onClick={() => document.getElementById('kit-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            {label}
          </button>
        ))}
      </div>
      <MediaSection kit={kit} field="logos" title="Logos" desc="Upload logo variations — primary, secondary, icon and wordmark." testId="logo-upload" />
      <Colors kit={kit} />
      <Fonts kit={kit} />
      <Section id="voice" title="Brand voice" desc="Describe how your brand sounds. Cream AI uses this when writing for you.">
        <textarea
          className="textarea"
          rows={5}
          value={kit.voice}
          placeholder="e.g. Warm, witty and plain-spoken. We say ‘you’ not ‘users’. No jargon, no exclamation marks."
          onChange={(e) => updateKit(kit.id, (k) => void (k.voice = e.target.value))}
          data-testid="kit-voice"
        />
      </Section>
      <MediaSection kit={kit} field="photos" title="Photos" desc="On-brand photography for your team." testId="photo-upload" />
      <MediaSection kit={kit} field="graphics" title="Graphics" desc="Illustrations, patterns and shapes." testId="graphic-upload" />
      <MediaSection kit={kit} field="icons" title="Icons" desc="Your icon set." testId="icon-upload" />
      <Section id="templates" title="Brand templates" desc="Designs your team can start from. Using one makes a copy.">
        <BrandTemplates designs={templates} />
      </Section>
      <Guidelines kit={kit} />
    </div>
  );
}

export default function BrandHub({ kitId }: { kitId?: string }) {
  const kit = useApp((s) => (kitId ? s.brandKits.find((k) => k.id === kitId) : undefined));
  useEffect(() => {
    registerUploadedFonts();
  }, []);
  if (kitId && kit) return <KitPage kit={kit} />;
  return <KitsList />;
}
