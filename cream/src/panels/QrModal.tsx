// QR Code app: URL → SVG QR code (via `qrcode`) inserted as a recolourable SVG element.
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Modal, Slider, Icon } from '../ui/ui';
import { insertSvg } from '../editor/dnd';
import { useEditor } from '../store/editor';

const LS = 'cream.qr.last';

export default function QrModal({ onClose }: { onClose: () => void }) {
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(LS) || '{}');
    } catch {
      return {};
    }
  })();
  const [url, setUrl] = useState<string>(saved.url ?? '');
  const [fg, setFg] = useState<string>(saved.fg ?? '#000000');
  const [bg, setBg] = useState<string>(saved.bg ?? '#ffffff');
  const [margin, setMargin] = useState<number>(saved.margin ?? 2);
  const [ecl, setEcl] = useState<'L' | 'M' | 'Q' | 'H'>(saved.ecl ?? 'M');
  const [size, setSize] = useState<number>(saved.size ?? 35);
  const [transparent, setTransparent] = useState<boolean>(!!saved.transparent);
  const [svg, setSvg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!url.trim()) {
      setSvg('');
      setErr('');
      return;
    }
    let alive = true;
    QRCode.toString(url.trim(), { type: 'svg', margin, errorCorrectionLevel: ecl, color: { dark: fg, light: transparent ? '#0000' : bg } })
      .then((s) => {
        if (!alive) return;
        setSvg(s);
        setErr('');
      })
      .catch((e) => alive && setErr(e?.message ?? 'Could not generate a QR code for that text.'));
    return () => {
      alive = false;
    };
  }, [url, fg, bg, margin, ecl, transparent]);

  const add = () => {
    if (!svg || !useEditor.getState().design) return;
    insertSvg(svg, { keepRatio: true, frac: size / 100, credit: { title: `QR code: ${url.trim()}`, source: 'qrcode' } });
    try {
      localStorage.setItem(LS, JSON.stringify({ url, fg, bg, margin, ecl, size, transparent }));
    } catch {
      /* ignore */
    }
    const id = useEditor.getState().selection[0];
    if (id) useEditor.getState().updateEl(id, { name: 'QR code', link: /^https?:\/\//.test(url.trim()) ? url.trim() : undefined } as any);
    onClose();
  };

  return (
    <Modal
      title={
        <span className="row" style={{ gap: 8 }}>
          <Icon name="QrCode" size={18} /> QR Code
        </span>
      }
      onClose={onClose}
      testId="qr-modal"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!svg} onClick={add} data-testid="qr-add">
            Add to design
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 180px', gap: 18 }}>
        <div>
          <div className="field">
            <label htmlFor="qr-url">URL or text</label>
            <input
              id="qr-url"
              className="input"
              placeholder="https://example.com"
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') add();
              }}
              data-testid="qr-url"
            />
          </div>
          <div className="row" style={{ gap: 12, marginBottom: 12 }}>
            <div className="field grow" style={{ margin: 0 }}>
              <label>Foreground</label>
              <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} style={{ width: '100%', height: 34, border: '1px solid var(--border)', borderRadius: 8, background: 'none' }} data-testid="qr-fg" />
            </div>
            <div className="field grow" style={{ margin: 0 }}>
              <label>Background</label>
              <input type="color" value={bg} disabled={transparent} onChange={(e) => setBg(e.target.value)} style={{ width: '100%', height: 34, border: '1px solid var(--border)', borderRadius: 8, background: 'none' }} data-testid="qr-bg" />
            </div>
          </div>
          <label className="row" style={{ marginBottom: 12, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={transparent} onChange={(e) => setTransparent(e.target.checked)} /> Transparent background
          </label>
          <Slider label="Margin" min={0} max={8} value={margin} onChange={setMargin} testId="qr-margin" />
          <Slider label="Size on page (%)" min={10} max={90} value={size} onChange={setSize} testId="qr-size" />
          <div className="field">
            <label>Error correction</label>
            <select className="select" value={ecl} onChange={(e) => setEcl(e.target.value as any)}>
              <option value="L">Low (7%)</option>
              <option value="M">Medium (15%)</option>
              <option value="Q">Quartile (25%)</option>
              <option value="H">High (30%)</option>
            </select>
          </div>
        </div>
        <div>
          <div className="label" style={{ marginBottom: 6 }}>
            Preview
          </div>
          <div className={transparent ? 'checker' : undefined} style={{ width: 180, height: 180, borderRadius: 10, border: '1px solid var(--border)', display: 'grid', placeItems: 'center', overflow: 'hidden', background: transparent ? undefined : 'var(--surface-2)' }} data-testid="qr-preview">
            {svg ? <div style={{ width: 170, height: 170 }} dangerouslySetInnerHTML={{ __html: svg.replace('<svg ', '<svg width="170" height="170" ') }} /> : <span className="faint" style={{ padding: 16, textAlign: 'center' }}>{err || 'Enter a URL to generate your code'}</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
