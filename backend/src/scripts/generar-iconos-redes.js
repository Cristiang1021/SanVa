const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

const dir = path.join(__dirname, '../../assets/email');

const extraerPath = (svg) => {
  const m = svg.match(/<path d="([^"]+)"/);
  if (!m) throw new Error('No path');
  return m[1];
};

const raster = (svg, outfile) => {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 128 },
    background: 'rgba(0,0,0,0)'
  });
  fs.writeFileSync(outfile, resvg.render().asPng());
  console.log('wrote', outfile);
};

const instagramPath = extraerPath(fs.readFileSync(path.join(dir, 'instagram.svg'), 'utf8'));
const facebookPath = extraerPath(fs.readFileSync(path.join(dir, 'facebook.svg'), 'utf8'));
const tiktokPath = extraerPath(fs.readFileSync(path.join(dir, 'tiktok.svg'), 'utf8'));
const youtubePath = extraerPath(fs.readFileSync(path.join(dir, 'youtube.svg'), 'utf8'));
const xPath = extraerPath(fs.readFileSync(path.join(dir, 'x.svg'), 'utf8'));

raster(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <defs>
    <radialGradient id="ig" cx="30%" cy="107%" r="150%">
      <stop offset="0%" stop-color="#fdf497"/>
      <stop offset="5%" stop-color="#fdf497"/>
      <stop offset="45%" stop-color="#fd5949"/>
      <stop offset="60%" stop-color="#d6249f"/>
      <stop offset="90%" stop-color="#285AEB"/>
    </radialGradient>
  </defs>
  <rect width="96" height="96" rx="24" fill="url(#ig)"/>
  <g transform="translate(20 20) scale(2.333)" fill="#ffffff">${`<path d="${instagramPath}"/>`}</g>
</svg>`, path.join(dir, 'instagram.png'));

raster(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <g transform="scale(4)" fill="#1877F2"><path d="${facebookPath}"/></g>
</svg>`, path.join(dir, 'facebook.png'));

raster(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="48" fill="#010101"/>
  <g transform="translate(22 20) scale(2.2)" fill="#25F4EE"><path d="${tiktokPath}"/></g>
  <g transform="translate(26 24) scale(2.2)" fill="#FE2C55"><path d="${tiktokPath}"/></g>
  <g transform="translate(24 22) scale(2.2)" fill="#ffffff"><path d="${tiktokPath}"/></g>
</svg>`, path.join(dir, 'tiktok.png'));

raster(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <g transform="translate(4 18) scale(3.66)" fill="#FF0000"><path d="${youtubePath}"/></g>
</svg>`, path.join(dir, 'youtube.png'));

raster(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="48" fill="#000000"/>
  <g transform="translate(24 24) scale(2)" fill="#ffffff"><path d="${xPath}"/></g>
</svg>`, path.join(dir, 'x.png'));
