/*jshint esversion: 6 */

L.KMZLoader = L.Class.extend({
  options: {
    tiled: true,
    interactive: true,
    bindPopup: true,
    bindTooltip: true,
    debug: 0,
  },

  initialize: function(opts) {
    L.setOptions(this, opts);
    this.name = this.options.name;
    this.tiled = 'geojsonvt' in window && this.options.tiled;
    this.interactive = this.options.interactive;
    this.emptyIcon = 'data:image/png;base64,' + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII=";
    this.callback = opts.onKMZLoaded;
  },

  parse: function(kmzUrl) {
    this.name = this.name ? this.name : kmzUrl.split('/').pop();
    this._load(kmzUrl);
  },

  _load: function(url) {
    this._getBinaryContent(url, function(err, data) {
      if (err != null) console.error(url, err, data);
      else this._parse(data);
    }.bind(this));
  },

  _parse: function(data) {
    return this._isZipped(data) ? this._parseKMZ(data) : this._parseKML(data);
  },

  _parseKMZ: function(data) {
    var that = this;
    JSZip.loadAsync(data).then((zip) => {
      Promise.all(that._mapZipFiles(zip)).then((list) => {
        Promise.all(that._mapListFiles(list)).then((data) => {
          var kmlString = this._decodeKMZFolder(data);
          that._parseKML(kmlString);
        });
      });
    });
  },

  _parseKML: function(data) {
    var kmlString = this._decodeKMLString(data);
    var xmlDoc = this._toXML(kmlString);
    this._kmlToLayer(xmlDoc);
  },

  _decodeKMLString: function(data) {
    return data instanceof ArrayBuffer ? String.fromCharCode.apply(null, new Uint8Array(data)) : data;
  },

  _decodeKMZFolder: function(data) {
    var kmzFiles = this._listToObject(data);
    var kmlDoc = this._getKmlDoc(kmzFiles);
    var images = this._getImageFiles(Object.keys(kmzFiles));

    kmlString = kmzFiles[kmlDoc];

    // replaces all images with their base64 encoding
    for (var i in images) {
      var imageUrl = images[i];
      var dataUrl = kmzFiles[imageUrl];
      kmlString = this._replaceAll(kmlString, imageUrl, dataUrl);
    }
    return kmlString;
  },

  _toXML: function(text) {
    return (new DOMParser()).parseFromString(text, 'text/xml');
  },

  _toGeoJSON: function(xmlDoc) {
    return toGeoJSON.kml(xmlDoc);
  },

  _kmlToLayer: function(xmlDoc) {
    var data = this._toGeoJSON(xmlDoc);

    if (this.interactive) {
      this.geojson = L.geoJson(data, {
        pointToLayer: this._pointToLayer.bind(this),
        onEachFeature: this._onEachFeature.bind(this),
      });
      this.layer = this.geojson;
    }

    if (this.tiled) {
      this.gridlayer = L.gridLayer.geoJson(data);
      this.layer = this.interactive ? L.featureGroup([this.gridlayer, this.geojson]) : this.gridlayer;
    }

    if (this.layer) {
      this._onKMZLoaded(this.layer, this.name);
    }
  },

  _pointToLayer: function(feature, latlng) {
    return new L.marker(latlng, {
      icon: L.icon({
        iconUrl: this.emptyIcon,
      }),
    });
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
    if (this.callback) this.callback(layer, name);
  },

  _setLayerPointIcon: function(feature, layer) {
    var width = 28;
    var height = 28;
    layer.setIcon(L.icon({
      iconSize: [width, height],
      iconAnchor: [width / 2, height / 2],
      iconUrl: this.tiled ? this.emptyIcon : feature.properties.icon,
    }));
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

  _escapeRegExp: function(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
  },

  _replaceAll: function(str, find, replace) {
    return str.replace(new RegExp(this._escapeRegExp(find), 'g'), replace);
  },

  _mapZipFiles: function(zip) {
    return Object.keys(zip.files)
      .map((name) => zip.files[name])
      .map((entry) => entry
        .async("blob")
        .then((value) => [entry.name, value]) // [ fileName, stringValue ]
      );
  },

  _mapListFiles: function(list) {
    return list.map(file => Promise.resolve().then(() => {
      return this._readFile(file);
    }));
  },

  _listToObject: function(list) {
    return list
      .reduce(function(newObj, listElem) {
        newObj[listElem[0]] = listElem[1]; // { fileName: stringValue }
        return newObj;
      }, {} /* NB: do not remove, initial value */ );
  },

  _getFileExt: function(filename) {
    return filename.split('.').pop().toLowerCase().replace('jpg', 'jpeg');
  },

  _getMimeType: function(filename, ext) {
    var mime = 'text/plain';
    if (/\.(jpe?g|png|gif|bmp)$/i.test(filename)) {
      mime = 'image/' + ext;
    } else if (/\.kml$/i.test(filename)) {
      mime = 'text/plain';
    }
    return mime;
  },

  _getKmlDoc: function(files) {
    return files["doc.kml"] ? "doc.kml" : this._getKmlFiles(Object.keys(files))[0];
  },

  _getKmlFiles: function(files) {
    return files.filter((file) => /.*\.kml/.test(file));
  },

  _getImageFiles: function(files) {
    return files.filter((file) => /\.(jpe?g|png|gif|bmp)$/i.test(file));
  },

  /**
   * It checks if a given file begins with PK, if so it's zipped
   *
   * @link https://en.wikipedia.org/wiki/List_of_file_signatures
   */
  _isZipped: function(file) {
    var P = new Uint8Array(file, 0, 1); // offset, length
    var K = new Uint8Array(file, 1, 1);
    var PK = String.fromCharCode(P, K);
    return 'PK' === PK;
  },

  _readFile: function(file) {
    var filename = file[0];
    var fileblob = file[1];
    var ext = this._getFileExt(filename);
    var mime = this._getMimeType(filename, ext);
    return this._fileReader(fileblob, mime, filename);
  },

  _fileReader: function(blob, mime, name) {
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
  },

  _getBinaryContent: function(path, callback) {
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
  },

  _blobToString: function(b) {
    var u, x;
    u = URL.createObjectURL(b);
    x = new XMLHttpRequest();
    x.open('GET', u, false); // although sync, you're not fetching over internet
    x.send();
    URL.revokeObjectURL(u);
    return x.responseText;
  },

  _blobToBase64: function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  },

});

L.KMZParser = L.Class.extend({

  initialize: function(opts) {
    L.setOptions(this, opts);
    this.loaders = [];
  },

  load: function(kmzUrl, opts) {
    var kmzLoader = new L.KMZLoader(L.extend({}, this.options, opts));
    kmzLoader.parse(kmzUrl);
    this.loaders.push(kmzLoader);
  },

  get: function(i) {
    return i < this.loaders.length ? this.loaders[i] : false;
  },
});
