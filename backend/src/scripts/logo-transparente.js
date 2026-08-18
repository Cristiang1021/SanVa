const path = require('path');
const sharp = require('sharp');

const input = path.join(__dirname, '../../../frontend/static/logo/Sanva Shows@4x-8.png');
const outputLight = path.join(__dirname, '../../../frontend/public/logo/sanva-shows-ink.png');
const outputDark = path.join(__dirname, '../../../frontend/public/logo/sanva-shows.png');

const UMBRAL_NEGRO = 40;
const UMBRAL_BLANCO = 210;
const INK = { r: 2, g: 2, b: 2 };

async function procesar({ convertirBlanco = false }) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r <= UMBRAL_NEGRO && g <= UMBRAL_NEGRO && b <= UMBRAL_NEGRO) {
      data[i + 3] = 0;
      continue;
    }

    if (convertirBlanco && r >= UMBRAL_BLANCO && g >= UMBRAL_BLANCO && b >= UMBRAL_BLANCO) {
      data[i] = INK.r;
      data[i + 1] = INK.g;
      data[i + 2] = INK.b;
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().trim().toBuffer();
}

async function generarFavicon(logoBuffer, size, output) {
  const padding = Math.round(size * 0.1);
  const inner = size - padding * 2;

  const resized = await sharp(logoBuffer)
    .resize(inner, inner, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(output);
}

async function main() {
  const darkBg = await procesar({ convertirBlanco: false });
  await sharp(darkBg).toFile(outputDark);

  const lightBg = await procesar({ convertirBlanco: true });
  await sharp(lightBg).toFile(outputLight);

  const publicDir = path.join(path.dirname(outputLight), '..');
  await generarFavicon(lightBg, 32, path.join(publicDir, 'favicon-32.png'));
  await generarFavicon(lightBg, 192, path.join(publicDir, 'favicon-192.png'));
  await generarFavicon(lightBg, 180, path.join(publicDir, 'apple-touch-icon.png'));
  await generarFavicon(lightBg, 512, path.join(publicDir, 'favicon.png'));

  console.log('Logos guardados:');
  console.log(' -', outputDark, '(correos / fondo oscuro)');
  console.log(' -', outputLight, '(sidebar / fondo claro)');
  console.log(' - favicons en frontend/public/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
