import { useState } from 'react';
import { presetById } from '../model/presets';
import { Icon } from '../ui/ui';
import { RatioBox } from './CreateMenu';
import { createFromPreset } from './actions';

const PRODUCTS = [
  { preset: 'business-card', name: 'Business cards', price: 'from $19.99 / 50', icon: 'CreditCard', color: '#ffe3d3', cat: 'Business' },
  { preset: 'flyer', name: 'Flyers', price: 'from $14.99 / 25', icon: 'FileImage', color: '#e5dbff', cat: 'Marketing' },
  { preset: 'poster', name: 'Posters', price: 'from $9.99', icon: 'Image', color: '#d3f9d8', cat: 'Marketing' },
  { preset: 'tshirt', name: 'T-shirts', price: 'from $24.99', icon: 'Shirt', color: '#ffdeeb', cat: 'Apparel' },
  { preset: 'mug', name: 'Mugs', price: 'from $14.99', icon: 'Coffee', color: '#fff3bf', cat: 'Gifts' },
  { preset: 'sticker', name: 'Stickers', price: 'from $7.99 / 10', icon: 'Sticker', color: '#d0ebff', cat: 'Gifts' },
  { preset: 'invitation', name: 'Invitations', price: 'from $17.99 / 20', icon: 'Mail', color: '#fcc2d7', cat: 'Cards & invitations' },
  { preset: 'card', name: 'Greeting cards', price: 'from $3.99', icon: 'Gift', color: '#ffe8cc', cat: 'Cards & invitations' },
  { preset: 'postcard', name: 'Postcards', price: 'from $12.99 / 25', icon: 'Mail', color: '#c5f6fa', cat: 'Cards & invitations' },
  { preset: 'brochure', name: 'Brochures', price: 'from $29.99 / 25', icon: 'BookOpen', color: '#e9fac8', cat: 'Marketing' },
  { preset: 'label', name: 'Labels', price: 'from $9.99 / 24', icon: 'Tag', color: '#f3d9fa', cat: 'Business' },
  { preset: 'banner', name: 'Banners', price: 'from $39.99', icon: 'Flag', color: '#ffc9c9', cat: 'Marketing' },
  { preset: 'calendar', name: 'Calendars', price: 'from $19.99', icon: 'Calendar', color: '#dbe4ff', cat: 'Gifts' },
  { preset: 'certificate', name: 'Certificates', price: 'from $9.99 / 10', icon: 'Award', color: '#fff9db', cat: 'Business' },
  { preset: 'menu', name: 'Menus', price: 'from $14.99 / 10', icon: 'UtensilsCrossed', color: '#ffe066', cat: 'Business' },
  { preset: 'letter', name: 'Letterheads', price: 'from $19.99 / 50', icon: 'FileText', color: '#e7f5ff', cat: 'Business' },
];

const CATS = ['All', 'Business', 'Marketing', 'Cards & invitations', 'Apparel', 'Gifts'];

export default function PrintShop() {
  const [cat, setCat] = useState('All');
  const list = PRODUCTS.filter((p) => cat === 'All' || p.cat === cat);
  return (
    <div className="home-content" data-testid="print-page">
      <div className="print-hero">
        <div>
          <span className="badge">Print with Cream</span>
          <h1>Print Shop</h1>
          <p>Design it here, print it anywhere. Every product opens at the right size with bleed-ready dimensions — export a print-ready PDF and send it to any printer.</p>
        </div>
        <Icon name="Printer" size={80} className="print-hero-ico" />
      </div>
      <div className="chips" style={{ margin: '18px 0' }}>
        {CATS.map((c) => (
          <button key={c} className={'chip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>
      <div className="print-grid">
        {list.map((p) => {
          const pr = presetById(p.preset);
          return (
            <div className="print-card" key={p.preset} data-testid={'print-' + p.preset}>
              <div className="print-art" style={{ background: p.color }}>
                <Icon name={p.icon} size={40} />
                {pr && (
                  <span className="print-ratio">
                    <RatioBox p={pr} max={34} />
                  </span>
                )}
              </div>
              <div className="print-meta">
                <b>{p.name}</b>
                <span className="faint">{pr?.display}</span>
                <span className="muted">{p.price}</span>
              </div>
              <button className="btn primary block" onClick={() => createFromPreset(p.preset)} data-testid={'print-design-' + p.preset}>
                Design
              </button>
            </div>
          );
        })}
      </div>
      <p className="faint" style={{ marginTop: 24 }}>
        Prices are illustrative. Cream doesn’t take orders — use Share → Download → PDF Print for a print-ready file with crop marks and bleed.
      </p>
    </div>
  );
}
