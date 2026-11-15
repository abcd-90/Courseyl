const sharp = require('sharp');
const fs = require('fs');

async function createOgAndLogo() {
  // Create logo.png from icon-512.png
  await sharp('public/icon-512.png').resize(512, 512).png().toFile('public/logo.png');
  console.log('Created public/logo.png');

  // Create og-image.png (1200x630)
  const iconBuffer = await sharp('public/icon-512.png').resize(220, 220).toBuffer();

  const svgBackground = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="grad" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#4b5e1e" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#0a0f0c" stop-opacity="1"/>
        </radialGradient>
      </defs>
      <rect width="1200" height="630" fill="#0a0f0c"/>
      <rect width="1200" height="630" fill="url(#grad)"/>
      <text x="600" y="380" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="58" font-weight="bold" fill="#ffffff" text-anchor="middle">Courseyl</text>
      <text x="600" y="440" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="28" font-weight="600" fill="#a3b86c" text-anchor="middle">Turn Any YouTube Video Into an Interactive Course</text>
      <text x="600" y="495" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="20" fill="#c4c7b8" text-anchor="middle">Active Recall Quizzes • Diagnostic Placement Tests • Interactive Notes</text>
    </svg>
  `);

  await sharp(svgBackground)
    .composite([{ input: iconBuffer, top: 100, left: 490 }])
    .png()
    .toFile('public/og-image.png');
  console.log('Created public/og-image.png');
}

createOgAndLogo().catch(err => {
  console.error(err);
  process.exit(1);
});
