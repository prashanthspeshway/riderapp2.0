import React, { useState, useEffect, useRef } from "react";
import {
  Container, Paper, Typography, TextField, Box,
  Button, Drawer, CircularProgress, ListItemButton,
  Card, CardContent, Chip, Avatar, Divider,
  Stepper, Step, StepLabel, Alert, Snackbar, Grid,
  useTheme, useMediaQuery, IconButton
} from "@mui/material";
import {
  DirectionsCar, TwoWheeler, LocalTaxi, LocalShipping,
  LocationOn, AccessTime, AttachMoney, Star, Phone, Chat,
  AcUnit, AirportShuttle, ShoppingBag
} from "@mui/icons-material";
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
  const [currentRideId, setCurrentRideId] = useState(null);
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

  // Uber-like bottom sheet with scroll-based expansion
  const bottomSheetRef = useRef(null);
  const scrollableContentRef = useRef(null);
  const [lastScrollTop, setLastScrollTop] = useState(0);
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const lastScrollTime = useRef(Date.now());
  
  useEffect(() => {
    const scrollableElement = scrollableContentRef.current;
    const bottomSheetElement = bottomSheetRef.current;
    
    if (!scrollableElement || !bottomSheetElement || !isMobile || !bottomSheetVisible || !drop || showDriverDetails) {
      return;
    }

    let startY = 0;
    let isDragging = false;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = startY - currentY;
      
      // Swipe up to expand (like Uber) - more sensitive
      if (deltaY > 20 && !sheetExpanded) {
        setSheetExpanded(true);
        isDragging = false;
      } 
      // Swipe down to collapse (like Uber) - more sensitive
      else if (deltaY < -20 && sheetExpanded && scrollableElement.scrollTop <= 10) {
        setSheetExpanded(false);
        isDragging = false;
      }
    };

    const handleTouchEnd = () => {
      isDragging = false;
    };

    const handleScroll = (e) => {
      const element = e.target;
      const currentScrollTop = element.scrollTop;
      const now = Date.now();
      const timeDelta = now - lastScrollTime.current;
      const scrollDelta = currentScrollTop - lastScrollTop;
      
      // Calculate scroll velocity
      const velocity = timeDelta > 0 ? scrollDelta / timeDelta : 0;
      setScrollVelocity(velocity);
      
      // Uber-like scroll behavior - more sensitive
      if (scrollDelta < -5 && !sheetExpanded) {
        // Scrolling up while collapsed -> expand
        setSheetExpanded(true);
      } else if (scrollDelta > 5 && sheetExpanded && currentScrollTop <= 10) {
        // Scrolling down while expanded and near top -> collapse
        setSheetExpanded(false);
      }
      
      setLastScrollTop(currentScrollTop);
      lastScrollTime.current = now;
    };

    // Add event listeners
    bottomSheetElement.addEventListener('touchstart', handleTouchStart, { passive: true });
    bottomSheetElement.addEventListener('touchmove', handleTouchMove, { passive: true });
    bottomSheetElement.addEventListener('touchend', handleTouchEnd, { passive: true });
    scrollableElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      bottomSheetElement.removeEventListener('touchstart', handleTouchStart);
      bottomSheetElement.removeEventListener('touchmove', handleTouchMove);
      bottomSheetElement.removeEventListener('touchend', handleTouchEnd);
      scrollableElement.removeEventListener('scroll', handleScroll);
    };
  }, [sheetExpanded, isMobile, bottomSheetVisible, drop, showDriverDetails, lastScrollTop]);

  // Auto-scroll to top when sheet expands
  useEffect(() => {
    if (sheetExpanded && scrollableContentRef.current) {
      // Small delay to ensure the sheet has expanded before scrolling
      setTimeout(() => {
        scrollableContentRef.current?.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [sheetExpanded]);

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
        const rideId = res.data?.ride?._id || res.data?.ride?.id || res.data?.ride?.rideId || null;
        setCurrentRideId(rideId);
        socket.emit("newRide", res.data.ride);
      }
    } catch (err) {
      setLookingForRider(false);
      showError(err.response?.data?.message || "Failed to create ride request");
    }
  };

  // Client-side matchmaking (scoring) helper
  const matchDrivers = (drivers = [], { pickup, drop, type } = {}) => {
    if (!drivers.length || !pickup || !drop) return null;

    const haversine = (a, b) => {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371; // km
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };

    const scored = drivers
      .filter((d) => d.isAvailable !== false)
      .map((d) => {
        const distToPickup = d.location ? haversine(d.location, pickup) : 999;
        const vehicleMatch = d.vehicleType === type ? 1 : 0;
        const eta = d.etaMin || Math.round(distToPickup * 3) || 10; // rough fallback
        const rating = d.rating || 4.5;
        const priceBias = d.baseFare ? 1 / Math.max(1, d.baseFare) : 1; // cheaper preferred

        // Normalize and weight: lower distance & ETA is better, higher rating is better
        const score = 
          (1 / Math.max(0.3, distToPickup)) * 0.4 +
          (1 / Math.max(1, eta)) * 0.3 +
          (rating / 5) * 0.2 +
          (vehicleMatch ? 0.1 : 0) +
          priceBias * 0.05;

        return { ...d, _score: score, _distToPickup: distToPickup, _eta: eta };
      })
      .sort((a, b) => b._score - a._score);

    return scored[0] || null;
  };

  // Listen for nearbyDrivers and propose a best match
  useEffect(() => {
    const handler = (drivers) => {
      const best = matchDrivers(drivers, { pickup, drop, type: selectedRide });
      if (best && currentRideId) {
        socket.emit('proposeDriver', { rideId: currentRideId, driverId: best.id || best._id || best.driverId });
      }
    };
    socket.on('nearbyDrivers', handler);
    return () => socket.off('nearbyDrivers', handler);
  }, [pickup, drop, selectedRide, currentRideId]);


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

  // Helper functions
  const mapCodeToCategory = (code) => {
    const mapping = {
      'bike': 'bike',
      'auto': 'auto', 
      'car': 'car',
      'premium': 'premium',
      'parcel': 'parcel'
    };
    return mapping[code] || 'car';
  };

  const getIconForCode = (code) => {
    switch (code) {
      case 'bike': return '🏍️';
      case 'auto': return '🛺';
      case 'car': return '🚗';
      case 'premium': return '🚙';
      case 'parcel': return '📦';
      default: return '🚗';
    }
  };

  const getVehicleIcon = (code) => {
    switch (code) {
      case 'bike': return <TwoWheeler sx={{ fontSize: 40, color: 'success.main' }} />;
      case 'auto': return <LocalTaxi sx={{ fontSize: 40, color: 'warning.main' }} />;
      case 'car': return <DirectionsCar sx={{ fontSize: 40, color: 'primary.main' }} />;
      case 'premium': return <Star sx={{ fontSize: 40, color: 'secondary.main' }} />;
      case 'parcel': return <LocalShipping sx={{ fontSize: 40, color: 'info.main' }} />;
      default: return <DirectionsCar sx={{ fontSize: 40, color: 'primary.main' }} />;
    }
  };

  // Image src for vehicle types – using images from public/images/vehicles/
  const getVehicleImage = (code) => {
    const imageMap = {
      'bike': '/images/vehicles/bike.png',
      'scooty': '/images/vehicles/scooty.png',
      'auto': '/images/vehicles/auto.png',
      'auto_3': '/images/vehicles/auto.png',
      'car': '/images/vehicles/car.png',
      'car_4': '/images/vehicles/car.png',
      'car_ac': '/images/vehicles/car-ac.png',
      'car_6': '/images/vehicles/car-6seats.png',
      'premium': '/images/vehicles/premium.svg',
      'parcel': '/images/vehicles/parcel.png'
    };
    return imageMap[code] || `/images/vehicles/car.png`;
  };

  const getColorForCode = (code) => {
    switch (code) {
      case 'bike': return 'success';
      case 'auto': return 'warning';
      case 'car': return 'primary';
      case 'premium': return 'secondary';
      case 'parcel': return 'info';
      default: return 'primary';
    }
  };

  const estimatePriceForCode = (code, dist = distance) => {
    const km = dist ? parseFloat(dist) : 5;
    switch (code) {
      case 'bike': return (km * 10).toFixed(0);
      case 'auto': return (km * 15).toFixed(0);
      case 'car': return (km * 20).toFixed(0);
      case 'premium': return (km * 30).toFixed(0);
      case 'parcel': return (km * 12).toFixed(0);
      default: return (km * 20).toFixed(0);
    }
  };

  const displayNameForCode = (code) => {
    switch (code) {
      case 'bike': return 'Bike';
      case 'auto': return 'Auto';
      case 'car': return 'Car';
      case 'premium': return 'Premium';
      case 'parcel': return 'Parcel';
      default: return 'Car';
    }
  };

  return (
    <>
      {/* Mobile: Full-screen map with bottom sheet */}
      {isMobile ? (
        <Box sx={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
          {/* Full Screen Map */}
          <Box 
            sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              height: '100%',
              width: '100%'
            }}
            onClick={() => {
              // When map is tapped, collapse sheet and allow location input
              setSheetExpanded(false);
            }}
          >
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
              showActiveRide={!!activeRide} // Show online riders only when no active ride
              filterVehicleType={selectedRide} // Filter online riders by selected type
            />
          </Box>

          {/* Bottom Sheet - Uber-like */}
          <Box
            ref={bottomSheetRef}
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: sheetExpanded ? '85vh' : '40vh',
              backgroundColor: 'white',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              zIndex: 100
            }}
          >
            {/* Drag Handle */}
            <Box
              sx={{
                width: 40,
                height: 4,
                bgcolor: 'grey.400',
                borderRadius: 2,
                mx: 'auto',
                mt: 1.5,
                mb: 1,
                cursor: 'pointer'
              }}
              onClick={() => setSheetExpanded(!sheetExpanded)}
            />

            {/* Content - Scrollable */}
            <Box sx={{ overflowY: 'auto', flex: 1, px: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Find a trip
              </Typography>

              {/* Pickup Input */}
              <TextField
                fullWidth
                label="Pick-up location"
                value={pickupAddress}
                onChange={(e) => {
                  setPickupAddress(e.target.value);
                  fetchSuggestions(e.target.value, setPickupSuggestions, pickup);
                }}
                inputRef={pickupInputRef}
                sx={{ mb: 1 }}
              />
              {pickupSuggestions.map((s, i) => (
                <ListItemButton
                  key={i}
                  onClick={() => handlePickupSelect(s.place_id, s.description)}
                >
                  {s.description}
                </ListItemButton>
              ))}

              {/* Drop Input */}
              <TextField
                fullWidth
                label="Drop-off location"
                value={dropAddress}
                onChange={(e) => {
                  setDropAddress(e.target.value);
                  fetchSuggestions(e.target.value, setDropSuggestions, pickup);
                }}
                inputRef={dropInputRef}
                sx={{ mb: 2 }}
              />
              {dropSuggestions.map((s, i) => (
                <ListItemButton
                  key={i}
                  onClick={() => handleDropSelect(s.place_id, s.description)}
                >
                  {s.description}
                </ListItemButton>
              ))}

              {/* Vehicle Options - When drop is selected */}
              {drop && (
                <>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, mt: 3 }}>
                    Choose a ride
                  </Typography>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pb: 2 }}>
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
                            '&:hover': { borderColor: 'black' }
                          }}
                        >
                          <CardContent sx={{ p: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                <Avatar 
                                  src={getVehicleImage(code)} 
                                  sx={{ 
                                    mr: 1.5, 
                                    width: 56, 
                                    height: 56,
                                    bgcolor: 'grey.100',
                                    '& img': {
                                      objectFit: 'contain',
                                      padding: '10px'
                                    }
                                  }}
                                >
                                  {getVehicleIcon(code)}
                                </Avatar>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
                                    {t.name || 'Car'}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                                    {description}
                                  </Typography>
                                  <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                    <Chip 
                                      icon={<AccessTime />} 
                                      label={`${etaMin} min`} 
                                      size="small" 
                                      variant="outlined"
                                    />
                                  </Box>
                                </Box>
                              </Box>
                              <Box sx={{ textAlign: 'right' }}>
                                <Typography variant="subtitle2">
                                  ₹{price}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>

                  {/* Request Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={!selectedRide || lookingForRider}
                    sx={{ 
                      bgcolor: selectedRide && !lookingForRider ? "black" : "grey.400", 
                      "&:hover": { bgcolor: selectedRide && !lookingForRider ? "#333" : "grey.400" }, 
                      mt: 2,
                      mb: 2,
                      py: 1.5,
                      fontSize: '1rem',
                      minHeight: 48
                    }}
                    onClick={handleFindRiders}
                    startIcon={lookingForRider ? <CircularProgress size={20} color="inherit" /> : null}
                  >
                    {lookingForRider
                      ? "Looking for drivers..."
                      : selectedRide
                        ? `Request ${displayNameForCode(selectedRide)}`
                        : "Select Vehicle Type First"}
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Box>
      ) : (
        /* Desktop Layout */
        <Container maxWidth="xl" sx={{ mt: 3 }}>
          <Box sx={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 2fr", 
            gap: 2
          }}>
            {/* Left panel - Desktop */}
            <Paper sx={{ 
              p: 3, 
              borderRadius: 2
            }}>
          <Typography variant={isMobile ? "body1" : "h6"} sx={{ 
            mb: { xs: 1.5, md: 2 },
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
            Uber
            <Chip label="User" size="small" sx={{ ml: 0.5 }} />
          </Typography>

          <Typography variant="subtitle2" sx={{ mb: 1 }}>
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
              <Typography variant="subtitle1" component="div" sx={{ 
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
                <Typography variant="subtitle2">Economy</Typography>
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
                        borderColor: selectedRide === code ? 'black' : 'grey.300'
                      }}
                    >
                      <CardContent sx={{ p: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                            <Avatar 
                              src={getVehicleImage(code)} 
                              sx={{ 
                                mr: 1, 
                                width: 48, 
                                height: 48,
                                bgcolor: 'grey.100',
                                '& img': {
                                  objectFit: 'contain',
                                  padding: '8px'
                                }
                              }}
                            >
                              {getVehicleIcon(code)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ mb: 0.25 }}>
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
                            <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
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
                      borderColor: 'grey.300'
                    }}
                  >
                    <CardContent sx={{ p: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <Avatar 
                            src={getVehicleImage('parcel')} 
                            sx={{ mr: 1, width: 36, height: 36 }}
                          >
                            <ShoppingBag />
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ mb: 0.25 }}>
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
                          <Typography variant="subtitle2" sx={{ color: 'success.main' }}>
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
                  <Typography variant="h6">
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
                    mb: 1
                  }}>
                    Verification Code
                  </Typography>
                  <Typography variant="h4" sx={{ 
                    color: '#e65100', 
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
            showActiveRide={!!activeRide} // Show online riders only when no active ride
            filterVehicleType={selectedRide} // Filter online riders by selected type (desktop)
          />
        </Paper>
      </Box>
      </Container>
      )}
      
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

      
      {/* Backdrop */}
      {isMobile && drop && !showDriverDetails && bottomSheetVisible && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1299,
            opacity: sheetExpanded ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: sheetExpanded ? 'auto' : 'none'
          }}
          onClick={() => {
            setSheetExpanded(false);
            setBottomSheetVisible(false);
          }}
        />
      )}

      {/* Uber-like Mobile Bottom Sheet */}
      {isMobile && drop && !showDriverDetails && bottomSheetVisible && (
        <Box
          ref={bottomSheetRef}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: sheetExpanded ? '85vh' : '40vh',
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'height 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            zIndex: 1300,
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <Box
            sx={{
              width: 40,
              height: 4,
              bgcolor: 'grey.400',
              borderRadius: 2,
              mx: 'auto',
              mt: 1.5,
              mb: 1,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: 'grey.500',
                transform: 'scaleX(1.2)'
              },
              '&:active': {
                transform: 'scale(0.9)'
              }
            }}
            onClick={() => setSheetExpanded(!sheetExpanded)}
          />
        
        <Box ref={scrollableContentRef} sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography
              variant="h6"
              component="div"
            >
              Choose a ride
            </Typography>
          </Box>
          


          


          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {typesLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, py: 2 }}>
                <CircularProgress size={20} />
                <Typography variant="body2">Loading vehicle types…</Typography>
              </Box>
            )}
            {typesError && (
              <Alert severity="error" sx={{ mx: 1 }}>{typesError}</Alert>
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
                    borderColor: selectedRide === code ? 'primary.main' : 'grey.300',
                    '&:hover': { borderColor: 'primary.main' }
                  }}
                >
                  <CardContent sx={{ p: 1.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <Avatar 
                            src={getVehicleImage(code)} 
                            sx={{ 
                              mr: 1.5, 
                              width: 56, 
                              height: 56,
                              bgcolor: 'grey.100',
                              '& img': {
                                objectFit: 'contain',
                                padding: '10px'
                              }
                            }}
                          >
                            {getVehicleIcon(code)}
                          </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ mb: 0.25 }}>
                            {t.name || 'Car'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                            {description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                            <Chip 
                              icon={<AccessTime />} 
                              label={`${etaMin} min`} 
                              size="small" 
                              variant="outlined"
                            />
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2">
                          {price}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          estimated
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
                  borderColor: 'grey.300'
                }}
              >
                <CardContent sx={{ p: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <Avatar 
                        src={getVehicleImage('parcel')} 
                        sx={{ 
                          mr: 1, 
                          width: 48, 
                          height: 48,
                          bgcolor: 'grey.100',
                          '& img': {
                            objectFit: 'contain',
                            padding: '8px'
                          }
                        }}
                      >
                        <ShoppingBag />
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ mb: 0.25 }}>
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
                      <Typography variant="subtitle2" sx={{ color: 'text.primary' }}>
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
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Payment</Typography>
            <Card sx={{ border: '1px solid', borderColor: 'grey.300' }}>
              <CardContent sx={{ p: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar 
                      src="/images/vehicles/cash.svg" 
                      sx={{ width: 32, height: 32 }}
                    >
                      <AttachMoney />
                    </Avatar>
                    <Box>
                      <Typography variant="body2">Cash</Typography>
                      <Typography variant="caption" color="text.secondary">Pay with cash</Typography>
                    </Box>
                  </Box>
                  <Chip label="Default" size="small" variant="outlined" />
                </Box>
              </CardContent>
            </Card>
          </Box>

          {/* Request button */}
          <Button
            variant="contained"
            fullWidth
            disabled={!drop || !selectedRide || lookingForRider}
            onClick={handleFindRiders}
            sx={{ 
              mt: 2, 
              py: 1.5
            }}
          >
            {lookingForRider ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} color="inherit" />
                Looking for drivers...
              </>
            ) : !drop ? (
              "Set drop location first"
            ) : !selectedRide ? (
              "Select Vehicle Type First"
            ) : (
              `Request ${vehicleTypes.find(v => (v.code || v.name?.toLowerCase()) === selectedRide)?.name || selectedRide}`
            )}
          </Button>
        </Box>
      </Box>
      )}

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
                <Typography variant="h5">
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
                      <Typography variant="h6">
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
                    <Typography variant="h6" sx={{ color: 'primary.main' }}>
                      {rideOptions.find((r) => r.id === selectedRide)?.price}
              </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Chip 
                      label={rideStatus} 
                      color="success" 
                      size="small"
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
    </>
  );
}
