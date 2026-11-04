const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function processImages() {
  const root = path.resolve(__dirname, '..');
  const src = path.join(root, 'public/assets/aistudio/WhatsApp_Image_2026-10-30_at_9.19.45_PM_d188417f.jpg');
  
  if (!fs.existsSync(src)) {
    throw new Error('Source file not found: ' + src);
  }

  // Sample navy color from the image border
  const navyBg = { r: 1, g: 11, b: 31, alpha: 1 };

  // 1. Square version: 1000x1000 with clean padding
  await sharp(src)
    .resize(1000, 1000, {
      fit: 'contain',
      background: navyBg
    })
    .png({ quality: 95 })
    .toFile(path.join(root, 'public/og-celestial-square.png'));

  // 2. Landscape banner version: 1200x630
  // Place a 520x520 centered logo on a 1200x630 background
  const logoSquare = await sharp(src)
    .resize(520, 520, {
      fit: 'contain',
      background: navyBg
    })
    .toBuffer();

  await sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: navyBg
    }
  })
  .composite([
    {
      input: logoSquare,
      top: 55,
      left: Math.round((1200 - 520) / 2)
    }
  ])
  .png({ quality: 95 })
  .toFile(path.join(root, 'public/og-celestial-banner.png'));

  // Main files
  fs.copyFileSync(path.join(root, 'public/og-celestial-banner.png'), path.join(root, 'public/og-celestial.png'));
  fs.copyFileSync(path.join(root, 'public/og-celestial-banner.png'), path.join(root, 'public/og-banner.png'));
  fs.copyFileSync(path.join(root, 'public/og-celestial-square.png'), path.join(root, 'public/og-banner-square.png'));
  fs.copyFileSync(path.join(root, 'public/og-celestial-square.png'), path.join(root, 'public/og-image.png'));

  console.log('Successfully generated celestial OG assets!');
}

processImages().catch(err => {
  console.error(err);
  process.exit(1);
});
