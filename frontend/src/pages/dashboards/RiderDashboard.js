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
  useMediaQuery
} from "@mui/material";
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
  Security
} from "@mui/icons-material";
import axios from "axios";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Map from "../../components/Map";
import { useNotification } from "../../contexts/NotificationContext";
import { getPendingRides, acceptRide, rejectRide } from "../../services/api";
import SimpleChatModal from "../../components/SimpleChatModal";
import ChatNotification from "../../components/ChatNotification";
import RideNotification from "../../components/RideNotification";
import OTPVerificationModal from "../../components/OTPVerificationModal";

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

const socket = io("http://localhost:5000");

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
    today: 0,
    week: 0,
    month: 0,
    total: 0
  });
  const [stats, setStats] = useState({
    totalRides: 0,
    completedRides: 0,
    rating: 4.8,
    onlineTime: 0
  });
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
    // Check if user is authenticated
    if (!auth?.user || !auth?.token) {
      console.log("No auth data found, redirecting to login");
      navigate("/login");
      return;
    }

    // Load rider data
    const loadRiderData = async () => {
      try {
        // Use token from auth context instead of localStorage
        const token = auth.token;
        if (!token) {
          console.log("No token in auth context, redirecting to login");
          navigate("/login");
          return;
        }
        
        const response = await axios.get(`http://localhost:5000/api/rider/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          const riderData = response.data.rider;
          setIsOnline(riderData.isOnline || false);
          setIsAvailable(riderData.isAvailable || false);
          
          // Set earnings (mock data for now)
          setEarnings({
            today: 45.50,
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
        console.error("Error loading rider data:", error);
        
        if (error.response?.status === 401) {
          // Token expired or invalid - only redirect if it's a real auth error
          console.log("Authentication error, redirecting to login");
          showError("Session expired. Please login again.");
          logout(); // Clear auth context
          navigate("/login");
        } else {
          // Set default values if API fails (network issues, etc.)
          console.log("API error, setting default values:", error.message);
          setIsOnline(false);
          setIsAvailable(false);
        }
      }
    };

    loadRiderData();
    fetchPendingRides();

    // Socket.IO connection
    socket.on("connect", () => {
      console.log("✅ Socket connected:", socket.id);
      if (auth?.user?._id) {
        socket.emit("joinRiderRoom", auth.user._id);
        console.log("🚗 Rider joined room:", auth.user._id);
      }
    });

    socket.on("newRide", (ride) => {
      console.log("New ride received:", ride);
      fetchPendingRides(true); // Silent refresh
      showSuccess("New ride request received!");
      
      // Play notification sound
      playNotificationSound();
    });

    socket.on("rideAccepted", (ride) => {
      console.log("🎉 Ride accepted:", ride);
      console.log("🎉 Ride OTP status:", ride.otpVerified);
      setSelectedRide(ride);
      setNotificationOpen(true);
    });

    socket.on("rideStarted", (ride) => {
      console.log("Ride started:", ride);
      setSelectedRide(ride);
    });

    socket.on("otpVerified", (data) => {
      console.log("🎉 OTP verified event received:", data);
      console.log("🎉 Current selectedRide:", selectedRide);
      console.log("🎉 Comparing ride IDs:", selectedRide?._id, "vs", data.rideId);
      
      if (selectedRide && (selectedRide._id == data.rideId || selectedRide._id === data.rideId)) {
        console.log("✅ Updating ride status to started");
        setSelectedRide(prev => {
          const updated = { ...prev, otpVerified: true, status: "started" };
          console.log("✅ Updated selectedRide:", updated);
          return updated;
        });
        setOtpModalOpen(false);
        showSuccess("OTP verified successfully! Ride activated.");
      } else {
        console.log("❌ Ride ID mismatch or no selected ride");
      }
    });

    // Listen for chat messages globally
    socket.on("message", (messageData) => {
      console.log("🚗 Received chat message:", messageData);
      // Play notification sound for incoming messages
      if (messageData.sender !== 'rider') {
        playNotificationSound();
        // Increment unread message count if chat is not open
        if (!chatOpen) {
          setUnreadMessages(prev => prev + 1);
        }
      }
    });
    

    socket.on("rideCompleted", (ride) => {
      console.log("Ride completed:", ride);
      setSelectedRide(null);
      fetchPendingRides(true); // Silent refresh
    });

    socket.on("rideCancelled", (ride) => {
      console.log("Ride cancelled:", ride);
      setSelectedRide(null);
      fetchPendingRides(true); // Silent refresh
    });

    // Remove automatic refresh to prevent flickering
    // Only refresh on user actions and socket events

    return () => {
      socket.off("connect");
      socket.off("newRide");
      socket.off("rideAccepted");
      socket.off("rideStarted");
      socket.off("otpVerified");
      socket.off("rideCompleted");
      socket.off("rideCancelled");
    };
  }, [auth, navigate, showSuccess]);

  const fetchPendingRides = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      console.log("🔍 Fetching pending rides...");
      console.log("🔍 Auth token:", auth?.token ? "Present" : "Missing");
      console.log("🔍 Auth user:", auth?.user);
      
      const response = await getPendingRides();
      console.log("🔍 API Response:", response.data);
      
      if (response.data?.success) {
        setRides(response.data.rides || []);
        console.log("🔍 Set rides:", response.data.rides?.length || 0);
      } else {
        console.error("API response error:", response.data);
        if (!silent) showError("Failed to fetch rides");
      }
    } catch (error) {
      console.error("Error fetching rides:", error);
      console.error("Error details:", error.response?.data);
      if (!silent) {
        if (error.response?.data?.error) {
          showError(error.response.data.error);
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
      
      // Check if token exists in auth context
      const token = auth?.token;
      if (!token) {
        showError("Please login again");
        navigate("/login");
        return;
      }
      
      // Update backend first
      const response = await axios.put(
        `http://localhost:5000/api/rider/status`,
        { isOnline: newOnlineStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        // Only update state if backend update was successful
        setIsOnline(newOnlineStatus);
        
        // If going offline, also set available to false
        if (!newOnlineStatus) {
          setIsAvailable(false);
        }
        
        showSuccess(newOnlineStatus ? "You are now online!" : "You are now offline!");
      } else {
        showError(response.data.message || "Failed to update status");
      }
    } catch (error) {
      console.error("Error updating online status:", error);
      
      if (error.response?.status === 401) {
        // Token expired or invalid
        console.log("Authentication error in toggle online, redirecting to login");
        showError("Session expired. Please login again.");
        logout(); // Clear auth context
        navigate("/login");
      } else if (error.response?.data?.message) {
        showError(error.response.data.message);
      } else {
        showError("Failed to update status");
      }
    }
  };

  const handleAcceptRide = async (rideId) => {
    try {
      const response = await acceptRide(rideId);
      if (response.data?.success) {
        showSuccess("Ride accepted! Please verify OTP to activate the ride.");
        
        // Set the selected ride to show active ride UI
        const acceptedRide = response.data.ride;
        if (acceptedRide) {
          console.log("🚗 Accepted ride data:", acceptedRide);
          console.log("🚗 OTP:", acceptedRide.otp);
          console.log("🚗 OTP Verified:", acceptedRide.otpVerified);
          console.log("🚗 Status:", acceptedRide.status);
          setSelectedRide(acceptedRide);
          setOtpModalOpen(true); // Show OTP verification modal
          
          // Join chat room immediately when accepting ride
          const roomId = `ride_${acceptedRide._id}`;
          console.log("🚗 Joining chat room for accepted ride:", roomId);
          socket.emit('joinChatRoom', roomId);
        } else {
          console.log("❌ No ride data in response:", response.data);
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
    setUnreadMessages(0); // Clear unread messages when chat is opened
  };

  const handleStartRide = async (rideId) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/rides/${rideId}/start`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      
      if (response.data.success) {
        showSuccess("Ride started!");
        socket.emit("rideStarted", { rideId, riderId: auth?.user?._id });
      }
    } catch (error) {
      console.error("Error starting ride:", error);
      showError("Failed to start ride");
    }
  };

  const handleCancelRide = async (rideId) => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/rides/${rideId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
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

  const handleOTPVerified = (rideId) => {
    console.log("✅ OTP verified for ride:", rideId);
    console.log("✅ Current selectedRide before update:", selectedRide);
    
    // Update the selectedRide state directly
    if (selectedRide && selectedRide._id == rideId) {
      setSelectedRide(prev => {
        const updated = { ...prev, otpVerified: true, status: "started" };
        console.log("✅ Updated selectedRide in handleOTPVerified:", updated);
        return updated;
      });
    } else {
      // Fallback: refresh pending rides to get updated data
      console.log("🔄 Fallback: Refreshing pending rides to get updated data");
      fetchPendingRides(true);
    }
    
    setOtpModalOpen(false);
    
    // Small delay to ensure state update is processed
    setTimeout(() => {
      showSuccess("Ride activated successfully!");
    }, 100);
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f5f5f5',
      pb: { xs: 1, md: 2 }
    }}>

      <Box sx={{ maxWidth: { xs: '100%', md: '100%' }, mx: 'auto', px: { xs: 1, md: 2 } }}>
                {/* All 6 Stats Cards in Horizontal Line */}
                <Grid container spacing={{ xs: 1, md: 1.5 }} sx={{ mb: { xs: 1.5, md: 2 } }}>
                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ 
                      bgcolor: 'success.main',
                      color: 'white',
                      borderRadius: 2,
                      minHeight: { xs: 70, md: 90 },
                      boxShadow: 2
                    }}>
                      <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                              Today's Earnings
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, fontSize: { xs: '1rem', md: '1.2rem' } }}>
                              ₹{(earnings.today || 0).toFixed(2)}
                            </Typography>
                          </Box>
                          <AttachMoney sx={{ fontSize: { xs: 20, md: 24 }, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      color: 'white',
                      borderRadius: 2,
                      minHeight: { xs: 70, md: 90 },
                      boxShadow: 2
                    }}>
                      <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                              Total Rides Today
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, fontSize: { xs: '1rem', md: '1.2rem' } }}>
                              {stats.totalRides || 0}
                            </Typography>
                          </Box>
                          <DirectionsCar sx={{ fontSize: { xs: 20, md: 24 }, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      color: 'white',
                      borderRadius: 2,
                      minHeight: { xs: 70, md: 90 },
                      boxShadow: 2
                    }}>
                      <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                              Rating
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, fontSize: { xs: '1rem', md: '1.2rem' } }}>
                              {stats.rating || 4.8}
                            </Typography>
                          </Box>
                          <Star sx={{ fontSize: { xs: 20, md: 24 }, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: 2,
                      minHeight: { xs: 70, md: 90 },
                      boxShadow: 2
                    }}>
                      <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                              Completed Rides
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, fontSize: { xs: '1rem', md: '1.2rem' } }}>
                              {stats.completedRides || 0}
                            </Typography>
                          </Box>
                          <CheckCircle sx={{ fontSize: { xs: 20, md: 24 }, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                      color: 'white',
                      borderRadius: 2,
                      minHeight: { xs: 70, md: 90 },
                      boxShadow: 2
                    }}>
                      <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                              Online Time Today
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, fontSize: { xs: '1rem', md: '1.2rem' } }}>
                              {Math.floor(stats.onlineTime / 60)}h {stats.onlineTime % 60}m
                            </Typography>
                          </Box>
                          <Schedule sx={{ fontSize: { xs: 20, md: 24 }, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={6} sm={4} md={2}>
                    <Card sx={{ 
                      background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                      color: 'white',
                      borderRadius: 2,
                      minHeight: { xs: 70, md: 90 },
                      boxShadow: 2
                    }}>
                      <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.7rem', md: '0.8rem' } }}>
                              Weekly Earnings
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, fontSize: { xs: '1rem', md: '1.2rem' } }}>
                              ₹{(earnings.week || 0).toFixed(2)}
                            </Typography>
                          </Box>
                          <TrendingUp sx={{ fontSize: { xs: 20, md: 24 }, opacity: 0.8 }} />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

        {/* Professional Driver Status Card */}
        <Card sx={{ 
          mb: { xs: 1.5, md: 2 }, 
          borderRadius: 2, 
          boxShadow: 2
        }}>
          <CardContent sx={{ p: { xs: 1.5, md: 2 } }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 2, sm: 0 }
            }}>
              <Typography variant={isMobile ? "body1" : "h6"} sx={{ 
                fontWeight: 'bold', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              }}>
                <PowerSettingsNew color="primary" sx={{ fontSize: { xs: 20, md: 24 } }} />
                Driver Status
      </Typography>

              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: { xs: 1, md: 2 },
                width: { xs: '100%', sm: 'auto' },
                justifyContent: { xs: 'space-between', sm: 'flex-end' }
              }}>
                <Chip 
                  label={isOnline ? 'ONLINE' : 'OFFLINE'} 
                  color={isOnline ? 'success' : 'default'}
                  sx={{ 
                    fontWeight: 'bold',
                    fontSize: { xs: '0.7rem', md: '0.8rem' },
                    px: { xs: 1, md: 2 }
                  }}
                />
      <Button
        variant="contained"
                  size={isMobile ? "small" : "medium"}
                  onClick={handleToggleOnline}
        sx={{
                    backgroundColor: isOnline ? '#f44336' : '#4caf50',
                    color: 'white',
                    px: { xs: 2, md: 3 },
                    py: { xs: 0.5, md: 1 },
                    fontSize: { xs: '0.8rem', md: '0.9rem' },
                    fontWeight: 'bold',
                    borderRadius: { xs: 1, md: 2 },
                    minWidth: { xs: 100, md: 120 },
                    '&:hover': {
                      backgroundColor: isOnline ? '#d32f2f' : '#388e3c'
                    }
                  }}
                >
                  {isOnline ? 'GO OFFLINE' : 'GO ONLINE'}
      </Button>
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ 
              mt: { xs: 1, md: 2 },
              fontSize: { xs: '0.8rem', md: '0.9rem' }
            }}>
              {isOnline 
                ? 'You are receiving ride requests' 
                : 'Go online to start receiving ride requests'
              }
              </Typography>
          </CardContent>
        </Card>


        {/* Mobile-First Pending Rides */}
        <Card sx={{ 
          borderRadius: { xs: 1, md: 2 }, 
          boxShadow: { xs: 1, md: 3 }
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between', 
              alignItems: { xs: 'flex-start', sm: 'center' },
              mb: { xs: 2, md: 3 },
              gap: { xs: 2, sm: 0 }
            }}>
              <Typography variant={isMobile ? "body1" : "h6"} sx={{ 
                fontWeight: 'bold', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1 
              }}>
                <DirectionsCar color="primary" sx={{ fontSize: { xs: 20, md: 24 } }} />
            Pending Ride Requests
          </Typography>
              <Button
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                onClick={() => fetchPendingRides()}
                disabled={loading}
        sx={{
                  minWidth: { xs: 80, md: 100 },
                  fontSize: { xs: '0.8rem', md: '0.9rem' }
                }}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
      </Button>
            </Box>

      {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
              </Box>
            ) : rides.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                {isOnline 
                  ? "No pending ride requests at the moment. Stay online to receive new requests!"
                  : "Go online to start receiving ride requests."
                }
              </Alert>
                    ) : (
                      <Grid container spacing={{ xs: 1, md: 2 }}>
                        {rides.map((ride) => (
                          <Grid item xs={12} md={6} key={ride._id}>
                            <Card 
                              sx={{ 
                                cursor: 'pointer',
                                border: selectedRide?._id === ride._id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                                borderRadius: { xs: 1, md: 2 },
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                  boxShadow: { xs: 2, md: 3 },
                                  transform: { xs: 'none', md: 'translateY(-2px)' }
                                }
                              }}
                              onClick={() => setSelectedRide(ride)}
                            >
                              <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                                <Box sx={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'flex-start', 
                                  mb: { xs: 1.5, md: 2 }
                                }}>
                                  <Box>
                                    <Typography variant={isMobile ? "body1" : "h6"} sx={{ fontWeight: 'bold' }}>
                                      Ride Request
              </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                                      {new Date(ride.createdAt).toLocaleString()}
              </Typography>
                                  </Box>
                                  <Chip 
                                    label={`₹${ride.totalFare || ride.fare || '0.00'}`} 
                                    color="primary" 
                                    sx={{ 
                                      fontWeight: 'bold',
                                      fontSize: { xs: '0.7rem', md: '0.8rem' }
                                    }}
                                  />
                                </Box>
                                
                                <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                    <LocationOn sx={{ fontSize: { xs: 14, md: 16 }, color: 'green', mr: 1 }} />
                                    <Typography variant="body2" sx={{ 
                                      fontWeight: 'bold',
                                      fontSize: { xs: '0.8rem', md: '0.9rem' }
                                    }}>
                                      Pickup: {ride.pickupAddress || ride.pickup || 'Not specified'}
              </Typography>
                                  </Box>
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <LocationOn sx={{ fontSize: { xs: 14, md: 16 }, color: 'red', mr: 1 }} />
                                    <Typography variant="body2" sx={{ 
                                      fontWeight: 'bold',
                                      fontSize: { xs: '0.8rem', md: '0.9rem' }
                                    }}>
                                      Drop: {ride.dropAddress || ride.drop || 'Not specified'}
              </Typography>
                                  </Box>
                                </Box>
                                
                                <Box sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  mb: { xs: 1.5, md: 2 }
                                }}>
                                  <Person sx={{ fontSize: { xs: 14, md: 16 }, mr: 1 }} />
                                  <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                                    {ride.userId?.fullName || 'Unknown User'}
              </Typography>
                                  <Star sx={{ fontSize: { xs: 14, md: 16 }, color: 'gold', ml: 1, mr: 0.5 }} />
                                  <Typography variant="body2" sx={{ fontSize: { xs: '0.8rem', md: '0.9rem' } }}>
                                    {ride.userId?.rating || '4.5'}
              </Typography>
                                </Box>
                                
                                <Box sx={{ display: 'flex', gap: { xs: 0.5, md: 1 } }}>
                    <Button
                      variant="contained"
                      color="success"
                                    startIcon={<CheckCircle sx={{ fontSize: { xs: 16, md: 20 } }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAcceptRide(ride._id);
                                    }}
                                    sx={{ 
                                      flex: 1,
                                      fontSize: { xs: '0.8rem', md: '0.9rem' },
                                      py: { xs: 0.5, md: 1 }
                                    }}
                                  >
                                    Accept
                </Button>
                    <Button
                                    variant="outlined"
                      color="error"
                                    startIcon={<Cancel sx={{ fontSize: { xs: 16, md: 20 } }} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRejectRide(ride._id);
                                    }}
                                    sx={{ 
                                      flex: 1,
                                      fontSize: { xs: '0.8rem', md: '0.9rem' },
                                      py: { xs: 0.5, md: 1 }
                                    }}
                                  >
                                    Reject
                </Button>
              </Box>
            </CardContent>
          </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
          </CardContent>
        </Card>
      </Box>

      {/* Professional Active Ride Section - Tiles Structure */}
      {selectedRide && (
        <Box sx={{ 
          maxWidth: '100%', 
          mx: 'auto', 
          px: { xs: 1, md: 2 }, 
          mt: { xs: 2, md: 3 }
        }}>
          {/* Header Tile */}
          <Card sx={{ 
            borderRadius: { xs: 2, md: 3 }, 
            boxShadow: 4,
            overflow: 'hidden',
            bgcolor: 'success.main',
            color: 'white',
            mb: 2
          }}>
            <Box sx={{ 
              p: { xs: 2, md: 3 }, 
              background: 'rgba(255,255,255,0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    width: { xs: 40, md: 48 }, 
                    height: { xs: 40, md: 48 } 
                  }}>
                    <DirectionsCar sx={{ fontSize: { xs: 24, md: 28 } }} />
                  </Avatar>
                  <Box>
                    <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 'bold', mb: 0.5 }}>
                      Active Ride
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Ride ID: #{selectedRide._id}
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label={selectedRide?.otpVerified ? "ACTIVE" : "AWAITING OTP"} 
                  sx={{ 
                    bgcolor: selectedRide?.otpVerified ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 152, 0, 0.9)',
                    color: 'white',
                    fontWeight: 'bold',
                    px: 2,
                    py: 1,
                    fontSize: { xs: '0.8rem', md: '0.9rem' }
                  }} 
                />
              </Box>
            </Box>

          </Card>

          {/* Main Content - Left Panel (Details) & Right Panel (Map) */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            {/* Left Panel - Driver Details, Passenger Details, Ride Information, Actions */}
            <Box sx={{ 
              flex: { xs: 1, md: 1 }, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 1,
              height: '100%',
              justifyContent: 'space-between'
            }}>
              {/* Driver Details */}
              <Card sx={{ 
                borderRadius: 2, 
                boxShadow: 3,
                bgcolor: 'rgba(76, 175, 80, 0.05)',
                border: '1px solid rgba(76, 175, 80, 0.2)'
              }}>
                <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    fontWeight: 'bold', 
                    color: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: { xs: '0.8rem', md: '0.9rem' }
                  }}>
                    <Person sx={{ fontSize: { xs: 14, md: 16 } }} color="success" />
                    Driver Details
                  </Typography>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                    borderRadius: 1.5
                  }}>
                    <Avatar sx={{ 
                      bgcolor: 'success.main',
                      width: { xs: 28, md: 32 },
                      height: { xs: 28, md: 32 }
                    }}>
                      <Person sx={{ fontSize: { xs: 14, md: 16 } }} />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.75rem', md: '0.8rem' },
                        display: 'block'
                      }}>
                        {auth?.user?.fullName || 'Driver'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{
                        fontSize: { xs: '0.7rem', md: '0.75rem' }
                      }}>
                        {auth?.user?.mobile || 'No contact'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Passenger Details */}
              <Card sx={{ 
                borderRadius: 2, 
                boxShadow: 3,
                bgcolor: 'rgba(33, 150, 243, 0.05)',
                border: '1px solid rgba(33, 150, 243, 0.2)'
              }}>
                <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    fontWeight: 'bold', 
                    color: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: { xs: '0.8rem', md: '0.9rem' }
                  }}>
                    <Person sx={{ fontSize: { xs: 14, md: 16 } }} color="primary" />
                    Passenger Details
                  </Typography>
                  <Box sx={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    bgcolor: 'rgba(33, 150, 243, 0.1)',
                    borderRadius: 1.5
                  }}>
                    <Avatar sx={{ 
                      bgcolor: 'primary.main',
                      width: { xs: 28, md: 32 },
                      height: { xs: 28, md: 32 }
                    }}>
                      <Person sx={{ fontSize: { xs: 14, md: 16 } }} />
                    </Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.75rem', md: '0.8rem' },
                        display: 'block'
                      }}>
                        {selectedRide.riderId?.fullName || 'Unknown User'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{
                        fontSize: { xs: '0.7rem', md: '0.75rem' }
                      }}>
                        {selectedRide.riderId?.mobile || 'No contact'}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {/* Ride Information */}
              <Card sx={{ 
                borderRadius: 2, 
                boxShadow: 3,
                bgcolor: 'rgba(255, 152, 0, 0.05)',
                border: '1px solid rgba(255, 152, 0, 0.2)'
              }}>
                <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    fontWeight: 'bold', 
                    color: 'warning.main',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: { xs: '0.8rem', md: '0.9rem' }
                  }}>
                    <AttachMoney sx={{ fontSize: { xs: 14, md: 16 } }} color="warning" />
                    Ride Information
                  </Typography>
                  <Grid container spacing={1}>
                    <Grid item xs={4}>
                      <Box sx={{ 
                        textAlign: 'center',
                        p: 1,
                        bgcolor: 'rgba(255, 152, 0, 0.1)',
                        borderRadius: 1.5
                      }}>
                        <AttachMoney sx={{ fontSize: { xs: 16, md: 18 }, color: 'warning.main', mb: 0.25 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          fontSize: { xs: '0.65rem', md: '0.7rem' },
                          display: 'block',
                          mb: 0.25
                        }}>
                          Fare
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 'bold', 
                          color: 'warning.main',
                          fontSize: { xs: '0.7rem', md: '0.8rem' },
                          display: 'block'
                        }}>
                          ₹{selectedRide.totalFare || selectedRide.fare || '0.00'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ 
                        textAlign: 'center',
                        p: 1,
                        bgcolor: 'rgba(76, 175, 80, 0.1)',
                        borderRadius: 1.5
                      }}>
                        <Route sx={{ fontSize: { xs: 16, md: 18 }, color: 'success.main', mb: 0.25 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          fontSize: { xs: '0.65rem', md: '0.7rem' },
                          display: 'block',
                          mb: 0.25
                        }}>
                          Distance
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 'bold', 
                          color: 'success.main',
                          fontSize: { xs: '0.7rem', md: '0.8rem' },
                          display: 'block'
                        }}>
                          {selectedRide.distance ? (selectedRide.distance / 1000).toFixed(4) : 'N/A'} km
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={4}>
                      <Box sx={{ 
                        textAlign: 'center',
                        p: 1,
                        bgcolor: 'rgba(33, 150, 243, 0.1)',
                        borderRadius: 1.5
                      }}>
                        <AccessTime sx={{ fontSize: { xs: 16, md: 18 }, color: 'primary.main', mb: 0.25 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          fontSize: { xs: '0.65rem', md: '0.7rem' },
                          display: 'block',
                          mb: 0.25
                        }}>
                          ETA
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 'bold', 
                          color: 'primary.main',
                          fontSize: { xs: '0.7rem', md: '0.8rem' },
                          display: 'block'
                        }}>
                          {selectedRide.estimatedTime || 'N/A'} min
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card sx={{ 
                borderRadius: 2, 
                boxShadow: 3,
                bgcolor: 'rgba(0, 0, 0, 0.02)',
                border: '1px solid rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent sx={{ p: { xs: 1, md: 1.5 } }}>
                  <Typography variant="subtitle2" sx={{ 
                    mb: 1, 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    fontSize: { xs: '0.8rem', md: '0.9rem' }
                  }}>
                    <Security sx={{ fontSize: { xs: 14, md: 16 } }} />
                    Actions
                  </Typography>
                  <Grid container spacing={1}>
                    {(() => {
                      console.log("🔍 Rendering Actions - selectedRide:", selectedRide);
                      console.log("🔍 OTP Verified:", selectedRide?.otpVerified);
                      console.log("🔍 Status:", selectedRide?.status);
                      return null;
                    })()}
                    {!selectedRide?.otpVerified ? (
                      <>
                        <Grid item xs={12}>
                          <Button
                            variant="contained"
                            startIcon={<Security sx={{ fontSize: { xs: 14, md: 16 } }} />}
                            onClick={() => setOtpModalOpen(true)}
                            fullWidth
                            sx={{
                              bgcolor: 'warning.main',
                              color: 'white',
                              py: 0.75,
                              fontWeight: 'bold',
                              fontSize: { xs: '0.75rem', md: '0.8rem' },
                              '&:hover': { bgcolor: 'warning.dark' }
                            }}
                          >
                            Verify OTP
                          </Button>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="caption" sx={{ 
                            textAlign: 'center', 
                            color: 'text.secondary',
                            fontStyle: 'italic',
                            fontSize: { xs: '0.7rem', md: '0.75rem' },
                            mb: 1,
                            display: 'block'
                          }}>
                            Waiting for passenger to provide OTP
                          </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Button
                            variant="outlined"
                            startIcon={
                              <Box sx={{ position: 'relative' }}>
                                <Chat sx={{ fontSize: { xs: 14, md: 16 } }} />
                                {unreadMessages > 0 && (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: -4,
                                      right: -4,
                                      bgcolor: 'error.main',
                                      color: 'white',
                                      borderRadius: '50%',
                                      minWidth: 14,
                                      height: 14,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.65rem',
                                      fontWeight: 'bold',
                                      border: '1px solid white'
                                    }}
                                  >
                                    {unreadMessages > 9 ? '9+' : unreadMessages}
                                  </Box>
                                )}
                              </Box>
                            }
                            onClick={handleChat}
                            fullWidth
                            sx={{
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              py: 0.75,
                              fontWeight: 'bold',
                              fontSize: { xs: '0.75rem', md: '0.8rem' },
                              '&:hover': { 
                                borderColor: 'primary.dark',
                                bgcolor: 'primary.light',
                                color: 'primary.dark'
                              }
                            }}
                          >
                            Message Passenger
                          </Button>
                        </Grid>
        </>
      ) : (
        <>
                        <Grid item xs={12} sm={6}>
                          <Button
                            variant="contained"
                            startIcon={<Phone sx={{ fontSize: { xs: 14, md: 16 } }} />}
                            onClick={handleCall}
                            fullWidth
                            sx={{
                              bgcolor: 'success.main',
                              color: 'white',
                              py: 0.75,
                              fontWeight: 'bold',
                              fontSize: { xs: '0.75rem', md: '0.8rem' },
                              '&:hover': { bgcolor: 'success.dark' }
                            }}
                          >
                            Call
                          </Button>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                    <Button
                      variant="contained"
                            startIcon={
                              <Box sx={{ position: 'relative' }}>
                                <Chat sx={{ fontSize: { xs: 14, md: 16 } }} />
                                {unreadMessages > 0 && (
                                  <Box
                                    sx={{
                                      position: 'absolute',
                                      top: -4,
                                      right: -4,
                                      bgcolor: 'error.main',
                                      color: 'white',
                                      borderRadius: '50%',
                                      minWidth: 14,
                                      height: 14,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.65rem',
                                      fontWeight: 'bold',
                                      border: '1px solid white'
                                    }}
                                  >
                                    {unreadMessages > 9 ? '9+' : unreadMessages}
                                  </Box>
                                )}
                              </Box>
                            }
                            onClick={() => setChatOpen(true)}
                            fullWidth
                            sx={{
                              bgcolor: 'primary.main',
                              color: 'white',
                              py: 0.75,
                              fontWeight: 'bold',
                              fontSize: { xs: '0.75rem', md: '0.8rem' },
                              '&:hover': { bgcolor: 'primary.dark' }
                            }}
                          >
                            Chat
                    </Button>
                        </Grid>
                        
                        <Grid item xs={12}>
                    <Button
                      variant="contained"
                            startIcon={<CheckCircle sx={{ fontSize: { xs: 14, md: 16 } }} />}
                            onClick={() => handleStartRide(selectedRide._id)}
                            fullWidth
                            sx={{
                              bgcolor: 'success.main',
                              color: 'white',
                              py: 0.75,
                              fontWeight: 'bold',
                              fontSize: { xs: '0.75rem', md: '0.8rem' },
                              '&:hover': { bgcolor: 'success.dark' }
                            }}
                          >
                            Start Ride
                          </Button>
                        </Grid>
                      </>
                    )}
                    
                    <Grid item xs={12}>
                      <Button
                        variant="outlined"
                        startIcon={<Cancel sx={{ fontSize: { xs: 14, md: 16 } }} />}
                        onClick={() => handleCancelRide(selectedRide._id)}
                        fullWidth
                        sx={{
                          borderColor: 'error.main',
                          color: 'error.main',
                          py: 0.75,
                          fontWeight: 'bold',
                          fontSize: { xs: '0.75rem', md: '0.8rem' },
                          '&:hover': { 
                            borderColor: 'error.dark',
                            bgcolor: 'error.light',
                            color: 'error.dark'
                          }
                        }}
                      >
                        Cancel Ride
                    </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>

            {/* Right Panel - Map */}
            <Box sx={{ 
              flex: { xs: 1, md: 2 }, 
              minHeight: { xs: 300, md: 500 }
            }}>
              <Card sx={{ 
                borderRadius: 2, 
                boxShadow: 3,
                overflow: 'hidden',
                height: '100%'
              }}>
                <Box sx={{ 
                  p: 2, 
                  bgcolor: 'primary.main',
                  color: 'white'
                }}>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <LocationOn />
                    Live Route Map
                  </Typography>
                </Box>
                
                <Box sx={{ 
                  height: { xs: 300, md: 450 },
                  width: '100%',
                  position: 'relative'
                }}>
                  {(() => {
                    const hasPickup = selectedRide.pickupCoords || selectedRide.pickup;
                    const hasDrop = selectedRide.dropCoords || selectedRide.drop;
                    
                    return hasPickup || hasDrop ? (
                      <Map
                        apiKey="AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo"
                        pickup={selectedRide.pickupCoords || selectedRide.pickup}
                        drop={selectedRide.dropCoords || selectedRide.drop}
                        driverLocation={selectedRide.captainId?.currentLocation}
                        riderLocation={riderLocation}
                        setDistance={setDistance}
                        setDuration={setDuration}
                        setPickup={() => {}}
                        setPickupAddress={() => {}}
                        setDrop={() => {}}
                        setDropAddress={() => {}}
                      />
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        justifyContent: 'center', 
                        alignItems: 'center',
                        height: '100%',
                        bgcolor: 'rgba(0,0,0,0.05)',
                        color: 'text.secondary'
                      }}>
                        <LocationOn sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                        <Typography variant="h6" sx={{ opacity: 0.7 }}>
                          No route information available
                        </Typography>
                      </Box>
                    );
                  })()}
                </Box>
              </Card>
            </Box>
          </Box>
        </Box>
      )}

      {/* Chat Modal */}
      <SimpleChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        ride={selectedRide}
        userRole="rider"
        socket={socket}
        auth={auth}
      />

      {/* Ride Notification Popup */}
      <RideNotification
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        ride={selectedRide}
        onCall={handleCall}
        onChat={handleChat}    
        userRole="rider"
      />

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        ride={selectedRide}
        onVerified={handleOTPVerified}
      />

    </Box>
  );
}