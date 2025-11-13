import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  Grid,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
  Tooltip
} from "@mui/material";
import {
  LocalShipping,
  LocationOn,
  Person,
  Phone,
  Category,
  Description,
  Send,
  MyLocation,
  Place,
  Route,
  CheckCircle,
  ArrowForward,
  Refresh
} from "@mui/icons-material";
import { useJsApiLoader, GoogleMap, Marker, DirectionsRenderer, Autocomplete } from "@react-google-maps/api";
import axios from "axios";
import { API_BASE } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";

const libraries = ["places"];

const HYDERABAD_CENTER = {
  lat: 17.3850,
  lng: 78.4867,
};

const SEARCH_RADIUS = 50000; // 50km in meters

const steps = ['Sender Details', 'Receiver Details', 'Parcel Info', 'Location & Map', 'Review & Submit'];

export default function Parcel() {
  const { auth } = useAuth();
  const { showSuccess, showError } = useNotification();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({
    senderName: "",
    senderMobile: "",
    receiverName: "",
    receiverMobile: "",
    parcelCategory: "",
    parcelDetails: "",
    pickupAddress: "",
    dropAddress: "",
  });

  const [pickup, setPickup] = useState(null);
  const [drop, setDrop] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [directions, setDirections] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [mapLoading, setMapLoading] = useState(true);

  const [pickupAutocomplete, setPickupAutocomplete] = useState(null);
  const [dropAutocomplete, setDropAutocomplete] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyAWstISB_4yTFzsAolxk8SOMBZ_7_RaKQo",
    libraries: libraries
  });

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log("📍 Parcel GPS Location:", {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            source: position.coords.accuracy < 100 ? "GPS" : "Network"
          });
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(pos);
          setPickup(pos);
          setMapLoading(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setCurrentLocation({ lat: 12.9716, lng: 77.5946 }); // Bangalore
          setPickup({ lat: 12.9716, lng: 77.5946 });
          setMapLoading(false);
        },
        { 
          enableHighAccuracy: true,  // Force GPS on mobile
          timeout: 15000,            // Longer timeout for GPS lock
          maximumAge: 0              // Force fresh GPS reading, no cache
        }
      );
    }
  }, []);

  // Calculate route when pickup and drop are set
  useEffect(() => {
    if (pickup && drop && isLoaded) {
      calculateRoute();
    }
  }, [pickup, drop, isLoaded]);

  // Force map re-render when step changes to Location & Map
  useEffect(() => {
    if (activeStep === 3 && isLoaded) {
      // Small delay to ensure the map container is rendered
      setTimeout(() => {
        setMapLoading(false);
        // Trigger map resize to ensure proper rendering
        if (window.google && window.google.maps) {
          setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 200);
        }
      }, 100);
    }
  }, [activeStep, isLoaded]);

  const calculateRoute = async () => {
    if (!pickup || !drop) return;

    const directionsService = new window.google.maps.DirectionsService();

    directionsService.route(
      {
        origin: pickup,
        destination: drop,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
          const route = result.routes[0];
          setDistance((route.legs[0].distance.value / 1000).toFixed(2));
          setDuration(Math.round(route.legs[0].duration.value / 60));
        } else {
          console.error("Directions request failed:", status);
        }
      }
    );
  };

  // Geocoding helpers
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const results = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK') {
            resolve(results);
          } else {
            reject(status);
          }
        });
      });
      return results[0]?.formatted_address || "";
    } catch (err) {
      console.error("Reverse geocode failed:", err);
      return "";
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleMapClick = async (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    const newLocation = { lat, lng };
    
    setDrop(newLocation);
    const address = await getAddressFromCoords(lat, lng);
    setForm(prev => ({ ...prev, dropAddress: address }));
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(form.senderMobile)) {
      showError("Sender Mobile must be 10 digits starting with 6,7,8,9");
      setLoading(false);
      return;
    }
    if (!phoneRegex.test(form.receiverMobile)) {
      showError("Receiver Mobile must be 10 digits starting with 6,7,8,9");
      setLoading(false);
      return;
    }

    if (!pickup || !drop) {
      showError("Please select both pickup and drop locations");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/api/parcels`, {
        ...form,
        pickup: pickup,
        drop: drop,
        distance: distance,
        duration: duration
      });

      showSuccess("Parcel request submitted successfully!");
      navigate("/activity", {
        state: {
          parcel: res.data.parcel,
          rider: res.data.rider,
          distance,
        },
      });
    } catch (err) {
      console.error("Error submitting parcel:", err);
      showError("Error submitting parcel request!");
    } finally {
      setLoading(false);
    }
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" />
                Sender Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="senderName"
                label="Sender Name"
                value={form.senderName}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter sender's full name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="senderMobile"
                label="Sender Mobile"
                value={form.senderMobile}
                onChange={handleChange}
                type="tel"
                inputProps={{ pattern: "[6-9][0-9]{9}", maxLength: 10 }}
                helperText="10-digit mobile starting with 6-9"
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter sender's mobile number"
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="secondary" />
                Receiver Information
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="receiverName"
                label="Receiver Name"
                value={form.receiverName}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter receiver's full name"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="receiverMobile"
                label="Receiver Mobile"
                value={form.receiverMobile}
                onChange={handleChange}
                type="tel"
                inputProps={{ pattern: "[6-9][0-9]{9}", maxLength: 10 }}
                helperText="10-digit mobile starting with 6-9"
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter receiver's mobile number"
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Category color="primary" />
                Parcel Information
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                select
                name="parcelCategory"
                label="Parcel Category"
                value={form.parcelCategory}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
              >
                <MenuItem value="Documents">📄 Documents</MenuItem>
                <MenuItem value="Food">🍕 Food</MenuItem>
                <MenuItem value="Electronics">📱 Electronics</MenuItem>
                <MenuItem value="Clothes">👕 Clothes</MenuItem>
                <MenuItem value="Fragile">⚠️ Fragile</MenuItem>
                <MenuItem value="Other">📦 Other</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="parcelDetails"
                label="Parcel Details"
                value={form.parcelDetails}
                onChange={handleChange}
                multiline
                rows={4}
                placeholder="Describe your parcel (size, weight, special instructions, etc.)"
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Box>
            {/* Location Details Header */}
            <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationOn color="primary" />
              Location Details
            </Typography>

            {/* Address Input Fields */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      setPickupAutocomplete(autocomplete);
                      // Configure autocomplete with Hyderabad restrictions
                      if (window.google && window.google.maps) {
                        autocomplete.setBounds(
                          new window.google.maps.Circle({
                            center: HYDERABAD_CENTER,
                            radius: SEARCH_RADIUS
                          }).getBounds()
                        );
                        autocomplete.setComponentRestrictions({ country: 'in' });
                      }
                    }}
                    onPlaceChanged={() => {
                      if (pickupAutocomplete) {
                        const place = pickupAutocomplete.getPlace();
                        if (place.geometry && place.geometry.location) {
                          const coords = {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                          };
                          setPickup(coords);
                          setForm(prev => ({ ...prev, pickupAddress: place.formatted_address }));
                        }
                      }
                    }}
                    options={{
                      types: ['establishment', 'geocode'],
                      componentRestrictions: { country: 'in' },
                      bounds: window.google && window.google.maps ? new window.google.maps.Circle({
                        center: HYDERABAD_CENTER,
                        radius: SEARCH_RADIUS
                      }).getBounds() : null,
                      strictBounds: true
                    }}
                  >
                    <TextField
                      fullWidth
                      name="pickupAddress"
                      label="Pickup Address"
                      value={form.pickupAddress}
                      onChange={(e) => handleChange(e)}
                      placeholder="Enter pickup location"
                      required
                      size={isMobile ? "small" : "medium"}
                      InputProps={{
                        startAdornment: <Place sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Autocomplete>
                ) : (
                  <TextField
                    fullWidth
                    name="pickupAddress"
                    label="Pickup Address"
                    value={form.pickupAddress}
                    onChange={(e) => handleChange(e)}
                    placeholder="Enter pickup location"
                    required
                    size={isMobile ? "small" : "medium"}
                    InputProps={{
                      startAdornment: <Place sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                {isLoaded ? (
                  <Autocomplete
                    onLoad={(autocomplete) => {
                      setDropAutocomplete(autocomplete);
                      // Configure autocomplete with Hyderabad restrictions
                      if (window.google && window.google.maps) {
                        autocomplete.setBounds(
                          new window.google.maps.Circle({
                            center: HYDERABAD_CENTER,
                            radius: SEARCH_RADIUS
                          }).getBounds()
                        );
                        autocomplete.setComponentRestrictions({ country: 'in' });
                      }
                    }}
                    onPlaceChanged={() => {
                      if (dropAutocomplete) {
                        const place = dropAutocomplete.getPlace();
                        if (place.geometry && place.geometry.location) {
                          const coords = {
                            lat: place.geometry.location.lat(),
                            lng: place.geometry.location.lng()
                          };
                          setDrop(coords);
                          setForm(prev => ({ ...prev, dropAddress: place.formatted_address }));
                        }
                      }
                    }}
                    options={{
                      types: ['establishment', 'geocode'],
                      componentRestrictions: { country: 'in' },
                      bounds: window.google && window.google.maps ? new window.google.maps.Circle({
                        center: HYDERABAD_CENTER,
                        radius: SEARCH_RADIUS
                      }).getBounds() : null,
                      strictBounds: true
                    }}
                  >
                    <TextField
                      fullWidth
                      name="dropAddress"
                      label="Drop Address"
                      value={form.dropAddress}
                      onChange={(e) => handleChange(e)}
                      placeholder="Enter drop location"
                      required
                      size={isMobile ? "small" : "medium"}
                      InputProps={{
                        startAdornment: <Place sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Autocomplete>
                ) : (
                  <TextField
                    fullWidth
                    name="dropAddress"
                    label="Drop Address"
                    value={form.dropAddress}
                    onChange={(e) => handleChange(e)}
                    placeholder="Enter drop location"
                    required
                    size={isMobile ? "small" : "medium"}
                    InputProps={{
                      startAdornment: <Place sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                )}
              </Grid>
            </Grid>

            {/* Full-Width Map Section */}
            <Box sx={{ 
              width: '100%',
              borderRadius: 2, 
              overflow: 'hidden',
              border: '2px solid #e0e0e0',
              position: 'relative',
              bgcolor: 'grey.50',
              display: 'flex',
              flexDirection: 'column',
              '& .map-container': {
                width: '100% !important',
                height: '100% !important',
                minHeight: '500px !important',
                borderRadius: '8px !important'
              },
              '& .gm-style': {
                borderRadius: '8px !important'
              }
            }}>
              <Typography variant="body2" color="text.secondary" sx={{ p: 2, fontStyle: 'italic', borderBottom: '1px solid #e0e0e0' }}>
                Click on the map to set your drop location
              </Typography>
              
              {mapLoading ? (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '500px',
                  width: '100%',
                  bgcolor: 'grey.100'
                }}>
                  <CircularProgress size={40} sx={{ mb: 2 }} />
                  <Typography variant="body2" color="text.secondary">
                    Loading map...
                  </Typography>
                </Box>
              ) : isLoaded ? (
                <Box sx={{ 
                  height: '500px', 
                  width: '100%',
                  position: 'relative'
                }}>
                  <GoogleMap
                    mapContainerStyle={{ 
                      width: '100%', 
                      height: '100%',
                      minHeight: '500px',
                      borderRadius: '8px'
                    }}
                    mapContainerClassName="map-container"
                    center={currentLocation || HYDERABAD_CENTER}
                    zoom={13}
                    onClick={handleMapClick}
                    options={{
                      zoomControl: true,
                      streetViewControl: false,
                      mapTypeControl: false,
                      fullscreenControl: true,
                      clickableIcons: false,
                      gestureHandling: 'greedy',
                      disableDefaultUI: false,
                      styles: [
                        {
                          featureType: 'all',
                          elementType: 'geometry.fill',
                          stylers: [{ visibility: 'on' }]
                        }
                      ]
                    }}
                  >
                    {currentLocation && (
                      <Marker
                        position={currentLocation}
                        title="Your Location"
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                          scaledSize: new window.google.maps.Size(30, 30)
                        }}
                      />
                    )}
                    {pickup && (
                      <Marker
                        position={pickup}
                        title="Pickup Location"
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                          scaledSize: new window.google.maps.Size(30, 30)
                        }}
                      />
                    )}
                    {drop && (
                      <Marker
                        position={drop}
                        title="Drop Location"
                        icon={{
                          url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: new window.google.maps.Size(30, 30)
                        }}
                      />
                    )}
                    {directions && (
                      <DirectionsRenderer directions={directions} />
                    )}
                  </GoogleMap>
                  <Box sx={{ 
                    position: 'absolute', 
                    top: 10, 
                    right: 10,
                    bgcolor: 'white',
                    p: 1,
                    borderRadius: 1,
                    boxShadow: 2,
                    zIndex: 1000
                  }}>
                    <Tooltip title="Click on map to set drop location">
                      <Chip 
                        icon={<MyLocation />} 
                        label="Click to set drop" 
                        size="small" 
                        color="primary" 
                      />
                    </Tooltip>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '500px',
                  width: '100%',
                  bgcolor: 'grey.100'
                }}>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    Map Loading...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Please wait while we load the map
                  </Typography>
                </Box>
              )}
            </Box>
            
            {(distance && duration) && (
              <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
                <Typography variant="body2">
                  <strong>Route calculated:</strong> {distance} km • <strong>Duration:</strong> {duration} minutes
                </Typography>
              </Alert>
            )}
          </Box>
        );
      case 4:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color="primary" />
                Review & Submit
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Sender Details
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Name:</strong> {form.senderName}
                </Typography>
                <Typography variant="body2">
                  <strong>Mobile:</strong> {form.senderMobile}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Receiver Details
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Name:</strong> {form.receiverName}
                </Typography>
                <Typography variant="body2">
                  <strong>Mobile:</strong> {form.receiverMobile}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Parcel Information
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Category:</strong> {form.parcelCategory}
                </Typography>
                <Typography variant="body2">
                  <strong>Details:</strong> {form.parcelDetails || 'No additional details'}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Location Details
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Pickup:</strong> {form.pickupAddress}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Drop:</strong> {form.dropAddress}
                </Typography>
                {(distance && duration) && (
                  <Typography variant="body2">
                    <strong>Distance:</strong> {distance} km • <strong>Duration:</strong> {duration} minutes
                  </Typography>
                )}
              </Card>
            </Grid>
          </Grid>
        );
      default:
        return 'Unknown step';
    }
  };

  if (!isLoaded) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '50vh' 
      }}>
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
      <Container maxWidth="lg" sx={{ mt: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box sx={{ 
          textAlign: 'center', 
          mb: { xs: 3, md: 4 },
          p: { xs: 2, md: 3 },
          bgcolor: 'white',
          borderRadius: 2,
          boxShadow: 1
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: 2, 
            mb: 2
          }}>
            <LocalShipping sx={{ 
              fontSize: { xs: 40, md: 48 }, 
              color: 'primary.main' 
            }} />
            <Box>
              <Typography variant={isMobile ? "h4" : "h3"} sx={{ 
                fontWeight: 'bold',
                color: 'primary.main',
                mb: 1
              }}>
                Book a Parcel
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Send your parcel safely with our delivery service
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Stepper */}
        <Paper sx={{ p: { xs: 2, md: 3 }, mb: 3, borderRadius: 2 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>

        {/* Main Content */}
        <Paper sx={{ 
          p: { xs: 2, md: 4 }, 
          borderRadius: 2,
          boxShadow: 2
        }}>
          <Box component="form" onSubmit={handleSubmit}>
            {getStepContent(activeStep)}
            
            <Divider sx={{ my: 3 }} />
            
            {/* Navigation Buttons */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Button
                disabled={activeStep === 0}
                onClick={handleBack}
                sx={{ 
                  minWidth: 120,
                  py: 1.5
                }}
              >
                Back
              </Button>
              
              {activeStep === steps.length - 1 ? (
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !pickup || !drop}
                  startIcon={loading ? <CircularProgress size={20} /> : <Send />}
                  sx={{
                    minWidth: 200,
                    py: 1.5,
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Parcel Request'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleNext}
                  endIcon={<ArrowForward />}
                  sx={{
                    minWidth: 120,
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}