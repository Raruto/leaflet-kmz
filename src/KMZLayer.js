import * as _ from './utils';

const kmzLayerMethods = {
	options: {
		interactive: true,
		ballon: true,
		bindPopup: true,
		bindTooltip: true,
		preferCanvas: false,
	},

	_initializeKMZ(kmzUrl, options) {
		L.Util.setOptions(this, options);

		if (L.Browser && L.Browser.mobile) this.options.bindTooltip = false;

		this._layers = {};

		if (kmzUrl) this.load(kmzUrl);
	},

	add(kmzUrl) {
		this.load(kmzUrl);
	},

	load(kmzUrl) {
		L.KMZLayer._jsPromise = _.lazyLoader(this._requiredJSModules(), L.KMZLayer._jsPromise)
			.then(() => _.loadFile(kmzUrl))
			.then((data) => this.parse(data, { name: _.getFileName(kmzUrl), icons: {} }));
	},

	parse(data, props) {
		return _.isZipped(data) ? this._parseKMZ(data, props) : this._parseKML(data, props);
	},

	_parseKMZ(data, props) {
		_.unzip(data).then((kmzFiles) => {
			const kmlDoc = _.getKmlDoc(kmzFiles);
			const images = _.getImageFiles(Object.keys(kmzFiles));

			const kmlString = kmzFiles[kmlDoc];
			// cache all images with their base64 encoding
			props.icons = images.reduce((obj, item) => {
				obj[item] = kmzFiles[item];
				return obj;
			}, {});

			this._parseKML(kmlString, props);
		});
	},

	_parseKML(data, props) {
		const xml = _.toXML(data, props);
		const geojson = _.toGeoJSON(xml, props);
		const layer = (this.options.geometryToLayer || this._geometryToLayer).call(this, geojson, xml);
		this.addLayer(layer);
		this.fire('load', { layer: layer, name: geojson.properties.name });
	},

	_geometryToLayer(data, xml) {
		const preferCanvas = this._map ? this._map.options.preferCanvas : this.options.preferCanvas;
		const emptyIcon    = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
		// parse GeoJSON
		const layer = new L.GeoJSON(data, {
			pointToLayer: (feature, latlng) => {
				if (preferCanvas) {
					return L.kmzMarker(latlng, {
						iconUrl: data.properties.icons[feature.properties.icon] || feature.properties.icon || emptyIcon,
						iconSize: [28, 28],
						iconAnchor: [14, 14],
						interactive: this.options.interactive,
					});
				}
				// TODO: handle L.svg renderer within the L.KMZMarker class?
				return new L.Marker(latlng, {
					icon: new L.Icon({
						iconUrl: data.properties.icons[feature.properties.icon] || feature.properties.icon || emptyIcon,
						iconSize: [28, 28],
						iconAnchor: [14, 14],
					}),
					interactive: this.options.interactive,
				});
			},
			style: (feature) => {
				const styles = {};
				const prop = feature.properties;

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

				const prop = feature.properties;
				const name = prop.name || "";
				const desc = prop.description || "";

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
		// parse GroundOverlays
		const el = xml.getElementsByTagName('GroundOverlay');
		for (let l, k = 0; k < el.length; k++) {
			l = _.parseGroundOverlay(el[k], data.properties);
			if (l) {
				layer.addLayer(l);
			}
		}
		return layer;
	},

	_requiredJSModules() {
		const urls = [];
		const host = 'https://unpkg.com/';

		if (typeof window.JSZip !== 'function') {
			urls.push(host + 'jszip@3.10.1/dist/jszip.min.js');
		}
		if (typeof window.toGeoJSON !== 'object') {
			urls.push(host + '@tmcw/togeojson@4.1.0/dist/togeojson.umd.js');
		}

		return urls;
	},
};

let KMZLayer;
if (L.version.startsWith('1.')) {
	kmzLayerMethods.initialize = kmzLayerMethods._initializeKMZ;
	KMZLayer = L.FeatureGroup.extend(kmzLayerMethods);
} else {
	KMZLayer = class extends L.FeatureGroup {
		constructor(url, options) {
			super();
			this._initializeKMZ(url, options);
		}
	};
	KMZLayer.include(kmzLayerMethods);
}
L.KMZLayer = KMZLayer;
export { KMZLayer };

L.kmzLayer = function(url, options) {
	return new L.KMZLayer(url, options);
};
