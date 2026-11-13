const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

function makeSvg(scale = 0.80, rx = 13) {
  const tx = 32 - 32 * scale;
  const ty = 32 - 28.5 * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="${rx}" fill="#0f1611"/>
  <g transform="translate(${tx}, ${ty}) scale(${scale})" fill="#ffffff" stroke="#ffffff">
    <path
      fill-rule="evenodd"
      d="M32 10 L60 24 L32 38 L4 24 Z M27 15.5 L41 23.5 L27 31.5 Z"
      fill="#ffffff"
      stroke="#ffffff"
      stroke-width="3"
      stroke-linejoin="round"
    />
    <path
      d="M14 33 L32 42 L50 33 V43 A18 6.5 0 0 1 14 43 Z"
      fill="#ffffff"
      stroke="none"
    />
    <path
      d="M52 28 V36"
      stroke="#ffffff"
      stroke-width="1.8"
      stroke-linecap="round"
    />
    <circle cx="52" cy="37" r="2" fill="#ffffff" stroke="none" />
    <path d="M50.6 38.5 H53.4 L55 47 H49 Z" fill="#ffffff" stroke="none" />
  </g>
</svg>`;
}

function createIco(pngBuffers) {
  const numImages = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(numImages, 4); // count

  let currentOffset = 6 + (16 * numImages);
  const entries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(currentOffset, 12); // offset
    entries.push(entry);
    currentOffset += item.buffer.length;
  }
  return Buffer.concat([header, ...entries, ...pngBuffers.map(p => p.buffer)]);
}

async function build() {
  const svg = makeSvg(0.80, 13);
  const svgBuffer = Buffer.from(svg);

  // Generate PNG sizes
  const [p16, p32, p48, p64, p180, p192, p512] = await Promise.all([
    sharp(svgBuffer).resize(16, 16).png().toBuffer(),
    sharp(svgBuffer).resize(32, 32).png().toBuffer(),
    sharp(svgBuffer).resize(48, 48).png().toBuffer(),
    sharp(svgBuffer).resize(64, 64).png().toBuffer(),
    sharp(svgBuffer).resize(180, 180).png().toBuffer(),
    sharp(svgBuffer).resize(192, 192).png().toBuffer(),
    sharp(svgBuffer).resize(512, 512).png().toBuffer(),
  ]);

  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 },
  ]);

  // Write to src/app/
  const appDir = path.join(__dirname, '..', 'src', 'app');
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svg);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(appDir, 'icon.png'), p32);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), p180);

  // Write to public/
  const pubDir = path.join(__dirname, '..', 'public');
  fs.writeFileSync(path.join(pubDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(pubDir, 'icon.svg'), svg);
  fs.writeFileSync(path.join(pubDir, 'icon-32.png'), p32);
  fs.writeFileSync(path.join(pubDir, 'icon-192.png'), p192);
  fs.writeFileSync(path.join(pubDir, 'icon-512.png'), p512);
  fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), p180);

  console.log('All icons generated successfully!');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
