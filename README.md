# leaflet-kmz

[![NPM version](https://img.shields.io/npm/v/leaflet-kmz.svg?color=red)](https://www.npmjs.com/package/leaflet-kmz)
[![License](https://img.shields.io/badge/license-GPL%203-blue.svg?style=flat)](LICENSE)

A KMZ file loader for Leaflet Maps

_For a working example see one of the following demos:_

- [kmz layers](https://raruto.github.io/leaflet-kmz/examples/leaflet-kmz.html)
- [vector grid](https://raruto.github.io/leaflet-kmz/examples/leaflet-kmz_gridlayer.html)


---

## How to use

1. **include CSS & JavaScript**
    ```html
    <head>
    ...
    <style> html, body, #map { height: 100%; width: 100%; padding: 0; margin: 0; } </style>
    <!-- Leaflet (JS/CSS) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <!-- Leaflet-KMZ -->
    <script src="https://unpkg.com/leaflet-kmz@1.1.1/dist/leaflet-kmz.js"></script>
    ...
    </head>
    ```
2. **choose a div container used for the slippy map**
    ```html
    <body>
    ...
	  <div id="map"></div>
    ...
    </body>
    ```
3. **create your first simple “leaflet-kmz” slippy map**
    ```html
    <script>
    {
      const map = new (L.LeafletMap || L.Map)('map', {
        preferCanvas: true // recommended when loading large layers.
      });
      map.setView(new L.LatLng(43.5978, 12.7059), 5);

      const OpenTopoMap = new L.TileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        opacity: 0.90
      });
      OpenTopoMap.addTo(map);

      // Instantiate KMZ layer (async)
      const kmz = L.kmzLayer().addTo(map);

      kmz.on('load', function(e) {
        control.addOverlay(e.layer, e.name);
        // e.layer.addTo(map);
      });

      // Add remote KMZ files as layers (NB if they are 3rd-party servers, they MUST have CORS enabled)
      kmz.load('https://raruto.github.io/leaflet-kmz/examples/regions.kmz');
      kmz.load('https://raruto.github.io/leaflet-kmz/examples/capitals.kmz');
      kmz.load('https://raruto.github.io/leaflet-kmz/examples/globe.kmz');

      const control = new (L.LayersControl || L.Control.Layers)(null, null, { collapsed:false }).addTo(map);
    }
    </script>
    ```

**Notes:**
- supported file formats: **.kmz**, **.kml**
- KMZ extraction uses native `DecompressionStream('deflate-raw')` (current Chrome, Edge, Firefox and Safari); no ZIP library or download is required. Plain KML does not require this API.
- Supported archives: single-volume ZIP32 with stored or DEFLATE entries and UTF-8 filenames, including data descriptors. ZIP64, encrypted and multi-volume archives are rejected.
- `load(url)` and `parse(kmzArrayBuffer, props)` return promises that reject on archive or decompression errors. Handle these rejections with `await`/`catch`.
- to be able to use Google files (eg. through Google My Maps) you **MUST** use a valid third-party kml proxy server

---

**Compatible with:**
[![Leaflet 1.9.4](https://img.shields.io/badge/Leaflet-1.9.4-1EB300.svg?style=flat)](https://leafletjs.com/reference.html)
[![Leaflet 2.0.0-beta.3](https://img.shields.io/badge/Leaflet-2.0.0--beta.3-1EB300.svg?style=flat)](https://leafletjs.com/reference.html)
[![@tmcw/togeojson v7](https://img.shields.io/badge/@tmcw/togeojson-7.1.3-1EB300.svg?style=flat)](https://www.npmjs.com/package/@tmcw/togeojson)

---

**Contributors:** [A-Lurker](https://github.com/a-lurker/leaflet-kmz), [BrandonXiang](https://github.com/brandonxiang/leaflet-geojson-vt), [Raruto](https://github.com/Raruto/leaflet-kmz)