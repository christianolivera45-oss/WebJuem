import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generateBrandBanners() {
  const sourceImgPath = path.resolve('public/assets/aistudio/WhatsApp_Image_2026-10-30_at_9.19.45_PM_998ceb95.jpeg');
  const publicDir = path.resolve('public');

  if (!fs.existsSync(sourceImgPath)) {
    console.warn('Source image not found, skipping generation:', sourceImgPath);
    return;
  }

  // Extract the pure emblem (Moon + Rays + Stars) and "JUEM"
  const rawCrop = await sharp(sourceImgPath)
    .extract({ left: 350, top: 215, width: 554, height: 508 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = rawCrop;
  const { width, height } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let i = 0; i < width * height; i++) {
    let r = data[i * 3];
    let g = data[i * 3 + 1];
    let b = data[i * 3 + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    let alpha = 0;
    if (lum > 70) {
      alpha = 255;
    } else if (lum > 28) {
      const t = (lum - 28) / (70 - 28);
      alpha = Math.round(t * 255);
      r = Math.min(255, Math.round(r * 1.15));
      g = Math.min(255, Math.round(g * 1.15));
    }

    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = alpha;
  }

  const emblemRaw = await sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();

  // 1. SQUARE (1200 x 1200) - For WhatsApp square chat preview
  const sqW = 1200, sqH = 1200;
  const sqSvg = `<svg width="${sqW}" height="${sqH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="sqBg" cx="50%" cy="50%" r="72%">
        <stop offset="0%" stop-color="#0a1d3d" />
        <stop offset="40%" stop-color="#041126" />
        <stop offset="75%" stop-color="#020818" />
        <stop offset="100%" stop-color="#01040f" />
      </radialGradient>
      <linearGradient id="goldArc" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCE19B" />
        <stop offset="45%" stop-color="#D4AF37" />
        <stop offset="100%" stop-color="#A57922" />
      </linearGradient>
    </defs>
    <rect width="${sqW}" height="${sqH}" fill="url(#sqBg)" />
    <!-- Top-Left Corner -->
    <path d="M 0 360 A 360 360 0 0 0 360 0 L 0 0 Z" fill="#020817" opacity="0.9" />
    <path d="M 0 360 A 360 360 0 0 0 360 0" fill="none" stroke="url(#goldArc)" stroke-width="4" />
    <!-- Bottom-Right Corner -->
    <path d="M 1200 840 A 360 360 0 0 0 840 1200 L 1200 1200 Z" fill="#020817" opacity="0.9" />
    <path d="M 1200 840 A 360 360 0 0 0 840 1200" fill="none" stroke="url(#goldArc)" stroke-width="4" />
  </svg>`;

  const sqEmb = await sharp(emblemRaw).resize(650).toBuffer();
  const sqMeta = await sharp(sqEmb).metadata();

  const sqFinal = await sharp(Buffer.from(sqSvg))
    .composite([{
      input: sqEmb,
      left: Math.round((sqW - (sqMeta.width || 650)) / 2),
      top: Math.round((sqH - (sqMeta.height || 596)) / 2)
    }])
    .png({ quality: 95 })
    .toBuffer();

  // 2. WIDE BANNER (1200 x 630, 1.91:1) - For Facebook, Twitter, and wide preview cards
  const wideW = 1200, wideH = 630;
  const wideSvg = `<svg width="${wideW}" height="${wideH}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="wideBg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="#0a1d3d" />
        <stop offset="42%" stop-color="#041126" />
        <stop offset="80%" stop-color="#020818" />
        <stop offset="100%" stop-color="#01040f" />
      </radialGradient>
      <linearGradient id="goldArcWide" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FCE19B" />
        <stop offset="45%" stop-color="#D4AF37" />
        <stop offset="100%" stop-color="#A57922" />
      </linearGradient>
    </defs>
    <rect width="${wideW}" height="${wideH}" fill="url(#wideBg)" />
    <!-- Top-Left Corner -->
    <path d="M 0 250 A 250 250 0 0 0 250 0 L 0 0 Z" fill="#020817" opacity="0.9" />
    <path d="M 0 250 A 250 250 0 0 0 250 0" fill="none" stroke="url(#goldArcWide)" stroke-width="3" />
    <!-- Bottom-Right Corner -->
    <path d="M 1200 380 A 250 250 0 0 0 950 630 L 1200 630 Z" fill="#020817" opacity="0.9" />
    <path d="M 1200 380 A 250 250 0 0 0 950 630" fill="none" stroke="url(#goldArcWide)" stroke-width="3" />
  </svg>`;

  const wideEmb = await sharp(emblemRaw).resize(null, 390).toBuffer();
  const wideMeta = await sharp(wideEmb).metadata();

  const wideFinal = await sharp(Buffer.from(wideSvg))
    .composite([{
      input: wideEmb,
      left: Math.round((wideW - (wideMeta.width || 425)) / 2),
      top: Math.round((wideH - (wideMeta.height || 390)) / 2)
    }])
    .png({ quality: 95 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'og-banner-square.png'), sqFinal);
  fs.writeFileSync(path.join(publicDir, 'og-banner.png'), wideFinal);
  fs.writeFileSync(path.join(publicDir, 'og-image.png'), wideFinal);
  console.log('✓ Generated Juem celestial brand banners successfully!');
}

generateBrandBanners().catch(err => {
  console.error('Error generating banners:', err);
  process.exit(1);
});
