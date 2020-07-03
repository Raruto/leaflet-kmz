import * as _ from './utils';

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
		_.getBinaryContent(url,
			(err, data) => {
				if (err != null) console.error(url, err, data);
				else this._parse(data);
			}
		);
	},

	_parse: function(data) {
		return _.isZipped(data) ? this._parseKMZ(data) : this._parseKML(data);
	},

	_parseKMZ: function(data) {
		_.unzip(data).then((kml) => this._parseKML(kml));
	},

	_parseKML: function(data) {
		var kmlString = _.decodeKMLString(data);
		var xmlDoc = _.toXML(kmlString);
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
		var data = _.toGeoJSON(xmlDoc);

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

export var KMZLoader = L.KMZLoader;
