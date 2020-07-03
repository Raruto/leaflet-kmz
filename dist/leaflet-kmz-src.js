(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('leaflet-pointable')) :
	typeof define === 'function' && define.amd ? define(['exports', 'leaflet-pointable'], factory) :
	(global = global || self, factory(global['leaflet-kmz'] = {}));
}(this, (function (exports) { 'use strict';

	// import JSZip from 'jszip';

	const extractRGB = (color) => {
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

	const decodeKMLString = (data) => {
		return data instanceof ArrayBuffer ? String.fromCharCode.apply(null, new Uint8Array(data)) : data;
	};

	const decodeKMZFolder = (data) => {
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


	const escapeRegExp = (str) => {
		return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	};

	const fileReader = (blob, mime, name) => {
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

	const getBinaryContent = (path, callback) => {
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

	const getKmlDoc = (files) => {
		return files["doc.kml"] ? "doc.kml" : getKmlFiles(Object.keys(files))[0];
	};

	const getKmlFiles = (files) => {
		return files.filter((file) => /.*\.kml/.test(file));
	};

	const getImageFiles = (files) => {
		return files.filter((file) => /\.(jpe?g|png|gif|bmp)$/i.test(file));
	};

	const getFileExt = (filename) => {
		return filename.split('.').pop().toLowerCase().replace('jpg', 'jpeg');
	};

	const getMimeType = (filename, ext) => {
		var mime = 'text/plain';
		if (/\.(jpe?g|png|gif|bmp)$/i.test(filename)) {
			mime = 'image/' + ext;
		} else if (/\.kml$/i.test(filename)) {
			mime = 'text/plain';
		}
		return mime;
	};

	const getLatLngsPoly = (feature, i) => {
		var o = [];
		var geometry = feature.geometry || feature;
		var coords = geometry.type == "Polygon" ? geometry.coordinates[0] : geometry.coordinates;
		for (var j = i || 0; j < coords.length; j++) {
			o[i++] = [coords[j][0], coords[j][1]];
		}
		return o.length ? o : false;
	};

	const getLatLngsPoint = (feature, i) => {
		var o = [];
		var geometry = feature.geometry || feature;
		var coords = geometry.coordinates;
		o[i || 0] = [coords[0], coords[1]];
		return o.length ? o : false;
	};

	const getLatLngs = (feature, i) => {
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

	const iscolorHex = (color) => {
		return /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/.test(color.toLowerCase());
	};

	/**
	 * It checks if a given file begins with PK, if so it's zipped
	 *
	 * @link https://en.wikipedia.org/wiki/List_of_file_signatures
	 */
	const isZipped = (file) => {
		var P = new Uint8Array(file, 0, 1); // offset, length
		var K = new Uint8Array(file, 1, 1);
		var PK = String.fromCharCode(P, K);
		return 'PK' === PK;
	};

	const listToObject = (list) => {
		return list.reduce((obj, item) => {
			obj[item[0]] = item[1]; // { fileName: stringValue }
			return obj;
		}, {});
	};

	const loadJS = (url) => {
		return new Promise((resolve, reject) => {
			var tag = document.createElement("script");
			tag.type = "text/javascript";
			tag.src = url;
			tag.onload = resolve.bind(url);
			tag.onerror = reject.bind(url);
			document.head.appendChild(tag);
		});
	};

	const mapZipFiles = (zip) => {
		return Object.keys(zip.files)
			.map((name) => zip.files[name])
			.map((entry) => entry
				.async("blob")
				.then((value) => [entry.name, value]) // [ fileName, stringValue ]
			);
	};

	const mapListFiles = (list) => {
		return list
			.map(file => Promise.resolve().then(() => readFile(file)));
	};

	const parseKMZFolder = (zip) => {
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
	const pointInPolygon = (point, vs) => {
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
	const pointInLayer = (p, layer, first) => {
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

	const readFile = (file) => {
		var filename = file[0];
		var fileblob = file[1];
		var ext = getFileExt(filename);
		var mime = getMimeType(filename, ext);
		return fileReader(fileblob, mime, filename);
	};

	const replaceAll = (str, find, replace) => {
		return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
	};

	const toGeoJSON = (xmlDoc) => {
		return window.toGeoJSON.kml(xmlDoc);
	};

	const toXML = (text) => {
		return (new DOMParser()).parseFromString(text, 'text/xml');
	};

	const toRGBA = (color, alpha) => {
		if (alpha && iscolorHex(color)) {
			var colorRgb = extractRGB(color);
			return "rgba(" + colorRgb[0] + "," + colorRgb[1] + "," + colorRgb[2] + "," + alpha + ")";
		}
		return color;
	};

	const unzip = (data) => {
		return new Promise((resolve, reject) => {
			window.JSZip.loadAsync(data)
				.then((zip) =>
					parseKMZFolder(zip)
					.then((kmlString) => resolve(kmlString))
				);
		});
	};

	L.KMZParser = L.Class.extend({

		initialize: function(opts) {
			L.setOptions(this, opts);
			this.loaders = [];
		},

		load: function(kmzUrl, opts) {
			this._loadAsyncJS(this._requiredJSModules()); // async download all required JS modules.
			this._waitAsyncJS(this._loadKMZ.bind(this, kmzUrl, opts)); // wait until all JS modules are downloaded.
		},

		get: function(i) {
			return i < this.loaders.length ? this.loaders[i] : false;
		},

		_loadKMZ: function(kmzUrl, opts) {
			var kmzLoader = new L.KMZLoader(L.extend({}, this.options, opts));
			kmzLoader.parse(kmzUrl);
			this.loaders.push(kmzLoader);
		},

		_loadAsyncJS: function(urls) {
			if (!L.KMZParser._jsPromise && urls.length) {
				var promises = urls.map(url => loadJS(url));
				L.KMZParser._jsPromisePending = true;
				L.KMZParser._jsPromise = Promise.all(promises).then(function() {
					L.KMZParser._jsPromisePending = false;
				}.bind(this));
			}
		},

		_requiredJSModules: function() {
			var urls = [];
			var host = 'https://unpkg.com/';

			if (typeof window.JSZip !== 'function') {
				urls.push(host + 'jszip@3.1.5/dist/jszip.min.js');
			}
			if (typeof window.toGeoJSON !== 'object') {
				urls.push(host + '@tmcw/togeojson@3.0.1/dist/togeojsons.min.js');
			}
			if (typeof window.geojsonvt !== 'function') {
				urls.push(host + 'geojson-vt@3.0.0/geojson-vt.js');
			}

			return urls;
		},

		_waitAsyncJS: function(callback) {
			if (L.KMZParser._jsPromise && L.KMZParser._jsPromisePending) {
				L.KMZParser._jsPromise.then(callback);
			} else {
				callback.call();
			}
		},

	});

	var KMZParser = L.KMZParser;

	L.KMZLoader = L.Class.extend({
		options: {
			renderer: true,
			tiled: true,
			interactive: true,
			ballon: true,
			bindPopup: true,
			bindTooltip: true,
			debug: 0,
			keepFront: true,
			emptyIcon: "data:image/png;" + "base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII="
		},

		initialize: function(opts) {

			L.setOptions(this, opts);

			this.renderer = this.options.renderer;
			this.tiled = this.options.tiled; // (Optimized) GeoJSON Vector Tiles ["geojson-vt.js"] library.
			this.interactive = this.options.interactive; // (Default) Mouse interactions through ["leaflet.js"] layers.
			this.pointable = this.tiled && !this.interactive && this.options.pointable; // (Experimental) Optimized Mouse interactions through ["geojson-vt.js", "leaflet-pointable.js"] libraries.
			this.emptyIcon = this.options.emptyIcon;
			this.name = this.options.name;
			this.callback = opts.onKMZLoaded;
		},

		parse: function(kmzUrl) {
			this.name = this.name ? this.name : kmzUrl.split('/').pop();
			this._load(kmzUrl);
		},

		_load: function(url) {
			getBinaryContent(url,
				(err, data) => {
					if (err != null) console.error(url, err, data);
					else this._parse(data);
				}
			);
		},

		_parse: function(data) {
			return isZipped(data) ? this._parseKMZ(data) : this._parseKML(data);
		},

		_parseKMZ: function(data) {
			unzip(data).then((kml) => this._parseKML(kml));
		},

		_parseKML: function(data) {
			var kmlString = decodeKMLString(data);
			var xmlDoc = toXML(kmlString);
			this._kmlToLayer(xmlDoc);
		},

		_keepFront: function(layer) {
			var keepFront = function(e) {
				if (this.bringToFront) this.bringToFront();
			}.bind(layer);
			layer.on('add', function(e) {
				this._map.on('baselayerchange', keepFront);
			});
			layer.on('remove', function(e) {
				this._map.off('baselayerchange', keepFront);
			});
		},

		_kmlToLayer: function(xmlDoc) {
			var data = toGeoJSON(xmlDoc);

			if (this.interactive) {
				this.geojson = L.geoJson(data, {
					pointToLayer: this._pointToLayer.bind(this),
					onEachFeature: this._onEachFeature.bind(this),
					kmzRenderer: this.renderer,
				});
				this.layer = this.geojson;
			}

			if (this.tiled) {
				this.gridlayer = L.gridLayer.geoJson(data, {
					pointable: this.pointable,
					ballon: this.options.ballon,
					bindPopup: this.options.bindPopup,
					bindTooltip: this.options.bindTooltip,
				});
				this.layer = this.interactive ? L.featureGroup([this.gridlayer, this.geojson]) : this.gridlayer;
			}

			if (this.layer) {
				this._onKMZLoaded(this.layer, this.name);
			}
		},

		_pointToLayer: function(feature, latlng) {
			return new L.KMZMarker(latlng, {
				kmzRenderer: this.renderer,
			});
			// return new L.marker(latlng, {
			//   icon: L.icon({
			//   	iconUrl: this.emptyIcon,
			//   }),
			// });
		},

		_onEachFeature: function(feature, layer) {
			switch (feature.geometry.type) {
				case 'Point':
					this._setLayerPointIcon(feature, layer);
					break;
				case 'LineString':
				case 'Polygon':
				case 'GeometryCollection':
					this._setLayerStyle(feature, layer);
					break;
				default:
					console.warn('Unsupported feature type: ' + feature.geometry.type, feature);
					break;
			}
			this._setLayerBalloon(feature, layer);
		},

		_onKMZLoaded: function(layer, name) {
			if (this.options.debug) console.log(layer, name);
			if (this.options.keepFront) this._keepFront(layer);
			if (this.callback) this.callback(layer, name);
		},

		_setLayerPointIcon: function(feature, layer) {
			layer.setIconUrl(this.tiled ? this.emptyIcon : feature.properties.icon);
			// var width = 28;
			// var height = 28;
			// layer.setIcon(L.icon({
			// 	iconSize: [width, height],
			// 	iconAnchor: [width / 2, height / 2],
			// 	iconUrl: this.tiled ? this.emptyIcon : feature.properties.icon,
			// }));
		},

		_setLayerStyle: function(feature, layer) {
			var styles = {
				weight: 1,
				opacity: 0,
				fillOpacity: 0,
			};
			if (!this.tiled) {
				if (feature.properties["stroke-width"]) {
					styles.weight = feature.properties["stroke-width"] * 1.05;
				}
				if (feature.properties["stroke-opacity"]) {
					styles.opacity = feature.properties["stroke-opacity"];
				}
				if (feature.properties["fill-opacity"]) {
					styles.fillOpacity = feature.properties["fill-opacity"];
				}
				if (feature.properties.stroke) {
					styles.color = feature.properties.stroke;
				}
				if (feature.properties.fill) {
					styles.fillColor = feature.properties.fill;
				}
			}
			layer.setStyle(styles);
		},

		_setLayerBalloon: function(feature, layer) {
			if (!this.options.ballon) return;

			var name = feature.properties.name ? feature.properties.name : "";
			var desc = feature.properties.description ? feature.properties.description : "";

			if (name || desc) {
				if (this.options.bindPopup) {
					layer.bindPopup('<div>' + '<b>' + name + '</b>' + '<br>' + desc + '</div>');
				}
				if (this.options.bindTooltip) {
					layer.bindTooltip('<b>' + name + '</b>', {
						direction: 'auto',
						sticky: true,
					});
				}
			}
		},

	});

	/**
	 * Include a default canvas renderer to each initialized map.
	 */
	var mapProto = L.Map.prototype;
	var getRendererMapProto = mapProto.getRenderer;
	L.Map.addInitHook(function() {
		this.options.kmzRenderer = L.canvas({ padding: 0.5 /*, pane: 'overlayPane'*/ });
	});
	L.Map.include({
		getRenderer: function(layer) {
			if (layer && layer.options && layer.options.kmzRenderer) {
				if (layer.options.kmzRenderer instanceof L.Renderer)
					layer.options.renderer = layer.options.kmzRenderer;
				else if (layer.options.kmzRenderer)
					layer.options.renderer = this.options.kmzRenderer;
			}
			var renderer = getRendererMapProto.call(this, layer);
			return renderer;
		},
	});

	var KMZLoader = L.KMZLoader;

	/**
	 * Optimized leaflet canvas renderer to load numerous markers
	 *
	 * @link https://stackoverflow.com/a/51852641
	 * @link https://stackoverflow.com/a/43019740
	 *
	 */
	L.KMZMarker = L.CircleMarker.extend({
		setIconUrl: function(iconUrl) {
			this._iconUrl = typeof iconUrl !== "undefined" ? iconUrl : this._iconUrl;
		},
		_updatePath: function() {
			var renderer = this._renderer;
			var layer = this;

			if (!this._iconUrl || !renderer._drawing || layer._empty()) {
				return;
			}

			var p = layer._point,
				ctx = renderer._ctx;

			var icon = new Image(),
				width = 28,
				height = 28;

			icon.onload = function() {
				ctx.drawImage(icon, p.x - (width / 2.0), p.y - (height / 2.0), width, height);
				// Removed in Leaflet 1.4.0
				if (renderer._drawnLayers) renderer._drawnLayers[layer._leaflet_id] = layer;
				else renderer._layers[layer._leaflet_id] = layer;
			};
			icon.src = this._iconUrl;
		}
	});

	var KMZMarker = L.KMZMarker;

	/**
	 * A plugin combining geojson-vt with leafletjs which is initially inspired by leaflet-geojson-vt.
	 *
	 * @author Brandonxiang, Raruto
	 *
	 * @link https://github.com/brandonxiang/leaflet-geojson-vt
	 */

	L.GridLayer.GeoJSON = L.GridLayer.extend({
		options: {
			pointable: false,
			ballon: false,
			bindPopup: false,
			bindTooltip: false,
			async: false,
			maxZoom: 24,
			tolerance: 3,
			debug: 0,
			extent: 4096,
			buffer: 256,
			icon: {
				width: 28,
				height: 28,
			},
			styles: {
				strokeWidth: 1,
				strokeColor: '#f00',
				strokeOpacity: 1.0,
				fillColor: '#000',
				fillOpacity: 0.25
			}
		},

		initialize: function(geojson, options) {
			L.setOptions(this, options);
			L.GridLayer.prototype.initialize.call(this, options);
			this.tileIndex = (geojsonvt || window.geojsonvt)(geojson, this.options);
			this.geojson = geojson; // eg. saved for advanced "leaflet-pip" mouse/click integrations
		},

		onAdd: function(map) {
			L.GridLayer.prototype.onAdd.call(this, map);
			if (this.options.ballon) {
				if (this.options.bindPopup) this._map.on("click", this.updateBalloon, this);
				if (this.options.bindTooltip) this._map.on("mousemove", this.updateBalloon, this);
			}
		},

		createTile: function(coords) {
			var tile = L.DomUtil.create('canvas', 'leaflet-tile');
			var size = this.getTileSize();
			tile.width = size.x;
			tile.height = size.y;
			var ctx = tile.getContext('2d');

			// return the tile so it can be rendered on screen
			var tileInfo = this.tileIndex.getTile(coords.z, coords.x, coords.y);
			var features = tileInfo ? tileInfo.features : [];
			for (var i = 0; i < features.length; i++) {
				this._drawFeature(ctx, features[i]);
			}
			return tile;
		},

		_drawFeature: function(ctx, feature) {
			ctx.beginPath();
			this._setStyle(ctx, feature);
			if (feature.type === 1) this._drawIcon(ctx, feature);
			else if (feature.type === 2) this._drawLine(ctx, feature);
			else if (feature.type === 3) this._drawPolygon(ctx, feature);
			else console.warn('Unsupported feature type: ' + feature.geometry.type, feature);

			ctx.stroke();
		},

		_drawIcon: function(ctx, feature) {
			var icon = new Image(),
				p = feature.geometry[0],
				width = this.options.icon.width,
				height = this.options.icon.height;
			icon.onload = () => ctx.drawImage(icon, (p[0] / 16.0) - (width / 2.0), (p[1] / 16.0) - (height / 2.0), width, height);
			icon.src = feature.tags.icon ? feature.tags.icon : null;
		},

		_drawLine: function(ctx, feature) {
			var line = feature.geometry,
				ring, p, j, k;
			for (j = 0; j < line.length; j++) {
				ring = line[j];
				for (k = 0; k < ring.length; k++) {
					p = ring[k];
					if (k) ctx.lineTo(p[0] / 16.0, p[1] / 16.0);
					else ctx.moveTo(p[0] / 16.0, p[1] / 16.0);
				}
			}
		},

		_drawPolygon: function(ctx, feature) {
			this._drawLine(ctx, feature);
			ctx.fill('evenodd');
		},

		_setStyle: function(ctx, feature) {
			var style = {};

			if (feature.type === 1) style = this._setPointStyle(feature, style);
			else if (feature.type === 2) style = this._setLineStyle(feature, style);
			else if (feature.type === 3) style = this._setPolygonStyle(feature, style);

			ctx.lineWidth = style.stroke ? this._setWeight(style.weight) : 0;
			ctx.strokeStyle = style.stroke ? this._setOpacity(style.stroke, style.opacity) : {};
			ctx.fillStyle = style.fill ? this._setOpacity(style.fill, style.fillOpacity) : {};
		},

		_setPointStyle: function(feature, style) {
			return style;
		},

		_setLineStyle: function(feature, style) {
			style.weight = (feature.tags["stroke-width"] ? feature.tags["stroke-width"] : this.options.styles.strokeWidth) * 1.05;
			style.opacity = feature.tags["stroke-opacity"] ? feature.tags["stroke-opacity"] : this.options.styles.strokeOpacity;
			style.stroke = feature.tags.stroke ? feature.tags.stroke : this.options.styles.strokeColor;
			return style;
		},

		_setPolygonStyle: function(feature, style) {
			style = this._setLineStyle(feature, style);
			style.fill = feature.tags.fill ? feature.tags.fill : this.options.styles.fillColor;
			style.fillOpacity = feature.tags["fill-opacity"] ? feature.tags["fill-opacity"] : this.options.styles.fillOpacity;
			return style;
		},

		_setWeight: function(weight) {
			return weight || 5;
		},

		_setOpacity: function(color, opacity) {
			return toRGBA(color || '#f00', opacity);
		},

		/**
		 * (EXPERIMENTAL) Based on: https://github.com/Raruto/leaflet-pointable
		 */
		updateBalloon: function(e) {
			if (!this._map || !this.options.pointable || !this._map.isPointablePixel() || !this.isPointablePixel()) return;
			this._popup = this._popup || L.popup();
			var points = pointInLayer(e.latlng, this.geojson);
			if (points) {
				var feature = points[0];
				var name = feature.properties.name || "";
				if (name) {
					this._popup.setLatLng(e.latlng);
					this._popup.setContent('<b>' + name + '</b>');
					this._popup.openOn(this._map);
				}
			} else {
				this._map.closePopup(this._popup);
			}
		},

	});

	L.gridLayer.geoJson = function(geojson, options) {
		return new L.GridLayer.GeoJSON(geojson, options);
	};

	var GridLayer = {
		GeoJSON: L.GridLayer.GeoJSON,
	};

	var gridLayer = {
		geoJSON: L.gridLayer.geoJson,
	};

	exports.GridLayer = GridLayer;
	exports.KMZLoader = KMZLoader;
	exports.KMZMarker = KMZMarker;
	exports.KMZParser = KMZParser;
	exports.gridLayer = gridLayer;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=leaflet-kmz-src.js.map
