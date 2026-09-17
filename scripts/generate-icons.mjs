/**
 * Generates simple shield-style PNG icons for the extension (16/48/128px).
 * Pure Node (zlib) — no image dependencies. Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'apps/extension/public/icons');
mkdirSync(outDir, { recursive: true });

// CRC32 for PNG chunks
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

function makeIcon(size) {
  // RGBA pixel buffer
  const px = new Uint8Array(size * size * 4);
  const cx = (size - 1) / 2;
  const r = size / 2 - 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cx;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let a = 0; // transparent outside circle
      let rr = 0x06, gg = 0xb6, bb = 0xd4; // cyan shield

      if (dist <= r) {
        a = 255;
        // inner shield emblem: darker navy check area
        const shieldTop = size * 0.22;
        const shieldBot = size * 0.78;
        const halfW = size * 0.26 * (1 - (y - shieldTop) / (shieldBot - shieldTop) * 0.55);
        const inShield = y >= shieldTop && y <= shieldBot && Math.abs(dx) <= halfW;
        if (inShield) {
          // draw a simple check mark
          const t = (y - shieldTop) / (shieldBot - shieldTop);
          const checkX = Math.abs(dx);
          const isCheck = (t > 0.45 && t < 0.62 && checkX < size * 0.10) ||
            (t > 0.58 && t < 0.75 && dx > 0 && dx < size * 0.22 && Math.abs((dx - 0.06 * size) - (t - 0.58) * size * 0.9) < size * 0.05);
          if (isCheck) { rr = 0x05; gg = 0x08; bb = 0x11; } // navy check
        }
        // subtle border
        if (dist > r - Math.max(1, size / 24)) { rr = 0x0e; gg = 0xa5; bb = 0xb9; }
      }

      px[i] = rr; px[i + 1] = gg; px[i + 2] = bb; px[i + 3] = a;
    }
  }

  // Assemble PNG
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  // rows with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [16, 48, 128]) {
  writeFileSync(join(outDir, `icon${size}.png`), makeIcon(size));
  console.log(`Wrote icon${size}.png`);
}
