import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "100%",
  minHeight: "400px",
};

// Default Hyderabad
const DEFAULT_PICKUP = { lat: 17.385044, lng: 78.486671 };

// Static libraries array to fix performance warning
const LIBRARIES = ["places"];

// Normalize various vehicle type strings to canonical codes
const normalizeType = (type) => {
  if (!type) return 'car';
  const t = String(type).toLowerCase().replace(/\s|-/g, '_');
  switch (t) {
    case 'bike':
    case 'two_wheeler':
    case 'twowheeler':
    case 'scooter':
      return 'bike';
    case 'auto':
    case 'autorickshaw':
    case 'auto_rickshaw':
    case 'auto_3':
    case 'three_wheeler':
    case 'threewheeler':
    case 'three_wheeler_auto':
    case 'e_rickshaw':
    case 'erickshaw':
    case 'rickshaw':
    case 'tuk_tuk':
      return 'auto';
    case 'car':
    case 'cab':
    case 'car_4':
      return 'car';
    case 'premium':
    case 'vip':
    case 'luxury':
      return 'premium';
    case 'parcel':
    case 'delivery':
    case 'cargo':
      return 'parcel';
    default:
      return 'car';
  }
};

// Get vehicle icon URL for map markers using Google default icons
const getVehicleIconUrl = (vehicleType) => {
  const code = normalizeType(vehicleType);
  // Use Google Maps default dot icons for maximum reliability
  const iconMap = {
    bike: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
    auto: 'http://maps.google.com/mapfiles/ms/icons/orange-dot.png',
    car: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    premium: 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png',
    parcel: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
  };
  return iconMap[code] || iconMap['car'];
};

// Safely extract latitude/longitude from various backend shapes
const extractLatLng = (entity) => {
  const l = entity?.location || entity?.currentLocation;
  // Common shapes
  if (l && typeof l.lat === 'number' && typeof l.lng === 'number') {
    return { lat: l.lat, lng: l.lng };
  }
  if (l && typeof l.latitude === 'number' && typeof l.longitude === 'number') {
    return { lat: l.latitude, lng: l.longitude };
  }
  // GeoJSON coordinates: [lng, lat]
  if (Array.isArray(l?.coordinates) && l.coordinates.length >= 2) {
    const lat = Number(l.coordinates[1]);
    const lng = Number(l.coordinates[0]);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  // Top-level fields
  if (typeof entity?.lat === 'number' && typeof entity?.lng === 'number') {
    return { lat: entity.lat, lng: entity.lng };
  }
  if (typeof entity?.latitude === 'number' && typeof entity?.longitude === 'number') {
    return { lat: entity.latitude, lng: entity.longitude };
  }
  // Strings fallback
  const slat = l?.lat ?? l?.latitude ?? entity?.lat ?? entity?.latitude;
  const slng = l?.lng ?? l?.longitude ?? entity?.lng ?? entity?.longitude;
  if (slat != null && slng != null) {
    const lat = parseFloat(slat);
    const lng = parseFloat(slng);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
  }
  return null;
};

export default function Map({
  apiKey,
  pickup,
  setPickup,
  setPickupAddress,
  drop,
  setDrop,
  setDropAddress,
  riderLocation,
  driverLocation,
  setDistance,
  setDuration,
  viewOnly = false,
  showActiveRide = false, // New prop to control whether to show online riders
  filterVehicleType = null, // Optional filter to show only selected vehicle type
}) {
  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [onlineRiders, setOnlineRiders] = useState([]);
  const hasAutoZoomedRef = useRef(false); // ensure auto-zoom runs only once per page load

  // Debug logging
  console.log("🗺️ Map Component - Pickup:", pickup);
  console.log("🗺️ Map Component - Drop:", drop);
  console.log("🗺️ Map Component - Driver Location:", driverLocation);
  console.log("🗺️ Map Component - Rider Location:", riderLocation);

  // 🚗 Fetch online riders for map display
  useEffect(() => {
    const fetchOnlineRiders = async () => {
      try {
        // Always fetch all riders; rely on client-side filtering for display
        const response = await axios.get('http://localhost:5000/api/rider/online');
        const data = response?.data || {};
        console.log('📍 Fetched online riders response:', data);
        const list = data.riders || data.drivers || data.captains || data.data || [];
        const ridersRaw = Array.isArray(list) ? list : (list?.items || []);
        // Normalize coordinates and types to ensure markers render
        const riders = ridersRaw
          .map((r) => {
            const loc = extractLatLng(r);
            const srcType = r.vehicleType ?? r.type ?? r.category ?? r.vehicle?.type;
            const vtLocal = srcType ? normalizeType(srcType) : null;
            const id = r.id || r._id || r.userId || r.riderId || r.driverId;
            return { ...r, id, vehicleType: vtLocal, location: loc };
          })
          .filter((r) => r.location && typeof r.location.lat === 'number' && typeof r.location.lng === 'number' && !!r.vehicleType);
        console.log('📍 Total riders to display (normalized):', riders.length);
        setOnlineRiders(riders);
      } catch (error) {
        console.error('❌ Error fetching online riders:', error);
        console.error('❌ Error details:', error.response?.data || error.message);
      }
    };

    fetchOnlineRiders();
    // Refresh every 5 seconds for live updates (update when filter changes)
    const interval = setInterval(fetchOnlineRiders, 5000);
    return () => clearInterval(interval);
  }, [filterVehicleType]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES, // ✅ Static libraries array to fix performance warning
  });

  // 🗺️ Custom map styling to remove clutter and show only essential hotspots
  const mapStyles = [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }] // Hide all POI labels
    },
    {
      featureType: "poi",
      elementType: "geometry",
      stylers: [{ visibility: "off" }] // Hide all POI icons (restaurants, shops, etc.)
    },
    {
      featureType: "transit",
      elementType: "labels",
      stylers: [{ visibility: "off" }] // Hide transit labels
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ visibility: "off" }] // Hide transit stations
    },
    {
      featureType: "administrative",
      elementType: "labels",
      stylers: [{ visibility: "simplified" }] // Simplify administrative labels
    },
    {
      featureType: "road",
      elementType: "labels",
      stylers: [{ visibility: "simplified" }] // Simplify road labels
    },
    {
      elementType: "geometry",
      stylers: [{ color: "#e9e5e1" }] // Light background color
    },
    {
      elementType: "labels.text.fill",
      stylers: [{ color: "#5f5f5f" }] // Dark gray text
    },
    {
      elementType: "labels.text.stroke",
      stylers: [{ color: "#ffffff" }] // White stroke for text
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#c9c9c9" }] // Light gray water
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#f0f0f0" }] // Very light gray landscape
    }
  ];

  // ✅ Reverse geocode
  const getAddressFromCoords = async (lat, lng, cb) => {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await res.json();
      cb(data.results[0]?.formatted_address || "");
    } catch (err) {
      console.error("Reverse geocode failed:", err);
    }
  };

  // ✅ Ensure pickup always exists → try GPS first
  useEffect(() => {
    if (!pickup) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setPickup(loc);
          getAddressFromCoords(loc.lat, loc.lng, setPickupAddress);

          if (mapRef.current) {
            mapRef.current.panTo(loc);
          }
        },
        (err) => {
          console.warn("Geolocation failed, fallback used:", err.message);
          setPickup(DEFAULT_PICKUP);
          getAddressFromCoords(
            DEFAULT_PICKUP.lat,
            DEFAULT_PICKUP.lng,
            setPickupAddress
          );
        }
      );
    }
  }, [pickup, setPickup, setPickupAddress]);

  // ✅ Fetch directions
  useEffect(() => {
    if (isLoaded && pickup && drop) {
      const directionsService = new window.google.maps.DirectionsService();

      if (!directionsRendererRef.current) {
        directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
          suppressMarkers: true,
          polylineOptions: { strokeColor: "#22c55e", strokeWeight: 3, strokeOpacity: 0.8 },
        });
      }

      directionsRendererRef.current.setMap(mapRef.current);

      directionsService.route(
        {
          origin: pickup,
          destination: drop,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "OK" && result) {
            directionsRendererRef.current.setDirections(result);

            // ✅ repeat suppression each time
            directionsRendererRef.current.setOptions({ suppressMarkers: true });

            const leg = result.routes[0].legs[0];
            setDistance(leg.distance.text.replace(" km", ""));
            setDuration(leg.duration.text);
          } else {
            console.error("Directions request failed:", status);
          }
        }
      );
    } else if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
    }
  }, [isLoaded, pickup, drop, setDistance, setDuration]);

  // 🔭 Auto-fit map bounds to include pickup, drop, and online riders
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;
    if (!onlineRiders || onlineRiders.length === 0) return;
    if (hasAutoZoomedRef.current) return; // already auto-zoomed once

    try {
      const bounds = new window.google.maps.LatLngBounds();
      if (pickup && pickup.lat && pickup.lng) bounds.extend(new window.google.maps.LatLng(pickup.lat, pickup.lng));
      if (drop && drop.lat && drop.lng) bounds.extend(new window.google.maps.LatLng(drop.lat, drop.lng));
      onlineRiders.forEach(r => {
        if (r.location && r.location.lat && r.location.lng) {
          bounds.extend(new window.google.maps.LatLng(r.location.lat, r.location.lng));
        }
      });
      mapRef.current.fitBounds(bounds);
      hasAutoZoomedRef.current = true; // mark as done
    } catch (e) {
      console.warn('Map fitBounds failed:', e);
    }
  }, [isLoaded, onlineRiders, pickup, drop]);

  // ✅ Clear previous markers and create new ones
  useEffect(() => {
    if (mapRef.current) {
      // Clear all existing markers
      const markers = mapRef.current.markers || [];
      markers.forEach(marker => marker.setMap(null));
      mapRef.current.markers = [];
    }
  }, [pickup, drop, riderLocation]);


  if (!isLoaded) return <p>Loading Map...</p>;

  // Compute type counts for legend
  const typeCounts = { bike: 0, auto: 0, car: 0, premium: 0, parcel: 0 };
  onlineRiders.forEach(r => {
    const code = normalizeType(r.vehicleType || 'car');
    if (typeCounts[code] != null) typeCounts[code] += 1;
  });

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={pickup && pickup.lat && pickup.lng ? pickup : DEFAULT_PICKUP}
      zoom={14}
      options={{
        disableDefaultUI: true,
        zoomControl: false,            // Hide +/- zoom buttons
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: "greedy",
        mapTypeControl: false,         // Removes Map/Satellite toggle
        rotateControl: false,          // Removes rotate control
        scaleControl: false,           // Hide scale bar
        clickableIcons: false,         // Prevent info window from opening
        styles: mapStyles              // Apply custom styles to remove clutter
      }}
      onLoad={(map) => {
        mapRef.current = map;
        
        // Hide Google branding
        const style = document.createElement('style');
        style.innerHTML = `
          .gm-style-cc { display: none !important; }
          .gm-style a[title="Report problems with Street View imagery"] { display: none !important; }
          .gm-style-iw { display: none !important; }
        `;
        document.head.appendChild(style);
      }}
      onClick={viewOnly ? undefined : (e) => {
        const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
        setDrop(loc);
        getAddressFromCoords(loc.lat, loc.lng, setDropAddress);
      }}
    >
      {/* ✅ Pickup Marker (Green) */}
      {pickup && pickup.lat && pickup.lng && !viewOnly && (
        <Marker
          key={`pickup-${pickup.lat.toFixed(5)}-${pickup.lng.toFixed(5)}`}
          position={pickup}
          draggable={!viewOnly}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
            scaledSize: new window.google.maps.Size(32, 32),
          }}
          onClick={() => {}} // Prevent info window
          onDragEnd={viewOnly ? undefined : (e) => {
            const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setPickup(loc);
            getAddressFromCoords(loc.lat, loc.lng, setPickupAddress);
          }}
        />
      )}

      {/* ✅ Drop Marker (Red) */}
      {drop && drop.lat && drop.lng && !viewOnly && (
        <Marker
          key={`drop-${drop.lat.toFixed(5)}-${drop.lng.toFixed(5)}`}
          position={drop}
          draggable={!viewOnly}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            scaledSize: new window.google.maps.Size(32, 32),
          }}
          onClick={() => {}} // Prevent info window
          onDragEnd={viewOnly ? undefined : (e) => {
            const loc = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setDrop(loc);
            getAddressFromCoords(loc.lat, loc.lng, setDropAddress);
          }}
        />
      )}

      {/* ✅ Rider Marker (Blue Car Icon) */}
      {riderLocation && riderLocation.lat && riderLocation.lng && (
        <Marker
          key={`rider-${riderLocation.lat.toFixed(5)}-${riderLocation.lng.toFixed(5)}`}
          position={riderLocation}
          icon={{
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
            scaledSize: new window.google.maps.Size(32, 32),
          }}
          title="You"
        />
      )}

      {/* 🚗 Online Riders Markers with Vehicle Icons - Always show all types */}
      {onlineRiders && onlineRiders.length > 0 && (
        <>
          {onlineRiders.map((rider, idx) => {
            console.log('📍 Rendering rider marker:', rider);
            if (!rider.location || !rider.location.lat || !rider.location.lng) {
              console.warn('⚠️ Rider missing location:', rider);
              return null;
            }
            const vehicleIcon = getVehicleIconUrl(rider.vehicleType || 'car');
            return (
              <Marker
                key={`online-rider-${rider.id || rider._id || rider.userId || idx}`}
                position={{ lat: rider.location.lat, lng: rider.location.lng }}
                icon={{
                  url: vehicleIcon,
                  scaledSize: new window.google.maps.Size(40, 40),
                  anchor: new window.google.maps.Point(20, 20),
                }}
                zIndex={1000}
                title={`${rider.name} - ${rider.vehicleType || 'car'}`}
              />
            );
          })}
        </>
      )}

      {/* ✅ Driver Marker (Blue Car Icon) */}
      {driverLocation && driverLocation.lat && driverLocation.lng && (
        <Marker
          key={`driver-${driverLocation.lat.toFixed(5)}-${driverLocation.lng.toFixed(5)}`}
          position={{ lat: driverLocation.lat, lng: driverLocation.lng }}
          icon={{
            url: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
            scaledSize: new window.google.maps.Size(40, 40),
          }}
          title="Your Driver"
        />
      )}
      
      
    </GoogleMap>

    {/* Overlay legend showing rider counts by type (exclude parcel) */}
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      background: 'rgba(255,255,255,0.9)',
      color: '#111',
      padding: '8px 10px',
      borderRadius: 8,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      fontSize: 12,
      lineHeight: 1.4,
      pointerEvents: 'none'
    }}>
      <div><strong>Online riders:</strong> {onlineRiders.length}</div>
      {(() => {
        const labels = { bike: 'Bike', auto: 'Auto', car: 'Car', premium: 'Premium' };
        const items = Object.entries(typeCounts)
          .filter(([t, count]) => t !== 'parcel' && count > 0)
          .map(([t, count]) => `${labels[t] || (t.charAt(0).toUpperCase() + t.slice(1))}: ${count}`);
        return <div>{items.join(' • ') || '—'}</div>;
      })()}
    </div>
    </div>
  );
}
