const esbuild = require('esbuild');
const { options } = require('./build.js');

async function startServer(port = 8080) {
  const builds = await Promise.all([false, true].map(minify => esbuild.context(options(minify))));
  try {
    await Promise.all(builds.map(build => build.watch()));
    const server = await builds[0].serve({ servedir: '.', host: '127.0.0.1', port });
    return { port: server.port, close: () => Promise.all(builds.map(build => build.dispose())) };
  } catch (error) {
    await Promise.all(builds.map(build => build.dispose()));
    throw error;
  }
}

async function main() {
  const server = await startServer();
  console.log(`Serving on http://127.0.0.1:${server.port}`);
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, async () => { await server.close(); });
  }
}

module.exports = { startServer };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
