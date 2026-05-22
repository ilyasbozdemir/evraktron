import { Jimp } from 'jimp';
import { imagesToIco } from 'png-to-ico';
import fs from 'fs';
import path from 'path';

const sizes = [16, 32, 48, 64, 128, 256];
const srcPath = path.resolve('public/icon.png');
const outPath = path.resolve('public/icon.ico');

async function main() {
  console.log('Reading source PNG...');
  const source = await Jimp.read(srcPath);

  // Resize to multiple sizes and save as temp PNGs
  const tempFiles = [];
  for (const size of sizes) {
    const resized = source.clone().resize({ w: size, h: size });
    const tmpPath = path.resolve(`public/icon_${size}.png`);
    await resized.write(tmpPath);
    tempFiles.push(tmpPath);
    console.log(`  ✓ ${size}x${size} done`);
  }

  // Convert to ICO
  console.log('Building ICO...');
  const icoBuffer = await imagesToIco(tempFiles);
  fs.writeFileSync(outPath, icoBuffer);
  console.log(`✅ icon.ico written (${icoBuffer.length} bytes)`);

  // Cleanup temp files
  for (const f of tempFiles) fs.unlinkSync(f);
  console.log('Temp files cleaned up.');
}

main().catch(console.error);
