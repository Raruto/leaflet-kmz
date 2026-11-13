const assert = require('node:assert/strict');
const { readFileSync, readdirSync } = require('node:fs');
const path = require('node:path');
const { deflateRawSync } = require('node:zlib');
const { Then } = require('@cucumber/cucumber');

const source = readFileSync(path.join(__dirname, '..', '..', 'src', 'utils.js'), 'utf8');
const utils = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

function archive(entries, descriptor = false) {
  const locals = [];
  const directory = [];
  let offset = 0;
  for (const [name, content, method] of entries) {
    const filename = Buffer.from(name);
    const data = Buffer.from(content);
    const compressed = method === 8 ? deflateRawSync(data) : data;
    let crc = 0xffffffff;
    for (const byte of data) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800 | (descriptor ? 8 : 0), 6);
    local.writeUInt16LE(method, 8);
    if (!descriptor) {
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(compressed.length, 18);
      local.writeUInt32LE(data.length, 22);
    }
    local.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50);
    local.copy(central, 6, 4, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(offset, 42);
    const tail = Buffer.alloc(descriptor ? 16 : 0);
    if (descriptor) {
      tail.writeUInt32LE(0x08074b50);
      tail.writeUInt32LE(crc, 4);
      tail.writeUInt32LE(compressed.length, 8);
      tail.writeUInt32LE(data.length, 12);
    }
    locals.push(local, filename, compressed, tail);
    directory.push(central, filename);
    offset += local.length + filename.length + compressed.length + tail.length;
  }
  const central = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, central, end]);
}

Then('native ZIP extraction preserves KML and images', async function () {
  const { unzip, getKmlDoc } = await utils;
  const kml = '<kml><name>Città 日本</name></kml>';
  const image = Buffer.alloc(150000, 0x89);
  for (const method of [0, 8]) {
    for (const descriptor of [false, true]) {
      const zip = archive([
        ['cartella/', '', method],
        ['cartella/città.kml', kml, method],
        ['images/icon.png', image, method],
        ['__proto__', 'safe', method],
      ], descriptor);
      // Include a ZIP signature in the comment, not another end record.
      const comment = Buffer.from('archive comment PK\x05\x06');
      zip.writeUInt16LE(comment.length, zip.length - 2);
      const input = Buffer.concat([zip, comment]);
      const files = await unzip(input);
      assert.equal(files[getKmlDoc(files)], kml);
      assert.equal(files['images/icon.png'], `data:image/png;base64,${image.toString('base64')}`);
      assert.equal(files.__proto__, 'safe');
      assert.equal(files['cartella/'], undefined);
      assert.equal(Object.getPrototypeOf(files), null);
    }
  }
  const files = await unzip(new Blob([archive([['other.kml', 'other', 0], ['doc.kml', 'main', 8]])]));
  assert.equal(files[getKmlDoc(files)], 'main');
  assert.deepEqual(Object.keys(await unzip(archive([]))), []);
  const examples = path.join(__dirname, '..', '..', 'examples');
  for (const name of readdirSync(examples).filter(file => file.endsWith('.kmz'))) {
    const extracted = await unzip(readFileSync(path.join(examples, name)));
    assert.ok(extracted[getKmlDoc(extracted)], `No KML extracted from ${name}`);
    for (const filename of Object.keys(extracted).filter(file => /\.(png|jpe?g|gif|bmp)$/i.test(file))) {
      assert.match(extracted[filename], /^data:image\/[^;]+;base64,/);
    }
  }
});

Then('native ZIP extraction rejects invalid and unsupported archives', async function () {
  const { unzip } = await utils;
  const valid = archive([['doc.kml', '<kml/>', 8]]);
  const central = valid.readUInt32LE(valid.length - 6);
  const cases = [
    [Buffer.alloc(0), /end of central directory/],
    [valid.subarray(0, -1), /end of central directory/],
  ];
  for (const [offset, value, message] of [
    [valid.length - 6, 0xffffffff, /ZIP64/],
    [valid.length - 10, 0xfffffffe, /central directory bounds/],
    [central + 42, central, /entry bounds/],
    [central + 20, central, /local entry/],
    [central + 24, 999, /size mismatch/],
    [central, 0, /central directory entry/],
    [0, 0, /local header/],
  ]) {
    const broken = Buffer.from(valid);
    broken.writeUInt32LE(value, offset);
    cases.push([broken, message]);
  }
  for (const [offset, value, message] of [
    [valid.length - 18, 1, /Multi-volume/],
    [valid.length - 12, 0xffff, /ZIP64/],
    [central + 8, 0x801, /Encrypted/],
    [central + 10, 99, /compression method/],
    [central + 34, 1, /Multi-volume/],
    [8, 0, /local entry/],
    [30, 0, /local filename/],
  ]) {
    const broken = Buffer.from(valid);
    broken.writeUInt16LE(value, offset);
    cases.push([broken, message]);
  }
  const truncatedDeflate = Buffer.from(valid);
  truncatedDeflate.fill(0, 30 + Buffer.byteLength('doc.kml'), central);
  cases.push([truncatedDeflate, /./]);
  for (const [input, message] of cases) await assert.rejects(unzip(input), message);
  const native = globalThis.DecompressionStream;
  try {
    globalThis.DecompressionStream = undefined;
    await assert.rejects(unzip(valid), /requires DecompressionStream/);
    assert.equal((await unzip(archive([['doc.kml', '<kml/>', 0]])))['doc.kml'], '<kml/>');
  } finally {
    globalThis.DecompressionStream = native;
  }
});
