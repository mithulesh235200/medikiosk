// Generates MediKiosk PWA icons with Node builtins only (no dependencies).
// Teal rounded square + white medical cross. Run: node scripts/generate-icons.cjs
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function toPNG(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter byte: none
    Buffer.from(rgba.subarray(y * size * 4, (y + 1) * size * 4)).copy(raw, y * (size * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Teal #0d9488 background, white rounded medical cross centered.
function drawIcon(size, crossScale) {
  const rgba = new Uint8ClampedArray(size * size * 4);
  const r = Math.round(size * 0.22); // corner radius
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const qx = x < r ? r - x : x >= size - r ? x - (size - 1 - r) : 0;
      const qy = y < r ? r - y : y >= size - r ? y - (size - 1 - r) : 0;
      const inside = qx === 0 || qy === 0 || qx * qx + qy * qy <= r * r;
      const i = (y * size + x) * 4;
      if (inside) {
        rgba[i] = 0x0d; rgba[i + 1] = 0x94; rgba[i + 2] = 0x88; rgba[i + 3] = 255;
      } else {
        rgba[i + 3] = 0; // transparent corners
      }
    }
  }
  // white cross
  const arm = size * 0.5 * crossScale; // half-length
  const thick = size * 0.16 * crossScale; // half-thickness
  const c = size / 2;
  const rad = Math.min(thick * 0.45, size * 0.03);
  for (let y = Math.floor(c - arm); y < Math.ceil(c + arm); y++) {
    for (let x = Math.floor(c - arm); x < Math.ceil(c + arm); x++) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const inV = Math.abs(x + 0.5 - c) <= thick;
      const inH = Math.abs(y + 0.5 - c) <= thick;
      if (!(inV || inH)) continue;
      const i = (y * size + x) * 4;
      rgba[i] = 255; rgba[i + 1] = 255; rgba[i + 2] = 255; rgba[i + 3] = 255;
      void rad;
    }
  }
  return rgba;
}

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const jobs = [
  ['icon-192.png', 192, 0.62],
  ['icon-512.png', 512, 0.62],
  ['maskable-512.png', 512, 0.5], // smaller cross = safe-zone compliant
];
for (const [file, size, scale] of jobs) {
  fs.writeFileSync(path.join(outDir, file), toPNG(size, drawIcon(size, scale)));
  console.log('wrote public/icons/' + file);
}
