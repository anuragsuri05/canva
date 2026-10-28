// Uploads tab: upload files (button / drag & drop), Record yourself, Images / Videos / Audio grids with ⋯ menu.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Asset } from '../model/types';
import { useApp } from '../store/app';
import { useSrc } from '../store/blobs';
import { useEditor } from '../store/editor';
import { insertAudio, insertImageSmart, insertVideo, setDragPayload, setPageBackgroundImage } from '../editor/dnd';
import { Icon, Menu, Modal, Segmented, fmtDate } from '../ui/ui';
import { fmtDuration } from '../assets/openverse';
import { EmptyBox, togglePreview, usePlayer, stopPreview } from './common';

type Tab = 'image' | 'video' | 'audio';
const ACCEPT = 'image/*,video/*,audio/*,.svg,.ttf,.otf,.woff,.woff2';
const MAX_BYTES: Record<string, number> = { image: 50e6, video: 1e9, audio: 250e6, font: 20e6 };

const ref = (a: Asset) => 'asset:' + a.id;
const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);

export async function uploadFiles(files: File[]) {
  const app = useApp.getState();
  let ok = 0;
  let fonts = 0;
  for (const f of files) {
    const kind = f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : /\.(ttf|otf|woff2?)$/i.test(f.name) ? 'font' : f.type.startsWith('image/') ? 'image' : null;
    if (!kind) {
      app.toast(`“${f.name}” isn't a supported file type`, 'error');
      continue;
    }
    if (f.size > MAX_BYTES[kind]) {
      app.toast(`“${f.name}” is too large`, 'error');
      continue;
    }
    try {
      await app.addAssetFromFile(f);
      ok++;
      if (kind === 'font') fonts++;
    } catch {
      app.toast(`Couldn't upload “${f.name}”`, 'error');
    }
  }
  if (ok) app.toast(fonts ? `Uploaded ${ok} file${ok > 1 ? 's' : ''} (${fonts} font${fonts > 1 ? 's' : ''} now in the font menu)` : `Uploaded ${ok} file${ok > 1 ? 's' : ''}`, 'success');
  return ok;
}

export function insertAsset(a: Asset) {
  if (!useEditor.getState().design) return;
  if (a.kind === 'image') return insertImageSmart(ref(a), { w: a.width, h: a.height, credit: { title: a.name, source: 'upload' } });
  if (a.kind === 'video') return insertVideo(ref(a), { w: a.width, h: a.height, duration: a.duration && isFinite(a.duration) ? a.duration : undefined, credit: { title: a.name, source: 'upload' } });
  if (a.kind === 'audio') return insertAudio(ref(a), a.name.replace(/\.[a-z0-9]+$/i, ''), { duration: a.duration && isFinite(a.duration) ? a.duration : undefined, credit: { title: a.name, source: 'upload' } });
}

function assetDrag(e: React.DragEvent, a: Asset) {
  if (a.kind === 'image') setDragPayload(e, { kind: 'image', src: ref(a), w: a.width, h: a.height, credit: { title: a.name, source: 'upload' } });
  else if (a.kind === 'video') setDragPayload(e, { kind: 'video', src: ref(a), w: a.width, h: a.height, duration: a.duration, credit: { title: a.name, source: 'upload' } });
  else if (a.kind === 'audio') setDragPayload(e, { kind: 'audio', src: ref(a), title: a.name, duration: a.duration });
}

function assetMenu(a: Asset, onInfo: () => void) {
  const app = useApp.getState();
  return [
    { label: 'Add to design', icon: 'Plus', onClick: () => insertAsset(a), testId: 'asset-add' },
    ...(a.kind === 'image' ? [{ label: 'Set as background', icon: 'Wallpaper', onClick: () => setPageBackgroundImage(ref(a), { title: a.name, source: 'upload' }) }] : []),
    { label: 'Rename', icon: 'PenLine', onClick: () => {
      const n = prompt('Rename file', a.name);
      if (n && n.trim()) app.patchAsset(a.id, { name: n.trim() });
    } },
    { label: 'Info', icon: 'Info', onClick: onInfo, testId: 'asset-info' },
    { sep: true },
    { label: 'Move to trash', icon: 'Trash2', danger: true, testId: 'asset-delete', onClick: () => {
      app.patchAsset(a.id, { trashedAt: Date.now() });
      app.toast(`Moved “${a.name}” to trash`);
    } },
  ];
}

function MoreButton({ a, onInfo }: { a: Asset; onInfo: () => void }) {
  const [open, setOpen] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <>
      <span
        ref={btn as any}
        role="button"
        tabIndex={0}
        className={'mini-btn more' + (open ? ' show' : '')}
        aria-label="More options"
        data-testid="asset-more"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.stopPropagation();
            setOpen(true);
          }
        }}
      >
        <Icon name="Ellipsis" size={16} />
      </span>
      {open && <Menu anchor={btn.current} items={assetMenu(a, onInfo)} onClose={() => setOpen(false)} placement="bottom-end" />}
    </>
  );
}

function ImageTile({ a, onInfo }: { a: Asset; onInfo: () => void }) {
  const src = useSrc(ref(a));
  return (
    <div role="button" tabIndex={0} className="pn-photo" data-testid="upload-tile" title={a.name} draggable onDragStart={(e) => assetDrag(e, a)} onClick={() => insertAsset(a)} onKeyDown={(e) => e.key === 'Enter' && insertAsset(a)} style={{ aspectRatio: a.width && a.height ? `${a.width} / ${a.height}` : '1' }}>
      {src ? <img src={src} alt={a.name} draggable={false} className={a.mime === 'image/svg+xml' ? 'checker' : undefined} /> : null}
      <MoreButton a={a} onInfo={onInfo} />
      <span className="credit">{a.name}</span>
    </div>
  );
}

function VideoTileU({ a, onInfo }: { a: Asset; onInfo: () => void }) {
  const src = useSrc(ref(a));
  const v = useRef<HTMLVideoElement>(null);
  return (
    <div
      role="button"
      tabIndex={0}
      className="pn-photo"
      data-testid="upload-tile"
      title={a.name}
      draggable
      onDragStart={(e) => assetDrag(e, a)}
      onClick={() => insertAsset(a)}
      onKeyDown={(e) => e.key === 'Enter' && insertAsset(a)}
      onPointerEnter={() => v.current?.play().catch(() => {})}
      onPointerLeave={() => v.current?.pause()}
      style={{ aspectRatio: a.width && a.height ? `${a.width} / ${a.height}` : '16 / 9' }}
    >
      {src && <video ref={v} src={src + '#t=0.1'} muted loop playsInline preload="metadata" style={{ position: 'absolute', inset: 0 }} />}
      {a.duration && isFinite(a.duration) ? (
        <span className="dur">
          <Icon name="Play" size={10} />
          {fmtDuration(a.duration)}
        </span>
      ) : null}
      <MoreButton a={a} onInfo={onInfo} />
    </div>
  );
}

function AudioRowU({ a, onInfo }: { a: Asset; onInfo: () => void }) {
  const src = useSrc(ref(a));
  const st = usePlayer();
  const playing = st.id === a.id;
  return (
    <div className="pn-row" role="button" tabIndex={0} data-testid="upload-tile" draggable onDragStart={(e) => assetDrag(e, a)} onClick={() => insertAsset(a)} onKeyDown={(e) => e.key === 'Enter' && insertAsset(a)}>
      <button
        className="pn-play"
        style={{ background: '#8b3dff' }}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={(e) => {
          e.stopPropagation();
          if (src) togglePreview(a.id, src);
        }}
      >
        <Icon name={playing ? 'Pause' : 'Play'} size={18} />
      </button>
      <div className="meta">
        <div className="t">{a.name}</div>
        <div className="s">{fmtDate(a.createdAt)}</div>
      </div>
      <span className="d">{fmtDuration(a.duration ?? 0)}</span>
      <div style={{ position: 'relative', width: 28, height: 28 }}>
        <MoreButton a={a} onInfo={onInfo} />
      </div>
    </div>
  );
}

function InfoModal({ a, onClose }: { a: Asset; onClose: () => void }) {
  const rows: [string, string][] = [
    ['Name', a.name],
    ['Type', a.mime || a.kind],
    ['Size', fmtSize(a.size)],
    ...(a.width && a.height ? ([['Dimensions', `${a.width} × ${a.height} px`]] as [string, string][]) : []),
    ...(a.duration && isFinite(a.duration) ? ([['Duration', fmtDuration(a.duration)]] as [string, string][]) : []),
    ['Uploaded', new Date(a.createdAt).toLocaleString()],
  ];
  return (
    <Modal title="File info" onClose={onClose} testId="asset-info-modal">
      <table style={{ width: '100%', fontSize: 13.5, borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="muted" style={{ padding: '6px 12px 6px 0', width: 110 }}>
                {k}
              </td>
              <td style={{ padding: '6px 0', wordBreak: 'break-all' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}

/* ---------- Record yourself ---------- */
function RecordModal({ onClose }: { onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const started = useRef(0);
  const [state, setState] = useState<'starting' | 'ready' | 'recording' | 'saving' | 'error'>('starting');
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setErr('Your browser does not support camera recording.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { width: 1280, height: 720 }, audio: true })
      .catch(() => navigator.mediaDevices.getUserMedia({ video: true }))
      .then((s) => {
        if (!alive) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (video.current) video.current.srcObject = s;
        setState('ready');
      })
      .catch((e) => {
        setState('error');
        setErr(e?.name === 'NotAllowedError' ? 'Camera access was blocked. Allow camera access in your browser settings and try again.' : 'No camera was found.');
      });
    return () => {
      alive = false;
      rec.current?.state === 'recording' && rec.current.stop();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (state !== 'recording') return;
    const id = setInterval(() => setSecs((Date.now() - started.current) / 1000), 250);
    return () => clearInterval(id);
  }, [state]);

  const start = () => {
    if (!stream.current) return;
    chunks.current = [];
    const mime = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find((m) => MediaRecorder.isTypeSupported(m));
    const r = new MediaRecorder(stream.current, mime ? { mimeType: mime } : undefined);
    r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    r.onstop = async () => {
      setState('saving');
      const duration = (Date.now() - started.current) / 1000;
      const blob = new Blob(chunks.current, { type: r.mimeType || 'video/webm' });
      const settings = stream.current?.getVideoTracks()[0]?.getSettings();
      const app = useApp.getState();
      const { asset, ref: src } = await app.addAssetFromBlob(blob, `Recording ${new Date().toLocaleString()}.webm`, 'video');
      const w = asset.width || settings?.width || 1280;
      const h = asset.height || settings?.height || 720;
      app.patchAsset(asset.id, { duration, width: w, height: h });
      if (useEditor.getState().design) await insertVideo(src, { w, h, duration });
      app.toast('Recording saved to Uploads', 'success');
      onClose();
    };
    started.current = Date.now();
    setSecs(0);
    r.start(250);
    rec.current = r;
    setState('recording');
  };

  return (
    <Modal
      title="Record yourself"
      onClose={onClose}
      testId="record-modal"
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          {state === 'recording' ? (
            <button className="btn danger" onClick={() => rec.current?.stop()} data-testid="record-stop">
              <Icon name="Square" size={14} /> Stop & save
            </button>
          ) : (
            <button className="btn primary" disabled={state !== 'ready'} onClick={start} data-testid="record-start">
              <Icon name="Circle" size={14} /> {state === 'saving' ? 'Saving…' : 'Start recording'}
            </button>
          )}
        </>
      }
    >
      {state === 'error' ? (
        <EmptyBox icon="VideoOff">{err}</EmptyBox>
      ) : (
        <div className="pn-rec">
          <video ref={video} autoPlay muted playsInline />
          {state === 'recording' && <span className="tm">● {fmtDuration(secs) || '0:00'}</span>}
          {state === 'starting' && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>Starting camera…</div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function UploadsPanel() {
  const assets = useApp((s) => s.assets);
  const [tab, setTab] = useState<Tab>('image');
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [info, setInfo] = useState<Asset | null>(null);
  const [recording, setRecording] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const list = useMemo(() => assets.filter((a) => !a.trashedAt && a.kind === tab), [assets, tab]);
  const counts = useMemo(() => {
    const c = { image: 0, video: 0, audio: 0, font: 0 };
    assets.forEach((a) => !a.trashedAt && c[a.kind]++);
    return c;
  }, [assets]);
  useEffect(() => () => stopPreview(), []);

  const handle = async (files: File[]) => {
    if (!files.length) return;
    setBusy((b) => b + files.length);
    const first = files[0];
    if (first.type.startsWith('video/')) setTab('video');
    else if (first.type.startsWith('audio/')) setTab('audio');
    else if (first.type.startsWith('image/')) setTab('image');
    try {
      await uploadFiles(files);
    } finally {
      setBusy((b) => b - files.length);
    }
  };

  const cols = useMemo(() => {
    const out: [Asset[], Asset[]] = [[], []];
    const hg = [0, 0];
    list.forEach((a) => {
      const k = hg[0] <= hg[1] ? 0 : 1;
      out[k].push(a);
      hg[k] += a.width && a.height ? a.height / a.width : 1;
    });
    return out;
  }, [list]);

  return (
    <div
      className="pn"
      data-testid="uploads-panel"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false);
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setOver(false);
        handle([...e.dataTransfer.files]);
      }}
    >
      <div className="row" style={{ gap: 6 }}>
        <button className="btn primary lg grow" onClick={() => input.current?.click()} data-testid="upload-button">
          <Icon name="CloudUpload" size={18} /> Upload files
        </button>
      </div>
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        hidden
        data-testid="upload-input"
        onChange={(e) => {
          handle([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
      <button className="btn block" style={{ marginTop: 8 }} onClick={() => setRecording(true)} data-testid="record-yourself">
        <Icon name="Webcam" size={16} /> Record yourself
      </button>
      <div className={'pn-drop' + (over ? ' over' : '')} data-testid="upload-dropzone">
        <Icon name="Upload" size={16} /> {over ? 'Drop to upload' : 'Drag files here — images, videos, audio or fonts'}
      </div>

      <div style={{ margin: '14px 0 10px' }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'image', label: `Images${counts.image ? ` (${counts.image})` : ''}` },
            { value: 'video', label: `Videos${counts.video ? ` (${counts.video})` : ''}` },
            { value: 'audio', label: `Audio${counts.audio ? ` (${counts.audio})` : ''}` },
          ]}
        />
      </div>
      {busy > 0 && (
        <div className="row faint" style={{ marginBottom: 8 }}>
          <span className="spinner" style={{ width: 14, height: 14, margin: 0, borderWidth: 2 }} /> Uploading {busy} file{busy > 1 ? 's' : ''}…
        </div>
      )}
      {!list.length && !busy ? (
        <EmptyBox icon={tab === 'image' ? 'ImagePlus' : tab === 'video' ? 'Film' : 'Music'}>
          No {tab === 'image' ? 'images' : tab === 'video' ? 'videos' : 'audio'} uploaded yet.
          <br />
          Upload files or drag them here.
        </EmptyBox>
      ) : tab === 'audio' ? (
        <div className="pn-audio">
          {list.map((a) => (
            <AudioRowU key={a.id} a={a} onInfo={() => setInfo(a)} />
          ))}
        </div>
      ) : (
        <div className="pn-masonry" data-testid="upload-grid">
          {cols.map((c, i) => (
            <div className="col" key={i}>
              {c.map((a) => (tab === 'image' ? <ImageTile key={a.id} a={a} onInfo={() => setInfo(a)} /> : <VideoTileU key={a.id} a={a} onInfo={() => setInfo(a)} />))}
            </div>
          ))}
        </div>
      )}
      {counts.font > 0 && <p className="faint" style={{ marginTop: 12 }}>{counts.font} uploaded font{counts.font > 1 ? 's' : ''} available in the font menu.</p>}
      {info && <InfoModal a={info} onClose={() => setInfo(null)} />}
      {recording && <RecordModal onClose={() => setRecording(false)} />}
    </div>
  );
}
