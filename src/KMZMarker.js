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

export var KMZMarker = L.KMZMarker;
