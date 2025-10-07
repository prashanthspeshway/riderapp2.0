import React, { useState, useRef, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery,
  Stepper,
  Step,
  StepLabel,
  Grid,
  IconButton,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import { 
  DirectionsCar, 
  Person, 
  Email, 
  Phone, 
  Upload, 
  Description, 
  CreditCard,
  CameraAlt,
  CheckCircle,
  ArrowForward,
  ArrowBack,
  CloudUpload,
  Image as ImageIcon,
  DocumentScanner
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { signupRider, getVehicleTypes } from "../services/api";

const steps = ['Personal Info', 'Address & Bank Details', 'PAN & Documents', 'Aadhar Details', 'License & Vehicle', 'Review & Submit'];

export default function RiderRegister() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    address: "",
    gender: "",
    ifsc: "",
    accountNumber: "",
    panNumber: "",
    aadharNumber: "",
    licenseNumber: "",
    vehicleNumber: "",
    vehicleType: "",
  });
  
  const [docs, setDocs] = useState({
    profilePicture: null,
    panDocument: null,
    aadharFront: null,
    aadharBack: null,
    license: null,
    rc: null,
    bikeFront: null,
    bikeBack: null,
  });
  
  const [message, setMessage] = useState({ type: "", text: "" });
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentDocType, setCurrentDocType] = useState("");
  const fileInputRef = useRef(null);
  const cameraRef = useRef(null);

  const [vehicleTypes, setVehicleTypes] = useState([]);

  // Load vehicle types once
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const res = await getVehicleTypes();
        setVehicleTypes(res.data?.types || []);
      } catch (err) {
        console.error("Failed to load vehicle types:", err);
      }
    };
    loadTypes();
  }, []);

  const validateFile = (file) => {
    if (!file) return false;
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Only JPG/PNG/PDF allowed" });
      return false;
    }
    if (file.size > maxSize) {
      setMessage({ type: "error", text: "File size must be < 5MB" });
      return false;
    }
    return true;
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (validateFile(files[0]))
      setDocs((prev) => ({ ...prev, [name]: files[0] }));
  };

  const handleCameraCapture = (docType) => {
    setCurrentDocType(docType);
    setCameraOpen(true);
  };

  const capturePhoto = () => {
    if (cameraRef.current) {
      const canvas = document.createElement('canvas');
      const video = cameraRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `${currentDocType}_camera.jpg`, { type: 'image/jpeg' });
          if (validateFile(file)) {
            setDocs((prev) => ({ ...prev, [currentDocType]: file }));
          }
        }
      }, 'image/jpeg', 0.8);
    }
    setCameraOpen(false);
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (cameraOpen && cameraRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          cameraRef.current.srcObject = stream;
        })
        .catch(error => {
          console.error('Error accessing camera:', error);
          setMessage({ type: "error", text: "Camera access denied. Please use file upload instead." });
          setCameraOpen(false);
        });
    }
  }, [cameraOpen]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setMessage({ type: "", text: "" });
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setLoading(true);

    try {
      const form = new FormData();
      form.append("firstName", formData.firstName);
      form.append("lastName", formData.lastName);
      form.append("email", formData.email);
      form.append("mobile", formData.mobile);
      form.append("address", formData.address);
      form.append("gender", formData.gender);
      form.append("ifsc", formData.ifsc);
      form.append("accountNumber", formData.accountNumber);
      form.append("panNumber", formData.panNumber);
      form.append("aadharNumber", formData.aadharNumber);
      form.append("licenseNumber", formData.licenseNumber);
      form.append("vehicleNumber", formData.vehicleNumber);
      if (formData.vehicleType) {
        form.append("vehicleType", formData.vehicleType);
      }
      form.append("role", "rider");

      Object.keys(docs).forEach((key) => {
        if (docs[key]) form.append(key, docs[key]);
      });

      await signupRider(form);
      setOpenModal(true);
    } catch (err) {
      console.error("❌ Signup error:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || err.message,
      });
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
                Personal Information
              </Typography>
            </Grid>
            
            {/* Profile Picture Upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                <CameraAlt color="primary" />
                Profile Picture
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' }, 
                alignItems: 'center', 
                gap: 3,
                p: 3,
                border: '2px dashed',
                borderColor: 'success.main',
                borderRadius: 3,
                bgcolor: 'success.light',
                opacity: 0.1
              }}>
                {/* Profile Picture Preview */}
                <Box sx={{ 
                  position: 'relative',
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '3px solid',
                  borderColor: 'success.main',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {docs.profilePicture ? (
                    <img
                      src={URL.createObjectURL(docs.profilePicture)}
                      alt="Profile Preview"
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }}
                    />
                  ) : (
                    <Person sx={{ fontSize: 60, color: 'success.main' }} />
                  )}
                </Box>
                
                {/* Upload Buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Upload your profile picture. This will be displayed in your dashboard.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <Button
                      variant="contained"
                      component="label"
                      startIcon={<CloudUpload />}
                      sx={{ 
                        bgcolor: 'success.main',
                        borderRadius: 2,
                        px: 3,
                        py: 1,
                        '&:hover': {
                          bgcolor: 'success.dark'
                        }
                      }}
                    >
                      Upload Photo
                      <input
                        type="file"
                        name="profilePicture"
                        onChange={handleFileChange}
                        hidden
                        accept="image/*"
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CameraAlt />}
                      onClick={() => handleCameraCapture('profilePicture')}
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        px: 3,
                        py: 1,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Take Photo
                    </Button>
                  </Box>
                  {docs.profilePicture && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Chip
                        icon={<CheckCircle />}
                        label={docs.profilePicture.name}
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your first name"
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'success.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your last name"
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: 'success.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="email"
                name="email"
                label="Email"
                value={formData.email}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your email"
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: 'success.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="tel"
                name="mobile"
                label="Mobile Number"
                value={formData.mobile}
                onChange={handleChange}
                inputProps={{ maxLength: 10 }}
                helperText="10-digit mobile starting with 6-9"
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your mobile number"
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: 'success.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Person color="primary" />
                Address & Bank Details
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                name="address"
                label="Address"
                value={formData.address}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your residential address"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                name="gender"
                label="Gender"
                value={formData.gender}
                onChange={handleChange}
                required
                SelectProps={{ native: true }}
                size={isMobile ? "small" : "medium"}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="ifsc"
                label="Bank IFSC"
                value={formData.ifsc}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter IFSC code"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="accountNumber"
                label="Account Number"
                value={formData.accountNumber}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter bank account number"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CreditCard color="primary" />
                PAN & Document Upload
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="panNumber"
                label="PAN Number"
                value={formData.panNumber}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your PAN number"
                InputProps={{
                  startAdornment: <CreditCard sx={{ mr: 1, color: 'success.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                Upload PAN Document
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<CloudUpload />}
                  sx={{ 
                    borderColor: 'success.main',
                    color: 'success.main',
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: 'success.dark',
                      bgcolor: 'success.light'
                    }
                  }}
                >
                  Upload File
                  <input
                    type="file"
                    name="panDocument"
                    onChange={handleFileChange}
                    hidden
                    accept="image/*,.pdf"
                  />
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<CameraAlt />}
                  onClick={() => handleCameraCapture('panDocument')}
                  sx={{ 
                    borderColor: 'success.main',
                    color: 'success.main',
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: 'success.dark',
                      bgcolor: 'success.light'
                    }
                  }}
                >
                  Take Photo
                </Button>
                {docs.panDocument && (
                  <Chip
                    icon={<CheckCircle />}
                    label={docs.panDocument.name}
                    color="success"
                    variant="outlined"
                  />
                )}
              </Box>
            </Grid>
          </Grid>
        );
      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DocumentScanner color="primary" />
                Aadhar Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="aadharNumber"
                label="Aadhar Number"
                value={formData.aadharNumber}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your Aadhar number"
                InputProps={{
                  startAdornment: <DocumentScanner sx={{ mr: 1, color: 'success.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                Upload Aadhar Documents
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Aadhar Front</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      size="small"
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Upload
                      <input
                        type="file"
                        name="aadharFront"
                        onChange={handleFileChange}
                        hidden
                        accept="image/*,.pdf"
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CameraAlt />}
                      size="small"
                      onClick={() => handleCameraCapture('aadharFront')}
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Camera
                    </Button>
                    {docs.aadharFront && (
                      <Chip
                        icon={<CheckCircle />}
                        label={docs.aadharFront.name}
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Aadhar Back</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      size="small"
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Upload
                      <input
                        type="file"
                        name="aadharBack"
                        onChange={handleFileChange}
                        hidden
                        accept="image/*,.pdf"
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CameraAlt />}
                      size="small"
                      onClick={() => handleCameraCapture('aadharBack')}
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Camera
                    </Button>
                    {docs.aadharBack && (
                      <Chip
                        icon={<CheckCircle />}
                        label={docs.aadharBack.name}
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        );
      case 4:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <DirectionsCar color="primary" />
                License & Vehicle Details
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="licenseNumber"
                label="License Number"
                value={formData.licenseNumber}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your license number"
                InputProps={{
                  startAdornment: <DirectionsCar sx={{ mr: 1, color: 'success.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                name="vehicleNumber"
                label="Vehicle Number"
                value={formData.vehicleNumber}
                onChange={handleChange}
                required
                size={isMobile ? "small" : "medium"}
                placeholder="Enter your vehicle number"
                InputProps={{
                  startAdornment: <DirectionsCar sx={{ mr: 1, color: 'success.main' }} />
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'success.main',
                      borderWidth: 2,
                    },
                  },
                  '& .MuiInputLabel-root.Mui-focused': {
                    color: 'success.main',
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                <InputLabel id="vehicle-type-label">Vehicle Type</InputLabel>
                <Select
                  labelId="vehicle-type-label"
                  id="vehicle-type"
                  name="vehicleType"
                  value={formData.vehicleType}
                  label="Vehicle Type"
                  onChange={handleChange}
                >
                  {vehicleTypes.map((t) => (
                    <MenuItem key={t.code} value={t.code}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                Upload License & Vehicle Documents
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>License Document</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      size="small"
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Upload
                      <input
                        type="file"
                        name="license"
                        onChange={handleFileChange}
                        hidden
                        accept="image/*,.pdf"
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CameraAlt />}
                      size="small"
                      onClick={() => handleCameraCapture('license')}
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Camera
                    </Button>
                    {docs.license && (
                      <Chip
                        icon={<CheckCircle />}
                        label={docs.license.name}
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>RC Document</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      size="small"
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Upload
                      <input
                        type="file"
                        name="rc"
                        onChange={handleFileChange}
                        hidden
                        accept="image/*,.pdf"
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CameraAlt />}
                      size="small"
                      onClick={() => handleCameraCapture('rc')}
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Camera
                    </Button>
                    {docs.rc && (
                      <Chip
                        icon={<CheckCircle />}
                        label={docs.rc.name}
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Bike Front Photo</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      size="small"
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Upload
                      <input
                        type="file"
                        name="bikeFront"
                        onChange={handleFileChange}
                        hidden
                        accept="image/*"
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CameraAlt />}
                      size="small"
                      onClick={() => handleCameraCapture('bikeFront')}
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Camera
                    </Button>
                    {docs.bikeFront && (
                      <Chip
                        icon={<CheckCircle />}
                        label={docs.bikeFront.name}
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Bike Back Photo</Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<CloudUpload />}
                      size="small"
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Upload
                      <input
                        type="file"
                        name="bikeBack"
                        onChange={handleFileChange}
                        hidden
                        accept="image/*"
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<CameraAlt />}
                      size="small"
                      onClick={() => handleCameraCapture('bikeBack')}
                      sx={{ 
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 2,
                        '&:hover': {
                          borderColor: 'success.dark',
                          bgcolor: 'success.light'
                        }
                      }}
                    >
                      Camera
                    </Button>
                    {docs.bikeBack && (
                      <Chip
                        icon={<CheckCircle />}
                        label={docs.bikeBack.name}
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        );
      case 5:
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
                  Personal Information
                </Typography>
                {docs.profilePicture && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <Avatar
                      src={URL.createObjectURL(docs.profilePicture)}
                      sx={{ width: 80, height: 80, border: '2px solid', borderColor: 'success.main' }}
                    />
                  </Box>
                )}
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Name:</strong> {formData.firstName} {formData.lastName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Email:</strong> {formData.email}
                </Typography>
                <Typography variant="body2">
                  <strong>Mobile:</strong> {formData.mobile}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Document Details
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>PAN:</strong> {formData.panNumber}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Aadhar:</strong> {formData.aadharNumber}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>License:</strong> {formData.licenseNumber}
                </Typography>
                <Typography variant="body2">
                  <strong>Vehicle:</strong> {formData.vehicleNumber}
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card sx={{ p: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Uploaded Documents
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {Object.entries(docs).map(([key, file]) => (
                    file && (
                      <Chip
                        key={key}
                        icon={<CheckCircle />}
                        label={file.name}
                        color="success"
                        variant="outlined"
                      />
                    )
                  ))}
                </Box>
              </Card>
            </Grid>
          </Grid>
        );
      default:
        return 'Unknown step';
    }
  };

  return (
    <>
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
              <DirectionsCar sx={{ 
                fontSize: { xs: 40, md: 48 }, 
                color: 'success.main' 
              }} />
              <Box>
                <Typography variant={isMobile ? "h4" : "h3"} sx={{ 
                  fontWeight: 'bold',
                  color: 'success.main',
                  mb: 1
                }}>
                  Rider Registration
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Join our driver community and start earning
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
              {message.text && (
                <Alert 
                  severity={message.type} 
                  sx={{ 
                    mb: 3, 
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: '1.2rem'
                    }
                  }}
                >
                  {message.text}
                </Alert>
              )}
              
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
                  startIcon={<ArrowBack />}
                  sx={{ 
                    minWidth: 120,
                    py: 1.5,
                    color: 'success.main',
                    '&:hover': {
                      bgcolor: 'success.light'
                    }
                  }}
                >
                  Back
                </Button>
                
                {activeStep === steps.length - 1 ? (
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
                    sx={{
                      minWidth: 200,
                      py: 1.5,
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      bgcolor: 'success.main',
                      '&:hover': { bgcolor: 'success.dark' }
                    }}
                  >
                    {loading ? 'Submitting...' : 'Submit Registration'}
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
                      fontWeight: 'bold',
                      bgcolor: 'success.main',
                      '&:hover': { bgcolor: 'success.dark' }
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

      {/* Camera Modal */}
      <Dialog open={cameraOpen} onClose={() => setCameraOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ 
          bgcolor: 'success.main', 
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          Take Photo - {currentDocType}
        </DialogTitle>
        <DialogContent sx={{ p: 3, textAlign: 'center' }}>
          <Box sx={{ 
            width: '100%', 
            height: 300, 
            bgcolor: 'grey.100',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2
          }}>
            <video
              ref={cameraRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Position the document clearly in the camera view and click "Capture"
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setCameraOpen(false)}
            sx={{
              borderColor: 'success.main',
              color: 'success.main',
              '&:hover': {
                borderColor: 'success.dark',
                bgcolor: 'success.light'
              }
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={capturePhoto}
            startIcon={<CameraAlt />}
            sx={{
              bgcolor: 'success.main',
              '&:hover': { bgcolor: 'success.dark' }
            }}
          >
            Capture
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)}>
        <DialogTitle sx={{ 
          bgcolor: 'success.main', 
          color: 'white',
          textAlign: 'center',
          fontWeight: 'bold'
        }}>
          Registration Submitted Successfully!
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
            <Typography sx={{ fontSize: '1.1rem', mb: 1 }}>
              Your registration has been submitted successfully.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait for admin approval. You will be notified once your account is verified.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button
            variant="contained"
            onClick={() => {
              setOpenModal(false);
              navigate("/rider-login");
            }}
            sx={{
              bgcolor: 'success.main',
              borderRadius: 2,
              px: 3,
              py: 1,
              '&:hover': {
                bgcolor: 'success.dark'
              }
            }}
          >
            Go to Login
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
