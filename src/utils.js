// import JSZip from 'jszip';
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
				console.warn("Error " + xhr.status + " while fetching remote file: " + url);
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
	var mime = 'text/plain';
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

export function toGeoJSON(data, props) {
	var xml = data instanceof XMLDocument ? data : toXML(data);
	var json = window.toGeoJSON.kml(xml);
	json.properties = L.extend({}, json.properties, props || {});
	return json;
}

export function toXML(data) {
	var text = data instanceof ArrayBuffer ? String.fromCharCode.apply(null, new Uint8Array(data)) : data;
	return (new DOMParser()).parseFromString(text, 'text/xml');
}

export function unzip(folder) {
	return new Promise((resolve, reject) => {
		window.JSZip.loadAsync(folder)
			.then((zip) => {

				// Parse KMZ files.
				var files = Object.keys(zip.files)
					.map((name) => {
						var entry = zip.files[name];
						if (isImageFile(name)) {
							var ext = getFileExt(name);
							var mime = getMimeType(name, ext);
							return entry
								.async("base64")
								.then((value) => [name, 'data:' + mime + ';base64,' + value]);
						}
						return entry
							.async("text")
							.then((value) => [name, value]); // [ fileName, stringValue ]
					});

				// Return KMZ files.
				Promise.all(files).then((list) =>
					resolve(list.reduce((obj, item) => {
						obj[item[0]] = item[1]; // { fileName: stringValue }
						return obj;
					}, {}))
				);
			});
	});
}
