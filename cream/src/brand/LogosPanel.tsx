// Editor "Logos" side panel: every logo from every brand kit, plus upload into the active kit.
import { useApp } from '../store/app';
import { insertImage, setDragPayload } from '../editor/dnd';
import { Icon } from '../ui/ui';
import { pickFiles } from '../home/actions';
import { SrcImg, updateKit } from './shared';
import { useActiveKit } from './BrandPanel';
import './brand.css';

export default function LogosPanel() {
  const kits = useApp((s) => s.brandKits);
  const [kit] = useActiveKit();
  const upload = async () => {
    if (!kit) return;
    const files = await pickFiles('image/*', true);
    const refs: string[] = [];
    for (const f of files) refs.push((await useApp.getState().addAssetFromFile(f)).ref);
    if (refs.length) {
      updateKit(kit.id, (k) => void k.logos.push(...refs));
      useApp.getState().toast(`Added ${refs.length} logo${refs.length > 1 ? 's' : ''} to ${kit.name}`, 'success');
    }
  };
  const withLogos = kits.filter((k) => k.logos.length);
  return (
    <div data-testid="logos-panel">
      <button className="btn primary block" onClick={upload} disabled={!kit} data-testid="logos-upload">
        <Icon name="CloudUpload" size={16} /> Upload logo{kit ? ` to ${kit.name}` : ''}
      </button>
      {withLogos.length === 0 && (
        <div className="empty">
          <Icon name="Hexagon" size={28} />
          <div style={{ marginTop: 8 }}>No logos yet. Upload your logo to use it in any design.</div>
        </div>
      )}
      {withLogos.map((k) => (
        <div key={k.id}>
          <div className="section-head">
            <h3>{k.name}</h3>
          </div>
          <div className="asset-grid">
            {k.logos.map((src, i) => (
              <button
                key={src + i}
                className="asset-tile contain checker-soft"
                draggable
                onDragStart={(e) => setDragPayload(e, { kind: 'image', src })}
                onClick={() => insertImage(src, { frac: 0.35 })}
                data-testid="logo-tile"
              >
                <SrcImg src={src} />
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn ghost block" style={{ marginTop: 14 }} onClick={() => useApp.getState().navigate({ name: 'home', section: 'brand', param: kit?.id })}>
        Manage logos in Brand Hub
      </button>
    </div>
  );
}
