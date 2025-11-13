import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Grid,
  Avatar,
  Chip,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Badge,
  useTheme,
  useMediaQuery,
  Modal,
  Fade,
  Backdrop,
  IconButton,
  AppBar,
  Toolbar,
  InputBase,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from "@mui/material";
import Navbar from "../../components/Navbar";
import RiderMobileMenu from "../../components/RiderMobileMenu";
import {
  DirectionsCar,
  LocationOn,
  AccessTime,
  AttachMoney,
  Phone,
  Chat,
  Star,
  Person,
  CheckCircle,
  Cancel,
  PlayArrow,
  Stop,
  PowerSettingsNew,
  Today,
  Schedule,
  LocalGasStation,
  Speed,
  Route,
  TrendingUp,
  TrendingDown,
  Security,
  Menu as MenuIcon,
  Search,
  History,
  Settings,
  Help,
  AccountCircle,
  Logout
} from "@mui/icons-material";
import axios from "axios";
import { API_BASE } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import socket from "../../services/socket";
import Map from "../../components/Map";
import { useNotification } from "../../contexts/NotificationContext";
import { getPendingRides, acceptRide, rejectRide } from "../../services/api";
import SimpleChatModal from "../../components/SimpleChatModal";
import ChatNotification from "../../components/ChatNotification";
import RideNotification from "../../components/RideNotification";
import OTPVerificationModal from "../../components/OTPVerificationModal";

// Google Maps API Key (prefer env at runtime for LAN/mobile)
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo";

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

export default function RiderDashboard() {
  const [rides, setRides] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [earnings, setEarnings] = useState({
    today: 7.75,
    week: 320.75,
    month: 1250.00,
    total: 5670.25
  });
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [stats, setStats] = useState({
    totalRides: 156,
    completedRides: 142,
    rating: 4.8,
    onlineTime: 0
  });
  
  // Bottom sheet state
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [newRideRequest, setNewRideRequest] = useState(null);
  
  // Debug: Log when newRideRequest changes
  useEffect(() => {
    console.log("🔔 newRideRequest state changed:", newRideRequest);
  }, [newRideRequest]);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  // map state
  const [pickup, setPickup] = useState(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [drop, setDrop] = useState(null);
  const [dropAddress, setDropAddress] = useState("");
  const [riderLocation, setRiderLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);

  useEffect(() => {
    // Early return if not authenticated - don't make any API calls
    if (!auth?.user || !auth?.token) {
      console.log("❌ No auth data found, redirecting to rider login");
      console.log("  - Auth object:", auth);
      console.log("  - Token in localStorage:", !!localStorage.getItem("auth"));
      // Don't navigate immediately, let the user see what's wrong
      setTimeout(() => {
        navigate("/rider-login");
      }, 100);
      return; // IMPORTANT: Return early to prevent API calls
    }
    
    // Validate token format
    const token = auth.token;
    if (typeof token !== 'string' || token.length < 10) {
      console.error("❌ Invalid token format");
      showError("Invalid session. Please login again.");
        setTimeout(async () => {
          await logout();
          navigate("/rider-login");
        }, 1000);
      return; // IMPORTANT: Return early to prevent API calls
    }
    
    console.log("✅ Auth check passed - User:", auth.user?.mobile, "Role:", auth.user?.role);

    // Load rider data - only called if auth is valid
    const loadRiderData = async () => {
      // Double check auth before making any API call
      if (!auth?.token || !auth?.user) {
        console.log("❌ loadRiderData - No auth, skipping API call");
        return;
      }
      
      try {
        const token = auth.token;
        if (!token || typeof token !== 'string' || token.length < 10) {
          console.log("❌ Invalid token format, skipping API call");
          return;
        }
        
        console.log('🔄 Loading rider data...');
        console.log('  - API Base:', API_BASE);
        console.log('  - Token present:', !!token);
        console.log('  - User ID:', auth.user?._id);
        
        const response = await axios.get(`${API_BASE}/api/rider/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Rider data response:', response.data);
        
        if (response.data.success) {
          const riderData = response.data.rider;
          setIsOnline(riderData.isOnline || false);
          setIsAvailable(riderData.isAvailable || false);
          
          // Set earnings (mock data for now)
          setEarnings({
            today: 7.75,
            week: 320.75,
            month: 1250.00,
            total: 5670.25
          });
          
          // Set stats (mock data for now)
          setStats({
            totalRides: 156,
            completedRides: 142,
            rating: 4.8,
            onlineTime: 420 // minutes
          });
        }
      } catch (error) {
        console.error("❌ Error loading rider data:", error);
        console.error("  - Error type:", error.response ? 'API Error' : 'Network Error');
        console.error("  - Status:", error.response?.status);
        console.error("  - Message:", error.message);
        
        // Check if request was cancelled due to missing token
        if (error.isCancel || axios.isCancel?.(error) || error.message === 'No authentication token available' || error.message === 'Request cancelled') {
          console.log("⚠️ Request cancelled - no token available");
          return; // Don't show error, just return
        }
        
        if (!error.response) {
          // Network error - don't redirect, just set defaults
          console.warn("⚠️ Network error - API not reachable, using defaults");
          setIsOnline(false);
          setIsAvailable(false);
        } else if (error.response?.status === 401) {
          // Only logout if we actually had a token (means it's invalid/expired)
          const hadToken = auth?.token && auth.token.length > 10;
          if (hadToken) {
            console.log("❌ Authentication error - token invalid/expired");
            showError("Session expired. Please login again.");
            await logout();
            navigate("/rider-login");
          } else {
            console.log("⚠️ 401 but no token - likely not logged in yet");
          }
        } else {
          console.log("⚠️ API error, setting default values:", error.message);
          setIsOnline(false);
          setIsAvailable(false);
        }
      }
    };

    // Only make API calls if we have valid auth
    if (auth?.token && auth?.user) {
      loadRiderData();
      fetchPendingRides();
    } else {
      console.warn("⚠️ Skipping API calls - no valid auth");
    }

    // Socket.IO connection
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      if (auth?.user?._id) {
        const riderId = auth.user._id.toString();
        socket.emit("joinRiderRoom", riderId);
        console.log("🚗 Rider joined room:", riderId);
        console.log("🚗 Socket ID:", socket.id);
        console.log("🚗 Auth user ID:", auth.user._id);
        
        // 🔧 FIX: Also emit to ALL possible rider IDs for compatibility
        // This ensures we receive events even if ID mismatch occurs
        const alternativeIds = [
          riderId,
          auth.user.mobile,
          `rider_${riderId}`,
          `user_${riderId}`
        ];
        console.log("🔧 Joining multiple rooms for compatibility:", alternativeIds);
        alternativeIds.forEach(id => socket.emit("joinRiderRoom", id));
      } else {
        console.error("❌ No auth user ID available for rider room");
      }
    });

    socket.on("newRide", (ride) => {
      console.log("New ride received:", ride);
      fetchPendingRides(true);
      setNewRideRequest(ride); // Show ride request popup
      playNotificationSound();
    });

    socket.on("rideRequest", (ride) => {
      console.log("📱📱📱 RIDE REQUEST RECEIVED! 📱📱📱");
      console.log("📱 Ride details:", ride);
      console.log("📱 Ride ID:", ride._id);
      console.log("📱 Ride type:", ride.rideType);
      console.log("📱 Fare:", ride.totalFare);
      console.log("📱 Pickup:", ride.pickup);
      console.log("📱 Setting newRideRequest state...");
      
      setNewRideRequest(ride); // Show ride request popup
      playNotificationSound();
      
      // Debug: Check state after a moment
      setTimeout(() => {
        console.log("📱 After setState - checking if popup should be visible");
      }, 100);
    });

    socket.on("rideAccepted", (ride) => {
      console.log("🎉 Ride accepted:", ride);
      setSelectedRide(ride);
      setNotificationOpen(true);
    });

    socket.on("rideStarted", (ride) => {
      console.log("Ride started:", ride);
      setSelectedRide(ride);
    });

    socket.on("otpVerified", (data) => {
      console.log("🎉 OTP verified event received:", data);
      
      if (selectedRide && (selectedRide._id == data.rideId || selectedRide._id === data.rideId)) {
        console.log("✅ Updating ride status to started");
        setSelectedRide(prev => {
          const updated = { ...prev, otpVerified: true, status: "started" };
          return updated;
        });
        setOtpModalOpen(false);
        showSuccess("OTP verified successfully! Ride activated.");
      }
    });

    socket.on("message", (messageData) => {
      console.log("🚗 Received chat message:", messageData);
      if (messageData.sender !== 'rider') {
        playNotificationSound();
        if (!chatOpen) {
          setUnreadMessages(prev => prev + 1);
        }
      }
    });

    socket.on("rideCompleted", (ride) => {
      console.log("Ride completed:", ride);
      setSelectedRide(null);
      fetchPendingRides(true);
    });

    socket.on("rideCancelled", (ride) => {
      console.log("Ride cancelled:", ride);
      setSelectedRide(null);
      fetchPendingRides(true);
    });

    return () => {
      socket.off("connect");
      socket.off("newRide");
      socket.off("rideRequest");
      socket.off("rideAccepted");
      socket.off("rideStarted");
      socket.off("otpVerified");
      socket.off("rideCompleted");
      socket.off("rideCancelled");
    };
  }, [auth, navigate, showSuccess]);

  // GPS Location Tracking - Update location continuously while online
  useEffect(() => {
    if (!isOnline || !auth?.token) {
      return;
    }
    
    console.log("📍 Starting GPS tracking for online rider");
    
    // Update location every 10 seconds while online
    const locationInterval = setInterval(async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true, // Force GPS on mobile
              timeout: 10000,
              maximumAge: 0 // Force fresh GPS reading
            }
          );
        });
        
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        console.log("📍 GPS Location update:", location, "Accuracy:", position.coords.accuracy);
        
        // Update location on server
        try {
          await axios.put(
            `${API_BASE}/api/rider/location`,
            {
              lat: location.lat,
              lng: location.lng
            },
            { headers: { Authorization: `Bearer ${auth.token}` } }
          );
          
          // Update local state for map
          setRiderLocation(location);
          console.log("✅ Location updated on server");
        } catch (locError) {
          console.error("❌ Error updating location:", locError);
        }
      } catch (gpsError) {
        console.error("❌ GPS error:", gpsError);
      }
    }, 10000); // Update every 10 seconds
    
    return () => {
      clearInterval(locationInterval);
      console.log("📍 Stopped GPS tracking");
    };
  }, [isOnline, auth?.token]);

  // Inactivity Detection - Auto-offline after 10 minutes
  useEffect(() => {
    if (!isOnline || !auth?.token) {
      return;
    }
    
    let inactivityTimer;
    let lastActivityTime = Date.now();
    
    const resetTimer = () => {
      lastActivityTime = Date.now();
      clearTimeout(inactivityTimer);
      
      // Set timer for 10 minutes (600000 ms)
      inactivityTimer = setTimeout(async () => {
        const timeSinceActivity = Date.now() - lastActivityTime;
        if (timeSinceActivity >= 600000) { // 10 minutes
          console.log("⏰ Rider inactive for 10 minutes, going offline");
          try {
            await axios.put(
              `${API_BASE}/api/rider/status`,
              { isOnline: false },
              { headers: { Authorization: `Bearer ${auth.token}` } }
            );
            setIsOnline(false);
            setIsAvailable(false);
            showError("You've been inactive for 10 minutes. Going offline.");
          } catch (error) {
            console.error("❌ Error setting offline due to inactivity:", error);
          }
        }
      }, 600000);
    };
    
    // Track user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
      window.addEventListener(event, resetTimer, true);
    });
    
    // Initialize timer
    resetTimer();
    
    return () => {
      clearTimeout(inactivityTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetTimer, true);
      });
    };
  }, [isOnline, auth?.token, showError]);

  // Removed slider event handlers

  const fetchPendingRides = async (silent = false) => {
    // Guard: Don't make API call if not authenticated
    if (!auth?.token || !auth?.user) {
      console.warn('⚠️ Skipping fetchPendingRides - not authenticated');
      return;
    }
    
    try {
      if (!silent) setLoading(true);
      
      console.log('🔄 Fetching pending rides...');
      console.log('  - Auth token:', auth?.token ? 'Present' : 'Missing');
      console.log('  - API Base:', API_BASE);
      
      const response = await getPendingRides();
      
      console.log('✅ Pending rides response:', response.data);
      
      if (response.data?.success) {
        setRides(response.data.rides || []);
        console.log('✅ Loaded', response.data.rides?.length || 0, 'pending rides');
      } else {
        console.warn('⚠️ API returned success=false:', response.data);
        if (!silent) showError(response.data?.message || "Failed to fetch rides");
      }
    } catch (error) {
      console.error("❌ Error fetching rides:", error);
      console.error("  - Error type:", error.response ? 'API Error' : 'Network Error');
      console.error("  - Status:", error.response?.status);
      console.error("  - Message:", error.message);
      console.error("  - Response data:", error.response?.data);
      
      // Check if request was cancelled due to missing token
      if (error.isCancel || axios.isCancel?.(error) || error.message === 'No authentication token available' || error.message === 'Request cancelled') {
        console.log("⚠️ Request cancelled - no token available");
        return; // Don't show error, just return
      }
      
      if (!silent) {
        // Distinguish between network errors and auth errors
        if (!error.response) {
          // Network error - API not reachable
          showError("Cannot connect to server. Check your connection.");
        } else if (error.response?.status === 401) {
          // Only logout if we actually had a token (means it's invalid/expired)
          const hadToken = auth?.token && auth.token.length > 10;
          if (hadToken) {
            showError("Session expired. Please login again.");
            await logout();
            navigate("/rider-login");
          } else {
            console.log("⚠️ 401 but no token - likely not logged in yet");
          }
        } else if (error.response?.data?.error) {
          showError(error.response.data.error);
        } else if (error.response?.data?.message) {
          showError(error.response.data.message);
        } else {
          showError("Failed to fetch rides");
        }
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    try {
      const newOnlineStatus = !isOnline;
      
      const token = auth?.token;
      if (!token) {
        showError("Please login again");
        navigate("/login");
        return;
      }
      
      // If going online, get current GPS location first
      let currentLocation = null;
      if (newOnlineStatus) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true, // Force GPS on mobile
                timeout: 10000,
                maximumAge: 0 // Force fresh GPS reading
              }
            );
          });
          
          currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          console.log("📍 GPS Location obtained for going online:", currentLocation);
          
          // Update location immediately when going online
          try {
            await axios.put(
              `${API_BASE}/api/rider/location`,
              {
                lat: currentLocation.lat,
                lng: currentLocation.lng
              },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            console.log("✅ Location updated when going online");
          } catch (locError) {
            console.warn("⚠️ Could not update location:", locError);
          }
        } catch (gpsError) {
          console.error("❌ GPS error when going online:", gpsError);
          showError("Could not get GPS location. Please enable location services.");
          return;
        }
      }
      
      const response = await axios.put(
        `${API_BASE}/api/rider/status`,
        { isOnline: newOnlineStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setIsOnline(newOnlineStatus);
        
        if (!newOnlineStatus) {
          setIsAvailable(false);
        }
        
        // Ensure rider joins socket room when going online
        if (newOnlineStatus && auth?.user?._id) {
          console.log("🔄 Joining rider room after going online");
          socket.emit("joinRiderRoom", auth.user._id.toString());
        }
        
        showSuccess(newOnlineStatus ? "You are now online!" : "You are now offline!");
      } else {
        showError(response.data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating online status:", error);
      
      if (error.response?.status === 401) {
        showError("Session expired. Please login again.");
        await logout();
        navigate("/login");
      } else if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError("Failed to update status");
      }
    }
  };

  // Slider handlers removed - using direct toggle now

  const handleAcceptRide = async (rideId) => {
    try {
      const response = await acceptRide(rideId);
      if (response.data?.success) {
        showSuccess("Ride accepted! Navigating to pickup location.");
        
        const acceptedRide = response.data.ride;
        if (acceptedRide) {
          // Fetch full ride details immediately after acceptance
          try {
            const rideDetailsResponse = await axios.get(
              `${API_BASE}/api/rides/${acceptedRide._id}`,
              { headers: { Authorization: `Bearer ${auth?.token}` } }
            );
            
            if (rideDetailsResponse.data.success && rideDetailsResponse.data.ride) {
              const fullRideData = rideDetailsResponse.data.ride;
              setSelectedRide(fullRideData);
              
              // Show user's pickup location on map
              if (fullRideData.pickupCoords) {
                setPickup({
                  lat: fullRideData.pickupCoords.lat,
                  lng: fullRideData.pickupCoords.lng
                });
                setPickupAddress(fullRideData.pickup || "");
              }
              
              if (fullRideData.dropCoords) {
                setDrop({
                  lat: fullRideData.dropCoords.lat,
                  lng: fullRideData.dropCoords.lng
                });
                setDropAddress(fullRideData.drop || "");
              }
              
              // Join chat room for communication
              const roomId = `ride_${acceptedRide._id}`;
              socket.emit('joinChatRoom', roomId);
              console.log("✅ Joined chat room:", roomId);
            }
          } catch (error) {
            console.error("Error fetching ride details:", error);
            // Use accepted ride data as fallback
            setSelectedRide(acceptedRide);
            if (acceptedRide.pickupCoords) {
              setPickup({
                lat: acceptedRide.pickupCoords.lat,
                lng: acceptedRide.pickupCoords.lng
              });
              setPickupAddress(acceptedRide.pickup || "");
            }
          }
        }
        
        fetchPendingRides();
      } else {
        showError(response.data?.message || "Failed to accept ride");
      }
    } catch (error) {
      console.error("Error accepting ride:", error);
      if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError("Failed to accept ride");
      }
    }
  };

  const handleRejectRide = async (rideId) => {
    try {
      const response = await rejectRide(rideId);
      if (response.data?.success) {
        showSuccess("Ride rejected");
        fetchPendingRides();
      } else {
        showError(response.data?.message || "Failed to reject ride");
      }
    } catch (error) {
      console.error("Error rejecting ride:", error);
      if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError("Failed to reject ride");
      }
    }
  };

  const handleCall = () => {
    if (selectedRide?.riderId?.mobile) {
      window.open(`tel:${selectedRide.riderId.mobile}`);
    } else {
      showError("Rider contact not available");
    }
  };

  const handleChat = () => {
    setChatOpen(true);
    setUnreadMessages(0);
  };

  const handleCancelRide = async (rideId) => {
    try {
      const token = auth?.token;
      if (!token) {
        showError("Please login again");
        await logout();
        navigate("/rider-login");
        return;
      }
      
      const response = await axios.put(
        `${API_BASE}/api/rides/${rideId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        showSuccess("Ride cancelled");
        setSelectedRide(null);
        setOtpModalOpen(false);
        socket.emit("rideCancelled", { rideId, riderId: auth?.user?._id });
      }
    } catch (error) {
      console.error("Error cancelling ride:", error);
      showError("Failed to cancel ride");
    }
  };

  const handleOTPVerified = async (rideId) => {
    console.log("✅ OTP verified for ride:", rideId);
    
    try {
      // Fetch the complete ride details from backend
      const response = await axios.get(
        `${API_BASE}/api/rides/${rideId}`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );
      
      if (response.data.success && response.data.ride) {
        const fullRideData = response.data.ride;
        console.log("📦 Full ride data after OTP verification:", fullRideData);
        
        // Update selected ride with complete data
        setSelectedRide(fullRideData);
        
        // Show user's pickup location on map
        if (fullRideData.pickupCoords) {
          setPickup({
            lat: fullRideData.pickupCoords.lat,
            lng: fullRideData.pickupCoords.lng
          });
          setPickupAddress(fullRideData.pickup || "");
        }
        
        if (fullRideData.dropCoords) {
          setDrop({
            lat: fullRideData.dropCoords.lat,
            lng: fullRideData.dropCoords.lng
          });
          setDropAddress(fullRideData.drop || "");
        }
        
        showSuccess("OTP verified! Navigate to user's pickup location.");
      } else {
        // Fallback to old behavior if fetch fails
        if (selectedRide && selectedRide._id == rideId) {
          setSelectedRide(prev => {
            const updated = { ...prev, otpVerified: true, status: "started" };
            return updated;
          });
        }
        fetchPendingRides(true);
      }
    } catch (error) {
      console.error("Error fetching ride details after OTP verification:", error);
      // Fallback to old behavior
      if (selectedRide && selectedRide._id == rideId) {
        setSelectedRide(prev => {
          const updated = { ...prev, otpVerified: true, status: "started" };
          return updated;
        });
      }
      fetchPendingRides(true);
    }
    
    setOtpModalOpen(false);
    
    setTimeout(() => {
      showSuccess("Ride activated successfully!");
    }, 100);
  };

  return (
    <Box sx={{ 
      height: '100vh',
      width: '100%',
      position: 'fixed',
      top: 0,
      left: 0,
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      '@keyframes pulse': {
        '0%': {
          opacity: 1,
        },
        '50%': {
          opacity: 0.5,
        },
        '100%': {
          opacity: 1,
        },
      },
    }}>
      {/* Original Navbar Component */}
      <Navbar />

      {/* Mobile Menu Component */}
      <RiderMobileMenu />

      {/* Account Menu for Desktop */}
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={() => setMenuAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { setMenuAnchorEl(null); setEarningsModalOpen(true); }}>
          <ListItemIcon><AttachMoney /></ListItemIcon>
          Earnings
        </MenuItem>
        <MenuItem onClick={() => setMenuAnchorEl(null)}>
          <ListItemIcon><Help /></ListItemIcon>
          Help
        </MenuItem>
      </Menu>

      {/* Full Screen Google Map */}
      <Box sx={{
        position: 'absolute',
        top: isMobile ? '0px' : '64px', // No navbar on mobile, navbar on desktop
        left: 0,
        right: 0,
        bottom: 0, // Full height now
        zIndex: 1
      }}>
        <Map 
          apiKey={GOOGLE_API_KEY}
          pickup={pickup}
          setPickup={setPickup}
          setPickupAddress={setPickupAddress}
          drop={drop}
          setDrop={() => {}}
          setDropAddress={() => {}}
          riderLocation={riderLocation}
          driverLocation={null}
          setDistance={() => {}}
          setDuration={() => {}}
          viewOnly={true}
          style={{ width: '100%', height: '100%' }}
        />
      </Box>

      {/* Floating GO Button (when offline) - Uber-style */}
      {!isOnline && (
        <Box sx={{
          position: 'fixed',
          bottom: 120,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001
        }}>
          <Button
            onClick={handleToggleOnline}
            disabled={loading}
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#000000',
              color: 'white',
              fontSize: '1.2rem',
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
              border: '3px solid white',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
              },
              '&:active': {
                transform: 'scale(0.95)',
              },
              '&:disabled': {
                background: '#6b7280',
                boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)',
              },
              transition: 'all 0.2s ease',
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'GO'}
          </Button>
        </Box>
      )}

      {/* Bottom Status Bar - Slideable Container */}
      <Box sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'transparent'
      }}>
        {/* Collapsed Bar - Tap to open */}
        <Box
          onClick={() => setBottomSheetOpen(true)}
          sx={{
            backgroundColor: !isOnline ? '#1f2937' : '#22c55e',
            color: 'white',
            p: 2,
            cursor: 'pointer',
            transition: 'background-color 0.3s ease',
            '&:hover': {
              opacity: 0.9
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            {isOnline && (
                <Box sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                backgroundColor: 'white',
                  animation: 'pulse 2s infinite'
                }} />
            )}
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {isOnline ? "You're online" : "Offline"}
                </Typography>
            {!isOnline && (
              <Typography variant="caption" sx={{ color: '#9ca3af' }}>
                - 5 min to request
              </Typography>
            )}
          </Box>
        </Box>
              </Box>

      {/* Slideable Bottom Sheet */}
      <Drawer
        anchor="bottom"
        open={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        PaperProps={{
          sx: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: '60vh',
            backgroundColor: 'white'
          }
        }}
      >
        <Box sx={{ p: 3 }}>
          {/* Handle */}
                <Box sx={{
            width: 40,
            height: 4,
            backgroundColor: '#d1d5db',
            borderRadius: 2,
            mx: 'auto',
            mb: 3
          }} />

          <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
            {isOnline ? "You're Online" : "You're Offline"}
          </Typography>

          {/* Status Display */}
          <Box sx={{
            backgroundColor: isOnline ? '#f0fdf4' : '#f9fafb',
            borderRadius: 2,
            p: 2,
            mb: 3,
            border: `2px solid ${isOnline ? '#22c55e' : '#e5e7eb'}`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{
                width: 48,
                height: 48,
                  borderRadius: '50%',
                backgroundColor: isOnline ? '#22c55e' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isOnline ? (
                  <PowerSettingsNew sx={{ color: 'white', fontSize: 28 }} />
                ) : (
                  <Stop sx={{ color: 'white', fontSize: 28 }} />
                )}
                </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {isOnline ? "Active & Accepting Rides" : "Not Accepting Rides"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isOnline ? "Go online to start earning" : "Go offline to stop receiving requests"}
                </Typography>
              </Box>
              </Box>
            </Box>

          {/* Stats */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6}>
            <Box sx={{ 
                backgroundColor: '#f9fafb',
                borderRadius: 2,
                p: 2,
                textAlign: 'center'
              }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#22c55e' }}>
                  ${earnings.today.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Today's Earnings
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{
                backgroundColor: '#f9fafb',
                borderRadius: 2,
                p: 2,
                textAlign: 'center'
              }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {stats.totalRides}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Rides
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Actions */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
              variant="contained"
              fullWidth
              size="large"
              onClick={handleToggleOnline}
              startIcon={isOnline ? <Stop /> : <PlayArrow />}
              sx={{
                backgroundColor: isOnline ? '#ef4444' : '#22c55e',
                color: 'white',
                py: 1.5,
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: isOnline ? '#dc2626' : '#16a34a'
                }
              }}
            >
              {isOnline ? "Go Offline" : "Go Online"}
              </Button>

            </Box>
          </Box>
      </Drawer>

      {/* Earnings Details Modal */}
      {earningsModalOpen && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2
        }}
        onClick={() => setEarningsModalOpen(false)}
        >
          <Box sx={{
            backgroundColor: 'white',
            borderRadius: 3,
            p: 4,
            maxWidth: 400,
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h5" sx={{ 
              fontWeight: 700, 
              mb: 3,
              textAlign: 'center',
              color: '#333'
            }}>
              Earnings Details
            </Typography>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ 
                fontWeight: 700, 
                textAlign: 'center',
                color: '#4CAF50',
                mb: 1
              }}>
                ${earnings.today.toFixed(2)}
              </Typography>
              <Typography variant="body1" sx={{ 
                textAlign: 'center',
                color: '#666',
                mb: 3
              }}>
                Today's Earnings
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ 
                fontWeight: 600, 
                mb: 2,
                color: '#333'
              }}>
                Earnings Breakdown
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Base Earnings
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ₹{(earnings.today * 0.85).toFixed(2)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Tips Received
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ₹{(earnings.today * 0.15).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={() => setEarningsModalOpen(false)}
              sx={{
                backgroundColor: '#4CAF50',
                '&:hover': {
                  backgroundColor: '#45a049'
                },
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600
              }}
            >
              Close
            </Button>
          </Box>
        </Box>
      )}

      {/* Chat Modal */}
      <SimpleChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        rideId={selectedRide?._id}
        userType="rider"
      />

      {/* Ride Notification Modal */}
      <RideNotification
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        ride={selectedRide}
        onAccept={handleAcceptRide}
        onReject={handleRejectRide}
      />

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        ride={selectedRide}
        onOTPVerified={handleOTPVerified}
        onCancel={handleCancelRide}
      />


      {/* Ride Request Popup - Uber Style */}
      {newRideRequest && (
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99998,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          animation: 'fadeIn 0.3s ease-in'
        }}
        onClick={() => {
          console.log("Closing popup...");
          setNewRideRequest(null);
        }}
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            sx={{
              width: '95%',
              maxWidth: 400,
              mb: 2,
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              backgroundColor: 'white',
              animation: 'slideUp 0.3s ease-out',
              '@keyframes slideUp': {
                from: { transform: 'translateY(100px)', opacity: 0 },
                to: { transform: 'translateY(0)', opacity: 1 }
              }
            }}
          >
            <CardContent sx={{ p: 0 }}>
              {/* Ride Type Header - Black pill with white text */}
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                py: 2,
                px: 2
              }}>
                <Box sx={{
                  backgroundColor: 'black',
                  color: 'white',
                  px: 2.5,
                  py: 0.75,
                  borderRadius: '25px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Person sx={{ fontSize: 18 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    Uber {newRideRequest.rideType ? newRideRequest.rideType.charAt(0).toUpperCase() + newRideRequest.rideType.slice(1) : 'Car'}
                  </Typography>
                </Box>
              </Box>

              {/* Fare - Large and bold */}
              <Box sx={{ textAlign: 'center', py: 2, px: 2 }}>
                <Typography variant="h2" sx={{
                  fontWeight: 700,
                  fontSize: '2.5rem',
                  mb: 0.5
                }}>
                  ₹{newRideRequest.totalFare || newRideRequest.total || 117}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{
                  display: 'block',
                  mb: 1
                }}>
                  *Includes 5% tax
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  ★{newRideRequest.rider?.rating || newRideRequest.user?.rating || 4.6} Cash payment
                </Typography>
              </Box>

              <Divider />

              {/* Pickup & Drop - Like Uber */}
              <Box sx={{ px: 2, py: 2 }}>
                {/* Pickup */}
                <Box sx={{ display: 'flex', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ mr: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      border: '2px solid #000',
                      backgroundColor: '#fff',
                      mb: 1
                    }} />
                    <Box sx={{
                      width: 1.5,
                      height: 40,
                      backgroundColor: '#e5e7eb'
                    }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                      {newRideRequest.matchDetails?.eta || 6} mins ({newRideRequest.matchDetails?.distance || 1.0} km) away
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#333' }}>
                      {newRideRequest.pickup || 'Pickup location address'}
                    </Typography>
                  </Box>
                </Box>

                {/* Drop */}
                <Box sx={{ display: 'flex', alignItems: 'start' }}>
                  <Box sx={{ mr: 2, display: 'flex', alignItems: 'flex-start' }}>
                    <Box sx={{
                      width: 10,
                      height: 10,
                      backgroundColor: '#000',
                      borderRadius: '2px'
                    }} />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 0.5 }}>
                      {newRideRequest.duration || 35} mins ({newRideRequest.distance || 13.8} km) trip
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#333' }}>
                      {newRideRequest.drop || 'Drop-off location address'}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider />

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  color="error"
                  size="large"
                  onClick={() => {
                    console.log("❌ Rejecting ride:", newRideRequest._id);
                    handleRejectRide(newRideRequest._id);
                    setNewRideRequest(null);
                  }}
                  sx={{ py: 1.5, fontWeight: 600, borderRadius: 2 }}
                >
                  Reject
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={() => {
                    console.log("✅ Accepting ride:", newRideRequest._id);
                    handleAcceptRide(newRideRequest._id);
                    setNewRideRequest(null);
                  }}
                  sx={{
                    backgroundColor: '#22c55e',
                    color: 'white',
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: 2,
                    '&:hover': {
                      backgroundColor: '#16a34a'
                    }
                  }}
                >
                  Accept Ride
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* User Info Container - Shows when ride is accepted */}
      {selectedRide && selectedRide.riderId && (
        <Box sx={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: 400,
          zIndex: 1000
        }}>
          <Card sx={{ borderRadius: 3, boxShadow: 6 }}>
            <CardContent sx={{ p: 2 }}>
              {/* User Info */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', mr: 2 }}>
                  {selectedRide.riderId?.fullName?.charAt(0) || 'U'}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {selectedRide.riderId?.fullName || 'User'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Star sx={{ color: 'warning.main', fontSize: 18 }} />
                    <Typography variant="body2" color="text.secondary">
                      {selectedRide.riderId?.rating || '4.5'} ⭐
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Action Buttons */}
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<Phone />}
                  onClick={handleCall}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: 2,
                    borderColor: '#22c55e',
                    color: '#22c55e',
                    '&:hover': {
                      borderColor: '#16a34a',
                      bgcolor: 'rgba(34, 197, 94, 0.05)'
                    }
                  }}
                >
                  Call
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<Chat />}
                  onClick={handleChat}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    borderRadius: 2,
                    backgroundColor: '#22c55e',
                    '&:hover': {
                      backgroundColor: '#16a34a'
                    }
                  }}
                >
                  Chat
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}