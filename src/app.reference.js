// import d3 library
import * as d3 from "d3";
import "leaflet";
import "leaflet.markercluster";

const zip_codes = [
  "10001",
  "10003",
  "10010",
  "10011",
  "10012",
  "10014",
  "10016",
  "10018",
  "10019",
  "10036",
  "10199",
];

const app = d3
  .select("#app")
  // replace the text of the app div with nothing
  .html("")
  // place chart in the center of the page
  .style("position", "fixed")
  .style("inset", "0")
  .style("padding", "50px")
  .style("overflow", "auto")
  // add new div for content to be placed in
  .append("div")
  .style("margin", "0 auto")
  .style("padding", "20px")
  .style("border-radius", "10px")
  .style("width", "100%")
  .style("max-width", "800px")
  .style("background", "hsl(255, 6%, 10%)")
  .style("box-shadow", "0px 0px 2px hsla(0, 0%, 0%, 0.1)");

// add title
const title = app
  .append("h1")
  .style("margin", "0")
  .style("padding-top", "4px")
  .style("padding-left", "2px")
  .style("padding-bottom", "12px")
  .style("font-size", "1.1rem")
  .style("font-weight", 500)
  .style("color", "#eee")
  .text("Illegal Parking near The New School");

// create a <div id="map"></div> inside of div#app
const mapElement = app
  .append("div")
  .attr("id", "map")
  .style("height", "500px")
  .style("border-radius", "8px");

// create leaflet map
const map = L.map(mapElement.node()).setView([0, 0], 15);

// Tile Layer
const tileLayer = L.tileLayer(
  "http://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    minZoom: 14,
    maxZoom: 16,
    attribution: "ARCGIS ONLINE",
  }
);

// The New School Data
const tnsCoordinates = new L.LatLng(40.7359728, -73.9957851);
const tnsIcon = L.icon({
  iconUrl: "/images/new_school.png",
  className: "tns-icon-marker",
  iconSize: [40, 40],
  shadowSize: [0, 0],
  iconAnchor: [20, 20],
  shadowAnchor: [0, 0],
  popupAnchor: [20, 20],
});
const tnsMarker = L.marker(tnsCoordinates, { icon: tnsIcon });

// Zip Code Layer
const zipCodeGeoJson = await d3.json("/data/zip-code.json");

const zipCodeLayer = L.geoJSON(zipCodeGeoJson, {
  style: function (feature) {
    return {};
  },
  filter: function (feature) {
    return zip_codes.includes(feature.properties["zcta"]);
  },
});

// Incident Layer
const fetchIncidents = async () => {
  const resourceUrl = new URL(
    "https://data.cityofnewyork.us/resource/erm2-nwe9.json"
  );

  resourceUrl.searchParams.set(
    "$where",
    `complaint_type = 'Illegal Parking' AND incident_zip IN (${zip_codes
      .map((i) => `'${i}'`)
      .join(", ")})`
  );

  resourceUrl.searchParams.set("$limit", 100);

  const response = await d3.json(resourceUrl);

  return response;
};

// fetch data from API
const incidents = await fetchIncidents();

const incidentLayer = L.markerClusterGroup();

for (const incident of incidents) {
  if (!incident.latitude || !incident.longitude) {
    continue;
  }

  const marker = L.marker([incident.latitude, incident.longitude]);

  marker.bindPopup(`<div style="display:flex;flex-direction:column;justify-content:center;">
    <div style="margin:0 auto;font-weight:600;">${incident.descriptor}</div>
    <div style="margin:0 auto;font-weight:400;">${new Date(
      incident.created_date
    ).toLocaleString()}</div>
    <div style="margin:0 auto;font-weight:400;">${
      incident["incident_address"]
    }</div>
  </div>`);

  incidentLayer.addLayer(marker);
}

// reset button control
L.Control.ResetButton = L.Control.extend({
  options: {
    position: "topleft",
  },
  onAdd: function (map) {
    const container = d3
      .create("div")
      .attr("class", "leaflet-bar leaflet-control");

    const button = container
      .append("a")
      .attr("class", "leaflet-control-button")
      .attr("role", "button")
      .style("cursor", "pointer");

    const icon = button
      .append("img")
      .attr("src", "/images/refresh-icon.svg")
      .style("transform", "scale(0.5)");

    button.on("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      map.panTo(tnsCoordinates);
    });

    return container.node();
  },
  onRemove: function (map) {},
});
const resetButton = new L.Control.ResetButton();
resetButton.addTo(map);

// add layers to map
map
  .panTo(tnsCoordinates)
  .addLayer(tileLayer)
  .addLayer(zipCodeLayer)
  .addLayer(incidentLayer)
  .addLayer(tnsMarker);
