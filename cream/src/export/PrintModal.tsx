import { useMemo, useState } from 'react';
import { Modal, Icon, Spinner } from '../ui/ui';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import type { Design } from '../model/types';
import { PageView } from '../render/PageView';
import { DEFAULT_EXPORT, downloadBlob, runExport } from './exporters';
import { htmlToText } from '../model/defaults';
import './export.css';

interface Product {
  id: string;
  name: string;
  icon: string;
  sizes: { label: string; w: number; h: number }[]; // inches
  papers: { label: string; mult: number }[];
  finishes: string[];
  qty: number[];
  unit: number; // USD per item at qty 1
  min: number; // minimum order total
}

export const PRODUCTS: Product[] = [
  { id: 'business-cards', name: 'Business cards', icon: 'CreditCard', sizes: [{ label: 'Standard 3.5 × 2 in', w: 3.5, h: 2 }, { label: 'Square 2.5 × 2.5 in', w: 2.5, h: 2.5 }], papers: [{ label: 'Standard (14pt)', mult: 1 }, { label: 'Premium (16pt)', mult: 1.3 }, { label: 'Luxe (32pt)', mult: 2.2 }], finishes: ['Matte', 'Glossy', 'Soft-touch'], qty: [50, 100, 250, 500, 1000], unit: 0.4, min: 9.99 },
  { id: 'flyers', name: 'Flyers', icon: 'FileImage', sizes: [{ label: 'Letter 8.5 × 11 in', w: 8.5, h: 11 }, { label: 'A4 8.3 × 11.7 in', w: 8.27, h: 11.69 }, { label: 'A5 5.8 × 8.3 in', w: 5.83, h: 8.27 }], papers: [{ label: 'Standard (100gsm)', mult: 1 }, { label: 'Premium (150gsm)', mult: 1.35 }], finishes: ['Matte', 'Glossy'], qty: [25, 50, 100, 250, 500], unit: 0.9, min: 14.99 },
  { id: 'posters', name: 'Posters', icon: 'Image', sizes: [{ label: '11 × 17 in', w: 11, h: 17 }, { label: '18 × 24 in', w: 18, h: 24 }, { label: '24 × 36 in', w: 24, h: 36 }], papers: [{ label: 'Satin', mult: 1 }, { label: 'Premium matte', mult: 1.25 }], finishes: ['Satin', 'Matte', 'Gloss'], qty: [1, 2, 5, 10, 25], unit: 14.99, min: 14.99 },
  { id: 'invitations', name: 'Invitations', icon: 'Mail', sizes: [{ label: '5 × 7 in', w: 5, h: 7 }, { label: '4.25 × 5.5 in', w: 4.25, h: 5.5 }], papers: [{ label: 'Standard', mult: 1 }, { label: 'Pearlescent', mult: 1.6 }], finishes: ['Matte', 'Glossy'], qty: [10, 25, 50, 100], unit: 1.6, min: 12.99 },
  { id: 'postcards', name: 'Postcards', icon: 'Mails', sizes: [{ label: '6 × 4 in', w: 6, h: 4 }, { label: '7 × 5 in', w: 7, h: 5 }], papers: [{ label: 'Standard', mult: 1 }, { label: 'Premium', mult: 1.3 }], finishes: ['Matte', 'Glossy'], qty: [25, 50, 100, 250], unit: 0.85, min: 11.99 },
  { id: 'stickers', name: 'Stickers', icon: 'Sticker', sizes: [{ label: '3 × 3 in', w: 3, h: 3 }, { label: '4 × 4 in', w: 4, h: 4 }], papers: [{ label: 'Paper', mult: 1 }, { label: 'Vinyl', mult: 1.5 }], finishes: ['Matte', 'Glossy', 'Clear'], qty: [10, 25, 50, 100, 250], unit: 1.2, min: 9.99 },
  { id: 't-shirts', name: 'T-shirts', icon: 'Shirt', sizes: [{ label: 'S', w: 12, h: 16 }, { label: 'M', w: 12, h: 16 }, { label: 'L', w: 12, h: 16 }, { label: 'XL', w: 12, h: 16 }], papers: [{ label: 'Classic cotton', mult: 1 }, { label: 'Premium organic', mult: 1.4 }], finishes: ['White', 'Black', 'Heather grey', 'Navy'], qty: [1, 2, 5, 10, 25], unit: 24.99, min: 24.99 },
  { id: 'hoodies', name: 'Hoodies', icon: 'Shirt', sizes: [{ label: 'S', w: 12, h: 14 }, { label: 'M', w: 12, h: 14 }, { label: 'L', w: 12, h: 14 }], papers: [{ label: 'Fleece', mult: 1 }], finishes: ['Black', 'Grey', 'Cream'], qty: [1, 2, 5, 10], unit: 44.99, min: 44.99 },
  { id: 'mugs', name: 'Mugs', icon: 'Coffee', sizes: [{ label: '11 oz', w: 8.5, h: 3.5 }, { label: '15 oz', w: 8.5, h: 4 }], papers: [{ label: 'Ceramic', mult: 1 }], finishes: ['White', 'Black handle'], qty: [1, 2, 4, 12], unit: 16.99, min: 16.99 },
  { id: 'tote-bags', name: 'Tote bags', icon: 'ShoppingBag', sizes: [{ label: '15 × 16 in', w: 12, h: 12 }], papers: [{ label: 'Cotton canvas', mult: 1 }], finishes: ['Natural', 'Black'], qty: [1, 5, 10, 25], unit: 19.99, min: 19.99 },
  { id: 'brochures', name: 'Brochures', icon: 'BookOpen', sizes: [{ label: 'Tri-fold Letter', w: 11, h: 8.5 }], papers: [{ label: 'Standard', mult: 1 }, { label: 'Premium', mult: 1.3 }], finishes: ['Matte', 'Glossy'], qty: [25, 50, 100, 250], unit: 1.4, min: 24.99 },
  { id: 'banners', name: 'Banners', icon: 'Flag', sizes: [{ label: '6 × 2 ft', w: 72, h: 24 }, { label: '8 × 3 ft', w: 96, h: 36 }], papers: [{ label: 'Vinyl 13oz', mult: 1 }], finishes: ['Grommets', 'Pole pockets'], qty: [1, 2, 5], unit: 59.99, min: 59.99 },
];

const SHIPPING = [
  { id: 'economy', label: 'Economy', days: [10, 14], price: 0 },
  { id: 'standard', label: 'Standard', days: [5, 8], price: 7.99 },
  { id: 'express', label: 'Express', days: [2, 3], price: 19.99 },
];

const money = (n: number) => '$' + n.toFixed(2);
const bizDays = (n: number) => {
  const d = new Date();
  let k = 0;
  while (k < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) k++;
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function suggestProduct(d: Design): string {
  const p = d.preset;
  if (p.includes('business-card')) return 'business-cards';
  if (p.includes('poster')) return 'posters';
  if (p.includes('invitation') || p === 'card') return 'invitations';
  if (p.includes('postcard')) return 'postcards';
  if (p.includes('sticker') || p.includes('label')) return 'stickers';
  if (p.includes('tshirt')) return 't-shirts';
  if (p.includes('mug')) return 'mugs';
  if (p.includes('brochure')) return 'brochures';
  if (p.includes('banner')) return 'banners';
  return 'flyers';
}

interface Proof {
  ok: boolean;
  text: string;
}

function autoProof(d: Design, size: { w: number; h: number }): Proof[] {
  const out: Proof[] = [];
  const inchPerPx = size.w / d.width;
  const safe = 0.125 / inchPerPx; // px
  let lowRes = 0;
  let edge = 0;
  for (const p of d.pages)
    for (const e of p.elements) {
      if (e.hidden) continue;
      if (e.type === 'image') {
        const crop = e.crop ?? { w: 1, h: 1 };
        const dpi = (e.naturalW * crop.w) / (e.w * inchPerPx);
        if (dpi < 150) lowRes++;
      }
      if ((e.type === 'text' && htmlToText(e.html).trim()) || (e.type === 'shape' && e.html)) {
        if (e.x < safe || e.y < safe || e.x + e.w > d.width - safe || e.y + e.h > (p.height ?? d.height) - safe) edge++;
      }
    }
  const ar = d.width / d.height;
  const par = size.w / size.h;
  out.push(Math.abs(ar - par) / par < 0.04 || Math.abs(ar - 1 / par) / par < 0.04 ? { ok: true, text: 'Design fits the product size' } : { ok: false, text: `Design proportions differ from ${size.w} × ${size.h} in — it will be scaled to fit (some edges may be cropped)` });
  out.push(lowRes ? { ok: false, text: `${lowRes} image${lowRes > 1 ? 's' : ''} may print blurry (below 150 DPI)` } : { ok: true, text: 'Image resolution looks good' });
  out.push(edge ? { ok: false, text: `${edge} text element${edge > 1 ? 's are' : ' is'} close to the edge and may be trimmed` } : { ok: true, text: 'Text is inside the safe area' });
  out.push({ ok: true, text: 'Bleed will be added automatically' });
  return out;
}

export default function PrintModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design) as Design;
  const settings = useApp((s) => s.settings);
  const [step, setStep] = useState<'product' | 'options' | 'checkout'>('product');
  const [pid, setPid] = useState(() => suggestProduct(design));
  const product = PRODUCTS.find((p) => p.id === pid)!;
  const [sizeI, setSizeI] = useState(0);
  const [paperI, setPaperI] = useState(0);
  const [finish, setFinish] = useState(product.finishes[0]);
  const [qty, setQty] = useState(product.qty[1] ?? product.qty[0]);
  const [ship, setShip] = useState('standard');
  const [addr, setAddr] = useState({ name: settings.userName === 'You' ? '' : settings.userName, line1: '', city: '', zip: '', country: 'United States' });
  const [busy, setBusy] = useState(false);
  const size = product.sizes[Math.min(sizeI, product.sizes.length - 1)];
  const proof = useMemo(() => autoProof(design, size), [design, size]);

  const pick = (id: string) => {
    const p = PRODUCTS.find((x) => x.id === id)!;
    setPid(id);
    setSizeI(0);
    setPaperI(0);
    setFinish(p.finishes[0]);
    setQty(p.qty[1] ?? p.qty[0]);
    setStep('options');
  };

  const discount = qty >= 500 ? 0.35 : qty >= 250 ? 0.25 : qty >= 100 ? 0.15 : qty >= 50 ? 0.08 : 0;
  const sub = Math.max(product.min, product.unit * qty * product.papers[Math.min(paperI, product.papers.length - 1)].mult * (1 - discount) * (size.w * size.h > 400 ? 1.6 : 1));
  const shipping = SHIPPING.find((s) => s.id === ship)!;
  const tax = sub * 0.08;
  const total = sub + shipping.price + tax;

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const r = await runExport(design, { ...DEFAULT_EXPORT, format: 'pdf-print', cropMarks: true, pageIds: design.pages.map((p) => p.id) });
      downloadBlob(r.blob, r.filename);
    } catch (e) {
      useApp.getState().toast('PDF failed: ' + (e as Error).message, 'error');
    }
    setBusy(false);
  };

  const order = () => {
    if (!addr.name.trim() || !addr.line1.trim() || !addr.city.trim() || !addr.zip.trim()) return useApp.getState().toast('Please complete your shipping address', 'error');
    const no = 'CR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const orders = JSON.parse(localStorage.getItem('cream-print-orders') || '[]');
    orders.unshift({ no, designId: design.id, title: design.title, product: product.name, size: size.label, paper: product.papers[paperI]?.label, finish, qty, total, shipping: shipping.label, createdAt: Date.now() });
    localStorage.setItem('cream-print-orders', JSON.stringify(orders.slice(0, 50)));
    useApp.getState().notify(`Print order ${no} placed: ${qty} × ${product.name} — arriving by ${bizDays(shipping.days[1])}`, design.id);
    useApp.getState().toast(`Order ${no} placed! (demo — no payment taken)`, 'success');
    onClose();
  };

  const page = design.pages[0];
  const pv = (w: number) => <PageView design={design} page={page} scale={w / Math.max(design.width, page.height ?? design.height)} ctx={{ mode: 'static', pageIndex: 0, pageCount: design.pages.length }} />;

  return (
    <Modal title="Print with Cream" onClose={onClose} size="wide" testId="print-modal">
      <div className="xp-modal">
        {step === 'product' && (
          <>
            <p className="muted" style={{ marginTop: 0 }}>
              Choose a product. We'll print your design and deliver it to your door.
            </p>
            <div className="xp-products">
              {PRODUCTS.map((p) => (
                <button key={p.id} className={'xp-product' + (p.id === pid ? ' on' : '')} onClick={() => pick(p.id)} data-testid={'print-product-' + p.id}>
                  <Icon name={p.icon} size={30} />
                  <b>{p.name}</b>
                  <span className="faint">from {money(p.min)}</span>
                </button>
              ))}
            </div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
              <button className="btn" onClick={downloadPdf} disabled={busy} data-testid="print-download-pdf">
                {busy ? <Spinner /> : <Icon name="Download" size={16} />} Download print-ready PDF
              </button>
              <button className="btn primary" onClick={() => setStep('options')} data-testid="print-continue">
                Continue with {product.name}
              </button>
            </div>
          </>
        )}

        {step === 'options' && (
          <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
            <div className="col" style={{ alignItems: 'center', width: 280, flex: 'none' }}>
              <div style={{ padding: 18, background: 'var(--surface-2)', borderRadius: 16 }}>
                <div style={{ boxShadow: '0 10px 30px rgba(0,0,0,.25)', borderRadius: product.id === 'business-cards' ? 6 : 2, overflow: 'hidden', transform: 'rotate(-2deg)' }}>{pv(240)}</div>
              </div>
              <div className="faint">
                {product.name} · {size.label}
              </div>
            </div>
            <div className="grow">
              <button className="btn ghost sm" onClick={() => setStep('product')} style={{ marginBottom: 6 }}>
                <Icon name="ChevronLeft" size={16} /> All products
              </button>
              <div className="xp-split">
                <div className="field">
                  <label>Size</label>
                  <select className="select" value={sizeI} onChange={(e) => setSizeI(Number(e.target.value))} data-testid="print-size">
                    {product.sizes.map((s, i) => (
                      <option key={s.label} value={i}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Paper / material</label>
                  <select className="select" value={paperI} onChange={(e) => setPaperI(Number(e.target.value))} data-testid="print-paper">
                    {product.papers.map((s, i) => (
                      <option key={s.label} value={i}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Finish</label>
                  <select className="select" value={finish} onChange={(e) => setFinish(e.target.value)} data-testid="print-finish">
                    {product.finishes.map((f) => (
                      <option key={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Quantity</label>
                  <select className="select" value={qty} onChange={(e) => setQty(Number(e.target.value))} data-testid="print-qty">
                    {product.qty.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="xp-section">Auto-proofer</div>
              <div data-testid="print-proof">
                {proof.map((p, i) => (
                  <div key={i} className="xp-proof">
                    <Icon name={p.ok ? 'CircleCheck' : 'TriangleAlert'} size={16} style={{ color: p.ok ? 'var(--success)' : 'var(--warn)', flex: 'none' }} />
                    {p.text}
                  </div>
                ))}
              </div>
              <div className="xp-summary">
                <div className="row">
                  <span>
                    {qty} × {product.name}
                    {discount ? <span className="badge" style={{ marginLeft: 6 }}>{Math.round(discount * 100)}% bulk discount</span> : null}
                  </span>
                  <b data-testid="print-subtotal">{money(sub)}</b>
                </div>
              </div>
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
                <button className="btn" onClick={downloadPdf} disabled={busy}>
                  {busy ? <Spinner /> : <Icon name="Download" size={16} />} PDF
                </button>
                <button className="btn primary" onClick={() => setStep('checkout')} data-testid="print-to-checkout">
                  Continue to checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'checkout' && (
          <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
            <div className="grow">
              <button className="btn ghost sm" onClick={() => setStep('options')} style={{ marginBottom: 6 }}>
                <Icon name="ChevronLeft" size={16} /> Back
              </button>
              <div className="xp-section">Shipping address</div>
              <div className="field">
                <input className="input" placeholder="Full name" value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} onKeyDown={(e) => e.stopPropagation()} data-testid="print-name" />
              </div>
              <div className="field">
                <input className="input" placeholder="Street address" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} onKeyDown={(e) => e.stopPropagation()} data-testid="print-address" />
              </div>
              <div className="xp-split">
                <input className="input" placeholder="City" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} onKeyDown={(e) => e.stopPropagation()} data-testid="print-city" />
                <input className="input" placeholder="ZIP / Postal code" value={addr.zip} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} onKeyDown={(e) => e.stopPropagation()} data-testid="print-zip" />
              </div>
              <div className="xp-section">Delivery</div>
              {SHIPPING.map((s) => (
                <label key={s.id} className="xp-row-item" style={{ border: '1px solid var(--border)', marginBottom: 6 }} data-testid={'print-ship-' + s.id}>
                  <input type="radio" name="ship" checked={ship === s.id} onChange={() => setShip(s.id)} />
                  <span className="grow">
                    <b>{s.label}</b>
                    <div className="faint">
                      Arrives {bizDays(s.days[0])} – {bizDays(s.days[1])}
                    </div>
                  </span>
                  <b>{s.price ? money(s.price) : 'Free'}</b>
                </label>
              ))}
            </div>
            <div style={{ width: 280, flex: 'none' }}>
              <div style={{ borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow)', width: 'fit-content', margin: '0 auto' }}>{pv(200)}</div>
              <div className="xp-summary">
                <div className="row">
                  <span>
                    {qty} × {product.name}
                  </span>
                  <span>{money(sub)}</span>
                </div>
                <div className="faint">
                  {size.label} · {product.papers[paperI]?.label} · {finish}
                </div>
                <div className="row">
                  <span>Shipping ({shipping.label})</span>
                  <span>{shipping.price ? money(shipping.price) : 'Free'}</span>
                </div>
                <div className="row">
                  <span>Estimated tax</span>
                  <span>{money(tax)}</span>
                </div>
                <div className="row" style={{ fontSize: 16 }}>
                  <b>Total</b>
                  <b data-testid="print-total">{money(total)}</b>
                </div>
              </div>
              <button className="btn primary block lg" style={{ marginTop: 10 }} onClick={order} data-testid="print-place-order">
                Place order
              </button>
              <div className="faint" style={{ marginTop: 6, textAlign: 'center' }}>
                Demo checkout — no payment is taken. 30-day Happiness Guarantee.
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
