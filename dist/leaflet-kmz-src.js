(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  factory(global['leaflet-kmz'] = {});
}(typeof globalThis !== 'undefined' ? globalThis : this, function (exports) {
  const module = { exports: {} };
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  KMZLayer: () => KMZLayer,
  KMZMarker: () => KMZMarker
});
module.exports = __toCommonJS(index_exports);

// src/utils.js
function loadFile(url) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    xhr.responseType = "arraybuffer";
    xhr.onload = () => {
      if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
        resolve(xhr.response || xhr.responseText);
      } else {
        resolve("");
      }
    };
    xhr.onerror = () => reject("Error " + xhr.status + " while fetching remote file: " + url);
    xhr.send();
  });
}
function getKmlDoc(files) {
  return files["doc.kml"] ? "doc.kml" : getKmlFiles(Object.keys(files))[0];
}
function getKmlFiles(files) {
  return files.filter((file) => isKmlFile(file));
}
function getImageFiles(files) {
  return files.filter((file) => isImageFile(file));
}
function getFileExt(filename) {
  return filename.split(".").pop().toLowerCase().replace("jpg", "jpeg");
}
function getFileName(url) {
  return url.split("/").pop();
}
function getMimeType(filename, ext) {
  let mime = "text/plain";
  if (/\.(jpe?g|png|gif|bmp)$/i.test(filename)) {
    mime = "image/" + ext;
  } else if (/\.kml$/i.test(filename)) {
    mime = "text/plain";
  }
  return mime;
}
function isImageFile(filename) {
  return /\.(jpe?g|png|gif|bmp)$/i.test(filename);
}
function isKmlFile(filename) {
  return /.*\.kml/.test(filename);
}
function isZipped(file) {
  return "PK" === String.fromCharCode(new Uint8Array(file, 0, 1), new Uint8Array(file, 1, 1));
}
function lazyLoader(urls, promise) {
  return promise instanceof Promise ? promise : Promise.all(urls.map((url) => loadJS(url)));
}
function loadJS(url) {
  return new Promise((resolve, reject) => {
    let tag = document.createElement("script");
    tag.addEventListener("load", resolve.bind(url), { once: true });
    tag.src = url;
    document.head.appendChild(tag);
  });
}
function parseLatLonBox(xml) {
  let box = new L.LatLngBounds([
    xml.getElementsByTagName("south")[0].childNodes[0].nodeValue,
    xml.getElementsByTagName("west")[0].childNodes[0].nodeValue
  ], [
    xml.getElementsByTagName("north")[0].childNodes[0].nodeValue,
    xml.getElementsByTagName("east")[0].childNodes[0].nodeValue
  ]);
  let rotation = xml.getElementsByTagName("rotation")[0];
  if (rotation !== void 0) {
    rotation = parseFloat(rotation.childNodes[0].nodeValue);
  }
  return [box, rotation];
}
function parseGroundOverlay(xml, props) {
  let [bounds, rotation] = parseLatLonBox(xml.getElementsByTagName("LatLonBox")[0]);
  let href = xml.getElementsByTagName("href")[0];
  let color = xml.getElementsByTagName("color")[0];
  let icon = xml.getElementsByTagName("Icon")[0];
  let options = {};
  if (!href && icon) {
    href = icon.getElementsByTagName("href")[0];
  }
  href = href.childNodes[0].nodeValue;
  href = props.icons[href] || href;
  if (color) {
    color = color.childNodes[0].nodeValue;
    options.opacity = parseInt(color.substring(0, 2), 16) / 255;
    options.color = "#" + color.substring(6, 8) + color.substring(4, 6) + color.substring(2, 4);
  }
  if (rotation) {
    options.rotation = rotation;
  }
  return new L.KMZImageOverlay(href, bounds, { opacity: options.opacity, angle: options.rotation });
}
function toGeoJSON(data, props) {
  const xml = data instanceof XMLDocument ? data : toXML(data);
  const json = window.toGeoJSON.kml(xml);
  json.properties = Object.assign({}, json.properties, props || {});
  return json;
}
function toXML(data) {
  let text = data;
  if (data instanceof ArrayBuffer) {
    text = new Uint8Array(data).reduce(function(data2, byte) {
      return data2 + String.fromCharCode(byte);
    }, "");
    const encoding = text.substring(0, text.indexOf("?>")).match(/encoding\s*=\s*["'](.*)["']/i);
    if (encoding) {
      text = new TextDecoder(encoding[1]).decode(data);
    }
  }
  return text ? new DOMParser().parseFromString(text, "text/xml") : document.implementation.createDocument(null, "kml");
  ;
}
function unzip(folder) {
  return new Promise((resolve, reject) => {
    window.JSZip.loadAsync(folder).then((zip) => {
      const files = Object.keys(zip.files).map((name) => {
        const entry = zip.files[name];
        if (isImageFile(name)) {
          const ext = getFileExt(name);
          const mime = getMimeType(name, ext);
          return entry.async("base64").then((value) => [name, "data:" + mime + ";base64," + value]);
        }
        return entry.async("text").then((value) => [name, value]);
      });
      Promise.all(files).then(
        (list) => resolve(list.reduce((obj, item) => {
          obj[item[0]] = item[1];
          return obj;
        }, {}))
      );
    });
  });
}

// src/KMZLayer.js
var kmzLayerMethods = {
  options: {
    interactive: true,
    ballon: true,
    bindPopup: true,
    bindTooltip: true,
    preferCanvas: false
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
    L.KMZLayer._jsPromise = lazyLoader(this._requiredJSModules(), L.KMZLayer._jsPromise).then(() => loadFile(kmzUrl)).then((data) => this.parse(data, { name: getFileName(kmzUrl), icons: {} }));
  },
  parse(data, props) {
    return isZipped(data) ? this._parseKMZ(data, props) : this._parseKML(data, props);
  },
  _parseKMZ(data, props) {
    unzip(data).then((kmzFiles) => {
      const kmlDoc = getKmlDoc(kmzFiles);
      const images = getImageFiles(Object.keys(kmzFiles));
      const kmlString = kmzFiles[kmlDoc];
      props.icons = images.reduce((obj, item) => {
        obj[item] = kmzFiles[item];
        return obj;
      }, {});
      this._parseKML(kmlString, props);
    });
  },
  _parseKML(data, props) {
    const xml = toXML(data, props);
    const geojson = toGeoJSON(xml, props);
    const layer = (this.options.geometryToLayer || this._geometryToLayer).call(this, geojson, xml);
    this.addLayer(layer);
    this.fire("load", { layer, name: geojson.properties.name });
  },
  _geometryToLayer(data, xml) {
    const preferCanvas = this._map ? this._map.options.preferCanvas : this.options.preferCanvas;
    const emptyIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
    const layer = new L.GeoJSON(data, {
      pointToLayer: (feature, latlng) => {
        if (preferCanvas) {
          return L.kmzMarker(latlng, {
            iconUrl: data.properties.icons[feature.properties.icon] || feature.properties.icon || emptyIcon,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            interactive: this.options.interactive
          });
        }
        return new L.Marker(latlng, {
          icon: new L.Icon({
            iconUrl: data.properties.icons[feature.properties.icon] || feature.properties.icon || emptyIcon,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          }),
          interactive: this.options.interactive
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
      onEachFeature: (feature, layer2) => {
        if (!this.options.ballon) return;
        const prop = feature.properties;
        const name = prop.name || "";
        const desc = prop.description || "";
        if (name || desc) {
          if (this.options.bindPopup) {
            layer2.bindPopup("<div><b>" + name + "</b><br>" + desc + "</div>");
          }
          if (this.options.bindTooltip) {
            layer2.bindTooltip("<b>" + name + "</b>", {
              direction: "auto",
              sticky: true
            });
          }
        }
      },
      interactive: this.options.interactive
    });
    const el = xml.getElementsByTagName("GroundOverlay");
    for (let l, k = 0; k < el.length; k++) {
      l = parseGroundOverlay(el[k], data.properties);
      if (l) {
        layer.addLayer(l);
      }
    }
    return layer;
  },
  _requiredJSModules() {
    const urls = [];
    const host = "https://unpkg.com/";
    if (typeof window.JSZip !== "function") {
      urls.push(host + "jszip@3.10.1/dist/jszip.min.js");
    }
    if (typeof window.toGeoJSON !== "object") {
      urls.push(host + "@tmcw/togeojson@4.1.0/dist/togeojson.umd.js");
    }
    return urls;
  }
};
var KMZLayer;
if (L.version.startsWith("1.")) {
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
L.kmzLayer = function(url, options) {
  return new L.KMZLayer(url, options);
};

// src/KMZMarker.js
var kmzMarkerMethods = {
  // initialize(latlng, options) {
  // 	L.CircleMarker.prototype.initialize.call(this, latlng, options);
  // },
  _updatePath() {
    const renderer = this._renderer;
    let icon = this._icon;
    const layer = this;
    if (!renderer._drawing || layer._empty()) {
      return;
    }
    if (icon) {
      icon.drawImage();
    } else {
      icon = this._icon = new Image(this.options.iconSize[0], this.options.iconSize[1]);
      icon.anchor = [icon.width / 2, icon.height / 2];
      icon.onload = icon.drawImage = () => {
        const p = layer._point.subtract(icon.anchor);
        const ctx = renderer._ctx;
        ctx.drawImage(icon, p.x, p.y, icon.width, icon.height);
      };
      icon.src = this.options.iconUrl;
    }
  }
};
if (L.version.startsWith("1.")) {
  L.KMZMarker = L.CircleMarker.extend(kmzMarkerMethods);
} else {
  L.KMZMarker = class extends L.CircleMarker {
  };
  L.KMZMarker.include(kmzMarkerMethods);
}
L.kmzMarker = function(ll, opts) {
  return new L.KMZMarker(ll, opts);
};
var KMZMarker = L.KMZMarker;

// src/KMZImageOverlay.js
var kmzImageOverlayMethods = {
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
      this._image.style[L.DomUtil.TRANSFORM || "transform"] += " rotate(" + this.options.angle + "deg)";
    } else if (L.Browser.ie) {
      const rad = this.options.angle * (Math.PI / 180), costheta = Math.cos(rad), sintheta = Math.sin(rad);
      this._image.style.filter += " progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand', M11=" + costheta + ", M12=" + -sintheta + ", M21=" + sintheta + ", M22=" + costheta + ")";
    }
  },
  getBounds() {
    return this._bounds;
  }
};
if (L.version.startsWith("1.")) {
  L.KMZImageOverlay = L.ImageOverlay.extend(kmzImageOverlayMethods);
} else {
  L.KMZImageOverlay = class extends L.ImageOverlay {
  };
  L.KMZImageOverlay.include(kmzImageOverlayMethods);
}
Object.assign(exports, module.exports); }));
//# sourceMappingURL=leaflet-kmz-src.js.map
