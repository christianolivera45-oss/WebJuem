import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function generatePerfectBanners() {
  const sourceImgPath = path.resolve('public/assets/aistudio/WhatsApp_Image_2026-10-30_at_9.19.45_PM_998ceb95.jpeg');
  const publicDir = path.resolve('public');

  // 1. Extract the emblem + "JUEM"
  // Bounding box: left: 350, top: 210, width: 554, height: 525
  const rawCrop = await sharp(sourceImgPath)
    .extract({ left: 350, top: 210, width: 554, height: 525 })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { data, info } = rawCrop;
  const { width, height } = info;
  const transparentEmblemBuffer = Buffer.alloc(width * height * 4);

  // Background reference color (deep midnight navy around the emblem)
  const bgR = 1, bgG = 11, bgB = 30;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];

    const dist = Math.sqrt(
      Math.pow(r - bgR, 2) +
      Math.pow(g - bgG, 2) +
      Math.pow(b - bgB, 2)
    );

    let alpha = 0;
    if (dist > 55) {
      alpha = 255;
    } else if (dist > 18) {
      alpha = Math.round(((dist - 18) / (55 - 18)) * 255);
    }

    transparentEmblemBuffer[i * 4] = r;
    transparentEmblemBuffer[i * 4 + 1] = g;
    transparentEmblemBuffer[i * 4 + 2] = b;
    transparentEmblemBuffer[i * 4 + 3] = alpha;
  }

  const transparentEmblem = await sharp(transparentEmblemBuffer, {
    raw: { width, height, channels: 4 }
  }).png().toBuffer();

  // Save transparent logo asset for website header/branding if needed
  fs.writeFileSync(path.join(publicDir, 'assets/aistudio/juem_logo_transparent.png'), transparentEmblem);

  // =========================================================================
  // 2. PERFECT SQUARE BANNER (1254 x 1254)
  // Take original image, cover the old off-center logo + subtitles with a seamless
  // radial gradient matching the background, and place the emblem DEAD CENTER!
  // =========================================================================
  const sourceMeta = await sharp(sourceImgPath).metadata();
  const srcW = sourceMeta.width || 1254;
  const srcH = sourceMeta.height || 1254;

  // SVG patch that covers the old logo area (x: 220 to 1030, y: 180 to 920)
  // using radial gradient matching the navy background
  const patchSvg = `<svg width="${srcW}" height="${srcH}">
    <defs>
      <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#071936" />
        <stop offset="50%" stop-color="#041026" />
        <stop offset="85%" stop-color="#02091c" />
        <stop offset="100%" stop-color="#010615" />
      </radialGradient>
    </defs>
    <!-- Oval mask that smoothly covers the old logo and subtitles without touching the corner arcs -->
    <ellipse cx="627" cy="540" rx="420" ry="380" fill="url(#centerGradient)" />
  </svg>`;

  const cleanBackground = await sharp(sourceImgPath)
    .composite([{ input: Buffer.from(patchSvg), top: 0, left: 0 }])
    .toBuffer();

  // Now composite the emblem DEAD CENTER:
  // Center of 1254 is (627, 627)
  // Emblem width: 554, height: 525
  const centerLeft = Math.round((srcW - width) / 2);
  const centerTop = Math.round((srcH - height) / 2) - 10; // optical center

  const perfectSquare = await sharp(cleanBackground)
    .composite([{ input: transparentEmblem, left: centerLeft, top: centerTop }])
    .png({ quality: 95 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'og-banner-square.png'), perfectSquare);
  console.log('✓ Created public/og-banner-square.png (1254x1254)');

  // =========================================================================
  // 3. PERFECT HORIZONTAL OPENGRAPH BANNER (1200 x 630, 1.91:1)
  // Ideal for Facebook, Twitter/X, and WhatsApp large cards
  // Corner arcs extracted from original, emblem placed in exact center (600, 315)
  // =========================================================================
  // Extract top-left arc (400x400)
  const arcTopLeft = await sharp(sourceImgPath)
    .extract({ left: 0, top: 0, width: 400, height: 400 })
    .resize(270, 270)
    .toBuffer();

  // Extract bottom-right arc (400x400)
  const arcBottomRight = await sharp(sourceImgPath)
    .extract({ left: srcW - 400, top: srcH - 400, width: 400, height: 400 })
    .resize(270, 270)
    .toBuffer();

  // Scale emblem for 630px height: height approx 360px
  const wideScale = 360 / height;
  const wideEmbW = Math.round(width * wideScale); // ~380px
  const wideEmbH = 360;

  const wideEmblem = await sharp(transparentEmblem)
    .resize(wideEmbW, wideEmbH)
    .toBuffer();

  const wideLeft = Math.round((1200 - wideEmbW) / 2);
  const wideTop = Math.round((630 - wideEmbH) / 2);

  // Background SVG for wide 1200x630
  const wideBgSvg = `<svg width="1200" height="630">
    <defs>
      <radialGradient id="wideGradient" cx="50%" cy="50%" r="65%">
        <stop offset="0%" stop-color="#081b3b" />
        <stop offset="45%" stop-color="#041228" />
        <stop offset="80%" stop-color="#02091b" />
        <stop offset="100%" stop-color="#010614" />
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#wideGradient)" />
  </svg>`;

  const perfectWide = await sharp(Buffer.from(wideBgSvg))
    .composite([
      { input: arcTopLeft, top: 0, left: 0 },
      { input: arcBottomRight, top: 630 - 270, left: 1200 - 270 },
      { input: wideEmblem, top: wideTop, left: wideLeft }
    ])
    .png({ quality: 95 })
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'og-banner.png'), perfectWide);
  fs.writeFileSync(path.join(publicDir, 'og-image.png'), perfectWide);
  console.log('✓ Created public/og-banner.png & public/og-image.png (1200x630)');
}

generatePerfectBanners().catch(err => {
  console.error('Error generating banners:', err);
  process.exit(1);
});
