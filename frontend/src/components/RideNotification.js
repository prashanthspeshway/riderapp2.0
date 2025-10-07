import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Avatar,
  Chip,
  Card,
  CardContent,
  IconButton
} from '@mui/material';
import {
  DirectionsCar,
  Person,
  LocationOn,
  AccessTime,
  AttachMoney,
  Close,
  Phone,
  Chat
} from '@mui/icons-material';

const RideNotification = ({ 
  open, 
  onClose, 
  ride, 
  onCall, 
  onChat, // Optional prop for chat functionality
  userRole 
}) => {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (open) {
      setCountdown(10);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [open, onClose]);

  if (!ride) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { 
          borderRadius: 3,
          border: '3px solid',
          borderColor: 'success.main'
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'success.main', 
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <DirectionsCar sx={{ mr: 1, fontSize: 28 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {userRole === 'user' ? 'Ride Accepted!' : 'Ride Accepted!'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={`Auto-close in ${countdown}s`}
            size="small"
            sx={{ bgcolor: 'white', color: 'success.main' }}
          />
          <IconButton onClick={onClose} sx={{ color: 'white' }}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Card sx={{ mb: 2, border: '2px solid', borderColor: 'success.light' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 56, height: 56 }}>
                <Person />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {userRole === 'user' 
                    ? ride.captainId?.fullName || 'Driver'
                    : ride.riderId?.fullName || 'Rider'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {userRole === 'user' 
                    ? ride.captainId?.mobile || 'Contact not available'
                    : ride.riderId?.mobile || 'Contact not available'
                  }
                </Typography>
                <Chip 
                  label={ride.status.toUpperCase()} 
                  color="success" 
                  size="small"
                  sx={{ mt: 0.5 }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                From
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {ride.pickup}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                To
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                {ride.drop}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip
                icon={<AccessTime />}
                label={`${ride.etaMinutes || '—'} min`}
                color="primary"
                variant="outlined"
              />
              <Chip
                icon={<AttachMoney />}
                label={`₹${ride.totalFare || '—'}`}
                color="secondary"
                variant="outlined"
              />
            </Box>

            {/* Driver Location */}
            {ride.captainId?.currentLocation && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Driver Location
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {ride.captainId.currentLocation.address || 'Location not available'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last updated: {ride.captainId.currentLocation.lastUpdated 
                    ? new Date(ride.captainId.currentLocation.lastUpdated).toLocaleTimeString()
                    : 'Just now'
                  }
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {userRole === 'user' 
            ? 'Your driver is on the way! You can track the ride in real-time.'
            : 'You have accepted this ride. Contact the rider for pickup details.'
          }
        </Typography>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ flex: 1 }}
        >
          View Details
        </Button>
        <Button
          variant="contained"
          color="success"
          startIcon={<Phone />}
          onClick={onCall}
          sx={{ flex: 1 }}
        >
          Call
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<Chat />}
          onClick={onChat}
          sx={{ flex: 1 }}
        >
          Chat
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RideNotification;
