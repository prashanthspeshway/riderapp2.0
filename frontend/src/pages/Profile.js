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
  TextField,
  useTheme,
  useMediaQuery
} from "@mui/material";
import {
  Person,
  Email,
  Phone,
  LocationOn,
  Edit,
  Save,
  Cancel,
  DirectionsCar,
  AttachMoney,
  CheckCircle,
  AccessTime,
  Schedule
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useNotification } from "../contexts/NotificationContext";
import api from "../services/api";
import RiderMobileMenu from "../components/RiderMobileMenu";

export default function Profile() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // State management
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    address: ''
  });
  const [originalData, setOriginalData] = useState({});
  const [userRole, setUserRole] = useState('user');

  // Load user data
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      if (!auth?.token) {
        showError("Please login again");
        logout();
        navigate("/login");
        return;
      }

      // Get user data from auth context
      if (auth?.user) {
        const userData = auth.user;
        setFormData({
          fullName: userData.fullName || '',
          email: userData.email || '',
          mobile: userData.mobile || '',
          address: userData.address || ''
        });
        setOriginalData({
          fullName: userData.fullName || '',
          email: userData.email || '',
          mobile: userData.mobile || '',
          address: userData.address || ''
        });
        
        // Determine user role
        if (auth.roles?.includes('rider')) {
          setUserRole('rider');
        } else if (auth.roles?.includes('admin')) {
          setUserRole('admin');
        } else {
          setUserRole('user');
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      showError("Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  // Save profile changes
  const handleSave = async () => {
    try {
      setLoading(true);
      
      if (!auth?.token) {
        showError("Please login again");
        logout();
        navigate("/login");
        return;
      }

      // Update user profile
      const response = await api.put(`/users/${auth.user._id}`, formData, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      if (response.data.success) {
        showSuccess("Profile updated successfully!");
        setOriginalData({ ...formData });
        setEditing(false);
        
        // Update auth context with new data
        // Note: You might need to implement a method to update auth context
        // For now, we'll just show success
      } else {
        showError(response.data.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      if (error.response?.status === 401) {
        showError("Session expired. Please login again.");
        logout();
        navigate("/login");
      } else {
        showError(error.response?.data?.message || "Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setFormData({ ...originalData });
    setEditing(false);
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, [auth]);

  if (loading && !auth?.user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
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
      
      <Box sx={{ maxWidth: { xs: '100%', md: 800 }, mx: 'auto', px: { xs: 2, md: 3 } }}>
        {/* Profile Header */}
        <Card sx={{ 
          mb: { xs: 2, md: 3 }, 
          borderRadius: { xs: 1, md: 2 }, 
          boxShadow: { xs: 1, md: 3 }
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'center', sm: 'flex-start' },
              gap: { xs: 2, sm: 3 }
            }}>
              <Avatar
                sx={{
                  width: { xs: 80, md: 100 },
                  height: { xs: 80, md: 100 },
                  bgcolor: 'primary.main',
                  fontSize: { xs: '2rem', md: '2.5rem' },
                  fontWeight: 'bold'
                }}
              >
                {auth?.user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              
              <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                <Typography variant={isMobile ? "h5" : "h4"} sx={{ fontWeight: 'bold', mb: 1 }}>
                  {auth?.user?.fullName || 'User'}
                </Typography>
                <Chip 
                  label={userRole.toUpperCase()} 
                  color={userRole === 'rider' ? 'warning' : userRole === 'admin' ? 'error' : 'primary'}
                  sx={{ mb: 2, fontWeight: 'bold' }}
                />
                <Typography variant="body1" color="text.secondary">
                  {auth?.user?.email || 'No email provided'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {auth?.user?.mobile || 'No phone provided'}
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                gap: 1,
                flexDirection: { xs: 'row', sm: 'column' }
              }}>
                {!editing ? (
                  <Button
                    variant="contained"
                    startIcon={<Edit />}
                    onClick={() => setEditing(true)}
                    sx={{ 
                      minWidth: { xs: 100, md: 120 },
                      fontSize: { xs: '0.8rem', md: '0.9rem' }
                    }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<Save />}
                      onClick={handleSave}
                      disabled={loading}
                      sx={{ 
                        minWidth: { xs: 100, md: 120 },
                        fontSize: { xs: '0.8rem', md: '0.9rem' }
                      }}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                      sx={{ 
                        minWidth: { xs: 100, md: 120 },
                        fontSize: { xs: '0.8rem', md: '0.9rem' }
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card sx={{ 
          mb: { xs: 2, md: 3 }, 
          borderRadius: { xs: 1, md: 2 }, 
          boxShadow: { xs: 1, md: 3 }
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant={isMobile ? "h6" : "h5"} sx={{ 
              fontWeight: 'bold', 
              mb: { xs: 2, md: 3 }, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1
            }}>
              <Person color="primary" sx={{ fontSize: { xs: 20, md: 24 } }} />
              Personal Information
            </Typography>
            
            <Grid container spacing={{ xs: 2, md: 3 }}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Full Name
                  </Typography>
                  {editing ? (
                    <TextField
                      fullWidth
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      placeholder="Enter your full name"
                      size={isMobile ? "small" : "medium"}
                    />
                  ) : (
                    <Typography variant="body1" sx={{ 
                      fontWeight: 'bold',
                      p: 1,
                      backgroundColor: 'grey.50',
                      borderRadius: 1
                    }}>
                      {formData.fullName || 'Not provided'}
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Email Address
                  </Typography>
                  {editing ? (
                    <TextField
                      fullWidth
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter your email"
                      size={isMobile ? "small" : "medium"}
                    />
                  ) : (
                    <Typography variant="body1" sx={{ 
                      fontWeight: 'bold',
                      p: 1,
                      backgroundColor: 'grey.50',
                      borderRadius: 1
                    }}>
                      {formData.email || 'Not provided'}
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Mobile Number
                  </Typography>
                  {editing ? (
                    <TextField
                      fullWidth
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                      placeholder="Enter your mobile number"
                      size={isMobile ? "small" : "medium"}
                    />
                  ) : (
                    <Typography variant="body1" sx={{ 
                      fontWeight: 'bold',
                      p: 1,
                      backgroundColor: 'grey.50',
                      borderRadius: 1
                    }}>
                      {formData.mobile || 'Not provided'}
                    </Typography>
                  )}
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Address
                  </Typography>
                  {editing ? (
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter your address"
                      size={isMobile ? "small" : "medium"}
                    />
                  ) : (
                    <Typography variant="body1" sx={{ 
                      fontWeight: 'bold',
                      p: 1,
                      backgroundColor: 'grey.50',
                      borderRadius: 1
                    }}>
                      {formData.address || 'Not provided'}
                    </Typography>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card sx={{ 
          mb: { xs: 2, md: 3 }, 
          borderRadius: { xs: 1, md: 2 }, 
          boxShadow: { xs: 1, md: 3 }
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant={isMobile ? "h6" : "h5"} sx={{ 
              fontWeight: 'bold', 
              mb: { xs: 2, md: 3 }, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1
            }}>
              <DirectionsCar color="primary" sx={{ fontSize: { xs: 20, md: 24 } }} />
              Account Information
            </Typography>
            
            <Grid container spacing={{ xs: 2, md: 3 }}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    User ID
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    fontWeight: 'bold',
                    p: 1,
                    backgroundColor: 'grey.50',
                    borderRadius: 1,
                    fontFamily: 'monospace',
                    fontSize: { xs: '0.8rem', md: '0.9rem' }
                  }}>
                    {auth?.user?._id || 'Not available'}
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Account Type
                  </Typography>
                  <Chip 
                    label={userRole.toUpperCase()} 
                    color={userRole === 'rider' ? 'warning' : userRole === 'admin' ? 'error' : 'primary'}
                    sx={{ fontWeight: 'bold' }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Member Since
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    fontWeight: 'bold',
                    p: 1,
                    backgroundColor: 'grey.50',
                    borderRadius: 1
                  }}>
                    {auth?.user?.createdAt 
                      ? new Date(auth.user.createdAt).toLocaleDateString()
                      : 'Not available'
                    }
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                    Last Updated
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    fontWeight: 'bold',
                    p: 1,
                    backgroundColor: 'grey.50',
                    borderRadius: 1
                  }}>
                    {auth?.user?.updatedAt 
                      ? new Date(auth.user.updatedAt).toLocaleDateString()
                      : 'Not available'
                    }
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card sx={{ 
          borderRadius: { xs: 1, md: 2 }, 
          boxShadow: { xs: 1, md: 3 }
        }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Typography variant={isMobile ? "h6" : "h5"} sx={{ 
              fontWeight: 'bold', 
              mb: { xs: 2, md: 3 }, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1
            }}>
              <AccessTime color="primary" sx={{ fontSize: { xs: 20, md: 24 } }} />
              Account Actions
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 3 },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' }
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                gap: { xs: 1, sm: 2 }
              }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={() => window.open('mailto:support@rideshare.com', '_blank')}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 'auto' },
                    fontSize: { xs: '0.8rem', md: '0.9rem' }
                  }}
                >
                  Contact Support
                </Button>
                
                <Button
                  variant="outlined"
                  color="info"
                  onClick={() => navigate('/history')}
                  sx={{ 
                    minWidth: { xs: '100%', sm: 'auto' },
                    fontSize: { xs: '0.8rem', md: '0.9rem' }
                  }}
                >
                  View History
                </Button>
              </Box>
              
              <Button
                variant="contained"
                color="error"
                onClick={() => {
                  if (window.confirm('Are you sure you want to logout?')) {
                    logout();
                    navigate('/login');
                  }
                }}
                sx={{ 
                  minWidth: { xs: '100%', sm: 'auto' },
                  fontSize: { xs: '0.8rem', md: '0.9rem' }
                }}
              >
                Logout
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}