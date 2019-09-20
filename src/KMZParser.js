L.KMZParser = L.Class.extend({

  initialize: function(opts) {
    L.setOptions(this, opts);
    this.loaders = [];
  },

  load: function(kmzUrl, opts) {
    this._loadAsyncJS(this._requiredJSModules()); // async download all required JS modules.
    this._waitAsyncJS(this._loadKMZ.bind(this, kmzUrl, opts)); // wait until all JS modules are downloaded.
  },

  get: function(i) {
    return i < this.loaders.length ? this.loaders[i] : false;
  },

  _loadKMZ: function(kmzUrl, opts) {
    var kmzLoader = new L.KMZLoader(L.extend({}, this.options, opts));
    kmzLoader.parse(kmzUrl);
    this.loaders.push(kmzLoader);
  },

  _loadAsyncJS: function(urls) {
    if (!L.KMZParser._jsPromise && urls.length) {
      var promises = urls.map(url => this._loadJS(url));
      L.KMZParser._jsPromisePending = true;
      L.KMZParser._jsPromise = Promise.all(promises).then(function() {
        L.KMZParser._jsPromisePending = false;
      }.bind(this));
    }
  },

  _loadJS: function(url) {
    return new Promise(function(resolve, reject) {
      var tag = document.createElement("script");
      tag.type = "text/javascript";
      tag.src = url;
      tag.onload = resolve.bind(url);
      tag.onerror = reject.bind(url);
      document.head.appendChild(tag);
    });
  },

  _requiredJSModules: function() {
    var urls = [];
    var host = 'https://unpkg.com/';

    if (typeof JSZip !== 'function' && typeof window.JSZip !== 'function') {
      urls.push(host + 'jszip@3.1.5/dist/jszip.min.js');
    }
    if (typeof toGeoJSON !== 'object' && typeof window.toGeoJSON !== 'object') {
      urls.push(host + '@tmcw/togeojson@3.0.1/dist/togeojsons.min.js');
    }
    if (typeof geojsonvt !== 'function' && typeof window.geojsonvt !== 'function') {
      urls.push(host + 'geojson-vt@3.0.0/geojson-vt.js');
    }

    return urls;
  },

  _waitAsyncJS: function(callback) {
    if (L.KMZParser._jsPromise && L.KMZParser._jsPromisePending) {
      L.KMZParser._jsPromise.then(callback);
    } else {
      callback.call();
    }
  },

});

export var KMZParser = L.KMZParser;
