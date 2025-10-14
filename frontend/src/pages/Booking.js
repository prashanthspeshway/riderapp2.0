import React, { useState, useEffect, useRef } from "react";
import {
  Container, Paper, Typography, TextField, Box,
  Button, Drawer, CircularProgress, ListItemButton,
  Card, CardContent, Chip, Avatar, Divider,
  Stepper, Step, StepLabel, Alert, Snackbar, Grid,
  useTheme, useMediaQuery
} from "@mui/material";
import {
  DirectionsCar, TwoWheeler, LocalTaxi, LocalShipping,
  LocationOn, AccessTime, AttachMoney, Star, Phone, Chat,
  AcUnit, AirportShuttle, ShoppingBag
} from "@mui/icons-material";
import { keyframes } from "@mui/system";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import socket from "../services/socket";
import MapComponent from "../components/Map";
import { createRide, getVehicleTypes, cancelRide, getActiveRide } from "../services/api";
import SimpleChatModal from "../components/SimpleChatModal";
import ChatNotification from "../components/ChatNotification";
import { verifyOTP } from "../services/api";
import CancelTripModal from "../components/CancelTripModal";

// Notification sound function
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.log('Could not play notification sound:', error);
  }
};

// Subtle green pulse animation for avatars (consistent brand feel)
const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.4); }
  50% { transform: scale(1.02); box-shadow: 0 0 0 6px rgba(46, 125, 50, 0.0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(46, 125, 50, 0.0); }
`;

// Use shared socket instance

export default function Booking() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  const [rideOptions, setRideOptions] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);

  const [lookingForRider, setLookingForRider] = useState(false);
  const [assignedRider, setAssignedRider] = useState(null);
  const [riderLocation, setRiderLocation] = useState(null);
  const [riderPanelOpen, setRiderPanelOpen] = useState(false);
  const [rideStatus, setRideStatus] = useState("Waiting for rider 🚖");
  const [activeRide, setActiveRide] = useState(null);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);
  // Mobile bottom sheet snap height (half -> full)
  const [sheetExpanded, setSheetExpanded] = useState(false);
  // Control bottom sheet visibility (hide on backdrop tap)
  const [bottomSheetVisible, setBottomSheetVisible] = useState(true);

  // Auto re-open bottom sheet when pickup/drop are set on mobile and not in driver details
  useEffect(() => {
    if (isMobile && drop && !showDriverDetails) {
      setBottomSheetVisible(true);
      setSheetExpanded(false);
    }
  }, [isMobile, drop, pickup, showDriverDetails]);
  // Refs to pickup/drop inputs for quick editing
  const pickupInputRef = useRef(null);
  const dropInputRef = useRef(null);

  // Vehicle types fetched from backend (for future dynamic options)
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);
  const [typesError, setTypesError] = useState("");

  const { auth } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [cancelOpen, setCancelOpen] = useState(false);


  const handleCall = () => {
    if (activeRide?.captainId?.mobile) {
      window.open(`tel:${activeRide.captainId.mobile}`);
    } else {
      showError("Driver contact not available");
    }
  };

  const fetchActiveRide = async () => {
    try {
      const res = await getActiveRide();
      const data = res?.data;
      if (data?.success && data?.ride) {
        console.log("📱 Fetched active ride:", data.ride);
        setActiveRide(data.ride);
        setShowDriverDetails(true);
        setAssignedRider(data.ride.captainId);
        setOtp(data.ride.otp || "");
        const status = String(data.ride.status || '').toLowerCase();
        const isActive = !["completed", "cancelled"].includes(status);
        try {
          if (isActive) {
            localStorage.setItem('activeRideId', data.ride._id);
          } else {
            localStorage.removeItem('activeRideId');
          }
        } catch (_) {}
        return data.ride;
      } else {
        console.error("📱 Failed to fetch active ride:", data?.message || res?.status);
      }
    } catch (error) {
      console.error("📱 Error fetching active ride:", error);
    }
    return null;
  };

  const handleChat = async () => {
    let currentRide = activeRide;
    
    if (!currentRide || !currentRide._id) {
      currentRide = await fetchActiveRide();
      
      if (!currentRide || !currentRide._id) {
        console.error("📱 No active ride found, cannot open chat");
        showError("No active ride found. Please try again.");
        return;
      }
    }
    
    setChatOpen(true);
    setUnreadMessages(0); // Clear unread messages when chat is opened
  };

  const handleCancelRide = async (reason) => {
    try {
      let currentId = activeRide?._id;
      if (!currentId) {
        const current = await fetchActiveRide();
        currentId = current?._id;
      }
      if (!currentId) {
        showError("No active ride to cancel");
        return;
      }
      const res = await cancelRide(currentId, reason);
      if (res?.data?.success) {
        showSuccess("Ride cancelled");
        setCancelOpen(false);
        setActiveRide(null);
        setShowDriverDetails(false);
        setAssignedRider(null);
        try { localStorage.removeItem('activeRideId'); } catch (_) {}
      } else {
        showError(res?.data?.message || "Failed to cancel ride");
      }
    } catch (e) {
      console.error("Cancel ride error:", e);
      showError(e?.response?.data?.message || "Failed to cancel ride");
    }
  };

  const GOOGLE_API_KEY = "AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo"; // 🔑 Replace with your real key

  // Load vehicle types safely inside the component
  useEffect(() => {
    let isMounted = true;
    const loadTypes = async () => {
      try {
        setTypesLoading(true);
        setTypesError("");
        const res = await getVehicleTypes();
        if (!isMounted) return;
        setVehicleTypes(res.data?.types || []);
      } catch (err) {
        console.error("Failed to load vehicle types:", err);
        if (!isMounted) return;
        // Fall back to sensible defaults so booking stays usable
        setVehicleTypes([
          { name: 'Scooty', code: 'scooty', seats: 1, ac: false, active: true },
          { name: 'Uber Bike', code: 'bike', seats: 1, ac: false, active: true },
          { name: 'Auto', code: 'auto', seats: 3, ac: false, active: true },
          { name: 'Go Sedan (4 seats)', code: 'car_4', seats: 4, ac: false, active: true },
          { name: 'Uber Go AC', code: 'car_ac', seats: 4, ac: true, active: true },
          { name: 'XL (6 seats)', code: 'car_6', seats: 6, ac: false, active: true }
        ]);
        setTypesError("");
      } finally {
        if (isMounted) setTypesLoading(false);
      }
    };
    loadTypes();
    return () => { isMounted = false; };
  }, []);

  // ✅ Join socket room and listen for ride updates
  useEffect(() => {
    if (auth?.user?._id) {
      console.log("🔌 Joining user room:", auth.user._id);
      socket.emit("joinUserRoom", auth.user._id);
      
      // Listen for ride updates
    socket.on("rideAccepted", (ride) => {
      console.log("📱 Received rideAccepted event:", ride);
      console.log("📱 Ride ID:", ride._id);
      console.log("📱 OTP received:", ride.otp);
      console.log("📱 Setting activeRide to:", ride);
      
      // Ensure ride has all required fields
      const completeRide = {
        ...ride,
        _id: ride._id || ride.id,
        riderId: ride.riderId || { _id: auth?.user?._id, fullName: auth?.user?.fullName, mobile: auth?.user?.mobile },
        captainId: ride.captainId || { _id: ride.captainId?._id, fullName: ride.captainId?.fullName, mobile: ride.captainId?.mobile }
      };
      
      console.log("📱 Complete ride data:", completeRide);
      
      setActiveRide(completeRide);
      setShowDriverDetails(true);
      setAssignedRider(completeRide.captainId);
      setOtp(completeRide.otp || "");
      setRideStatus("Rider accepted your ride! 🎉");
      showSuccess(`Ride accepted! Your OTP is: ${completeRide.otp || 'Not available'}`);
      
      // Join chat room immediately when ride is accepted
      const roomId = `ride_${completeRide._id}`;
      console.log("📱 Joining chat room for accepted ride:", roomId);
      socket.emit('joinChatRoom', roomId);
      
      // Force update debug info
      setTimeout(() => {
        console.log("📱 ActiveRide after setState:", completeRide);
      }, 100);
    });

    // Listen for chat messages globally
    socket.on("message", (messageData) => {
      console.log("📱 Received chat message:", messageData);
      // Play notification sound for incoming messages
      if (messageData.sender !== 'user') {
        playNotificationSound();
        // Increment unread message count if chat is not open
        if (!chatOpen) {
          setUnreadMessages(prev => prev + 1);
        }
      }
    });

      socket.on("rideStarted", (ride) => {
        setActiveRide(ride);
        setRideStatus("Ride started! 🚗");
      });

      socket.on("rideCompleted", (ride) => {
        setActiveRide(null);
        setAssignedRider(null);
        setRideStatus("Ride completed! ✅");
        try { localStorage.removeItem('activeRideId'); } catch (_) {}
      });

      socket.on("rideCancelled", (ride) => {
        setActiveRide(null);
        setAssignedRider(null);
        setRideStatus("Ride cancelled ❌");
        try { localStorage.removeItem('activeRideId'); } catch (_) {}
      });

      return () => {
        socket.off("rideAccepted");
        socket.off("rideStarted");
        socket.off("rideCompleted");
        socket.off("rideCancelled");
      };
    }
  }, [auth?.user?._id, showSuccess, showError]);

  // 📍 Get current location for pickup
  useEffect(() => {
    const resolveByBrowser = () =>
      new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
        );
      });

    const resolveByIP = async () => {
      const res = await fetch("https://ipapi.co/json/");
      const data = await res.json();
      if (!data || !data.latitude || !data.longitude) throw new Error("IP geolocation unavailable");
      return { lat: Number(data.latitude), lng: Number(data.longitude) };
    };

    const initLocation = async () => {
      try {
        const loc = await resolveByBrowser();
        setPickup(loc);
        const addr = await getAddressFromCoords(loc.lat, loc.lng);
        setPickupAddress(addr);
      } catch (err) {
        console.warn("Geolocation error:", err?.message || err);
        try {
          const loc = await resolveByIP();
          setPickup(loc);
          const addr = await getAddressFromCoords(loc.lat, loc.lng);
          setPickupAddress(addr);
        } catch (ipErr) {
          console.error("IP geolocation fallback failed:", ipErr?.message || ipErr);
        }
      }
    };

    initLocation();
  }, []);

  // 🌍 Reverse geocode helper
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
      );
      const address = res.data.results[0]?.formatted_address || "";
      return cleanAddress(address);
    } catch {
      return "";
    }
  };

  // 🧹 Clean address to remove location codes and format nicely
  const cleanAddress = (address) => {
    if (!address) return "";
    
    // Remove location codes like "64VJ+XFV" and similar patterns
    let cleaned = address.replace(/[A-Z0-9]{2,}\+[A-Z0-9]{2,}/g, '');
    
    // Remove extra commas and spaces
    cleaned = cleaned.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim();
    
    // Remove leading comma if exists
    if (cleaned.startsWith(',')) {
      cleaned = cleaned.substring(1).trim();
    }
    
    return cleaned;
  };

  // 🔎 Fetch suggestions using Google AutocompleteService (with 50 km radius)
  const fetchSuggestions = (input, setSuggestions, loc) => {
    if (!input || !window.google) return setSuggestions([]);

    const service = new window.google.maps.places.AutocompleteService();

    service.getPlacePredictions(
      {
        input,
        location: loc
          ? new window.google.maps.LatLng(loc.lat, loc.lng)
          : new window.google.maps.LatLng(17.385044, 78.486671), // Hyderabad fallback
        radius: 50000, // ✅ 50 km
        componentRestrictions: { country: "in" }, // ✅ restrict to India (optional)
      },
      (predictions, status) => {
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions
        ) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
      }
    );
  };

  const handlePickupSelect = async (placeId, description) => {
    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      service.getDetails(
        { placeId, fields: ["geometry.location"] },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place.geometry
          ) {
            const loc = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            setPickup(loc);
            setPickupAddress(cleanAddress(description));
            setPickupSuggestions([]);
          }
        }
      );
    } catch (err) {
      console.error("Pickup place details failed:", err);
    }
  };

  const handleDropSelect = async (placeId, description) => {
    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement("div")
      );
      service.getDetails(
        { placeId, fields: ["geometry.location"] },
        (place, status) => {
          if (
            status === window.google.maps.places.PlacesServiceStatus.OK &&
            place.geometry
          ) {
            const loc = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };
            setDrop(loc);
            setDropAddress(cleanAddress(description));
            setDropSuggestions([]);
          }
        }
      );
    } catch (err) {
      console.error("Drop place details failed:", err);
    }
  };

  // 🚖 Update ride options dynamically
  useEffect(() => {
    const km = distance ? parseFloat(distance) : 5; // Default to 5km if no distance
      setRideOptions([
      { 
        id: "bike", 
        name: "Bike", 
        icon: <TwoWheeler />,
        eta: "3 min", 
        price: "₹" + (km * 10).toFixed(2),
        description: "Quick and economical",
        color: "success"
      },
      { 
        id: "auto", 
        name: "Auto", 
        icon: <LocalTaxi />,
        eta: "2 min", 
        price: "₹" + (km * 15).toFixed(2),
        description: "Affordable and comfortable",
        color: "warning"
      },
      { 
        id: "car", 
        name: "Car", 
        icon: <DirectionsCar />,
        eta: "4 min", 
        price: "₹" + (km * 20).toFixed(2),
        description: "Comfortable and spacious",
        color: "primary"
      },
      { 
        id: "premium", 
        name: "Premium", 
        icon: <Star />,
        eta: "5 min", 
        price: "₹" + (km * 30).toFixed(2),
        description: "Luxury ride experience",
        color: "secondary"
      },
      { 
        id: "parcel", 
        name: "Parcel", 
        icon: <LocalShipping />,
        eta: "—", 
        price: "Go to Parcel Page",
        description: "Send packages safely",
        color: "info"
      }
    ]);
  }, [distance]);

  // 🔥 Create ride request
  const handleFindRiders = async () => {
    if (!pickup || !drop || !distance) {
      showError("Please select pickup and drop locations");
      return;
    }
    
    if (!selectedRide) {
      showError("Please select a vehicle type (Bike, Auto, Car, etc.)");
      return;
    }
    
    setLookingForRider(true);
    
    try {
      const res = await createRide({
        pickup: pickupAddress,
        drop: dropAddress,
        pickupCoords: pickup,
        dropCoords: drop,
        rideType: mapCodeToCategory(selectedRide)
      });
      
      if (res.data.success) {
        showSuccess("Ride request created successfully!");
      socket.emit("newRide", res.data.ride);
      }
    } catch (err) {
      setLookingForRider(false);
      showError(err.response?.data?.message || "Failed to create ride request");
    }
  };


  // 🚖 Socket listeners
  useEffect(() => {
    socket.on("rideAccepted", (ride) => {
      setLookingForRider(false);
      setAssignedRider(ride.acceptedBy);
      setRiderPanelOpen(true);
      setRideStatus("Rider en route 🚖");
    });

    socket.on("rideRejected", () => {
      setLookingForRider(false);
      alert("❌ All riders rejected your request.");
    });

    socket.on("riderLocationUpdate", ({ coords }) => {
      setRiderLocation(coords);
    });

    return () => {
      socket.off("rideAccepted");
      socket.off("rideRejected");
      socket.off("riderLocationUpdate");
    };
  }, []);

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 1, md: 3 } }}>
      <Box sx={{ 
        display: "grid", 
        gridTemplateColumns: { xs: "1fr", md: "1fr 2fr" }, 
        gap: { xs: 1, md: 2 }
      }}>
        {/* Mobile-First Left panel */}
        <Paper sx={{ 
          p: { xs: 2, md: 3 }, 
          borderRadius: { xs: 1, md: 2 }
        }}>
          <Typography variant={isMobile ? "body1" : "h6"} sx={{ 
            mb: { xs: 1.5, md: 2 },
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            Uber
            <Chip label="User" size="small" sx={{ ml: 0.5 }} />
          </Typography>

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            Find a trip
          </Typography>

          {/* ✅ Mobile-First Pickup Input with Suggestions */}
          <TextField
            fullWidth
            label="Pick-up location"
            value={pickupAddress}
            onChange={(e) => {
              setPickupAddress(e.target.value);
              fetchSuggestions(e.target.value, setPickupSuggestions, pickup);
            }}
            inputRef={pickupInputRef}
            sx={{ 
              mb: 1,
              '& .MuiInputBase-input': {
                fontSize: { xs: '16px', md: '14px' } // Prevent zoom on mobile
              }
            }}
          />
          {pickupSuggestions.map((s, i) => (
            <ListItemButton
              key={i}
              onClick={() => handlePickupSelect(s.place_id, s.description)}
            >
              {s.description}
            </ListItemButton>
          ))}

          {/* ✅ Mobile-First Drop Input with Suggestions */}
          <TextField
            fullWidth
            label="Drop-off location"
            value={dropAddress}
            onChange={(e) => {
              setDropAddress(e.target.value);
              fetchSuggestions(e.target.value, setDropSuggestions, pickup);
            }}
            inputRef={dropInputRef}
            sx={{ 
              mb: 1,
              '& .MuiInputBase-input': {
                fontSize: { xs: '16px', md: '14px' } // Prevent zoom on mobile
              }
            }}
          />
          {dropSuggestions.map((s, i) => (
            <ListItemButton
              key={i}
              onClick={() => handleDropSelect(s.place_id, s.description)}
            >
              {s.description}
            </ListItemButton>
          ))}

          {isMobile && drop && !showDriverDetails && !bottomSheetVisible && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setBottomSheetVisible(true);
                setSheetExpanded(false);
              }}
              sx={{ mt: 1 }}
            >
              Show ride options
            </Button>
          )}

          {/* Vehicle Selection - Desktop: show inline after drop; Mobile handled by bottom sheet */}
          {drop && !showDriverDetails && !isMobile && (
            <>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 700, 
                mb: 1.5, 
                mt: 2,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75
              }}>
                🚗 Choose a ride
                {!selectedRide && (
                  <Chip 
                    label="Required" 
                    color="error" 
                    size="small" 
                    variant="outlined"
                  />
                )}
              </Typography>
              
              {/* Uber-style section header */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Economy</Typography>
                <Typography variant="caption" color="text.secondary">quality drivers</Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1.5 }}>
                {typesLoading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2">Loading vehicle types…</Typography>
                  </Box>
                )}
                {typesError && (
                  <Alert severity="error">{typesError}</Alert>
                )}

                {!typesLoading && !typesError && vehicleTypes.filter(t => t.active).map((t) => {
                  const code = t.code || t.name?.toLowerCase() || "car";
                  const color = getColorForCode(code);
                  const icon = getIconForCode(code);
                  const etaMin = duration ? Math.max(1, Math.round(duration / 3)) : 3;
                  const price = estimatePriceForCode(code, distance);
                  const description = `${t.seats || 4} seats • ${t.ac ? 'AC' : 'Non-AC'}`;

                  return (
                    <Card
                      key={code}
                      onClick={() => setSelectedRide(code)}
                      sx={{
                        cursor: 'pointer',
                        border: selectedRide === code ? '2px solid' : '1px solid',
                        borderColor: selectedRide === code ? 'black' : 'grey.300',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 }
                      }}
                    >
                      <CardContent sx={{ p: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <Avatar sx={{ bgcolor: 'success.main', mr: 1, width: 36, height: 36, animation: `${pulse} 2s ease-in-out infinite` }}>
                              {icon}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                                {t.name || 'Car'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                                {description}
                              </Typography>
                             <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                               <Chip icon={<AccessTime />} label={`${etaMin} min`} size="small" variant="outlined" />
                             </Box>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                              {price}
                            </Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Parcel option at last */}
                {!typesLoading && !typesError && (
                  <Card
                    key="parcel"
                    onClick={() => navigate('/parcel')}
                    sx={{
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'grey.300',
                      transition: 'all 0.2s',
                      '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 }
                    }}
                  >
                    <CardContent sx={{ p: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <Avatar sx={{ bgcolor: 'success.main', mr: 1, width: 36, height: 36, animation: `${pulse} 2s ease-in-out infinite` }}>
                            <ShoppingBag />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                              Parcel
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                              Send packages and documents
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                              <Chip icon={<AccessTime />} label="3 min" size="small" variant="outlined" />
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'success.main' }}>
                            View
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                )}
              </Box>

          <Button
            fullWidth
            variant="contained"
                disabled={!drop || !selectedRide || lookingForRider}
                sx={{ 
                  bgcolor: selectedRide && !lookingForRider ? "black" : "grey.400", 
                  "&:hover": { bgcolor: selectedRide && !lookingForRider ? "#333" : "grey.400" }, 
                  mt: 2,
                  py: { xs: 1.5, md: 1 },
                  fontSize: { xs: '1rem', md: '0.875rem' },
                  minHeight: { xs: 48, md: 36 }
                }}
            onClick={handleFindRiders}
                startIcon={lookingForRider ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {lookingForRider
                  ? "Looking for drivers..."
                  : !drop
                    ? "Set drop location first"
                    : selectedRide
                      ? `Request ${displayNameForCode(selectedRide)}`
                      : "Select Vehicle Type First"}
              </Button>
            </>
          )}

          {/* Driver Assigned Tile - Shows in place of vehicle selection when ride is accepted */}
          {showDriverDetails && activeRide && (
            <Box sx={{ 
              mt: 3, 
              p: 2, 
              bgcolor: 'success.main',
              color: 'white',
              borderRadius: 2,
              boxShadow: 2
            }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 'bold', 
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                🚗 Driver Assigned
              </Typography>
              
              <Box sx={{ 
                bgcolor: 'rgba(255,255,255,0.1)', 
                borderRadius: 1, 
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 2
              }}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)' }}>
                  <DirectionsCar />
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {activeRide.captainId?.fullName || 'Driver'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {activeRide.captainId?.mobile || 'Contact not available'}
                  </Typography>
                  {/* Vehicle details for user (make, model, license) */}
                  <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                    Vehicle: {activeRide.captainId?.vehicle?.make || activeRide.captainId?.vehicleType || '—'}
                    {activeRide.captainId?.vehicle?.model ? ` ${activeRide.captainId.vehicle.model}` : ''}
                    {' • '}
                    License: {activeRide.captainId?.vehicle?.registrationNumber || activeRide.captainId?.vehicle?.plate || activeRide.captainId?.vehicleNumber || activeRide?.vehicleNumber || '—'}
                  </Typography>
                </Box>
              </Box>

              {/* OTP Display */}
              {activeRide && (otp || activeRide?.otp) && (
                <Box sx={{ 
                  bgcolor: 'rgba(255, 193, 7, 0.15)', 
                  p: 2, 
                  borderRadius: 2, 
                  border: '2px solid rgba(255, 193, 7, 0.5)',
                  mb: 2,
                  textAlign: 'center'
                }}>
                  <Typography variant="body2" sx={{ 
                    color: '#ff8f00', 
                    fontWeight: 'bold',
                    mb: 1
                  }}>
                    Verification Code
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    color: '#e65100', 
                    fontWeight: 'bold',
                    fontFamily: 'monospace',
                    letterSpacing: '0.2em'
                  }}>
                    {otp || activeRide?.otp}
                  </Typography>
                </Box>
              )}
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  startIcon={<Phone />}
                  onClick={handleCall}
                  sx={{
                    flex: 1,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Call
                </Button>
                <Button
                  variant="contained"
                  startIcon={
                    <Box sx={{ position: 'relative' }}>
                      <Chat />
                      {unreadMessages > 0 && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            bgcolor: 'error.main',
                            color: 'white',
                            borderRadius: '50%',
                            minWidth: 20,
                            height: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            border: '2px solid white'
                          }}
                        >
                          {unreadMessages > 9 ? '9+' : unreadMessages}
                        </Box>
                      )}
                    </Box>
                  }
                  onClick={handleChat}
                  sx={{
                    flex: 1,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                >
                  Message
          </Button>
              </Box>
            </Box>
          )}


          {(!pickup || !drop) && !isMobile && (
            <Box sx={{ 
              mt: 3, 
              p: 3, 
              textAlign: 'center',
              bgcolor: 'grey.50',
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'grey.300'
            }}>
              <Typography variant="h6" sx={{ 
                color: 'text.secondary', 
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1
              }}>
                📍 Select Pickup and Drop Locations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Choose your pickup and drop addresses to see available vehicle options
              </Typography>
            </Box>
          )}
          
        </Paper>

        {/* Mobile-First Right panel (Map) */}
        <Paper sx={{ 
          p: { xs: 0.5, md: 1 }, 
          borderRadius: { xs: 1, md: 2 },
          minHeight: { xs: 300, md: 500 }
        }}>
          <MapComponent
            apiKey={GOOGLE_API_KEY}
            pickup={pickup}
            setPickup={setPickup}
            setPickupAddress={setPickupAddress}
            drop={drop}
            setDrop={setDrop}
            setDropAddress={setDropAddress}
            riderLocation={riderLocation}
            driverLocation={activeRide?.captainId?.currentLocation}
            route={route}
            setRoute={setRoute}
            setDistance={setDistance}
            setDuration={setDuration}
          />
        </Paper>
      </Box>


      {/* Simple Chat Modal */}
      <SimpleChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        ride={activeRide}
        userRole="user"
        socket={socket}
        auth={auth}
      />
      
      {/* Debug info */}
      {chatOpen && (
        <div style={{ position: 'fixed', top: 10, right: 10, background: 'black', color: 'white', padding: '10px', zIndex: 9999 }}>
          <div>Socket: {socket ? 'Available' : 'Not available'}</div>
          <div>Connected: {socket?.connected ? 'Yes' : 'No'}</div>
          <div>Ride ID: {activeRide?._id || 'UNDEFINED'}</div>
          <div>ActiveRide: {activeRide ? 'Set' : 'Not set'}</div>
          <div>ShowDriverDetails: {showDriverDetails ? 'Yes' : 'No'}</div>
        </div>
      )}

      
      {/* Mobile bottom sheet: pops from below after drop is set */}
      <Drawer
        anchor="bottom"
        open={Boolean(isMobile && drop && !showDriverDetails && bottomSheetVisible)}
        onClose={(e, reason) => {
          // Collapse to regular size on backdrop or escape
          if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
            setSheetExpanded(false);
            setBottomSheetVisible(false);
            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
          }
        }}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            boxShadow: 6,
            height: sheetExpanded ? '85vh' : '35vh',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            transition: 'height 0.2s ease'
          }
        }}
      >
        {/* drag handle / tap area */}
        <Box
          sx={{ display: 'flex', justifyContent: 'center', pt: 1, cursor: 'pointer' }}
          onClick={() => setSheetExpanded(prev => !prev)}
        >
          <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'grey.400' }} />
        </Box>
        <Box
          sx={{ p: 2, pt: 1, overflowY: 'auto', flex: 1 }}
          onScroll={(e) => {
            try {
              const top = e.currentTarget.scrollTop;
              if (top > 24 && !sheetExpanded) setSheetExpanded(true);
            } catch (_) {}
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, mb: 1 }}>
            <Typography
              variant="subtitle1"
              component="div"
              sx={{ fontWeight: 700, cursor: sheetExpanded ? 'pointer' : 'default' }}
              onClick={() => { if (sheetExpanded) setSheetExpanded(false); }}
            >
              Choose a ride
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => {
                setSheetExpanded(false);
                setBottomSheetVisible(false);
                try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (_) {}
                // Focus drop input for quick edits
                try { dropInputRef.current?.focus(); } catch (_) {}
              }}
            >
              Edit locations
            </Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
            <Chip label="Pick up now" size="small" variant="outlined" />
            <Chip label="For me" size="small" variant="outlined" />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Economy</Typography>
            <Typography variant="caption" color="text.secondary">quality drivers</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {typesLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Loading vehicle types…</Typography>
              </Box>
            )}
            {typesError && (
              <Alert severity="error">{typesError}</Alert>
            )}

            {!typesLoading && !typesError && vehicleTypes.filter(t => t.active).map((t) => {
              const code = t.code || t.name?.toLowerCase() || "car";
              const icon = getIconForCode(code);
              const etaMin = duration ? Math.max(1, Math.round(duration / 3)) : 3;
              const price = estimatePriceForCode(code, distance);
              const description = `${t.seats || 4} seats • ${t.ac ? 'AC' : 'Non-AC'}`;

              return (
                <Card
                  key={`m-${code}`}
                  onClick={() => setSelectedRide(code)}
                  sx={{
                    cursor: 'pointer',
                    border: selectedRide === code ? '2px solid' : '1px solid',
                    borderColor: selectedRide === code ? 'black' : 'grey.300',
                    transition: 'all 0.2s',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 }
                  }}
                >
                  <CardContent sx={{ p: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <Avatar sx={{ bgcolor: 'success.main', mr: 1, width: 36, height: 36, animation: `${pulse} 2s ease-in-out infinite` }}>
                          {icon}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                            {t.name || 'Car'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                            {description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            <Chip icon={<AccessTime />} label={`${etaMin} min`} size="small" variant="outlined" />
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                          {price}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}

            {!typesLoading && !typesError && (
              <Card
                key="m-parcel"
                onClick={() => navigate('/parcel')}
                sx={{
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: 'grey.300',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-1px)', boxShadow: 2 }
                }}
              >
                <CardContent sx={{ p: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <Avatar sx={{ bgcolor: 'success.main', mr: 1, width: 36, height: 36, animation: `${pulse} 2s ease-in-out infinite` }}>
                        <ShoppingBag />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.25 }}>
                          Parcel
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25 }}>
                          Send packages and documents
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                          <Chip icon={<AccessTime />} label="3 min" size="small" variant="outlined" />
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                        View
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>

          {/* Payment method - Cash (for future use) */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Payment</Typography>
            <Card sx={{ border: '1px solid', borderColor: 'grey.300' }}>
              <CardContent sx={{ p: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ bgcolor: 'success.main', width: 32, height: 32 }}>
                      <AttachMoney />
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>Cash</Typography>
                      <Typography variant="caption" color="text.secondary">Pay with cash</Typography>
                    </Box>
                  </Box>
                  <Chip label="Default" size="small" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Box>

          <Button
            fullWidth
            variant="contained"
            disabled={!drop || !selectedRide || lookingForRider}
            sx={{
              bgcolor: selectedRide && !lookingForRider ? 'black' : 'grey.400',
              '&:hover': { bgcolor: selectedRide && !lookingForRider ? '#333' : 'grey.400' },
              mt: 2,
              py: 1.5
            }}
            onClick={handleFindRiders}
            startIcon={lookingForRider ? <CircularProgress size={20} color="inherit" /> : null}
          >
            {lookingForRider
              ? 'Looking for drivers...'
              : !drop
                ? 'Set drop location first'
                : selectedRide
                  ? `Request ${displayNameForCode(selectedRide)}`
                  : 'Select Vehicle Type First'}
          </Button>
        </Box>
      </Drawer>

      {/* Rider details drawer */}
      <Drawer 
        anchor="bottom" 
        open={riderPanelOpen} 
        onClose={() => setRiderPanelOpen(false)}
        PaperProps={{
          sx: { 
            borderTopLeftRadius: 20, 
            borderTopRightRadius: 20,
            maxHeight: '80vh'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          {assignedRider && (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{ 
                  width: 4, 
                  height: 40, 
                  bgcolor: 'success.main', 
                  borderRadius: 2, 
                  mr: 2 
                }} />
                <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                  Your driver is on the way! 🚗
                </Typography>
              </Box>

              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ 
                      width: 60, 
                      height: 60, 
                      bgcolor: 'primary.main',
                      mr: 2,
                      fontSize: '1.5rem'
                    }}>
                      {assignedRider.fullName?.charAt(0) || 'D'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {assignedRider.fullName}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Star sx={{ color: 'warning.main', fontSize: 20 }} />
                        <Typography variant="body2" color="text.secondary">
                          {assignedRider.rating || '4.5'} • {assignedRider.mobile}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Vehicle</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {(assignedRider.vehicle?.make || assignedRider.vehicleType || '—')}
                      {assignedRider.vehicle?.model ? ` ${assignedRider.vehicle.model}` : ''}
                      {' • '}
                      {(assignedRider.vehicle?.registrationNumber || assignedRider.vehicle?.plate || assignedRider.vehicleNumber || '—')}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Estimated Fare</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {rideOptions.find((r) => r.id === selectedRide)?.price}
              </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip 
                      label={rideStatus} 
                      color="success" 
                      size="small"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </Box>
                </CardContent>
              </Card>

              <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
                <Button 
                  variant="contained" 
                  color="success"
                  startIcon={<Phone />}
                  sx={{ flex: 1, py: 1.5 }}
                >
                  Call Driver
                </Button>
                <Button 
                  variant="outlined" 
                  color="primary"
                  startIcon={<Chat />}
                  sx={{ flex: 1, py: 1.5 }}
                >
                  Chat
                </Button>
                <Button 
                  variant="outlined" 
                  color="error"
                  sx={{ flex: 1, py: 1.5 }}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel
                </Button>
              </Box>

              <Alert severity="info" sx={{ borderRadius: 2 }}>
                <Typography variant="body2">
                  Your driver will arrive at the pickup location shortly. 
                  You can track their location in real-time on the map.
                </Typography>
              </Alert>
            </>
          )}
        </Box>
      </Drawer>

      <CancelTripModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelRide}
      />

    </Container>
  );
}
  // 🔁 Map vehicle type code to ride category accepted by backend
  const mapCodeToCategory = (code) => {
    if (!code) return "car";
    if (code.includes("bike") || code.includes("scooty")) return "bike";
    if (code.includes("auto")) return "auto";
    if (code.includes("car")) return "car";
    return "car";
  };

  const getIconForCode = (code) => {
    const lower = (code || '').toLowerCase();
    if (lower.includes('parcel')) return <ShoppingBag />;
    if (lower.includes('bike') || lower.includes('scooty')) return <TwoWheeler />;
    if (lower.includes('auto')) return <LocalTaxi />;
    if (lower.includes('car_6') || lower.includes('station')) return <AirportShuttle />;
    if (lower.includes('car_ac') || lower.includes('snow')) {
      return (
        <Box sx={{ position: 'relative' }}>
          <DirectionsCar />
          <AcUnit sx={{ position: 'absolute', right: -6, top: -4, fontSize: 14 }} />
        </Box>
      );
    }
    return <DirectionsCar />;
  };

  const getColorForCode = (code) => {
    return "success";
  };

  const estimatePriceForCode = (code, km) => {
    const d = km || 5;
    if (code.includes("bike") || code.includes("scooty")) return `₹${(d * 10).toFixed(2)}`;
    if (code.includes("auto")) return `₹${(d * 15).toFixed(2)}`;
    if (code.includes("car_ac")) return `₹${(d * 22).toFixed(2)}`;
    if (code.includes("car_6")) return `₹${(d * 25).toFixed(2)}`;
    if (code.includes("car_4")) return `₹${(d * 20).toFixed(2)}`;
    return `₹${(d * 20).toFixed(2)}`;
  };

  // Display name for button label
  const displayNameForCode = (code) => {
    const lower = (code || '').toLowerCase();
    if (lower.includes('bike') || lower.includes('scooty')) return 'Uber Bike';
    if (lower.includes('auto')) return 'Uber Auto';
    if (lower.includes('car_6')) return 'XL';
    if (lower.includes('car_ac')) return 'Uber Go AC';
    if (lower.includes('car') || lower.includes('car_4')) return 'Uber Go';
    return 'Ride';
  };
      {/* Mobile bottom sheet: pops from below after drop is set */}
