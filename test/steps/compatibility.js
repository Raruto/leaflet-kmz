const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { After, AfterAll, BeforeAll, Then, setDefaultTimeout } = require('@cucumber/cucumber');

setDefaultTimeout(30000);
let browser;
BeforeAll(async () => { browser = await chromium.launch(); });
After(async function () { if (this.page) await this.page.close(); });
AfterAll(async () => { if (browser) await browser.close(); });

Then('the {string} KMZ bundle loads KML and KMZ with Leaflet {string}', async function (bundle, version) {
  const page = this.page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const files = ['test/test-encoding.kml', 'examples/capitals.kmz'].map(file =>
    readFileSync(path.join(__dirname, '..', '..', file)));
  await page.route('https://fixture.invalid/**', route => {
    const index = route.request().url().endsWith('.kml') ? 0 : 1;
    return route.fulfill({ body: files[index], headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.setContent('<div id="map" style="width:400px;height:300px"></div>');
  const dist = `https://unpkg.com/leaflet@${version}/dist`;
  await page.addStyleTag({ url: `${dist}/leaflet.css` });
  await page.addScriptTag({ url: `${dist}/${version === '1.9.4' ? 'leaflet.js' : 'leaflet-global.js'}` });
  await page.addScriptTag({ path: require.resolve('jszip/dist/jszip.min.js') });
  await page.addScriptTag({ path: require.resolve('@tmcw/togeojson/dist/togeojson.umd.js') });
  const bundlePath = path.join(__dirname, '..', '..', 'dist', `leaflet-kmz${bundle === 'readable' ? '-src' : ''}.js`);
  await page.addScriptTag({ path: bundlePath });
  const result = await page.evaluate(async () => {
    const map = new (L.LeafletMap || L.Map)('map', { center: [0, 0], zoom: 2 });
    const layer = L.kmzLayer(null, { bindPopup: false }).addTo(map);
    const other = L.kmzLayer();
    const loaded = [];
    let canvasMarker = false;
    for (const file of ['test.kml', 'capitals.kmz']) {
      if (file.endsWith('.kmz')) map.options.preferCanvas = true;
      const done = new Promise(resolve => layer.once('load', event => {
        const layers = event.layer.getLayers();
        if (file.endsWith('.kmz')) canvasMarker = layers.some(item => item instanceof L.KMZMarker);
        resolve(layers.length);
      }));
      layer.load(`https://fixture.invalid/${file}`);
      loaded.push(await done);
    }
    const overlay = new L.KMZImageOverlay('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E',
      new L.LatLngBounds([0, 0], [1, 1]), { angle: 30 }).addTo(map);
    const result = {
      version: L.version, loaded, groups: layer.getLayers().length,
      defaultPopup: other.options.bindPopup, canvasMarker,
      rotation: overlay.getElement().style.transform.includes('rotate(30deg)'),
      exports: window['leaflet-kmz'].KMZLayer === L.KMZLayer,
    };
    map.remove();
    return result;
  });
  assert.equal(result.version, version);
  assert.equal(result.loaded[0], 3);
  assert.ok(result.loaded[1] > 0);
  assert.equal(result.groups, 2);
  assert.equal(result.defaultPopup, true);
  assert.equal(result.canvasMarker, true);
  assert.equal(result.rotation, true);
  assert.equal(result.exports, true);
  assert.deepEqual(errors, []);
  const exports = await page.evaluate(source => {
    const module = { exports: {} };
    new Function('module', 'exports', 'define', source)(module, module.exports, undefined);
    let amd;
    const define = (dependencies, factory) => { amd = {}; factory(amd); };
    define.amd = {};
    new Function('module', 'exports', 'define', source)(undefined, undefined, define);
    return [Object.keys(module.exports).sort(), Object.keys(amd).sort()];
  }, readFileSync(bundlePath, 'utf8'));
  assert.deepEqual(exports, [['KMZLayer', 'KMZMarker'], ['KMZLayer', 'KMZMarker']]);
});
