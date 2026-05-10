import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

import { propertyMapIcon } from "@/lib/mapIcons";

export interface LocationData {
  lat: number;
  lng: number;
  state?: string;
  city?: string;
  suburb?: string;
}

interface LocationPickerProps {
  lat?: number | null;
  lng?: number | null;
  onLocationSelect: (data: LocationData) => void;
  flyToCoords?: { lat: number; lng: number } | null;
}

// Helper to animate map view
function ChangeView({ center, zoom }: { center: L.LatLngExpression; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5 });
  }, [center, map, zoom]);
  return null;
}

const LocationPicker = ({ lat, lng, onLocationSelect, flyToCoords }: LocationPickerProps) => {
  const { theme } = useTheme();
  const [position, setPosition] = useState<L.LatLng | null>(
    lat && lng ? new L.LatLng(lat, lng) : null
  );
  const [isLoading, setIsLoading] = useState(false);

  // When flyToCoords changes from the parent, move the map but don't set the marker immediately.
  // The marker is only set on user click.
  const mapCenter: L.LatLngExpression = flyToCoords 
    ? [flyToCoords.lat, flyToCoords.lng] 
    : position 
      ? [position.lat, position.lng] 
      : [36.7525, 3.04197]; // Default Algiers

  const fetchLocationDetails = async (latlng: L.LatLng) => {
    setIsLoading(true);
    setPosition(latlng);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&accept-language=ar`
      );
      const data = await response.json();
      
      const address = data.address || {};
      // Nominatim might return state, city, town, village, suburb, neighbourhood
      const state = address.state; // Wilaya
      const city = address.city || address.town || address.village || address.county; // Baladiya
      const suburb = address.suburb || address.neighbourhood || address.residential; // Neighborhood

      onLocationSelect({
        lat: latlng.lat,
        lng: latlng.lng,
        state,
        city,
        suburb,
      });
    } catch (error) {
      console.error("Reverse geocoding failed", error);
      // Fallback: just send coords
      onLocationSelect({ lat: latlng.lat, lng: latlng.lng });
    } finally {
      setIsLoading(false);
    }
  };

  // MapEvents component inside map
  function MapEventsHandler() {
    useMapEvents({
      click(e) {
        fetchLocationDetails(e.latlng);
      },
    });
    return null;
  }

  return (
    <div className="h-[350px] w-full rounded-xl overflow-hidden shadow-sm border border-border relative z-0">
      <MapContainer
        center={mapCenter}
        zoom={flyToCoords ? 12 : position ? 15 : 10}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <ChangeView center={mapCenter} zoom={flyToCoords ? 12 : position ? 15 : 10} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={theme === 'dark' 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        <MapEventsHandler />
        {position && <Marker position={position} icon={propertyMapIcon} />}
      </MapContainer>
      
      {!position && !isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-white dark:bg-slate-800 border-2 border-primary px-4 py-2 rounded-full shadow-lg text-sm font-medium text-primary cursor-pointer pointer-events-none">
          انقر فوق الخريطة لتحديد موقع الشقة
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 z-[500] bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 px-6 py-3 border border-border shadow-lg rounded-xl flex items-center gap-3">
            <Loader2 className="animate-spin text-primary h-6 w-6" />
            <span className="font-semibold text-sm">جاري تحديد الموقع...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
