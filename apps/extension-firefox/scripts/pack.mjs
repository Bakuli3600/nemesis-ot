import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, '..', 'dist');
const manifestPath = join(dist, 'manifest.json');

// ---------------------------------------------------------------------------
// 1. Post-process manifest for Firefox/AMO compatibility.
//    Vite copies public/ verbatim; here we enforce AMO-safe fields so the
//    source manifest stays the single place to edit.
// ---------------------------------------------------------------------------
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

if (!manifest.browser_specific_settings?.gecko?.id) {
  manifest.browser_specific_settings = {
    gecko: {
      id: 'nemesis@cognitia-shield',
      strict_min_version: '128.0',
    },
  };
}

// AMO requires a description under 132 chars; keep the full one in the repo.
if (manifest.description && manifest.description.length > 132) {
  manifest.description = manifest.description.slice(0, 129) + '...';
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

// ---------------------------------------------------------------------------
// 2. Zip dist/ into a web-ext-compatible artifact ready for AMO upload.
//    Pure Node implementation (no archiver dep): manifest.json must be at the
//    archive root, so we store paths relative to dist/.
// ---------------------------------------------------------------------------
const ZIP_LOCAL_HEADER = 0x04034b50;
const ZIP_CENTRAL_HEADER = 0x02014b50;
const ZIP_END_OF_CENTRAL = 0x06054b50;
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  return (crc ^ -1) >>> 0;
}

function listFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out.sort();
}

function dosDateTime(date) {
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day =
    ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function buildZip(files) {
  const now = dosDateTime(new Date());
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const name = relative(dist, file).split('\\').join('/');
    const data = readFileSync(file);
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(ZIP_LOCAL_HEADER, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // stored, no compression
    local.writeUInt16LE(now.time, 10);
    local.writeUInt16LE(now.day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(ZIP_CENTRAL_HEADER, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(now.time, 12);
    central.writeUInt16LE(now.day, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuf);

    offset += 30 + nameBuf.length + data.length;
  }

  const centralSize = centralParts.reduce((n, b) => n + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(ZIP_END_OF_CENTRAL, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

if (!existsSync(dist)) {
  console.error('dist/ not found — run "vite build" first.');
  process.exit(1);
}

mkdirSync(join(root, '..', 'release'), { recursive: true });
const zipPath = join(root, '..', 'release', 'nemesis-firefox.zip');
const files = listFiles(dist);
writeFileSync(zipPath, buildZip(files));
console.log(`Packed ${files.length} files -> ${relative(process.cwd(), zipPath)}`);
