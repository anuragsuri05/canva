// Indexed (8-bit palette) PNG encoder used by "Compress file". Quantises with gifenc and
// deflates with the browser's native CompressionStream — typically 3–5× smaller than canvas PNGs.

import { quantize, applyPalette } from 'gifenc';
import { crc32 } from './zip';

async function zlib(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const v = new DataView(out.buffer);
  v.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  v.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export async function encodePng8(c: HTMLCanvasElement, colors = 256): Promise<Blob> {
  const { width: w, height: h } = c;
  const rgba = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  const hasAlpha = (() => {
    for (let i = 3; i < rgba.length; i += 4 * 7) if (rgba[i] < 255) return true;
    return false;
  })();
  const format = hasAlpha ? 'rgba4444' : 'rgb565';
  const palette = quantize(rgba, colors, { format, oneBitAlpha: false });
  const index = applyPalette(rgba, palette, format);
  // Raw scanlines with filter byte 0.
  const raw = new Uint8Array((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    raw.set(index.subarray(y * w, y * w + w), y * (w + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, w);
  iv.setUint32(4, h);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // indexed colour
  const plte = new Uint8Array(palette.length * 3);
  palette.forEach((p, i) => plte.set([p[0], p[1], p[2]], i * 3));
  const parts: Uint8Array[] = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('PLTE', plte)];
  // rgba4444 quantisation leaves near-0 / near-255 alphas; snap them so backgrounds stay fully clear.
  if (hasAlpha) parts.push(chunk('tRNS', new Uint8Array(palette.map((p) => { const a = p.length > 3 ? p[3] : 255; return a <= 24 ? 0 : a >= 232 ? 255 : a; }))));
  parts.push(chunk('IDAT', await zlib(raw)), chunk('IEND', new Uint8Array(0)));
  return new Blob(parts as BlobPart[], { type: 'image/png' });
}
