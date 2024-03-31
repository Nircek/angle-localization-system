import Map from 'ol/Map.js';
import OSM from 'ol/source/OSM.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import Graticule from 'ol/layer/Graticule.js';
import { ScaleLine, defaults as defaultControls } from 'ol/control.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import { transform } from 'ol/proj.js';
import { Fill, RegularShape, Stroke, Style } from 'ol/style.js';
import { register } from 'ol/proj/proj4.js';
import { Point, Polygon } from 'ol/geom.js'
import Feature from 'ol/Feature.js';
import proj4 from "proj4";
import { nelderMead } from "fmin";

// src: https://epsg.io/2180
proj4.defs("EPSG:2180", "+proj=tmerc +lat_0=0 +lon_0=19 +k=0.9993 +x_0=500000 +y_0=-5300000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs");
register(proj4);

const source = new VectorSource();
const center = [19.9109, 50.0588];

window.view = new View({
    center: transform(center, 'EPSG:4326', 'EPSG:3857'),
    zoom: 16,
});

window.map = new Map({
    target: 'map',
    controls: defaultControls({
        attribution: false
    }).extend([new ScaleLine({
        bar: true,
        minWidth: 150
    })]),
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
    view,
});


const d = 0.5;

const objects = [
    ["mariacki_prawa", 244236.99, 567188.28, 83.503],
    ["komin", 243457.31, 572056.42, 95.060],
    ["wawel_prawa", 243470.94, 566920.69, 106.998],
    ["nadajnik", 242952.50, 564535.90, 212.385],
    ["kopiec", 243454.98, 563933.24, 247.630]
].map(([a, b, c, az]) => ([a, b, c, (Math.round(az / d) + Math.random() - 0.5) * d]));

function generateCircles(objects) {
    const circles = [];
    for (const [i, [_n1, x1, y1, dir1]] of objects.entries()) {
        for (let j = i + 1; j < objects.length; ++j) {
            const [_n2, x2, y2, dir2] = objects[j];
            // assert: object 1 is "on left" of object 2
            const angle = dir2 - dir1;
            const r = Math.sqrt(((x1 - x2) ** 2 + (y1 - y2) ** 2) / (2 - 2 * Math.cos(angle * 2 / 180 * Math.PI)));
            const xa = (x2 - x1) / 2;
            const ya = (y2 - y1) / 2;
            const x0 = x1 + xa;
            const y0 = y1 + ya;
            const a = Math.sqrt(xa ** 2 + ya ** 2);
            const b = Math.sqrt(r ** 2 - a ** 2);
            const s = angle > 90 ? 1 : -1;
            const x3 = x0 + s * b * ya / a;
            const y3 = y0 - s * b * xa / a;
            circles.push([x3, y3, r]);
        }
    }
    return circles;
}

function createCircle(x, y, r) {
    const arr = [...Array(Math.floor(2 * Math.PI * r)).keys(), 0]
        .map(i => i / r)
        .map(a => [y + r * Math.sin(a), x + r * Math.cos(a)]);
    return new Polygon([arr]).transform("EPSG:2180", "EPSG:3857");
}

function showCircles(circles) {
    for (let [x, y, r] of circles) {
        source.addFeature(new Feature(createCircle(x, y, r)));
    }
}

const circles = generateCircles(objects);
showCircles(circles)

const bestFit = nelderMead(
    ([y, x]) => circles
        .map(
            ([x1, y1, r]) => (Math.sqrt((x - x1) ** 2 + (y - y1) ** 2) - r) ** 2
        )
        .reduce((a, b) => a + b, 0),
    transform(center, 'EPSG:4326', 'EPSG:2180')
);

const [y, x, a] = [...bestFit.x, Math.sqrt(bestFit.fx)].map(e => e.toFixed(2));
document.getElementById("info").innerText = `(${x}, ${y}) ± ${a} m`;

const p = new Point(transform(bestFit.x, 'EPSG:2180', 'EPSG:3857'));
const point_feature = new Feature(p);
point_feature.setStyle(new Style({
    image: new RegularShape({
        fill: new Fill({ color: '#ff0000aa' }),
        stroke: new Stroke({ color: 'black', width: 2 }),
        points: 4,
        radius: 10,
        angle: Math.PI / 4,
    })
}));

const circle_feature = new Feature(createCircle(+x, +y, +a));
circle_feature.setStyle(new Style({
    stroke: new Stroke({
        color: 'red',
        width: 3,
    }),
    fill: new Fill({
        color: '#ff000022',
    }),
}))

source.addFeature(point_feature);
source.addFeature(circle_feature);
