# leaflet-kmz
A KMZ file loader for Leaflet Maps

_For a working example see one of the following demos:_

- [multiple kmz files](https://raruto.github.io/examples/leaflet-kmz/leaflet-kmz.html)
- [mouse interactions](https://raruto.github.io/examples/leaflet-kmz/leaflet-kmz_mouse-interactions.html)

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
      var map = L.map('map');
      map.setView(new L.LatLng(43.5978, 12.7059), 5);

      var OpenTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 17,
        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        opacity: 0.90
      });
      OpenTopoMap.addTo(map);

      // Instantiate KMZ parser (async)
      var kmzParser = new L.KMZParser({
        onKMZLoaded: function(layer, name) {
          control.addOverlay(layer, name);
          layer.addTo(map);
        }
      });
      // Add remote KMZ files as layers (NB if they are 3rd-party servers, they MUST have CORS enabled)
      kmzParser.load('https://raruto.github.io/examples/leaflet-kmz/regions.kmz');
      kmzParser.load('https://raruto.github.io/examples/leaflet-kmz/capitals.kmz');
      kmzParser.load('https://raruto.github.io/examples/leaflet-kmz/globe.kmz');

      var control = L.control.layers(null, null, { collapsed:false }).addTo(map);
    </script>
    ```

**Notes:**
- supported file formats: **.kmz**, **.kml**
- to be able to use Google files (eg. through Google My Maps) you **MUST** use a valid third-party kml proxy server

---

**Compatibile with:** leaflet@1.3.4, jszip@3.1.5, @tmcw/togeojson@3.0.1, geojson-vt@3.0.0, leaflet-pointable@0.0.3

---

**Contributors:** [A-Lurker](https://github.com/a-lurker/leaflet-kmz), [BrandonXiang](https://github.com/brandonxiang/leaflet-geojson-vt), [Raruto](https://github.com/Raruto/leaflet-kmz)
