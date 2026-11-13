const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { AfterAll, Before, Then } = require('@cucumber/cucumber');
const { startServer } = require('../../build/dev.js');
const { getBrowser } = require('../hooks/browser.js');

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const pluginName = manifest.name.split('/').pop();
const bundleName = new RegExp(`^${pluginName}(?:-src|\\.min)?\\.js$`);
let server;
let base;

Before({ tags: '@smoke', timeout: 30000 }, async function () {
  if (!server) {
    server = await startServer(0);
    base = `http://127.0.0.1:${server.port}`;
  }
});

AfterAll(async function () {
  if (server) await server.close();
});

Then('all HTML examples are listed', function () {
  const examples = [];
  function collect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (entry.isFile() && entry.name.endsWith('.html')) {
        examples.push(path.relative('examples', file).split(path.sep).join('/'));
      }
    }
  }
  collect('examples');
  const feature = readFileSync('test/features/smoke.feature', 'utf8');
  const listed = [...feature.matchAll(/^\s*\|\s*([^|]+\.html)\s*\|\s*$/gm)].map(match => match[1].trim());
  assert.ok(examples.length, 'No HTML examples found');
  assert.deepEqual(listed.sort(), examples.sort(), 'Update the examples table');
});

Then('development pages use local bundles without changing example files', async function () {
  for (const example of ['leaflet-kmz.html', 'leaflet-kmz_gridlayer.html']) {
    const file = path.join('examples', example);
    const original = readFileSync(file, 'utf8');
    assert.ok(original.includes(`https://unpkg.com/${manifest.name}@`));
    const response = await fetch(`${base}/examples/${example}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const html = await response.text();
    assert.ok(html.includes('src="/dist/leaflet-kmz.js"'));
    assert.ok(!html.includes(`https://unpkg.com/${manifest.name}@`));
    assert.ok(html.includes('https://unpkg.com/leaflet@1.9.4/'));
    assert.equal(readFileSync(file, 'utf8'), original);
    const head = await fetch(`${base}/examples/${example}`, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(Number(head.headers.get('content-length')), Buffer.byteLength(html));
    assert.equal(await head.text(), '');
    const bundle = await fetch(`${base}/dist/leaflet-kmz.js`);
    assert.equal(bundle.status, 200);
    assert.equal(await bundle.text(), readFileSync(manifest.main, 'utf8'));
  }
});

Then('the example {string} loads without browser errors', { timeout: 30000 }, async function (example) {
  const page = await getBrowser().newPage();
  const errors = [];
  let googleKeyWarning = false;
  let bundleLoaded = false;
  function isBundleResponse(response) {
    const url = new URL(response.url());
    return response.request().resourceType() === 'script' && response.status() >= 200 && response.status() < 300 &&
      url.origin === base && bundleName.test(path.posix.basename(url.pathname));
  }
  page.on('pageerror', error => errors.push(`JavaScript: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') {
      if (message.text().includes('Google Maps JavaScript API error: ApiProjectMapError') ||
        message.text().startsWith('You are using this API without a key. See https://developers.google.com/maps/documentation/javascript/error-messages')) {
        googleKeyWarning = true;
      }
      else errors.push(`Console: ${message.text()}`);
    }
  });
  page.on('requestfailed', request => {
    const error = request.failure().errorText;
    if (request.resourceType() !== 'image' || error !== 'net::ERR_ABORTED') {
      errors.push(`Request: ${request.url()} (${error})`);
    }
  });
  page.on('response', response => {
    if (isBundleResponse(response)) bundleLoaded = true;
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  try {
    const url = `${base}/examples/${example.split('/').map(encodeURIComponent).join('/')}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 19000 });
    await Promise.all([
      bundleLoaded ? Promise.resolve() : page.waitForResponse(isBundleResponse, { timeout: 8000 }),
      page.locator('.leaflet-container').first().waitFor({ state: 'attached', timeout: 8000 }),
    ]);
    await page.waitForTimeout(1000);
    const scripts = await page.locator('script[src]').evaluateAll(elements => elements.map(element => element.src));
    assert.ok(!scripts.some(url => /jszip/i.test(url)), `Unexpected ZIP dependency: ${scripts.join(', ')}`);
    assert.ok(!errors.length, errors.join('\n'));
    if (googleKeyWarning) console.log('Google Maps API-key warning ignored: API key not configured');
  } catch (error) {
    if (errors.length) throw new Error(`${error.message}\n${errors.join('\n')}`, { cause: error });
    throw error;
  } finally {
    page.removeAllListeners();
    await page.close();
  }
});
