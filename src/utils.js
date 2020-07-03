// import JSZip from 'jszip';
// import * as toGeoJSON from '@tmcw/togeojson';

export const blobToBase64 = (blob, callback) => {
	var reader = new FileReader();
	reader.onload = function() {
		var dataUrl = reader.result;
		var base64 = dataUrl.split(',')[1];
		callback(base64);
	};
	reader.readAsDataURL(blob);
};

export const blobToString = (b) => {
	var u, x;
	u = URL.createObjectURL(b);
	x = new XMLHttpRequest();
	x.open('GET', u, false); // although sync, you're not fetching over internet
	x.send();
	URL.revokeObjectURL(u);
	return x.responseText;
};

export const extractRGB = (color) => {
	var sColor = color.toLowerCase();
	if (sColor.length === 4) {
		var sColorNew = "#";
		for (var i = 1; i < 4; i += 1) {
			sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
		}
		sColor = sColorNew;
	}
	var sColorChange = [];
	for (var j = 1; j < 7; j += 2) {
		sColorChange.push(parseInt("0x" + sColor.slice(j, j + 2)));
	}
	return sColorChange;
};

export const decodeKMLString = (data) => {
	return data instanceof ArrayBuffer ? String.fromCharCode.apply(null, new Uint8Array(data)) : data;
};

export const decodeKMZFolder = (data) => {
	var kmzFiles = listToObject(data);
	var kmlDoc = getKmlDoc(kmzFiles);
	var images = getImageFiles(Object.keys(kmzFiles));

	var kmlString = kmzFiles[kmlDoc];

	// replaces all images with their base64 encoding
	for (var i in images) {
		var imageUrl = images[i];
		var dataUrl = kmzFiles[imageUrl];
		kmlString = replaceAll(kmlString, imageUrl, dataUrl);
	}
	return kmlString;
};


export const escapeRegExp = (str) => {
	return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};

export const fileReader = (blob, mime, name) => {
	return new Promise((resolve, reject) => {
		var fr = new FileReader();
		fr.onload = () => {
			var result = fr.result;
			if (mime.indexOf('text') === -1) {
				var dataUrl = fr.result;
				var base64 = dataUrl.split(',')[1];
				result = 'data:' + mime + ';base64,' + base64;
			}
			return resolve([
				name, result
			]);
		};
		if (mime.indexOf('text') === -1) {
			fr.readAsDataURL(blob);
		} else {
			fr.readAsText(blob);
		}
	});
};

export const getBinaryContent = (path, callback) => {
	try {
		var xhr = new window.XMLHttpRequest();
		xhr.open('GET', path, true);
		xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		xhr.responseType = "arraybuffer";
		xhr.onreadystatechange = function(evt) {
			var file, err;
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					file = null;
					err = null;
					try {
						file = xhr.response || xhr.responseText;
					} catch (e) {
						err = new Error(e);
					}
					callback(err, file);
				} else {
					callback(new Error("Ajax error for " + path + " : " + this.status + " " + this.statusText), null);
				}
			}
		};
		xhr.send();
	} catch (e) {
		callback(new Error(e), null);
	}
};

export const getKmlDoc = (files) => {
	return files["doc.kml"] ? "doc.kml" : getKmlFiles(Object.keys(files))[0];
};

export const getKmlFiles = (files) => {
	return files.filter((file) => /.*\.kml/.test(file));
};

export const getImageFiles = (files) => {
	return files.filter((file) => /\.(jpe?g|png|gif|bmp)$/i.test(file));
};

export const getFileExt = (filename) => {
	return filename.split('.').pop().toLowerCase().replace('jpg', 'jpeg');
};

export const getMimeType = (filename, ext) => {
	var mime = 'text/plain';
	if (/\.(jpe?g|png|gif|bmp)$/i.test(filename)) {
		mime = 'image/' + ext;
	} else if (/\.kml$/i.test(filename)) {
		mime = 'text/plain';
	}
	return mime;
};

export const getLatLngsPoly = (feature, i) => {
	var o = [];
	var geometry = feature.geometry || feature;
	var coords = geometry.type == "Polygon" ? geometry.coordinates[0] : geometry.coordinates;
	for (var j = i || 0; j < coords.length; j++) {
		o[i++] = [coords[j][0], coords[j][1]];
	}
	return o.length ? o : false;
};

export const getLatLngsPoint = (feature, i) => {
	var o = [];
	var geometry = feature.geometry || feature;
	var coords = geometry.coordinates;
	o[i || 0] = [coords[0], coords[1]];
	return o.length ? o : false;
};

export const getLatLngs = (feature, i) => {
	var o = [];
	i = i || 0;
	var coords;

	var geometry = feature.geometry || feature;
	var type = geometry.type;

	if (type == "Point") {
		coords = getLatLngsPoint(feature, i);
		if (coords) o.push(coords);
	} else if (type == "LineString" || type == "Polygon") {
		coords = getLatLngsPoly(feature, i);
		if (coords) o.push(coords);
	} else if (type == "GeometryCollection") {
		var polys = geometry.geometries;
		for (var j = 0; j < polys.length; j++) {
			coords = getLatLngs(polys[j], i);
			if (coords) o.push(coords);
		}
	} else {
		console.warn("Unsupported feature type: " + type);
	}
	return o.length ? o : false;
};

export const iscolorHex = (color) => {
	return /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/.test(color.toLowerCase());
};

/**
 * It checks if a given file begins with PK, if so it's zipped
 *
 * @link https://en.wikipedia.org/wiki/List_of_file_signatures
 */
export const isZipped = (file) => {
	var P = new Uint8Array(file, 0, 1); // offset, length
	var K = new Uint8Array(file, 1, 1);
	var PK = String.fromCharCode(P, K);
	return 'PK' === PK;
};

export const listToObject = (list) => {
	return list.reduce((obj, item) => {
		obj[item[0]] = item[1]; // { fileName: stringValue }
		return obj;
	}, {});
};

export const loadJS = (url) => {
	return new Promise((resolve, reject) => {
		var tag = document.createElement("script");
		tag.type = "text/javascript";
		tag.src = url;
		tag.onload = resolve.bind(url);
		tag.onerror = reject.bind(url);
		document.head.appendChild(tag);
	});
};

export const mapZipFiles = (zip) => {
	return Object.keys(zip.files)
		.map((name) => zip.files[name])
		.map((entry) => entry
			.async("blob")
			.then((value) => [entry.name, value]) // [ fileName, stringValue ]
		);
};

export const mapListFiles = (list) => {
	return list
		.map(file => Promise.resolve().then(() => readFile(file)));
};

export const parseKMZFolder = (zip) => {
	return new Promise((resolve, reject) => {
		Promise.all(mapZipFiles(zip)).then((list) => {
			Promise.all(mapListFiles(list)).then((data) => {
				return resolve(decodeKMZFolder(data));
			});
		});
	});
};

/**
 * Point in Polygon: ray-casting algorithm
 *
 * @link http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
 */
export const pointInPolygon = (point, vs) => {
	var x = point[0];
	var y = point[1];

	var inside = false;
	for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
		var xi = vs[i][0];
		var yi = vs[i][1];
		var xj = vs[j][0];
		var yj = vs[j][1];

		var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		if (intersect) inside = !inside;
	}

	return inside;
};

/**
 * (EXPERIMENTAL) Inspired by: https://github.com/mapbox/leaflet-pip
 *
 * TODO: add/check support for Points, Lines and "donuts" Polygons
 */
export const pointInLayer = (p, layer, first) => {
	if (p instanceof L.LatLng) p = [p.lng, p.lat];
	var results = [];

	first = first || true;
	var features = layer.features;

	for (var i = 0; i < features.length; i++) {
		if (first && results.length) break;
		var coords = getLatLngs(features[i]);
		if (coords) {
			var inside = pointInPolygon(p, coords); // NB. works only with polygons (see: https://observablehq.com/@tmcw/understanding-point-in-polygon).
			if (inside) results.push(features[i]);
		}
	}
	return results.length ? results : false;
};

export const readFile = (file) => {
	var filename = file[0];
	var fileblob = file[1];
	var ext = getFileExt(filename);
	var mime = getMimeType(filename, ext);
	return fileReader(fileblob, mime, filename);
};

export const replaceAll = (str, find, replace) => {
	return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
};

export const toGeoJSON = (xmlDoc) => {
	return window.toGeoJSON.kml(xmlDoc);
};

export const toXML = (text) => {
	return (new DOMParser()).parseFromString(text, 'text/xml');
};

export const toRGBA = (color, alpha) => {
	if (alpha && iscolorHex(color)) {
		var colorRgb = extractRGB(color);
		return "rgba(" + colorRgb[0] + "," + colorRgb[1] + "," + colorRgb[2] + "," + alpha + ")";
	}
	return color;
};

export const unzip = (data) => {
	return new Promise((resolve, reject) => {
		window.JSZip.loadAsync(data)
			.then((zip) =>
				parseKMZFolder(zip)
				.then((kmlString) => resolve(kmlString))
			);
	});
};
