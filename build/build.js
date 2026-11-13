const esbuild = require('esbuild');

const banner = `(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  factory(global['leaflet-kmz'] = {});
}(typeof globalThis !== 'undefined' ? globalThis : this, function (exports) {
  const module = { exports: {} };`;
const footer = 'Object.assign(exports, module.exports); }));';

function options(minify) {
  return {
    entryPoints: ['src/index.js'], bundle: true, format: 'cjs',
    outfile: `dist/leaflet-kmz${minify ? '' : '-src'}.js`,
    sourcemap: true, minify,
    banner: { js: banner }, footer: { js: footer },
  };
}

async function build() {
  await Promise.all([false, true].map(minify => esbuild.build(options(minify))));
}

module.exports = { options, build };
if (require.main === module) build().catch(error => { console.error(error); process.exitCode = 1; });
