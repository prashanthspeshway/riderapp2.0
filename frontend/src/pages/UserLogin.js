import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { sendOtp, verifyOtp } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  Card,
  CardContent,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { Person, Phone, Security } from "@mui/icons-material";

export default function UserLogin() {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const navigate = useNavigate();
  const { login } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const isValidMobile = (num) => /^[0-9]{10}$/.test(num);
  const sanitizeMobile = (num) => (num || "").replace(/\D/g, "").slice(0, 10);

  const handleSendOtp = async () => {
    setMessage({ type: "", text: "" });
    const cleaned = sanitizeMobile(mobile);
    if (!cleaned || !isValidMobile(cleaned)) {
      setMessage({ type: "error", text: "Enter a valid 10-digit mobile number" });
      return;
    }
    try {
      setLoading(true);
      // Use sanitized mobile to avoid spaces/newlines breaking backend lookup
      const res = await sendOtp(cleaned, "user");
      if (res.data.success) {
        setStep(2);
        setMessage({ type: "success", text: "OTP sent! Check your mobile." });
      } else {
        setMessage({ type: "error", text: res.data.message || "Failed to send OTP" });
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      const text = apiMsg || (err?.response?.status === 404 ? "User not found. Please sign up first." : "Server error while sending OTP");
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setMessage({ type: "", text: "" });
    const cleanedMobile = sanitizeMobile(mobile);
    if (!otp || otp.length !== 6) {
      setMessage({ type: "error", text: "Enter a valid 6-digit OTP" });
      return;
    }
    try {
      setLoading(true);
      const res = await verifyOtp(cleanedMobile, otp, "user");
      if (res.data.success) {
        login({
          token: res.data.token,
          user: res.data.user,
          roles: [res.data.role || res.data.user?.role || "user"], // ✅ FIX
        });
        setMessage({ type: "success", text: "Login successful! Redirecting..." });
        setTimeout(() => navigate("/booking"), 1000);
      } else {
        setMessage({ type: "error", text: res.data.message || "Invalid OTP" });
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.message;
      const text = apiMsg || "Server error while verifying OTP";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      py: 2
    }}>
    <Container maxWidth="xs">
        <Card sx={{ 
          borderRadius: 3, 
          boxShadow: 6,
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          maxWidth: 400,
          mx: 'auto'
        }}>
          {/* Header with Green Theme */}
          <Box sx={{ 
            bgcolor: 'success.main',
            color: 'white',
            p: 2.5,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 60,
              height: 60,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.1)',
              opacity: 0.3
            }} />
            <Box sx={{
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 50,
              height: 50,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.1)',
              opacity: 0.2
            }} />
            
            <Avatar sx={{ 
              width: 60, 
              height: 60, 
              bgcolor: 'rgba(255,255,255,0.2)',
              mx: 'auto',
              mb: 1.5,
              fontSize: '1.5rem'
            }}>
              <Person sx={{ fontSize: '2rem' }} />
            </Avatar>
            
            <Typography variant="h5" sx={{ 
              fontWeight: 'bold',
              mb: 0.5,
              position: 'relative',
              zIndex: 1,
              fontSize: { xs: '1.3rem', sm: '1.5rem' }
            }}>
              User Login
            </Typography>
            
            <Typography variant="body2" sx={{ 
              opacity: 0.9,
              position: 'relative',
              zIndex: 1,
              fontSize: '0.9rem'
            }}>
              {step === 1 ? 'Enter your mobile number to get started' : 'Enter the OTP sent to your mobile'}
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
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

        {step === 1 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    width: 3, 
                    height: 30, 
                    bgcolor: 'success.main', 
                    borderRadius: 2, 
                    mr: 1.5 
                  }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: 'text.primary', fontSize: '1rem' }}>
                    Mobile Verification
                  </Typography>
                </Box>

                <TextField 
                  fullWidth 
                  label="Mobile Number" 
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)} 
                  margin="normal"
                  inputProps={{ maxLength: 10 }}
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
                
                <Button 
                  fullWidth 
                  variant="contained" 
                  size="medium"
                  onClick={handleSendOtp} 
                  disabled={loading}
                  sx={{ 
                    mt: 2.5,
                    py: 1.2,
                    bgcolor: 'success.main',
                    borderRadius: 2,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: 'success.dark',
                      transform: 'translateY(-1px)',
                      boxShadow: 3
                    },
                    '&:disabled': {
                      bgcolor: 'grey.400'
                    }
                  }}
                >
              {loading ? "Sending..." : "Send OTP"}
            </Button>
              </Box>
        )}

        {step === 2 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ 
                    width: 3, 
                    height: 30, 
                    bgcolor: 'success.main', 
                    borderRadius: 2, 
                    mr: 1.5 
                  }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: 'text.primary', fontSize: '1rem' }}>
                    OTP Verification
                  </Typography>
                </Box>


                <TextField 
                  fullWidth 
                  label="Enter OTP" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)} 
                  margin="normal"
                  inputProps={{ maxLength: 6 }}
                  InputProps={{
                    startAdornment: <Security sx={{ mr: 1, color: 'success.main' }} />
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
                
                <Button 
                  fullWidth 
                  variant="contained" 
                  size="medium"
                  onClick={handleVerifyOtp} 
                  disabled={loading}
                  sx={{ 
                    mt: 2.5,
                    py: 1.2,
                    bgcolor: 'success.main',
                    borderRadius: 2,
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: 'success.dark',
                      transform: 'translateY(-1px)',
                      boxShadow: 3
                    },
                    '&:disabled': {
                      bgcolor: 'grey.400'
                    }
                  }}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>

                <Button 
                  fullWidth 
                  variant="outlined" 
                  size="small"
                  onClick={() => setStep(1)} 
                  disabled={loading}
                  sx={{ 
                    mt: 1.5,
                    py: 0.8,
                    borderColor: 'success.main',
                    color: 'success.main',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontSize: '0.9rem',
                    '&:hover': {
                      borderColor: 'success.dark',
                      bgcolor: 'success.light',
                      color: 'success.dark'
                    }
                  }}
                >
                  Change Mobile Number
                </Button>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: 3,
                flexWrap: 'wrap'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                    New here?
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => navigate("/register")}
                    sx={{ 
                      borderColor: 'success.main',
                      color: 'success.main',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.9rem',
                      py: 0.8,
                      px: 2,
                      '&:hover': {
                        borderColor: 'success.dark',
                        bgcolor: 'success.light'
                      }
                    }}
                  >
                    Sign Up
                  </Button>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                    Rider?
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => navigate("/rider-login")}
                    sx={{ 
                      borderColor: 'success.main',
                      color: 'success.main',
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.9rem',
                      py: 0.8,
                      px: 2,
                      '&:hover': {
                        borderColor: 'success.dark',
                        bgcolor: 'success.light'
                      }
                    }}
                  >
                    Rider Login
                  </Button>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
    </Container>
    </Box>
  );
}
