import * as _ from './utils';

export const KMZLayer = L.KMZLayer = L.FeatureGroup.extend({
	options: {
		interactive: true,
		ballon: true,
		bindPopup: true,
		bindTooltip: true,
	},

	initialize: function(kmzUrl, options) {
		L.extend(this.options, options);

		this.tiled = this.options.tiled; // (Optimized) GeoJSON Vector Tiles ["geojson-vt.js"] library.
		this.interactive = this.options.interactive; // (Default) Mouse interactions through ["leaflet.js"] layers.
		this.pointable = this.tiled && !this.interactive && this.options.pointable; // (Experimental) Optimized Mouse interactions through ["geojson-vt.js", "leaflet-pointable.js"] libraries.

		this._layers = {};

		if (kmzUrl) this.load(kmzUrl);
	},

	add: function(kmzUrl) {
		this.load(kmzUrl);
	},

	load: function(kmzUrl) {
		L.KMZLayer._jsPromise = _.lazyLoader(this._requiredJSModules(), L.KMZLayer._jsPromise)
			.then(() => this._load(kmzUrl));
	},

	_load: function(url) {
		return _.loadFile(url).then((data) => this._parse(data, { name: _.getFileName(url) }));
	},

	_parse: function(data, props) {
		return _.isZipped(data) ? this._parseKMZ(data, props) : this._parseKML(data, props);
	},

	_parseKMZ: function(data, props) {
		_.unzip(data).then((kmzFiles) => {
			var kmlDoc = _.getKmlDoc(kmzFiles);
			var images = _.getImageFiles(Object.keys(kmzFiles));

			var kmlString = kmzFiles[kmlDoc];
			// cache all images with their base64 encoding
			var icons = images.reduce((obj, item) => {
				obj[item] = kmzFiles[item];
				return obj;
			}, {});

			this._parseKML(kmlString, L.extend({}, props, { icons: icons }));
		});
	},

	_parseKML: function(data, props) {
		var geojson = _.toGeoJSON(data, props);
		var layer = (this.options.geometryToLayer || this._geometryToLayer).call(this, geojson);
		this.addLayer(layer);
		this.fire('load', { layer: layer, name: geojson.properties.name });
	},

	_geometryToLayer: function(data) {
		var preferCanvas = (this._map && this._map.options.preferCanvas);
		var layer = L.geoJson(data, {
			pointToLayer: (feature, latlng) => {
				if (preferCanvas) {
					return L.kmzMarker(latlng, {
						iconUrl: data.properties.icons[feature.properties.icon],
						iconSize: [28, 28],
						iconAnchor: [14, 14],
						interactive: this.options.interactive,
					});
				}
				// TODO: handle L.svg renderer within the L.KMZMarker class?
				return L.marker(latlng, {
					icon: L.icon({
						iconUrl: data.properties.icons[feature.properties.icon],
						iconSize: [28, 28],
						iconAnchor: [14, 14],
					}),
				});
			},
			style: (feature) => {
				var styles = {};
				var prop = feature.properties;

				if (prop.stroke) {
					styles.stroke = true;
					styles.color = prop.stroke;
				}
				if (prop.fill) {
					styles.fill = true;
					styles.fillColor = prop.fill;
				}
				if (prop["stroke-opacity"]) {
					styles.opacity = prop["stroke-opacity"];
				}
				if (prop["fill-opacity"]) {
					styles.fillOpacity = prop["fill-opacity"];
				}
				if (prop["stroke-width"]) {
					styles.weight = prop["stroke-width"] * 1.05;
				}

				return styles;
			},
			onEachFeature: (feature, layer) => {
				if (!this.options.ballon) return;

				var prop = feature.properties;
				var name = prop.name || "";
				var desc = prop.description || "";

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
			interactive: this.options.interactive,
		});

		return layer;
	},

	_requiredJSModules: function() {
		var urls = [];
		var host = 'https://unpkg.com/';

		if (typeof window.JSZip !== 'function') {
			urls.push(host + 'jszip@3.5.0/dist/jszip.min.js');
		}
		if (typeof window.toGeoJSON !== 'object') {
			urls.push(host + '@tmcw/togeojson@4.1.0/dist/togeojson.umd.js');
		}

		return urls;
	},
});

L.kmzLayer = function(url, options) {
	return new L.KMZLayer(url, options);
};
