import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Chip,
  Divider
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { useNotification } from "../contexts/NotificationContext";
import { getRideById, cancelRide } from "../services/api";
import CancelTripModal from "../components/CancelTripModal";
import RiderMobileMenu from "../components/RiderMobileMenu";

export default function TripDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const { showSuccess, showError } = useNotification();
  const [ride, setRide] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getRideById(id);
        if (res.data?.success) {
          const r = res.data.ride;
          setRide(r);
          const status = String(r?.status || '').toLowerCase();
          const isActive = !["completed", "cancelled"].includes(status);
          // Only riders should be hard-locked to active trips
          const isRider = Array.isArray(auth?.roles) && auth.roles.includes("rider");
          if (isRider && isActive) {
            localStorage.setItem("activeRideId", r?._id);
          } else {
            localStorage.removeItem("activeRideId");
          }
        }
      } catch (e) {
        showError("Failed to load trip details");
      }
    };
    load();
  }, [id, showError]);

  const handleCancel = async (reason) => {
    try {
      const res = await cancelRide(id, reason);
      if (res.data?.success) {
        showSuccess("Ride cancelled successfully");
        setCancelOpen(false);
        localStorage.removeItem("activeRideId");
        const role = auth?.roles?.[0] || "user";
        navigate(role === "rider" ? "/rider-dashboard" : "/booking", { replace: true });
      } else {
        showError(res.data?.message || "Failed to cancel ride");
      }
    } catch (e) {
      showError(e.response?.data?.message || "Failed to cancel ride");
    }
  };

  const statusText = String(ride?.status || 'unknown');
  const isActive = !["completed", "cancelled"].includes(statusText.toLowerCase());

  if (!ride) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ mt: 4, p: 3, borderRadius: 2 }}>
          <Typography>Loading trip details…</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <>
      {/* Mobile Menu for Riders */}
      {Array.isArray(auth?.roles) && auth.roles.includes("rider") && <RiderMobileMenu />}
      
      <Container maxWidth="md">
        <Paper sx={{ mt: 4, p: 3, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 2 }}>
          Trip Details
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Pickup</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{ride.pickup}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Drop</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{ride.drop}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Type: ${ride.rideType || '—'}`} />
          <Chip label={`Fare: ₹${ride.totalFare || '—'}`} color="secondary" />
          <Chip label={`Status: ${ride.status}`} color={isActive ? 'primary' : 'default'} />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Driver</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{ride.captainId?.fullName || '—'}</Typography>
            <Typography variant="body2">{ride.captainId?.mobile || ''}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Passenger</Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{ride.riderId?.fullName || '—'}</Typography>
            <Typography variant="body2">{ride.riderId?.mobile || ''}</Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button variant="outlined" color="error" onClick={() => setCancelOpen(true)} disabled={!isActive}>
            Cancel Trip
          </Button>
          <Button variant="contained" onClick={() => navigate((auth?.roles?.[0] || 'user') === 'rider' ? '/rider-dashboard' : '/booking')} disabled={isActive}>
            Back
          </Button>
        </Box>
      </Paper>

      <CancelTripModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
      />
    </Container>
    </>
  );
}