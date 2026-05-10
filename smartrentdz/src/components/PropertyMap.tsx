"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";

import { propertyMapIcon } from "@/lib/mapIcons";

// ─── Props ─────────────────────────────────────────────────────────────────────
interface PropertyMapProps {
  lat: number;
  lng: number;
  price?: number;
  propertyId?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────
const PropertyMap = ({ lat, lng, price, propertyId }: PropertyMapProps) => {
  return (
    /**
     * Wrapper div:
     * - h-[400px]        → fixed height so MapContainer renders correctly
     * - rounded-2xl      → rounded corners
     * - overflow-hidden  → clips the map to the rounded corners
     * - relative z-0    → prevents Leaflet controls from floating above sticky navbars
     */
    <div className="h-[400px] w-full rounded-2xl overflow-hidden shadow-lg border border-border relative z-0">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={propertyMapIcon}>
          <Popup>
            <div style={{ textAlign: "center", minWidth: "120px" }}>
              {price != null && (
                <p
                  style={{
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#16a34a",
                    margin: "0 0 8px",
                  }}
                >
                  {price.toLocaleString("ar-DZ")} د.ج
                </p>
              )}
              {propertyId ? (
                <Link
                  to={`/apartment/${propertyId}`}
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    background: "#2563eb",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "0.8rem",
                    textDecoration: "none",
                  }}
                >
                  عرض التفاصيل
                </Link>
              ) : (
                <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                  الموقع الدقيق
                </span>
              )}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default PropertyMap;
