import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import socket from "../services/socket";

// Shared socket instance

export default function RideTrack() {
  const { id } = useParams();
  const [riderPos, setRiderPos] = useState(null);
  const [driverPos, setDriverPos] = useState(null);

  // Icons
  const riderIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/149/149071.png",
    iconSize: [30, 30],
  });
  const driverIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/1946/1946406.png",
    iconSize: [35, 35],
  });

  useEffect(() => {
    // Rider GPS - Use watchPosition for continuous tracking
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        console.log("📍 RideTrack GPS Update:", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: pos.coords.accuracy < 100 ? "GPS" : "Network"
        });
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setRiderPos(coords);
        socket.emit("riderLocation", { rideId: id, coords });
      },
      (err) => {
        console.error("GPS tracking error:", err);
      },
      { 
        enableHighAccuracy: true,  // Force GPS on mobile
        maximumAge: 0              // Force fresh GPS reading
      }
    );

    // Listen for driver updates
    socket.on("driverLocationUpdate", ({ rideId, coords }) => {
      if (rideId === parseInt(id)) {
        setDriverPos(coords);
      }
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.off("driverLocationUpdate");
    };
  }, [id]);

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      {riderPos && (
        <MapContainer center={riderPos} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {riderPos && <Marker position={riderPos} icon={riderIcon} />}
          {driverPos && <Marker position={driverPos} icon={driverIcon} />}
          {riderPos && driverPos && (
            <Polyline positions={[riderPos, driverPos]} pathOptions={{ color: "black", weight: 4 }} />
          )}
        </MapContainer>
      )}
    </div>
  );
}
