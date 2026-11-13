/**
 * Copyright (c) 2011-2015, Pavel Shramov, Bruno Bergot - MIT licence
 *
 * adapted from: https://github.com/windycom/leaflet-kml/L.KML.js
 */
const kmzImageOverlayMethods = {
	options: {
		angle: 0
	},
	// see: https://github.com/Raruto/leaflet-kmz/issues/22
	_initImage() {
		L.ImageOverlay.prototype._initImage.call(this);
		const onload = this._image.onload;
		this._image.onload = () => {
			if (!this._shouldReproject() || this._warped) {
				onload();
				return;
			}
			this._warped = true;
			this._reprojectImage();
		};
	},
	// see: https://github.com/Raruto/leaflet-kmz/issues/22
	_shouldReproject() {
		if (!this._map) return false;
		const crs = this._map.options.crs;
		return (crs === L.CRS.EPSG3857 || crs.code === 'EPSG:3857' || crs.code === 'EPSG:900913') &&
			typeof this._url === 'string' && this._url.startsWith('data:image/');
	},
	// see: https://github.com/Raruto/leaflet-kmz/issues/22
	setUrl(url) {
		this._warped = false;
		return L.ImageOverlay.prototype.setUrl.call(this, url);
	},
	// see: https://github.com/Raruto/leaflet-kmz/issues/22
	setBounds(bounds) {
		L.ImageOverlay.prototype.setBounds.call(this, bounds);
		if (this._warped) {
			this._warped = false;
			this._image.src = this._url;
		}
		return this;
	},
	// see: https://github.com/Raruto/leaflet-kmz/issues/22
	_reprojectImage() {
		const image = this._image;
		const bounds = this._bounds;
		const projection = this._map.options.crs.projection;
		const north = bounds.getNorth();
		const south = bounds.getSouth();
		const northY = projection.project(new L.LatLng(north, 0)).y;
		const southY = projection.project(new L.LatLng(south, 0)).y;
		const width = image.naturalWidth;
		const height = image.naturalHeight;
		if (!width || !height) {
			this.fire('error', { error: new Error('Invalid GroundOverlay dimensions') });
			return;
		}

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		if (!context) {
			this.fire('error', { error: new Error('GroundOverlay reprojection requires a 2D canvas') });
			return;
		}
		for (let row = 0; row < height; row++) {
			const y = northY - (row + 0.5) * (northY - southY) / height;
			const latitude = projection.unproject(new L.Point(0, y)).lat;
			const sourceY = Math.max(0, Math.min(image.naturalHeight - 1,
				(north - latitude) * image.naturalHeight / (north - south)));
			context.drawImage(image, 0, sourceY, width, 1, 0, row, width, 1);
		}
		canvas.toBlob((blob) => {
			if (!blob) {
				this.fire('error', { error: new Error('GroundOverlay reprojection failed') });
				return;
			}
			const url = URL.createObjectURL(blob);
			image.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
			image.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
			image.src = url;
		});
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
