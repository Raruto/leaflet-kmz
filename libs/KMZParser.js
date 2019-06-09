/*jshint esversion: 6 */

L.KMZLoader = L.Class.extend({
  options: {
    bindPopup: true,
    bindTooltip: true,
  },

  initialize: function(opts) {
    L.setOptions(this, opts);
    this.name = opts.name;
    this.tiled = 'geojsonvt' in window;
    this.emptyIcon = 'data:image/png;base64,' + "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAFElEQVR4XgXAAQ0AAABAMP1L30IDCPwC/o5WcS4AAAAASUVORK5CYII=";
    this.callback = opts.onKMZLoaded;
  },

  parse: function(kmzUrl) {
    this.name = this.name ? this.name : kmzUrl.split('/').pop();
    this._loadKmz(kmzUrl);
  },

  _loadKmz: function(kmzUrl) {
    var that = this;
    this._getBinaryContent(kmzUrl, function(err, data) {
      if (err != null) {
        console.error(kmzUrl, err, data);
      } else {
        var P = new Uint8Array(data, 0, 1);   // offset, length
        var K = new Uint8Array(data, 1, 1);
        var PK = String.fromCharCode(P,K);
        var zipped = ('PK' === PK);
        if (zipped) that._parseKMZ(data);
          else {
          var shortList = [[
            'doc.kml',
            String.fromCharCode.apply(null, new Uint8Array(data))
          ]];
          that._parseKML(shortList);
        }
      }
    });
  },

  _parseKMZ: function(data) {
    var that = this;
    JSZip.loadAsync(data).then(function(zip) {
      Promise.all(that._mapZipFiles(zip)).then((list) => {
        Promise.all(that._mapListFiles(list)).then((data) => {
          that._parseKML(data);
        });
      });
    });
  },

  _parseKML: function(data) {
    var files = this._listToObject(data);
    var kmlDoc = this._getKmlDoc(files);
    var images = this._getImageFiles(Object.keys(files));

    kml = files[kmlDoc];

    // replaces all images with their base64 encoding
    for (var i in images) {
      var imageUrl = images[i];
      var dataUrl = files[imageUrl];
      kml = this._replaceAll(kml, imageUrl, dataUrl);
    }

    this._toGeoJSON(kml);
  },

  _toGeoJSON: function(text) {
    var xmlDoc = (new DOMParser()).parseFromString(text, 'text/xml');
    var data = toGeoJSON.kml(xmlDoc);

    // set up the default layer: the additional fast draw layer is only used if geojsonvt is loaded
    this.geojson = L.geoJson(data, {
      filter: this._filter(),   // closure in use
      pointToLayer: this._pointToLayer,
      onEachFeature: this._onEachFeature(),   // closure in use
    });

    this.layer = this.geojson;
    if (this.tiled) {
      // geojsonvt is loaded, so set up the fast draw layer
      this.gridlayer = L.gridLayer.geoJson(data);
      this.layer = L.featureGroup([this.gridlayer, this.geojson]);
    }

    if (this.callback) {
      this.callback(this.layer, this.name);
    }
  },

  _popupTooltip: function(feature, layer) {
    var that = this;
    var name = feature.properties.name ? feature.properties.name : '';
    var desc = feature.properties.description ? feature.properties.description : '';
    if (name || desc) {
      if (that.options.bindPopup) {
        layer.bindPopup('<div>' + '<b>' + name + '</b>' + '<br/>' + desc + '</div>', {maxWidth: 'auto'});
      }
      if (that.options.bindTooltip) {
        layer.bindTooltip('<b>' + name + '</b>', {
          direction: 'auto',
          sticky: true,
        });
      }
    }
  },

  _filter: function() {
    var that = this;
    // closure for tiled
    return function(feature) {
      if (!that.tiled) return true;
      // everything besides points are drawn by L.GridLayer.GeoJSON
      if (feature.geometry.type === 'Point') return true;
      return false;
    };
  },

  _pointToLayer: function(feature, latlng) {
    return new L.marker(latlng, {
      icon: L.icon({
        iconUrl: this.emptyIcon,
      }),
    });
  },

  _onEachFeature: function() {
    var that = this;
    // closure for tiled
    return function(feature, layer) {
    var type = feature.geometry.type ? feature.geometry.type : "";

    if (that.tiled) {  // using fast draw
      if (type === 'Point') {
        var width = 28;
        var height = 28;
        layer.setIcon(L.icon({
          iconSize: [width, height],
          iconAnchor: [width / 2, height / 2],

          // if the icons are being drawn on the fast draw layer (ie tiled = true) then
          // place empty icons on the default layer to capture mouse events
          iconUrl: that.emptyIcon,
        }));

        that._popupTooltip(feature, layer);

        } else if (type === 'LineString' || type === 'Polygon' || type === 'GeometryCollection') {
          // do nothing here: the lines are drawn by L.GridLayer.GeoJSON
          // popups or tooltips are not allowed here, as we may want to handle thousands of lines here
        }
        else {
          console.warn('Unsupported feature type: ' + type);
          console.warn(feature);
        }
    }
    else // not using fast draw
    {
      if (type === 'Point') {
        var width = 28;
        var height = 28;
        layer.setIcon(L.icon({
          iconSize: [width, height],
          iconAnchor: [width / 2, height / 2],
          iconUrl: (feature.properties.icon ? feature.properties.icon : that.emptyIcon),
        }));
        } else if (type === 'LineString' || type === 'Polygon' || type === 'GeometryCollection') {
          var styles = {
            weight: 1,
            opacity: 0,
            fillOpacity: 0,
          };

          if (feature.properties["stroke-width"])   styles.weight      = feature.properties["stroke-width"] * 1.05;
          if (feature.properties["stroke-opacity"]) styles.opacity     = feature.properties["stroke-opacity"];
          if (feature.properties["fill-opacity"])   styles.fillOpacity = feature.properties["fill-opacity"];
          if (feature.properties.stroke)            styles.color       = feature.properties.stroke;
          if (feature.properties.fill)              styles.fillColor   = feature.properties.fill;

          layer.setStyle(styles);
        } else {
          console.warn('Unsupported feature type: ' + type);
          console.warn(feature);
        }
        // all feature types can have a popup or tooltip
        that._popupTooltip(feature, layer);
      }
    };
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
    this.loaders = [];
    this.opts = opts;
  },

  load: function(kmzUrl) {
    var kmzLoader = new L.KMZLoader(this.opts);
    kmzLoader.parse(kmzUrl);
    this.loaders.push(kmzLoader);
  },

  get: function(i) {
    return i < this.loaders.length ? this.loaders[i] : false;
  },
});
