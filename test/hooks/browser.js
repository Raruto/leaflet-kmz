const { After, AfterAll, BeforeAll, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const { mkdir, writeFile } = require('node:fs/promises');
const path = require('node:path');

const cache = path.join(__dirname, '..', 'node_modules', '.cache', 'unpkg');
const blankTile = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/rN8AAAAASUVORK5CYII=',
  'base64',
);
const assets = [
  'leaflet@1.9.4/dist/leaflet.css',
  'leaflet@1.9.4/dist/leaflet.js',
  'leaflet@1.9.4/dist/leaflet-src.js',
  'leaflet@1.9.4/dist/images/layers.png',
  'leaflet@1.9.4/dist/images/layers-2x.png',
  'leaflet@1.9.4/dist/images/marker-icon.png',
  'leaflet@1.9.4/dist/images/marker-icon-2x.png',
  'leaflet@1.9.4/dist/images/marker-shadow.png',
  'leaflet@2.0.0-beta.3/dist/leaflet.css',
  'leaflet@2.0.0-beta.3/dist/leaflet-global.js',
  'leaflet-ui@0.8.0/dist/leaflet-ui-src.js',
  'leaflet-ui@0.8.0/dist/leaflet-ui.css',
  'leaflet-ui@0.8.0/dist/images/leaflet-pegman/maps.gstatic.com/api-3cb_scout5.png',
  'leaflet-ui@0.8.0/dist/images/leaflet-pegman/maps.gstatic.com/pegman_v3runway-1x.png',
  'leaflet-ui@0.8.0/dist/images/leaflet-search/imagessearch-icon.png',
  'leaflet-pointable@0.2.1/leaflet-pointable.js',
  'geojson-vt@4.0.2/geojson-vt.js',
  'leaflet.vectorgrid@1.3.0/dist/Leaflet.VectorGrid.js',
  '@tmcw/togeojson@7.1.3/dist/togeojson.umd.js',
  '@raruto/leaflet-elevation@2.9.0/images/elevation-locate.png',
  'https://raruto.github.io/img/view-on-github.png',
];
const assetFiles = new Map(assets.map(asset => [assetUrl(asset), cachedAsset(asset)]));

function assetUrl(asset) {
  return asset.startsWith('http') ? asset : `https://unpkg.com/${asset}`;
}

function cachedAsset(asset) {
  const url = new URL(assetUrl(asset));
  const host = url.hostname === 'unpkg.com' ? '' : url.hostname;
  return path.join(cache, host, decodeURIComponent(url.pathname).slice(1));
}

async function downloadAssets() {
  await Promise.all(assets.map(async asset => {
    const url = assetUrl(asset);
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
    const filename = cachedAsset(asset);
    await mkdir(path.dirname(filename), { recursive: true });
    await writeFile(filename, Buffer.from(await response.arrayBuffer()));
  }));
}

async function routeAssets(page) {
  await page.route(url => ['unpkg.com', 'raruto.github.io'].includes(url.hostname), async route => {
    const url = new URL(route.request().url());
    const filename = assetFiles.get(url.href);
    if (!filename) {
      await route.fulfill({ status: 500, body: `Uncached test asset: ${url.href}` });
      return;
    }
    await route.fulfill({ path: filename, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route(url => url.hostname.endsWith('.tile.opentopomap.org'), route =>
    route.fulfill({ contentType: 'image/png', body: blankTile }));
}

setDefaultTimeout(30000);
let browser;

BeforeAll(async () => {
  await downloadAssets();
  browser = await chromium.launch();
});
After(async function () { if (this.page) await this.page.close(); });
AfterAll(async () => {
  if (!browser || !browser.isConnected()) return;
  const disconnected = new Promise(resolve => browser.once('disconnected', resolve));
  await Promise.race([browser.close(), disconnected]);
});

exports.newPage = async () => {
  const page = await browser.newPage();
  await routeAssets(page);
  return page;
};
