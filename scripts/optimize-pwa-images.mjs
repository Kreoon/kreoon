/**
 * Script to optimize PWA and favicon images
 * Run with: node scripts/optimize-pwa-images.mjs
 */

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const images = [
  { input: 'favicon.png', output: 'favicon.png', size: 64, quality: 90 },
  { input: 'favicon.png', output: 'pwa-192x192.png', size: 192, quality: 85 },
  { input: 'favicon.png', output: 'pwa-512x512.png', size: 512, quality: 80 },
];

async function optimizeImages() {
  console.log('🖼️  Optimizing PWA images...\n');

  // Read the source image (using the 1080x1080 as source)
  const sourceBuffer = readFileSync(join(publicDir, 'favicon.png'));

  for (const img of images) {
    try {
      const outputPath = join(publicDir, img.output);

      const result = await sharp(sourceBuffer)
        .resize(img.size, img.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({
          quality: img.quality,
          compressionLevel: 9,
          palette: true
        })
        .toBuffer();

      writeFileSync(outputPath, result);

      const originalSize = sourceBuffer.length;
      const newSize = result.length;
      const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);

      console.log(`✅ ${img.output}: ${img.size}x${img.size}px`);
      console.log(`   ${(originalSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (${reduction}% smaller)\n`);
    } catch (error) {
      console.error(`❌ Error processing ${img.output}:`, error.message);
    }
  }

  console.log('🎉 Done!');
}

optimizeImages().catch(console.error);
