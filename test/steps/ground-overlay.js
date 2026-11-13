const assert = require('node:assert/strict');
const path = require('node:path');
const { Then } = require('@cucumber/cucumber');
const { newPage } = require('../hooks/browser.js');

Then('a GroundOverlay image is reprojected for Leaflet {string}', async function (version) {
  const page = this.page = await newPage();
  await page.setContent('<div id="map" style="width:400px;height:300px"></div>');
  const dist = `https://unpkg.com/leaflet@${version}/dist`;
  await page.addStyleTag({ url: `${dist}/leaflet.css` });
  await page.addScriptTag({ url: `${dist}/${version === '1.9.4' ? 'leaflet.js' : 'leaflet-global.js'}` });
  await page.addScriptTag({ path: path.join(path.dirname(require.resolve('@tmcw/togeojson')), 'togeojson.umd.js') });
  const bundlePath = path.join(__dirname, '..', '..', 'dist', 'leaflet-kmz-src.js');
  await page.addScriptTag({ path: bundlePath });
  const result = await page.evaluate(async () => {
    const map = new (L.LeafletMap || L.Map)('map', { center: [54, -106], zoom: 3 });
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
      '<rect width="100" height="50" fill="red"/><rect y="50" width="100" height="50" fill="blue"/></svg>';
    const image = 'data:image/svg+xml;base64,' + btoa(svg);
    const layer = L.kmzLayer(null, { bindPopup: false });
    const loadedLayer = new Promise(resolve => layer.once('load', event => resolve(event.layer)));
    layer.parse('<kml xmlns="http://www.opengis.net/kml/2.2"><GroundOverlay><Icon><href>files/0.png</href></Icon>' +
      '<LatLonBox><north>58.992</north><south>48.765</south><east>-100.146</east><west>-111.6045</west></LatLonBox>' +
      '</GroundOverlay></kml>', { name: '850.kml', icons: { 'files/0.png': image } });
    const group = await loadedLayer;
    const bounds = new L.LatLngBounds([48.765, -111.6045], [58.992, -100.146]);
    const overlay = group.getLayers().find(layer => layer instanceof L.KMZImageOverlay);
    const loadedImage = new Promise((resolve, reject) => {
      overlay.once('load', resolve);
      overlay.once('error', event => reject(new Error(event.error ? event.error.message : 'GroundOverlay failed to load')));
    });
    layer.addTo(map);
    await loadedImage;
    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const projection = map.options.crs.projection;
    const northY = projection.project(new L.LatLng(north, 0)).y;
    const southY = projection.project(new L.LatLng(south, 0)).y;
    const midpointY = projection.project(new L.LatLng((north + south) / 2, 0)).y;
    const boundary = (northY - midpointY) / (northY - southY);
    const sampleRow = Math.floor((boundary + 0.5) / 2 * overlay.getElement().naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    context.drawImage(overlay.getElement(), 0, sampleRow, overlay.getElement().naturalWidth, 1, 0, 0, 1, 1);
    const pixel = context.getImageData(0, 0, 1, 1).data;
    map.remove();
    return { northHalf: pixel[0] > pixel[2], boundary };
  });
  assert.ok(result.boundary > 0.5);
  assert.equal(result.northHalf, true);
});
