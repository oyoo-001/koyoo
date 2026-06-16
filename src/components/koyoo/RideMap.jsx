import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from "react-leaflet";
import L from "leaflet";

const PICKUP_SVG = `<svg width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="13" fill="#22c55e" stroke="white" stroke-width="3"/><circle cx="14" cy="14" r="5" fill="white"/></svg>`;
const DEST_SVG = `<svg width="28" height="40" viewBox="0 0 28 40"><path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.3 21.7 0 14 0z" fill="#ef4444" stroke="white" stroke-width="2"/><circle cx="14" cy="14" r="5" fill="white"/></svg>`;
const RIDER_SVG = `<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#8b5cf6" stroke="white" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="white"/></svg>`;

function vehicleSvg(heading) {
  const rotate = heading != null ? `transform:rotate(${heading}deg)` : "";
  return `<div style="${rotate};width:36px;height:36px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">
    <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
      <path d="M6 22 L4 14 Q4 8 10 6 L16 4 L22 6 Q28 8 28 14 L26 22 Q26 26 22 26 L10 26 Q6 26 6 22Z" fill="#3b82f6" stroke="white" stroke-width="1.5"/>
      <path d="M10 14 Q10 10 12 9 L16 8 L20 9 Q22 10 22 14Z" fill="#93c5fd" opacity="0.7"/>
      <path d="M10 22 L10 18 L22 18 L22 22Z" fill="#93c5fd" opacity="0.7"/>
      <circle cx="9" cy="8" r="1.5" fill="#fef08a"/>
      <circle cx="23" cy="8" r="1.5" fill="#fef08a"/>
      <rect x="12" y="22" width="8" height="2" rx="1" fill="#2563eb"/>
    </svg>
  </div>`;
}

const nearbySvg = `<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#6b7280" stroke="white" stroke-width="2.5"/></svg>`;

const pickupIcon = L.divIcon({
  className: "",
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
  html: PICKUP_SVG,
});

const destinationIcon = L.divIcon({
  className: "",
  iconSize: [28, 40],
  iconAnchor: [14, 40],
  popupAnchor: [0, -40],
  html: DEST_SVG,
});

const riderIcon = L.divIcon({
  className: "",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
  html: RIDER_SVG,
});

const nearbyIcon = L.divIcon({
  className: "",
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
  html: nearbySvg,
});

function MovingVehicle({ position, heading }) {
  const markerRef = useRef(null);
  const icon = L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: vehicleSvg(heading),
  });

  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setIcon(icon);
    }
  }, [heading]);

  if (!position) return null;
  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
    >
      <Popup>Your Driver</Popup>
    </Marker>
  );
}

const SERVICE_AREA = {
  nairobi: { lat: [-1.35, -1.2], lng: [36.7, 36.95] },
  muranga: { lat: [-0.8, -0.5], lng: [36.9, 37.3] },
  kirinyaga: { lat: [-0.6, -0.3], lng: [37.1, 37.6] },
  mainRoad: [
    [-1.2833, 36.8167], [-1.2167, 36.8833], [-1.0833, 36.9833],
    [-0.9833, 37.0500], [-0.9000, 37.0833], [-0.7833, 37.1167],
    [-0.7167, 37.1500],
  ],
};

const MAIN_ROAD_POLYLINE = SERVICE_AREA.mainRoad.map(([lat, lng]) => [lat, lng]);

function RoutePath({ pickup, destination, onRoute, origin }) {
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);

  useEffect(() => {
    const start = origin || pickup;
    if (!start || !destination) {
      setRouteCoords(null);
      setRouteDistance(null);
      setRouteDuration(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const res = await fetch("/api/maps/directions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: [start[0], start[1]],
            destination: [destination[0], destination[1]],
          }),
        });
        const data = await res.json();
        if (data.coordinates && data.coordinates.length > 1) {
          setRouteCoords(data.coordinates);
          setRouteDistance(data.distance);
          setRouteDuration(data.duration);
          if (onRoute) {
            onRoute({ distance: data.distance, duration: data.duration });
          }
        }
      } catch {
        const d = calcDistance(start[0], start[1], destination[0], destination[1]);
        setRouteCoords([start, destination]);
        setRouteDistance(d);
        setRouteDuration((d / 40) * 60);
        if (onRoute) {
          onRoute({ distance: d, duration: (d / 40) * 60 });
        }
      }
    };

    fetchRoute();
  }, [pickup, destination, origin]);

  return (
    <>
      {routeCoords && routeCoords.length > 1 && (
        <Polyline
          positions={routeCoords}
          color="#10b981"
          weight={5}
          opacity={0.85}
        />
      )}
    </>
  );
}

function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function FitBounds({ pickup, destination, center, routeOrigin }) {
  const map = useMap();
  useEffect(() => {
    if (routeOrigin && pickup) {
      const bounds = L.latLngBounds([routeOrigin, pickup]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pickup && destination) {
      const bounds = L.latLngBounds([pickup, destination]);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (pickup) {
      map.setView(pickup, 17);
    } else if (center) {
      map.setView(center, 14);
    }
  }, [pickup, destination, center, map]);
  return null;
}

function MapClickHandler({ onClick }) {
  const map = useMap();
  useEffect(() => {
    if (!onClick) return;
    const handler = (e) => onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.on("click", handler);
    return () => map.off("click", handler);
  }, [map, onClick]);
  return null;
}

function ServiceAreaLayer() {
  const map = useMap();
  useEffect(() => {
    const nairobiBounds = L.rectangle(
      [[-1.35, 36.7], [-1.2, 36.95]],
      { color: "#22c55e", weight: 2, fill: true, fillColor: "#22c55e", fillOpacity: 0.05 }
    ).addTo(map);

    const murangaBounds = L.rectangle(
      [[-0.8, 36.9], [-0.5, 37.3]],
      { color: "#22c55e", weight: 2, fill: true, fillColor: "#22c55e", fillOpacity: 0.05 }
    ).addTo(map);

    const kirinyagaBounds = L.rectangle(
      [[-0.6, 37.1], [-0.3, 37.6]],
      { color: "#22c55e", weight: 2, fill: true, fillColor: "#22c55e", fillOpacity: 0.05 }
    ).addTo(map);

    const mainRoad = L.polyline(MAIN_ROAD_POLYLINE, {
      color: "#f59e0b",
      weight: 3,
      opacity: 0.5,
      dashArray: "8, 8",
    }).addTo(map);

    L.marker([-1.27, 36.82], {
      icon: L.divIcon({ className: "text-xs font-bold text-green-600 bg-white/80 px-1 rounded", html: "Nairobi", iconSize: [60, 16] }),
    }).addTo(map);

    L.marker([-0.7, 37.15], {
      icon: L.divIcon({ className: "text-xs font-bold text-green-600 bg-white/80 px-1 rounded", html: "Muranga", iconSize: [65, 16] }),
    }).addTo(map);

    L.marker([-0.45, 37.35], {
      icon: L.divIcon({ className: "text-xs font-bold text-green-600 bg-white/80 px-1 rounded", html: "Kirinyaga", iconSize: [70, 16] }),
    }).addTo(map);

    return () => {
      map.removeLayer(nairobiBounds);
      map.removeLayer(murangaBounds);
      map.removeLayer(kirinyagaBounds);
      map.removeLayer(mainRoad);
    };
  }, [map]);
  return null;
}

export default function RideMap({
  pickup, destination, driverLocation, center, userLocation,
  nearbyDrivers = [], onClick, className = "", showRoute = true, onRoute,
  routeOrigin, riderLocation, driverHeading,
}) {
  const defaultCenter = center || userLocation || [-1.2833, 36.8167];

  return (
    <div className={`w-full h-full rounded-xl overflow-hidden ${className}`}>
      <MapContainer
        center={defaultCenter}
        zoom={10}
        maxZoom={19}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        <ZoomControl position="topright" />
        <ServiceAreaLayer />
        <MapClickHandler onClick={onClick} />
        <FitBounds pickup={pickup} destination={destination} center={userLocation} routeOrigin={routeOrigin} />
        {showRoute && (routeOrigin || pickup) && destination && <RoutePath pickup={pickup} destination={destination} onRoute={onRoute} origin={routeOrigin} />}
        {pickup && (
          <Marker position={pickup} icon={pickupIcon}>
            <Popup>Pickup</Popup>
          </Marker>
        )}
        {destination && (
          <Marker position={destination} icon={destinationIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}
        {driverLocation && (
          <MovingVehicle position={driverLocation} heading={driverHeading} />
        )}
        {riderLocation && (
          <Marker position={riderLocation} icon={riderIcon}>
            <Popup>Rider</Popup>
          </Marker>
        )}
        {nearbyDrivers.map((d) => (
          <Marker key={d.id || d.user_id} position={[d.current_lat, d.current_lng]} icon={nearbyIcon}>
            <Popup>{d.vehicle_type || "Driver"}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
