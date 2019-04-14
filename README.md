# leaflet-kmz
A KMZ file loader for Leaflet Maps

_For a working example see [demo](https://raruto.github.io/examples/leaflet-kmz/leaflet-kmz.html)_

---

## How to use

1. **include CSS & JavaScript**
    ```html
    <head>
    ...
    <style> html, body, #map { height: 100%; width: 100%; padding: 0; margin: 0; } </style>
    <!-- Leaflet (JS/CSS) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.3.4/dist/leaflet.css">
    <script src="https://unpkg.com/leaflet@1.3.4/dist/leaflet.js"></script>
    <!-- JSZIP -->
    <script src="https://unpkg.com/jszip@3.1.5/dist/jszip.min.js"></script>
    <!-- togeojson -->
    <script src="https://unpkg.com/togeojson@0.16.0/togeojson.js"></script>
    <!-- geojson-vt -->
    <script src="https://unpkg.com/geojson-vt@3.0.0/geojson-vt.js"></script>
    <!-- Leaflet-KMZ -->
    <script src="https://raruto.github.io/cdn/leaflet-kmz/0.0.1/libs/KMZParser.js"></script>
    <script src="https://raruto.github.io/cdn/leaflet-kmz/0.0.1/libs/GridLayer.GeoJSON.js"></script>
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
3. **create your first simple “leaflet-kmz slippy map**
    ```html
    <script>
      var map = L.map('map');
      map.setView(new L.LatLng(43.5978, 12.7059), 5);

      var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        opacity: 0.90
      });
      OpenTopoMap.addTo(map);

      var kmzParser = new L.KMZParser({
        onKMZLoaded: function(layer, name) {
          control.addOverlay(layer, name);
          layer.addTo(map);
        }
      });

      kmzParser.load('https://raruto.github.io/examples/leaflet-kmz/regioni.kmz');
      kmzParser.load('https://raruto.github.io/examples/leaflet-kmz/capitali.kmz');
      kmzParser.load('https://raruto.github.io/examples/leaflet-kmz/globe.kmz');

      var control = L.control.layers(null, null).addTo(map);
    </script>
    ```

_**NB** to be able to use Google files (eg. Google My Maps) you **MUST** use a valid third-party kml proxy server._

---

**Compatibile with:** leaflet@1.3.4, jszip@3.1.5, togeojson@0.16.0, geojson-vt@3.0.0

---

**Contributors:** [Raruto](https://github.com/Raruto)
