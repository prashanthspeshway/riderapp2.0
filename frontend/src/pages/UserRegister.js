import React, { useState } from "react";
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Alert, 
  Box,
  Card,
  CardContent,
  Avatar,
  Divider,
  useTheme,
  useMediaQuery
} from "@mui/material";
import { Person, PersonAdd, Email, Phone } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { signupUser } from "../services/api";

export default function UserRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: "", email: "", mobile: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await signupUser(formData);
      if (res.data.success) {
        setSuccess("Registered successfully! Please login.");
        setTimeout(() => navigate("/login"), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error. Try again.");
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
              <PersonAdd sx={{ fontSize: '2rem' }} />
            </Avatar>
            
            <Typography variant="h5" sx={{ 
              fontWeight: 'bold',
              mb: 0.5,
              position: 'relative',
              zIndex: 1,
              fontSize: { xs: '1.3rem', sm: '1.5rem' }
            }}>
              User Register
            </Typography>
            
            <Typography variant="body2" sx={{ 
              opacity: 0.9,
              position: 'relative',
              zIndex: 1,
              fontSize: '0.9rem'
            }}>
              Create your account to get started
            </Typography>
          </Box>

          <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.2rem'
                  }
                }}
              >
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3, 
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: '1.2rem'
                  }
                }}
              >
                {success}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Box sx={{ 
                  width: 3, 
                  height: 30, 
                  bgcolor: 'success.main', 
                  borderRadius: 2, 
                  mr: 1.5 
                }} />
                <Typography variant="subtitle1" sx={{ fontWeight: "bold", color: 'text.primary', fontSize: '1rem' }}>
                  Personal Information
                </Typography>
              </Box>

              <TextField 
                fullWidth 
                label="Full Name" 
                name="fullName" 
                value={formData.fullName} 
                onChange={handleChange} 
                margin="normal" 
                required
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

              <TextField 
                fullWidth 
                type="email" 
                label="Email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                margin="normal" 
                required
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

              <TextField 
                fullWidth 
                type="tel" 
                label="Mobile Number" 
                name="mobile" 
                value={formData.mobile} 
                onChange={handleChange} 
                margin="normal" 
                inputProps={{ maxLength: 10 }} 
                required
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
                type="submit" 
                fullWidth 
                variant="contained" 
                size="medium"
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
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
            </form>

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
                    Already have an account?
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => navigate("/login")}
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
                    Login
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
