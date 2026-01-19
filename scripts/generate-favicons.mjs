import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const publicDir = path.join(root, 'public');

const svgPath = path.join(publicDir, 'favicon.svg');
const maskableSvgPath = path.join(publicDir, 'maskable-icon.svg');
const out = (name) => path.join(publicDir, name);

// Keep classic small sizes for tabs, plus Google/PWA-friendly sizes.
// Required by task: 48, 96, 192 (+ multi-size ico).
const pngSizes = [16, 32, 48, 96, 180, 192, 256, 512];

const maskablePngSizes = [192, 512];

async function ensureSvg() {
  try {
    await fs.access(svgPath);
  } catch {
    throw new Error(`Missing ${svgPath}. Create public/favicon.svg first.`);
  }

  try {
    await fs.access(maskableSvgPath);
  } catch {
    throw new Error(`Missing ${maskableSvgPath}. Create public/maskable-icon.svg first.`);
  }
}

async function writePng(size) {
  const buf = await sharp(svgPath)
    .resize(size, size, { fit: 'cover' })
    .png({ quality: 100 })
    .toBuffer();

  const names = [];
  if (size === 180) {
    names.push('apple-touch-icon.png');
  } else {
    // Compatibility with existing links
    names.push(`favicon-${size}x${size}.png`);

    // Convenience / task-required filenames
    if ([48, 96, 192, 256].includes(size)) {
      names.push(`favicon-${size}.png`);
    }
  }

  await Promise.all(names.map((name) => fs.writeFile(out(name), buf)));
  return { size, buf, names };
}

async function writeMaskablePng(size) {
  const buf = await sharp(maskableSvgPath)
    .resize(size, size, { fit: 'cover' })
    .png({ quality: 100 })
    .toBuffer();

  const name = `maskable-icon-${size}.png`;
  await fs.writeFile(out(name), buf);
  return { size, name };
}

async function writeIco(pngBuffers) {
  // Most browsers still look for /favicon.ico
  const icoBuf = await pngToIco(pngBuffers);
  await fs.writeFile(out('favicon.ico'), icoBuf);
}

async function writeManifest() {
  const manifest = {
    name: 'DSA Visualizer',
    short_name: 'DSA Visualizer',
    icons: [
      { src: '/favicon-96.png', sizes: '96x96', type: 'image/png' },
      { src: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/maskable-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/favicon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/maskable-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    theme_color: '#0B1220',
    background_color: '#0B1220',
    display: 'standalone',
  };

  await fs.writeFile(out('site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
}

async function main() {
  await ensureSvg();

  const generated = [];
  for (const size of pngSizes) {
    generated.push(await writePng(size));
  }

  const maskableGenerated = [];
  for (const size of maskablePngSizes) {
    maskableGenerated.push(await writeMaskablePng(size));
  }

  const icoInputs = generated
    .filter((x) => [16, 32, 48].includes(x.size))
    .map((x) => x.buf);

  await writeIco(icoInputs);
  await writeManifest();

  // Convenience: a single "icon" filename some templates reference
  await fs.copyFile(out('favicon-512x512.png'), out('icon-512.png'));

  console.log('Favicons generated in public/:');
  for (const g of generated) for (const name of g.names) console.log(`- ${name}`);
  for (const m of maskableGenerated) console.log(`- ${m.name}`);
  console.log('- favicon.ico');
  console.log('- site.webmanifest');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
