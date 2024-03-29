import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import Graticule from 'ol/layer/Graticule.js';
import { defaults } from 'ol/control/defaults.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { transform } from 'ol/proj.js';
import { register } from 'ol/proj/proj4.js';
import Circle from 'ol/geom/Circle.js';
import Feature from 'ol/Feature.js';
import proj4 from "proj4";

// src: https://epsg.io/2180
proj4.defs("EPSG:2180", "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);

const x = 244032.52, y = 564990.59, radius = 1e2;
const circle = new Feature(new Circle(
    transform([y, x], 'EPSG:2180', 'EPSG:3857'),
    radius
));

const source = new VectorSource();

window.show = () => source.addFeature(circle);

const map = new Map({
    target: 'map',
    // controls: defaults({ attribution: false }),
    layers: [
        new TileLayer({
            source: new OSM(),
        }),
        new Graticule({
            showLabels: true,
        }),
        new VectorLayer({
            source,
            style: {
                'stroke-color': 'blue',
                'stroke-width': 2,
                'fill-color': 'none',
            },
        }),
    ],
    view: new View({
        center: transform([19.9109, 50.0588], 'EPSG:4326', 'EPSG:3857'),
        zoom: 16,
    }),
});