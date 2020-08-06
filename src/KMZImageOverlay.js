/**
 * Copyright (c) 2011-2015, Pavel Shramov, Bruno Bergot - MIT licence
 *
 * adapted from: https://github.com/windycom/leaflet-kml/L.KML.js
 */
L.KMZImageOverlay = L.ImageOverlay.extend({
	options: {
		angle: 0
	},
	_reset: function() {
		L.ImageOverlay.prototype._reset.call(this);
		this._rotate();
	},
	_animateZoom: function(e) {
		L.ImageOverlay.prototype._animateZoom.call(this, e);
		this._rotate();
	},
	_rotate: function() {
		if (L.DomUtil.TRANSFORM) {
			// use the CSS transform rule if available
			this._image.style[L.DomUtil.TRANSFORM] += ' rotate(' + this.options.angle + 'deg)';
		} else if (L.Browser.ie) {
			// fallback for IE6, IE7, IE8
			var rad = this.options.angle * (Math.PI / 180),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			this._image.style.filter += ' progid:DXImageTransform.Microsoft.Matrix(sizingMethod=\'auto expand\', M11=' +
				costheta + ', M12=' + (-sintheta) + ', M21=' + sintheta + ', M22=' + costheta + ')';
		}
	},
	getBounds: function() {
		return this._bounds;
	}
});
