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

// Get vehicle icon URL for map markers
const getVehicleIconUrl = (vehicleType) => {
  const iconMap = {
    'bike': 'https://cdn-icons-png.flaticon.com/512/2907/2907618.png', // Bike icon
    'scooty': 'https://cdn-icons-png.flaticon.com/512/2907/2907557.png', // Scooter icon
    'auto': 'https://cdn-icons-png.flaticon.com/512/1766/1766602.png', // Auto rickshaw icon
    'car': 'https://cdn-icons-png.flaticon.com/512/2907/2907523.png', // Car icon
    'car_ac': 'https://cdn-icons-png.flaticon.com/512/2907/2907523.png', // Car with AC icon
    'car_6': 'https://cdn-icons-png.flaticon.com/512/2907/2907590.png', // SUV icon
    'premium': 'https://cdn-icons-png.flaticon.com/512/2907/2907535.png', // Premium car icon
    'parcel': 'https://cdn-icons-png.flaticon.com/512/2907/2907622.png' // Delivery truck icon
  };
  return iconMap[vehicleType] || iconMap['car']; // Default to car icon
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
}) {
  const mapRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const [onlineRiders, setOnlineRiders] = useState([]);

  // Debug logging
  console.log("🗺️ Map Component - Pickup:", pickup);
  console.log("🗺️ Map Component - Drop:", drop);
  console.log("🗺️ Map Component - Driver Location:", driverLocation);
  console.log("🗺️ Map Component - Rider Location:", riderLocation);

  // 🚗 Fetch online riders for map display
  useEffect(() => {
    const fetchOnlineRiders = async () => {
      try {
        // Use full URL to hit backend on port 5000
        const response = await axios.get('http://localhost:5000/api/rider/online');
        console.log('📍 Fetched online riders response:', response.data);
        if (response.data.success) {
          console.log('📍 Online riders:', response.data.riders);
          console.log('📍 Total riders to display:', response.data.riders.length);
          setOnlineRiders(response.data.riders);
        }
      } catch (error) {
        console.error('❌ Error fetching online riders:', error);
        console.error('❌ Error details:', error.response?.data || error.message);
      }
    };

    fetchOnlineRiders();
    // Refresh every 5 seconds for live updates
    const interval = setInterval(fetchOnlineRiders, 5000);
    return () => clearInterval(interval);
  }, []);

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

  return (
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
            url: "https://cdn-icons-png.flaticon.com/512/64/64113.png",
            scaledSize: new window.google.maps.Size(40, 40),
          }}
        />
      )}

      {/* 🚗 Online Riders Markers with Vehicle Icons - Only show if pickup/drop not set */}
      {onlineRiders && onlineRiders.length > 0 && !pickup && !drop && (
        <>
          {onlineRiders.map((rider) => {
            console.log('📍 Rendering rider marker:', rider);
            if (!rider.location || !rider.location.lat || !rider.location.lng) {
              console.warn('⚠️ Rider missing location:', rider);
              return null;
            }
            const vehicleIcon = getVehicleIconUrl(rider.vehicleType || 'car');
            return (
              <Marker
                key={`online-rider-${rider.id}`}
                position={{ lat: rider.location.lat, lng: rider.location.lng }}
                icon={{
                  url: vehicleIcon,
                  scaledSize: new window.google.maps.Size(40, 40),
                  anchor: new window.google.maps.Point(20, 20),
                }}
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
  );
}
