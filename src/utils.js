// import * as toGeoJSON from '@tmcw/togeojson';

export function loadFile(url) {
	return new Promise((resolve, reject) => {
		let xhr = new XMLHttpRequest();
		xhr.open('GET', url);
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		xhr.responseType = "arraybuffer";
		xhr.onload = () => {
			if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
				resolve(xhr.response || xhr.responseText);
			} else {
				resolve('');
			}
		};
		xhr.onerror = () => reject("Error " + xhr.status + " while fetching remote file: " + url);
		xhr.send();
	});
}

export function getKmlDoc(files) {
	return files["doc.kml"] ? "doc.kml" : getKmlFiles(Object.keys(files))[0];
}

export function getKmlFiles(files) {
	return files.filter((file) => isKmlFile(file));
}

export function getImageFiles(files) {
	return files.filter((file) => isImageFile(file));
}

export function getFileExt(filename) {
	return filename.split('.').pop().toLowerCase().replace('jpg', 'jpeg');
}

export function getFileName(url) {
	return url.split('/').pop();
}

export function getMimeType(filename, ext) {
	let mime = 'text/plain';
	if (/\.(jpe?g|png|gif|bmp)$/i.test(filename)) {
		mime = 'image/' + ext;
	} else if (/\.kml$/i.test(filename)) {
		mime = 'text/plain';
	}
	return mime;
}

export function isImageFile(filename) {
	return /\.(jpe?g|png|gif|bmp)$/i.test(filename);
}

export function isKmlFile(filename) {
	return /.*\.kml/.test(filename);
}

/**
 * It checks if a given file begins with PK, if so it's zipped
 *
 * @link https://en.wikipedia.org/wiki/List_of_file_signatures
 */
export function isZipped(file) {
	return 'PK' === String.fromCharCode(new Uint8Array(file, 0, 1), new Uint8Array(file, 1, 1));
}

export function lazyLoader(urls, promise) {
	return promise instanceof Promise ? promise : Promise.all(urls.map(url => loadJS(url)))
}

export function loadJS(url) {
	return new Promise((resolve, reject) => {
		let tag = document.createElement("script");
		tag.addEventListener('load', resolve.bind(url), { once: true });
		tag.src = url;
		document.head.appendChild(tag);
	});
}

export function parseLatLonBox(xml) {
	let box = new L.LatLngBounds([
		xml.getElementsByTagName('south')[0].childNodes[0].nodeValue,
		xml.getElementsByTagName('west')[0].childNodes[0].nodeValue
	], [
		xml.getElementsByTagName('north')[0].childNodes[0].nodeValue,
		xml.getElementsByTagName('east')[0].childNodes[0].nodeValue
	]);
	let rotation = xml.getElementsByTagName('rotation')[0];
	if (rotation !== undefined) {
		rotation = parseFloat(rotation.childNodes[0].nodeValue);
	}
	return [box, rotation];
}

export function parseGroundOverlay(xml, props) {
	let [bounds, rotation] = parseLatLonBox(xml.getElementsByTagName('LatLonBox')[0]);
	let href = xml.getElementsByTagName('href')[0];
	let color = xml.getElementsByTagName('color')[0];
	let icon = xml.getElementsByTagName('Icon')[0];
	let options = {};
	if (!href && icon) {
		href = icon.getElementsByTagName('href')[0];
	}
	href = href.childNodes[0].nodeValue;
	href = props.icons[href] || href;
	if (color) {
		color = color.childNodes[0].nodeValue;
		options.opacity = parseInt(color.substring(0, 2), 16) / 255.0;
		options.color = '#' + color.substring(6, 8) + color.substring(4, 6) + color.substring(2, 4);
	}
	if (rotation) {
		options.rotation = rotation;
	}
	return new L.KMZImageOverlay(href, bounds, { opacity: options.opacity, angle: options.rotation });
}

export function toGeoJSON(data, props) {
	const xml = data instanceof XMLDocument ? data : toXML(data);
	const json = window.toGeoJSON.kml(xml);
	json.properties = Object.assign({}, json.properties, props || {});
	return json;
}

export function toXML(data) {
	let text = data;
	if (data instanceof ArrayBuffer) {
		text = new Uint8Array(data).reduce(function (data, byte) {
			return data + String.fromCharCode(byte);
		}, '');
		const encoding = text.substring(0, text.indexOf("?>")).match(/encoding\s*=\s*["'](.*)["']/i);
		if (encoding) {
			text = new TextDecoder(encoding[1]).decode(data);
		}
	}
	return text ? (new DOMParser()).parseFromString(text, 'text/xml') : document.implementation.createDocument(null, "kml");;
}

/**
 * Read a single-volume ZIP32 KMZ using the central directory.
 *
 * @param {ArrayBuffer|Uint8Array|Blob} folder ZIP archive.
 * @returns {Promise<Object<string, string>>} Text files and image data URLs.
 * @throws {Error} If the archive is invalid or uses an unsupported ZIP feature.
 */
export async function unzip(folder) {
	const bytes = new Uint8Array(await new Response(folder).arrayBuffer());
	const view = new DataView(bytes.buffer);
	let end = bytes.length - 22;
	const first = Math.max(0, end - 65535);
	for (; end >= first; end--) {
		if (view.getUint32(end, true) === 0x06054b50 &&
			end + 22 + view.getUint16(end + 20, true) === bytes.length) break;
	}
	if (end < first) throw new Error('Invalid ZIP: end of central directory not found');
	const count = view.getUint16(end + 10, true);
	const size = view.getUint32(end + 12, true);
	let offset = view.getUint32(end + 16, true);
	if (count === 0xffff || size === 0xffffffff || offset === 0xffffffff) {
		throw new Error('ZIP64 archives are not supported');
	}
	if (view.getUint16(end + 4, true) || view.getUint16(end + 6, true) ||
		view.getUint16(end + 8, true) !== count) {
		throw new Error('Multi-volume ZIP archives are not supported');
	}
	const directory = offset;
	const limit = offset + size;
	if (limit !== end) throw new Error('Invalid ZIP: central directory bounds');
	const files = Object.create(null);
	const decoder = new TextDecoder();
	for (let index = 0; index < count; index++) {
		if (offset + 46 > limit || view.getUint32(offset, true) !== 0x02014b50) {
			throw new Error('Invalid ZIP: central directory entry');
		}
		const flags = view.getUint16(offset + 8, true);
		const method = view.getUint16(offset + 10, true);
		const compressed = view.getUint32(offset + 20, true);
		const uncompressed = view.getUint32(offset + 24, true);
		const nameLength = view.getUint16(offset + 28, true);
		const extraLength = view.getUint16(offset + 30, true);
		const commentLength = view.getUint16(offset + 32, true);
		const disk = view.getUint16(offset + 34, true);
		const local = view.getUint32(offset + 42, true);
		const next = offset + 46 + nameLength + extraLength + commentLength;
		if (compressed === 0xffffffff || uncompressed === 0xffffffff || local === 0xffffffff || disk === 0xffff) {
			throw new Error('ZIP64 archives are not supported');
		}
		if (disk) throw new Error('Multi-volume ZIP archives are not supported');
		if (flags & 0x41) throw new Error('Encrypted ZIP entries are not supported');
		if (method !== 0 && method !== 8) throw new Error('Unsupported ZIP compression method: ' + method);
		if (next > limit || local + 30 > directory || view.getUint32(local, true) !== 0x04034b50) {
			throw new Error('Invalid ZIP: entry bounds or local header');
		}
		const localNameLength = view.getUint16(local + 26, true);
		const start = local + 30 + localNameLength + view.getUint16(local + 28, true);
		if (start + compressed > directory || localNameLength !== nameLength ||
			view.getUint16(local + 6, true) !== flags || view.getUint16(local + 8, true) !== method) {
			throw new Error('Invalid ZIP: local entry does not match central directory');
		}
		for (let i = 0; i < nameLength; i++) {
			if (bytes[local + 30 + i] !== bytes[offset + 46 + i]) {
				throw new Error('Invalid ZIP: local filename does not match central directory');
			}
		}
		const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
		let content = bytes.subarray(start, start + compressed);
		if (method === 8) {
			if (typeof DecompressionStream !== 'function') {
				throw new Error('KMZ decompression requires DecompressionStream with deflate-raw support');
			}
			const stream = new Blob([content]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
			content = new Uint8Array(await new Response(stream).arrayBuffer());
		}
		if (content.length !== uncompressed) throw new Error('Invalid ZIP: uncompressed size mismatch');
		if (!name.endsWith('/')) {
			if (isImageFile(name)) {
				let binary = '';
				for (let i = 0; i < content.length; i += 8192) {
					binary += String.fromCharCode(...content.subarray(i, i + 8192));
				}
				files[name] = 'data:' + getMimeType(name, getFileExt(name)) + ';base64,' + btoa(binary);
			} else {
				files[name] = decoder.decode(content);
			}
		}
		offset = next;
	}
	if (offset !== limit) throw new Error('Invalid ZIP: central directory size mismatch');
	return files;
}
