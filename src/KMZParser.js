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

export var KMZParser = L.KMZParser;
