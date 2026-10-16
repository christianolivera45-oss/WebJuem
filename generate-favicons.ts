import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 1. Create the pristine, full-bleed SVG without ANY transparent border or rx cutouts
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Rich Luxury Metallic Gold Gradient -->
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EED58E" />
      <stop offset="25%" stop-color="#FDF3DA" />
      <stop offset="50%" stop-color="#D4AF37" />
      <stop offset="75%" stop-color="#AA7A1E" />
      <stop offset="100%" stop-color="#E5C158" />
    </linearGradient>

    <linearGradient id="goldRingGradient" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9A6B17" />
      <stop offset="35%" stop-color="#E8C96C" />
      <stop offset="70%" stop-color="#FFF2CE" />
      <stop offset="100%" stop-color="#C59B27" />
    </linearGradient>

    <!-- Deep Luxury Midnight Royal Blue Full-Bleed Background (NO transparent corners) -->
    <radialGradient id="bgGradient" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#0E1A34" />
      <stop offset="60%" stop-color="#070D1C" />
      <stop offset="100%" stop-color="#03060E" />
    </radialGradient>

    <!-- Subtle glow filter -->
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Full-bleed background filling all 512x512 pixels (ZERO transparent corners/borders) -->
  <rect width="512" height="512" fill="url(#bgGradient)" />

  <!-- Outer Ring with subtle glow -->
  <circle cx="256" cy="256" r="226" fill="none" stroke="url(#goldRingGradient)" stroke-width="14" />
  
  <!-- Inner Ornate Ring -->
  <circle cx="256" cy="256" r="206" fill="none" stroke="url(#goldRingGradient)" stroke-width="3.5" opacity="0.65" stroke-dasharray="14 10" />

  <!-- Monogram "J" (Juem) - Perfectly balanced, bold, and high contrast for 16px/32px/48px visibility -->
  <g filter="url(#goldGlow)">
    <path d="M 270 135 
             L 375 135 
             L 375 172 
             L 342 172 
             L 342 322 
             C 342 376, 310 410, 244 410 
             C 182 410, 138 372, 138 318 
             L 184 318 
             C 184 350, 206 370, 244 370 
             C 284 370, 298 344, 298 308 
             L 298 172 
             L 270 172 
             Z" 
          fill="url(#goldGradient)" />
  </g>
</svg>`;

async function main() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Write public/favicon.svg
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');
  console.log('Saved public/favicon.svg');

  const svgBuffer = Buffer.from(svgContent);

  // Sizes required by Google Search, Web Standards, PWA, and Apple
  const targets = [
    { name: 'favicon-48x48.png', size: 48 },   // Google Search primary recommended size
    { name: 'favicon-96x96.png', size: 96 },   // Google Search 2x high-DPI size
    { name: 'favicon-32x32.png', size: 32 },   // Desktop browser tabs
    { name: 'favicon-16x16.png', size: 16 },   // Legacy browser tabs
    { name: 'favicon-192x192.png', size: 192 }, // Android Chrome / PWA
    { name: 'favicon-512x512.png', size: 512 }, // Android Splash / High-Res PWA
    { name: 'apple-touch-icon.png', size: 180 } // iOS Safari Home Screen
  ];

  for (const t of targets) {
    const outPath = path.join(publicDir, t.name);
    await sharp(svgBuffer)
      .resize(t.size, t.size)
      .png({ compressionLevel: 9 })
      .toFile(outPath);
    console.log(`Generated ${t.name} (${t.size}x${t.size})`);
  }

  // Generate public/favicon.ico (standard 48x48 PNG container recognized as favicon.ico)
  // Modern browsers and Googlebot accept a PNG formatted favicon.ico
  const icoPath = path.join(publicDir, 'favicon.ico');
  await sharp(svgBuffer)
    .resize(48, 48)
    .toFormat('png')
    .toFile(icoPath);
  console.log('Generated public/favicon.ico (48x48)');

  // Generate web manifest for PWA compliance and Google Mobile search
  const manifest = {
    name: "Juem Mvd",
    short_name: "Juem",
    description: "Ropa de Temporada, Abrigos Premium y Accesorios",
    start_url: "/",
    display: "standalone",
    background_color: "#070D1C",
    theme_color: "#070D1C",
    icons: [
      {
        src: "/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/favicon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };
  fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('Generated public/site.webmanifest');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
