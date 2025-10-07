import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  IconButton,
  InputAdornment
} from "@mui/material";
import {
  Close,
  Visibility,
  VisibilityOff,
  Security,
  Timer
} from "@mui/icons-material";
import { verifyOTP, resendOTP } from "../services/api";
import { useNotification } from "../contexts/NotificationContext";

export default function OTPVerificationModal({ 
  open, 
  onClose, 
  ride, 
  onVerified 
}) {
  // Debug logging
  console.log("🔐 OTP Modal - Ride data:", ride);
  console.log("🔐 OTP Modal - Open state:", open);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [showOtp, setShowOtp] = useState(false);
  const { showSuccess, showError } = useNotification();

  // Timer countdown
  useEffect(() => {
    if (!open || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, timeLeft]);

  // Reset timer when modal opens
  useEffect(() => {
    if (open) {
      setTimeLeft(300);
      setOtp("");
    }
  }, [open]);

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      showError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await verifyOTP(ride._id, otp);
      if (response.data.success) {
        showSuccess("OTP verified successfully! Ride activated.");
        onVerified(ride._id);
        onClose();
      } else {
        showError(response.data.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      showError(
        error.response?.data?.message || 
        "Failed to verify OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    try {
      const response = await resendOTP(ride._id);
      if (response.data.success) {
        showSuccess("New OTP sent successfully!");
        setTimeLeft(300); // Reset timer
        setOtp("");
      } else {
        showError(response.data.message || "Failed to resend OTP");
      }
    } catch (error) {
      console.error("Resend OTP error:", error);
      showError(
        error.response?.data?.message || 
        "Failed to resend OTP. Please try again."
      );
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only numbers
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Security sx={{ fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Verify OTP
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose} 
          sx={{ color: 'white' }}
          disabled={loading}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ 
          bgcolor: 'rgba(255,255,255,0.1)', 
          borderRadius: 2, 
          p: 3, 
          mb: 3,
          backdropFilter: 'blur(10px)'
        }}>
          <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
            Ride #{ride?._id}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Please enter the 6-digit OTP provided by the passenger to activate this ride.
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Enter OTP"
            value={otp}
            onChange={handleOtpChange}
            type={showOtp ? "text" : "password"}
            placeholder="000000"
            inputProps={{
              maxLength: 6,
              style: { 
                textAlign: 'center', 
                fontSize: '24px', 
                letterSpacing: '8px',
                fontWeight: 'bold'
              }
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowOtp(!showOtp)}
                    edge="end"
                    sx={{ color: 'white' }}
                  >
                    {showOtp ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                '& fieldset': {
                  borderColor: 'rgba(255,255,255,0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255,255,255,0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'white',
                },
              },
              '& .MuiInputLabel-root': {
                color: 'rgba(255,255,255,0.8)',
                '&.Mui-focused': {
                  color: 'white',
                },
              },
              '& .MuiOutlinedInput-input': {
                color: 'white',
              }
            }}
          />
        </Box>

        {/* Timer */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: 1,
          mb: 2
        }}>
          <Timer sx={{ fontSize: 20 }} />
          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
            Time remaining: {formatTime(timeLeft)}
          </Typography>
        </Box>

        {timeLeft === 0 && (
          <Alert 
            severity="warning" 
            sx={{ 
              mb: 2,
              bgcolor: 'rgba(255, 152, 0, 0.2)',
              color: 'white',
              '& .MuiAlert-icon': {
                color: 'white'
              }
            }}
          >
            OTP has expired. Please request a new one.
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0 }}>
        <Button
          onClick={handleResendOTP}
          disabled={resendLoading || loading}
          sx={{
            color: 'white',
            borderColor: 'rgba(255,255,255,0.5)',
            '&:hover': {
              borderColor: 'white',
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          {resendLoading ? <CircularProgress size={20} /> : 'Resend OTP'}
        </Button>
        
        <Button
          onClick={handleVerifyOTP}
          disabled={loading || otp.length !== 6 || timeLeft === 0}
          variant="contained"
          sx={{
            bgcolor: 'rgba(76, 175, 80, 0.9)',
            color: 'white',
            px: 4,
            py: 1.5,
            fontWeight: 'bold',
            '&:hover': {
              bgcolor: 'rgba(76, 175, 80, 1)'
            },
            '&:disabled': {
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.5)'
            }
          }}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Verify & Activate'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

