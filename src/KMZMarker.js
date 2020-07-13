/**
 * Optimized leaflet canvas renderer to load numerous markers
 *
 * @link https://stackoverflow.com/a/51852641
 * @link https://stackoverflow.com/a/43019740
 *
 */
L.KMZMarker = L.CircleMarker.extend({
	// initialize: function(latlng, options) {
	// 	L.CircleMarker.prototype.initialize.call(this, latlng, options);
	// },
	_updatePath: function() {
		var renderer = this._renderer;
		var icon = this._icon;
		var layer = this;

		if (!renderer._drawing || layer._empty()) {
			return;
		}

		// if (icon.complete)
		if (icon) {
			icon.drawImage();
		} else {
			icon = this._icon = new Image(this.options.iconSize[0], this.options.iconSize[1]);
			icon.anchor = [icon.width / 2.0, icon.height / 2.0];
			icon.onload = icon.drawImage = () => {
				var p = layer._point.subtract(icon.anchor);
				var ctx = renderer._ctx;

				ctx.drawImage(icon, p.x, p.y, icon.width, icon.height);

				// Removed in Leaflet 1.4.0
				// if (renderer._drawnLayers) renderer._drawnLayers[layer._leaflet_id] = layer;
				// else renderer._layers[layer._leaflet_id] = layer;
			};
			icon.src = this.options.iconUrl;
		}
	}
});

L.kmzMarker = function(ll, opts) {
	return new L.KMZMarker(ll, opts);
};

export var KMZMarker = L.KMZMarker;
