import { useEffect, useRef, useState } from 'react';
import { Modal, Icon, Toggle } from '../ui/ui';
import { useEditor } from '../store/editor';
import { useApp } from '../store/app';
import { RECORD_PREFS_KEY, loadRecordPrefs, type RecordPrefs } from './RecordStudio';

export default function RecordModal({ onClose }: { onClose: () => void }) {
  const design = useEditor((s) => s.design);
  const [prefs, setPrefs] = useState<RecordPrefs>(loadRecordPrefs);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [err, setErr] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const vid = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let ms: MediaStream | null = null;
    let alive = true;
    (async () => {
      try {
        ms = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!alive) return ms.getTracks().forEach((t) => t.stop());
        setStream(ms);
      } catch (e) {
        setErr('Allow camera and microphone access to record. (' + (e as Error).message + ')');
      }
      try {
        const devs = await navigator.mediaDevices.enumerateDevices();
        if (!alive) return;
        setCams(devs.filter((d) => d.kind === 'videoinput'));
        setMics(devs.filter((d) => d.kind === 'audioinput'));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
      ms?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  useEffect(() => {
    if (vid.current && stream) {
      vid.current.srcObject = stream;
      vid.current.play().catch(() => {});
    }
  }, [stream]);

  const go = () => {
    const json = JSON.stringify(prefs);
    sessionStorage.setItem(RECORD_PREFS_KEY, json);
    localStorage.setItem(RECORD_PREFS_KEY, json);
    stream?.getTracks().forEach((t) => t.stop());
    if (!design) return;
    useApp.getState().saveDesign(design);
    onClose();
    useApp.getState().navigate({ name: 'present', id: design.id, mode: 'record' });
  };

  return (
    <Modal title="Present and record" onClose={onClose} testId="record-modal">
      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 200, height: 200, borderRadius: '50%', overflow: 'hidden', background: '#222', flex: 'none', display: 'grid', placeItems: 'center', color: '#aaa', fontSize: 12, textAlign: 'center' }}>
          {stream && prefs.camera ? <video ref={vid} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} /> : <Icon name={prefs.camera ? 'Camera' : 'CameraOff'} size={40} />}
        </div>
        <div className="grow">
          <p className="muted" style={{ marginTop: 0 }}>
            Record yourself presenting. Your camera appears in a bubble over your slides and your voice is recorded. You can download the video when you finish.
          </p>
          <Toggle label="Camera" on={prefs.camera} onChange={(camera) => setPrefs({ ...prefs, camera })} testId="record-camera-toggle" />
          {prefs.camera && cams.length > 0 && (
            <select className="select" value={prefs.cameraId ?? ''} onChange={(e) => setPrefs({ ...prefs, cameraId: e.target.value || undefined })} data-testid="record-camera-select">
              <option value="">Default camera</option>
              {cams.map((c, i) => (
                <option key={c.deviceId || i} value={c.deviceId}>
                  {c.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          <Toggle label="Microphone" on={prefs.mic} onChange={(mic) => setPrefs({ ...prefs, mic })} testId="record-mic-toggle" />
          {prefs.mic && mics.length > 0 && (
            <select className="select" value={prefs.micId ?? ''} onChange={(e) => setPrefs({ ...prefs, micId: e.target.value || undefined })}>
              <option value="">Default microphone</option>
              {mics.map((c, i) => (
                <option key={c.deviceId || i} value={c.deviceId}>
                  {c.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          )}
          {err && <div className="faint" style={{ color: 'var(--danger)', marginTop: 8 }}>{err}</div>}
        </div>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={go} data-testid="record-go">
          Go to recording studio
        </button>
      </div>
    </Modal>
  );
}
