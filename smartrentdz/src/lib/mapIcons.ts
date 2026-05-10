import L from "leaflet";

export const createHouseIcon = (color: string) => new L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 52" width="38px" height="52px" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); transform-origin: bottom center;">
      <!-- Pin background -->
      <path d="M19 0C8.5 0 0 8.5 0 19C0 33.25 19 52 19 52C19 52 38 33.25 38 19C38 8.5 29.5 0 19 0Z" fill="${color}" />
      <!-- Inner house -->
      <path d="M19 9L10 16.5V26H15V21H23V26H28V16.5L19 9Z" fill="white" />
    </svg>
  `,
  className: "custom-house-marker bg-transparent border-none",
  iconSize: [38, 52],
  iconAnchor: [19, 52],
  popupAnchor: [0, -52],
});

export const createSearchPinIcon = (color: string) => new L.divIcon({
  html: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 52" width="38px" height="52px" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); transform-origin: bottom center;">
      <path d="M19 0C8.5 0 0 8.5 0 19C0 33.25 19 52 19 52C19 52 38 33.25 38 19C38 8.5 29.5 0 19 0Z" fill="${color}" />
      <circle cx="19" cy="19" r="6" fill="white" />
    </svg>
  `,
  className: "custom-search-marker bg-transparent border-none",
  iconSize: [38, 52],
  iconAnchor: [19, 52],
  popupAnchor: [0, -52],
});

export const propertyMapIcon = createHouseIcon("#2563eb"); // Primary indigo/blue
export const searchMapPinIcon = createSearchPinIcon("#ef4444"); // Red for search pin
