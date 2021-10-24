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
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.6.0/dist/leaflet.css">
    <script src="https://unpkg.com/leaflet@1.6.0/dist/leaflet.js"></script>
    <!-- Leaflet-KMZ -->
    <script src="https://unpkg.com/leaflet-kmz@latest/dist/leaflet-kmz.js"></script>
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
      var map = L.map('map', {
        preferCanvas: true // recommended when loading large layers.
      });
      map.setView(new L.LatLng(43.5978, 12.7059), 5);

      var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        opacity: 0.90
      });
      OpenTopoMap.addTo(map);

      // Instantiate KMZ layer (async)
      var kmz = L.kmzLayer().addTo(map);

      kmz.on('load', function(e) {
        control.addOverlay(e.layer, e.name);
        // e.layer.addTo(map);
      });

      // Add remote KMZ files as layers (NB if they are 3rd-party servers, they MUST have CORS enabled)
      kmz.load('https://raruto.github.io/leaflet-kmz/examples/regions.kmz');
      kmz.load('https://raruto.github.io/leaflet-kmz/examples/capitals.kmz');
      kmz.load('https://raruto.github.io/leaflet-kmz/examples/globe.kmz');

      var control = L.control.layers(null, null, { collapsed:false }).addTo(map);
    </script>
    ```

**Notes:**
- supported file formats: **.kmz**, **.kml**
- to be able to use Google files (eg. through Google My Maps) you **MUST** use a valid third-party kml proxy server

---

**Compatibile with:** leaflet@1.6.0, jszip@3.2.0, @tmcw/togeojson@4.1.0

---

**Contributors:** [A-Lurker](https://github.com/a-lurker/leaflet-kmz), [BrandonXiang](https://github.com/brandonxiang/leaflet-geojson-vt), [Raruto](https://github.com/Raruto/leaflet-kmz)
