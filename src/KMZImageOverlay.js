/**
 * Copyright (c) 2011-2015, Pavel Shramov, Bruno Bergot - MIT licence
 *
 * adapted from: https://github.com/windycom/leaflet-kml/L.KML.js
 */
const kmzImageOverlayMethods = {
	options: {
		angle: 0
	},
	_reset() {
		L.ImageOverlay.prototype._reset.call(this);
		this._rotate();
	},
	_animateZoom(e) {
		L.ImageOverlay.prototype._animateZoom.call(this, e);
		this._rotate();
	},
	_rotate() {
		if (L.DomUtil.TRANSFORM || !L.Browser) {
			// use the CSS transform rule if available
			this._image.style[L.DomUtil.TRANSFORM || 'transform'] += ' rotate(' + this.options.angle + 'deg)';
		} else if (L.Browser.ie) {
			// fallback for IE6, IE7, IE8
			const rad = this.options.angle * (Math.PI / 180),
				costheta = Math.cos(rad),
				sintheta = Math.sin(rad);
			this._image.style.filter += ' progid:DXImageTransform.Microsoft.Matrix(sizingMethod=\'auto expand\', M11=' +
				costheta + ', M12=' + (-sintheta) + ', M21=' + sintheta + ', M22=' + costheta + ')';
		}
	},
	getBounds() {
		return this._bounds;
	}
};

if (L.version.startsWith('1.')) {
	L.KMZImageOverlay = L.ImageOverlay.extend(kmzImageOverlayMethods);
} else {
	L.KMZImageOverlay = class extends L.ImageOverlay {};
	L.KMZImageOverlay.include(kmzImageOverlayMethods);
}
