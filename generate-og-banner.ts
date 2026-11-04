import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// 1200x630 High-Definition OpenGraph Social Share Card
// Specifically engineered so the center 630x630 square is 100% safe for WhatsApp 1:1 square thumbnails
const ogBannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <!-- Rich Metallic Gold Gradient -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF5D6" />
      <stop offset="20%" stop-color="#FCE19B" />
      <stop offset="50%" stop-color="#D4AF37" />
      <stop offset="80%" stop-color="#A57922" />
      <stop offset="100%" stop-color="#E9C86A" />
    </linearGradient>

    <!-- Warm Gold Ring Gradient -->
    <linearGradient id="goldRing" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9A6B17" />
      <stop offset="35%" stop-color="#F2D37A" />
      <stop offset="70%" stop-color="#FFF6D8" />
      <stop offset="100%" stop-color="#C59B27" />
    </linearGradient>

    <!-- Linear Accent for Dividers -->
    <linearGradient id="dividerGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D4AF37" stop-opacity="0" />
      <stop offset="50%" stop-color="#FCE19B" stop-opacity="0.95" />
      <stop offset="100%" stop-color="#D4AF37" stop-opacity="0" />
    </linearGradient>

    <!-- Deep Luxury Midnight Royal Blue Radial Background -->
    <radialGradient id="ogBg" cx="50%" cy="45%" r="72%">
      <stop offset="0%" stop-color="#162544" />
      <stop offset="45%" stop-color="#0b1326" />
      <stop offset="80%" stop-color="#050a16" />
      <stop offset="100%" stop-color="#020409" />
    </radialGradient>

    <!-- Soft Glow Filter -->
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="7" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="16" flood-color="#000000" flood-opacity="0.75" />
    </filter>
  </defs>

  <!-- Full-Bleed Dark Navy Background -->
  <rect width="1200" height="630" fill="url(#ogBg)" />

  <!-- Subtle Radial Glow in Center -->
  <circle cx="600" cy="270" r="300" fill="#1e3a8a" opacity="0.18" />

  <!-- Geometric Decorative Concentric Rings in Center -->
  <g opacity="0.06" stroke="#FFF" stroke-width="1.2">
    <circle cx="600" cy="235" r="180" fill="none" />
    <circle cx="600" cy="235" r="260" fill="none" stroke-dasharray="6 6" />
    <circle cx="600" cy="235" r="340" fill="none" />
  </g>

  <!-- Luxury Outer Frame (1200x630) -->
  <rect x="24" y="24" width="1152" height="582" rx="18" fill="none" stroke="url(#goldRing)" stroke-width="2" opacity="0.3" />
  <rect x="32" y="32" width="1136" height="566" rx="14" fill="none" stroke="url(#goldRing)" stroke-width="1" opacity="0.12" stroke-dasharray="6 6" />

  <!-- Left Wing Accents (visible in 16:9 / 1200x630 cards on Facebook, Twitter, iMessage) -->
  <g transform="translate(160, 315)">
    <line x1="-80" y1="0" x2="80" y2="0" stroke="url(#dividerGold)" stroke-width="1.5" />
    <circle cx="0" cy="0" r="4" fill="#D4AF37" />
    <text x="0" y="-35" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#FCE19B">
      ✦ ENVÍOS EXPRESS
    </text>
    <text x="0" y="-14" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#94A3B8">
      A todo el país
    </text>
    <text x="0" y="30" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#FCE19B">
      ✦ MERCADO PAGO
    </text>
    <text x="0" y="50" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#94A3B8">
      Pagos 100% seguros
    </text>
  </g>

  <!-- Right Wing Accents (visible in 16:9 / 1200x630 cards) -->
  <g transform="translate(1040, 315)">
    <line x1="-80" y1="0" x2="80" y2="0" stroke="url(#dividerGold)" stroke-width="1.5" />
    <circle cx="0" cy="0" r="4" fill="#D4AF37" />
    <text x="0" y="-35" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#FCE19B">
      ✦ DOS LOCALES
    </text>
    <text x="0" y="-14" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#94A3B8">
      Pinamar &amp; Montevideo
    </text>
    <text x="0" y="30" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="#FCE19B">
      ✦ NUEVA COLECCIÓN
    </text>
    <text x="0" y="50" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="400" fill="#94A3B8">
      Indumentaria &amp; Accesorios
    </text>
  </g>

  <!-- ============================================================ -->
  <!-- CENTRAL WHATSAPP 1:1 SAFE SQUARE ZONE (x: 330 to 870, y: 30 to 600) -->
  <!-- Everything inside this zone is 100% visible in square thumbnails! -->
  <!-- ============================================================ -->

  <!-- 1. Top Store Tag: "TIENDA OFICIAL URUGUAY" (y: 65) -->
  <g transform="translate(600, 68)">
    <rect x="-135" y="-18" width="270" height="36" rx="18" fill="#0C1B38" stroke="url(#goldRing)" stroke-width="1.5" opacity="0.95" />
    <text x="0" y="6" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="2.5" fill="#FCE19B">
      ✦ TIENDA OFICIAL URUGUAY ✦
    </text>
  </g>

  <!-- 2. Large Official Juem Gold Emblem Crest (Center: 600, 220 | Radius: 100px) -->
  <g transform="translate(600, 220)" filter="url(#softShadow)">
    <!-- Outer Thick Gold Ring -->
    <circle cx="0" cy="0" r="100" fill="#060c18" stroke="url(#goldRing)" stroke-width="5" />
    <!-- Inner Dotted Gold Ring -->
    <circle cx="0" cy="0" r="88" fill="none" stroke="url(#goldRing)" stroke-width="2" opacity="0.65" stroke-dasharray="8 6" />
    
    <!-- Monogram "J" (Juem) perfectly centered inside the crest -->
    <g transform="translate(-86, -86) scale(0.336)" filter="url(#goldGlow)">
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
            fill="url(#goldGrad)" />
    </g>
  </g>

  <!-- 3. Brand Title: "JUEM MVD" (Large, bold, high contrast serif) -->
  <text x="600" y="375" text-anchor="middle" font-family="'Times New Roman', Georgia, serif" font-size="54" font-weight="700" letter-spacing="9" fill="url(#goldGrad)" filter="url(#goldGlow)">
    JUEM MVD
  </text>

  <!-- 4. Gold Divider with Center Diamond (y: 405) -->
  <line x1="430" y1="405" x2="770" y2="405" stroke="url(#dividerGold)" stroke-width="2" />
  <polygon points="600,399 606,405 600,411 594,405" fill="#FCE19B" />

  <!-- 5. Categories Tagline (compact width ~460px to fit in WhatsApp square) -->
  <text x="600" y="440" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" letter-spacing="3" fill="#F1F5F9">
    INDUMENTARIA • CALZADO • IMPRESIÓN 3D
  </text>

  <!-- 6. Cities / Delivery Tagline (compact width ~480px) -->
  <text x="600" y="475" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="400" letter-spacing="1" fill="#94A3B8">
    Envíos rápidos a todo el país • Pinamar &amp; Montevideo
  </text>

  <!-- 7. Bottom Website Badge (y: 535 | compact width: 220px) -->
  <g transform="translate(600, 535)">
    <rect x="-110" y="-18" width="220" height="36" rx="18" fill="#0C1B38" stroke="url(#goldRing)" stroke-width="1.5" />
    <circle cx="-80" cy="0" r="4.5" fill="#10B981" />
    <text x="6" y="5" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="700" letter-spacing="1.5" fill="#FCE19B">
      juem.com.uy
    </text>
  </g>
</svg>`;

async function main() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Save SVG
  const svgPath = path.join(publicDir, 'og-banner.svg');
  fs.writeFileSync(svgPath, ogBannerSvg, 'utf-8');
  console.log('✓ Generated public/og-banner.svg');

  // 2. Render 1200x630 PNG using sharp
  const svgBuffer = Buffer.from(ogBannerSvg);
  const pngBannerPath = path.join(publicDir, 'og-banner.png');
  const pngImagePath = path.join(publicDir, 'og-image.png');

  await sharp(svgBuffer)
    .resize(1200, 630)
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(pngBannerPath);
  console.log('✓ Generated public/og-banner.png (1200x630)');

  fs.copyFileSync(pngBannerPath, pngImagePath);
  console.log('✓ Created public/og-image.png copy');

  // 3. Render dedicated 630x630 square crop for WhatsApp
  const pngSquarePath = path.join(publicDir, 'og-banner-square.png');
  await sharp(pngBannerPath)
    .extract({ left: 285, top: 0, width: 630, height: 630 })
    .png({ quality: 95 })
    .toFile(pngSquarePath);
  console.log('✓ Generated public/og-banner-square.png (630x630)');
}

main().catch(err => {
  console.error('Error generating OG banner:', err);
  process.exit(1);
});
