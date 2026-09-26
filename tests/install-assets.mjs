import fs from 'node:fs';
import assert from 'node:assert/strict';
const manifest = JSON.parse(fs.readFileSync('public/manifest.webmanifest', 'utf8'));
assert.equal(manifest.id, '/');
assert.equal(manifest.start_url, '/');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const png = fs.readFileSync('public' + icon.src);
  const [width, height] = icon.sizes.split('x').map(Number);
  assert.equal(png.readUInt32BE(16), width);
  assert.equal(png.readUInt32BE(20), height);
  assert.equal(icon.type, 'image/png');
}
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
const apple = fs.readFileSync('public/icons/possara-180-v2.png');
assert.equal(apple.readUInt32BE(16), 180);
assert.match(fs.readFileSync('index.html', 'utf8'), /apple-touch-icon.*possara-180-v2.png/);
assert.ok(fs.readFileSync('public/favicon.svg', 'utf8').includes('url(#upper)'));
console.log('PASS: stable app identity, current logo, PNG icon dimensions, maskable and Apple icons.');
