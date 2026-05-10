import { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Apartment } from "@/services/apartmentService";
import { Button } from "./ui/button";
import { LocateFixed } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

import { propertyMapIcon, searchMapPinIcon } from "@/lib/mapIcons";

function MapControls({ onLocate }: { onLocate: () => void }) {
  return (
    <div className="absolute top-4 right-4 z-[400]">
      <Button
        variant="secondary"
        size="icon"
        className="h-10 w-10 rounded-full shadow-lg border-2 border-primary"
        onClick={(e) => {
          e.preventDefault();
          onLocate();
        }}
        title="تحديد موقعي"
      >
        <LocateFixed className="h-5 w-5 text-primary" />
      </Button>
    </div>
  );
}

// Haversine formula
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function LocateOnMount({ coords, onMapMove }: { coords: L.LatLng; onMapMove: (lat: number, lng: number) => void }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(coords, 13);
  }, [coords, map]);

  useMapEvents({
    click(e) {
      onMapMove(e.latlng.lat, e.latlng.lng);
    },
    moveend() {
      // Optional: trigger on center change if desired
    },
  });

  return null;
}

interface NearbySearchMapProps {
  apartments: Apartment[];
  centerLat: number;
  centerLng: number;
  onSearchPinMove: (lat: number, lng: number) => void;
}

const NearbySearchMap = ({ apartments, centerLat, centerLng, onSearchPinMove }: NearbySearchMapProps) => {
  const { theme } = useTheme();
  const searchCoords = useMemo(() => new L.LatLng(centerLat, centerLng), [centerLat, centerLng]);

  const handleLocateMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onSearchPinMove(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location", error);
        }
      );
    }
  };

  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-sm border border-border relative z-0">
      <MapContainer
        center={searchCoords}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={theme === 'dark' 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          }
        />
        
        <LocateOnMount coords={searchCoords} onMapMove={onSearchPinMove} />

        <Marker
          position={searchCoords}
          icon={searchMapPinIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              onSearchPinMove(position.lat, position.lng);
            },
          }}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="text-center font-bold text-sm">نقطة البحث (مسافة 10 كم)</div>
            <div className="text-xs text-muted-foreground mt-1 text-center">اسحب الدبوس لتغيير الموقع</div>
          </Popup>
        </Marker>

        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {apartments.map((apt) => {
            if (!apt.lat || !apt.lng) return null;
            const dist = calculateDistance(centerLat, centerLng, apt.lat, apt.lng);
            
            return (
              <Marker
                key={apt.id}
                position={[apt.lat, apt.lng]}
                icon={propertyMapIcon}
                eventHandlers={{
                  click: () => {
                    const el = document.getElementById(`apartment-${apt.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      el.classList.add('ring-2', 'ring-primary', 'ring-offset-2', 'transition-all', 'duration-500');
                      setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-2'), 2000);
                    }
                  }
                }}
              >
                <Popup className="apartment-popup">
                  <div className="w-48">
                    <img 
                      src={apt.images && apt.images.length > 0 ? apt.images[0] : "https://placehold.co/400x300"} 
                      alt={apt.title} 
                      className="w-full h-24 object-cover rounded-md mb-2"
                    />
                    <h3 className="font-bold text-sm truncate">{apt.title}</h3>
                    <p className="text-primary font-bold">{apt.price.toLocaleString("ar-DZ")} د.ج</p>
                    <p className="text-xs text-muted-foreground mb-2 mt-1">يبعد {dist.toFixed(1)} كم</p>
                    <Link to={`/apartment/${apt.id}`}>
                      <Button size="sm" className="w-full h-7 text-xs">عرض التفاصيل</Button>
                    </Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
      <MapControls onLocate={handleLocateMe} />
    </div>
  );
};

export default NearbySearchMap;
