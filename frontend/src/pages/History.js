import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Grid,
  Chip,
  Divider,
  Alert,
  useTheme,
  useMediaQuery,
  Skeleton,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import {
  DirectionsCar,
  LocationOn,
  AccessTime,
  AttachMoney,
  Star,
  CheckCircle,
  Cancel,
  Phone,
  Refresh,
  History as HistoryIcon,
  Person,
  Schedule
} from "@mui/icons-material";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import RiderMobileMenu from "../components/RiderMobileMenu";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { showError, showSuccess } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const userRole = auth?.roles?.[0] || 'user';

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (isRefresh = false, page = 1, status = '') => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Check if user is authenticated
      if (!auth?.token) {
        showError("Please login to view ride history");
        logout();
        navigate("/login");
        return;
      }

      console.log("🔍 Fetching ride history for user role:", userRole, "page:", page, "status:", status);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (status) {
        params.append('status', status);
      }
      
      const response = await api.get(`/rides/my?${params.toString()}`);
      console.log("🔍 History API response:", response.data);
      
      if (response.data?.success) {
        const rides = response.data.rides || [];
        const paginationData = response.data.pagination || {};
        console.log("🔍 Fetched rides:", rides);
        console.log("🔍 Pagination data:", paginationData);
        
        setHistory(rides);
        setPagination({
          current: paginationData.current || 1,
          pages: paginationData.pages || 1,
          total: paginationData.total || 0
        });
        
        if (isRefresh) {
          showSuccess("Ride history refreshed successfully!");
        }
      } else {
        const errorMsg = response.data?.error || "Failed to fetch ride history";
        console.error("❌ History API error:", errorMsg);
        setError(errorMsg);
        showError(errorMsg);
      }
    } catch (error) {
      console.error("❌ Error fetching history:", error);
      
      if (error.response?.status === 401) {
        showError("Session expired. Please login again.");
        logout();
        navigate("/login");
      } else if (error.response?.status === 403) {
        showError("Access denied. You don't have permission to view this data.");
      } else if (error.response?.status === 404) {
        setError("No ride history found");
      } else if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        setError("Network error. Please check your internet connection.");
        showError("Network error. Please check your internet connection.");
      } else {
        const errorMsg = error.response?.data?.error || error.message || "Failed to fetch ride history";
        setError(errorMsg);
        showError(errorMsg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      case 'in-progress': 
      case 'in_progress': 
      case 'started': return 'warning';
      case 'pending': return 'info';
      case 'accepted': return 'primary';
      case 'otp_verified': return 'success';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle />;
      case 'cancelled': return <Cancel />;
      case 'in-progress': 
      case 'in_progress': 
      case 'started': return <Schedule />;
      case 'pending': return <AccessTime />;
      case 'accepted': return <CheckCircle />;
      case 'otp_verified': return <CheckCircle />;
      default: return <DirectionsCar />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'COMPLETED';
      case 'cancelled': return 'CANCELLED';
      case 'in-progress': 
      case 'in_progress': 
      case 'started': return 'IN PROGRESS';
      case 'pending': return 'PENDING';
      case 'accepted': return 'ACCEPTED';
      case 'otp_verified': return 'ACTIVE';
      default: return 'UNKNOWN';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date not available';
    
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const handleCall = (phone) => {
    if (phone) {
      window.open(`tel:${phone}`);
    } else {
      showError("Phone number not available");
    }
  };

  const handleTrack = (rideId) => {
    if (rideId) {
      navigate(`/ride/${rideId}`);
    } else {
      showError("Ride ID not available");
    }
  };

  const handleRefresh = () => {
    fetchHistory(true, pagination.current, statusFilter);
  };

  const handlePageChange = (event, page) => {
    fetchHistory(false, page, statusFilter);
  };

  const handleStatusFilterChange = (event) => {
    const newStatus = event.target.value;
    setStatusFilter(newStatus);
    fetchHistory(false, 1, newStatus);
  };

  if (loading) {
  return (
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: '#f8f9fa',
        pb: { xs: 2, md: 4 }
      }}>
        <Box sx={{ maxWidth: { xs: '100%', md: 1200 }, mx: 'auto', px: { xs: 2, md: 3 } }}>
          {/* Header Skeleton */}
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="text" width="60%" height={40} />
              <Skeleton variant="text" width="40%" height={24} sx={{ mt: 1 }} />
            </CardContent>
          </Card>

          {/* Content Skeleton */}
          {[1, 2, 3].map((item) => (
            <Card key={item} sx={{ mb: 2, borderRadius: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Skeleton variant="text" width="80%" height={32} />
                    <Skeleton variant="text" width="60%" height={24} sx={{ mt: 1 }} />
                    <Skeleton variant="text" width="40%" height={20} sx={{ mt: 1 }} />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Skeleton variant="rectangular" width="100%" height={60} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      pb: { xs: 2, md: 4 }
    }}>
      {/* Mobile Menu for Riders */}
      {userRole === 'rider' && <RiderMobileMenu />}
      
      <Box sx={{ maxWidth: { xs: '100%', md: 1200 }, mx: 'auto', px: { xs: 2, md: 3 } }}>
        {/* Header */}
        <Card sx={{ 
          mb: { xs: 2, md: 3 }, 
          borderRadius: 2, 
          boxShadow: 2
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <HistoryIcon sx={{ 
                  fontSize: { xs: 32, md: 40 }, 
                  color: 'primary.main' 
                }} />
                <Box>
                  <Typography variant={isMobile ? "h5" : "h4"} sx={{ 
                    fontWeight: 'bold',
                    color: 'primary.main'
                  }}>
                    Ride History
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {userRole === 'rider' 
                      ? 'Your completed and cancelled rides' 
                      : 'Your ride history and past trips'
                    }
                  </Typography>
                </Box>
              </Box>
              
              <Button
                variant="outlined"
                startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ 
                  minWidth: 120,
                  py: 1
                }}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Filters and Pagination Controls */}
        {!error && history.length > 0 && (
          <Card sx={{ 
            mb: { xs: 2, md: 3 }, 
            borderRadius: 2, 
            boxShadow: 1
          }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Showing {history.length} of {pagination.total} rides
                  </Typography>
                  
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Filter by Status</InputLabel>
                    <Select
                      value={statusFilter}
                      label="Filter by Status"
                      onChange={handleStatusFilterChange}
                    >
                      <MenuItem value="">All Status</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="cancelled">Cancelled</MenuItem>
                      <MenuItem value="started">In Progress</MenuItem>
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="accepted">Accepted</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {pagination.pages > 1 && (
                  <Pagination
                    count={pagination.pages}
                    page={pagination.current}
                    onChange={handlePageChange}
                    color="primary"
                    size={isMobile ? "small" : "medium"}
                    showFirstButton
                    showLastButton
                  />
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, borderRadius: 2 }}
            action={
              <Button color="inherit" size="small" onClick={handleRefresh}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Empty State */}
        {!error && history.length === 0 && (
          <Card sx={{ 
            borderRadius: 2, 
            boxShadow: 2,
            textAlign: 'center'
          }}>
            <CardContent sx={{ p: { xs: 4, md: 6 } }}>
              <DirectionsCar sx={{ 
                fontSize: { xs: 64, md: 80 }, 
                color: 'text.secondary', 
                mb: 3 
              }} />
              <Typography variant={isMobile ? "h5" : "h4"} sx={{ 
                fontWeight: 'bold', 
                mb: 2,
                color: 'text.secondary'
              }}>
                No Rides Yet
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}>
                {userRole === 'rider' 
                  ? 'Complete your first ride to see it here' 
                  : 'Book your first ride to see it here'
                }
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => navigate(userRole === 'rider' ? '/rider-dashboard' : '/booking')}
                sx={{ 
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  fontWeight: 'bold'
                }}
              >
                {userRole === 'rider' ? 'Go to Dashboard' : 'Book a Ride'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History List */}
        {!error && history.length > 0 && (
          <Grid container spacing={{ xs: 2, md: 3 }}>
            {history.map((ride) => (
              <Grid item xs={12} key={ride._id}>
                <Card sx={{ 
                  borderRadius: 2, 
                  boxShadow: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 4,
                    transform: { xs: 'none', md: 'translateY(-2px)' }
                  }
                }}>
                  <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                    <Grid container spacing={{ xs: 2, md: 3 }}>
                      {/* Ride Info */}
                      <Grid item xs={12} md={8}>
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'flex-start',
                            mb: 1,
                            flexWrap: 'wrap',
                            gap: 1
                          }}>
                            <Typography variant={isMobile ? "h6" : "h5"} sx={{ 
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              flex: 1,
                              minWidth: 200
                            }}>
                              <LocationOn color="success" sx={{ fontSize: { xs: 20, md: 24 } }} />
                              {ride.pickupAddress || ride.pickup || 'Pickup Location'}
                            </Typography>
                            <Chip
                              icon={getStatusIcon(ride.status)}
                              label={getStatusLabel(ride.status)}
                              color={getStatusColor(ride.status)}
                              sx={{ 
                                fontWeight: 'bold',
                                fontSize: { xs: '0.7rem', md: '0.8rem' }
                              }}
                            />
                          </Box>
                          
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            mb: 1,
                            ml: 2
                          }}>
                            <LocationOn color="error" sx={{ fontSize: { xs: 20, md: 24 }, mr: 1 }} />
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {ride.dropAddress || ride.drop || 'Drop Location'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            mb: 1
                          }}>
                            <AccessTime sx={{ fontSize: { xs: 16, md: 18 } }} />
                            {formatDate(ride.createdAt)}
                          </Typography>
                          
                          {ride.distance && (
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              mb: 1
                            }}>
                              <DirectionsCar sx={{ fontSize: { xs: 16, md: 18 } }} />
                              {(ride.distance / 1000).toFixed(2)} km
                            </Typography>
                          )}
                          
                          {ride.estimatedTime && (
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              mb: 1
                            }}>
                              <Schedule sx={{ fontSize: { xs: 16, md: 18 } }} />
                              {ride.estimatedTime} minutes
                            </Typography>
                          )}
                          
                          {ride.rideType && (
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1,
                              mb: 1
                            }}>
                              <DirectionsCar sx={{ fontSize: { xs: 16, md: 18 } }} />
                              {ride.rideType.charAt(0).toUpperCase() + ride.rideType.slice(1)}
                            </Typography>
                          )}
                          
                          {ride.paymentMethod && (
                            <Typography variant="body2" color="text.secondary" sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1
                            }}>
                              <AttachMoney sx={{ fontSize: { xs: 16, md: 18 } }} />
                              {ride.paymentMethod.charAt(0).toUpperCase() + ride.paymentMethod.slice(1)}
                            </Typography>
                          )}
                        </Box>

                        {/* User/Driver Info */}
                        {userRole === 'rider' && ride.riderId && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            p: 1.5,
                            backgroundColor: 'grey.50',
                            borderRadius: 1,
                            mb: 2
                          }}>
                            <Person sx={{ fontSize: { xs: 18, md: 20 }, color: 'primary.main' }} />
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {ride.riderId.fullName || 'Unknown User'}
                            </Typography>
                            {ride.riderId.rating && (
                              <>
                                <Star sx={{ fontSize: { xs: 16, md: 18 }, color: 'gold', ml: 1 }} />
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {ride.riderId.rating}
                                </Typography>
                              </>
                            )}
                          </Box>
                        )}

                        {userRole === 'user' && ride.captainId && (
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1,
                            p: 1.5,
                            backgroundColor: 'grey.50',
                            borderRadius: 1,
                            mb: 2
                          }}>
                            <Person sx={{ fontSize: { xs: 18, md: 20 }, color: 'primary.main' }} />
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {ride.captainId.fullName || 'Unknown Driver'}
                            </Typography>
                            {ride.captainId.rating && (
                              <>
                                <Star sx={{ fontSize: { xs: 16, md: 18 }, color: 'gold', ml: 1 }} />
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {ride.captainId.rating}
                                </Typography>
                              </>
                            )}
                          </Box>
                        )}
                      </Grid>

                      {/* Fare and Actions */}
                      <Grid item xs={12} md={4}>
                        <Box sx={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          height: '100%',
                          justifyContent: 'space-between'
                        }}>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Total Fare
                            </Typography>
                            <Typography variant={isMobile ? "h5" : "h4"} sx={{ 
                              fontWeight: 'bold', 
                              color: 'primary.main',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1
                            }}>
                              <AttachMoney sx={{ fontSize: { xs: 20, md: 24 } }} />
                              ₹{(ride.fare || ride.totalFare || 0).toFixed(2)}
                            </Typography>
                          </Box>

                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            gap: 1
                          }}>
                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              onClick={() => handleTrack(ride._id)}
                              sx={{ 
                                fontSize: { xs: '0.8rem', md: '0.9rem' },
                                py: { xs: 0.5, md: 1 }
                              }}
                            >
                              View Details
                            </Button>
                            
                            {(ride.status === 'completed' || ride.status === 'in-progress' || ride.status === 'in_progress') && (
                              <Button
                                variant="outlined"
                                color="secondary"
                                fullWidth
                                onClick={() => handleCall(
                                  userRole === 'rider' 
                                    ? ride.riderId?.mobile 
                                    : ride.captainId?.mobile
                                )}
                                sx={{ 
                                  fontSize: { xs: '0.8rem', md: '0.9rem' },
                                  py: { xs: 0.5, md: 1 }
                                }}
                                startIcon={<Phone sx={{ fontSize: { xs: 14, md: 16 } }} />}
                              >
                                Call
                              </Button>
                            )}
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Bottom Pagination */}
        {!error && history.length > 0 && pagination.pages > 1 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            mt: 3,
            mb: 2
          }}>
            <Pagination
              count={pagination.pages}
              page={pagination.current}
              onChange={handlePageChange}
              color="primary"
              size={isMobile ? "small" : "medium"}
              showFirstButton
              showLastButton
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}