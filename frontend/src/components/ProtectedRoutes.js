import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getActiveRide, getRideById } from "../services/api";

export default function ProtectedRoute({ children, role }) {
  const { auth } = useAuth();
  const token = auth?.token || null;
  const roles = auth?.roles || [];
  const location = useLocation();
  const [activeRideId, setActiveRideId] = useState(() => localStorage.getItem("activeRideId"));
  const isRider = roles.includes("rider");
  const isAdmin = roles.includes("admin");

  // On mount, check server if no local lock
  useEffect(() => {
    let mounted = true;
    const checkActive = async () => {
      try {
        if (!token) return;
        // If not a rider, ensure no lock persists and skip
        if (!isRider) {
          if (activeRideId) {
            localStorage.removeItem("activeRideId");
            if (mounted) setActiveRideId(null);
          }
          return;
        }
        // If we already have a local lock, verify it below in another effect
        if (activeRideId) return;
        const res = await getActiveRide();
        const ride = res.data?.ride;
        if (!ride) return;
        const status = String(ride.status || '').toLowerCase();
        const isActive = !["completed", "cancelled"].includes(status);
        if (mounted && res.data?.success && ride?._id && isActive) {
          localStorage.setItem("activeRideId", ride._id);
          setActiveRideId(ride._id);
        } else if (mounted && !isActive) {
          // Ensure lock is cleared when ride is no longer active
          localStorage.removeItem("activeRideId");
          setActiveRideId(null);
        }
      } catch (e) {
        // ignore fetch errors
      }
    };
    checkActive();
    return () => { mounted = false; };
  }, [token, activeRideId]);

  // Verify any existing local lock on navigation; clear it if ride is completed/cancelled
  useEffect(() => {
    let mounted = true;
    const verifyLock = async () => {
      try {
        // If not a rider, clear any residual lock and skip
        if (!isRider) {
          if (activeRideId) {
            localStorage.removeItem("activeRideId");
            if (mounted) setActiveRideId(null);
          }
          return;
        }
        const id = localStorage.getItem("activeRideId");
        // If localStorage no longer has a lock, ensure state reflects that
        if (!id) {
          if (mounted && activeRideId) setActiveRideId(null);
          return;
        }
        const res = await getRideById(id);
        const ride = res.data?.ride;
        const status = String(ride?.status || '').toLowerCase();
        const isActive = !["completed", "cancelled"].includes(status);
        // If ride no longer active or missing, clear lock
        if (mounted && (!ride || !res.data?.success || !isActive)) {
          // Clear lock if ride missing or no longer active
          localStorage.removeItem("activeRideId");
          setActiveRideId(null);
          return;
        }
        // If the current authenticated user is not associated to this ride, clear lock
        const currentUserId = auth?.user?._id;
        const riderId = ride?.riderId?._id || ride?.riderId;
        const captainId = ride?.captainId?._id || ride?.captainId;
        const belongsToUser = currentUserId && (String(currentUserId) === String(riderId) || String(currentUserId) === String(captainId));
        if (mounted && !belongsToUser) {
          localStorage.removeItem("activeRideId");
          setActiveRideId(null);
        }
      } catch (e) {
        // Clear lock on 401/404 or explicit backend errors so user isn't stuck
        const code = e?.response?.status;
        if ([401, 403, 404].includes(code)) {
          localStorage.removeItem("activeRideId");
          setActiveRideId(null);
        }
      }
    };
    verifyLock();
    return () => { mounted = false; };
  }, [location.pathname, activeRideId, isRider]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role && !roles.includes(role)) {
    // 🚀 If role mismatch, send them to correct dashboard
    // Fix: app has no /user-dashboard, send users to booking
    if (roles.includes("user")) return <Navigate to="/booking" replace />;
    if (roles.includes("rider")) return <Navigate to="/rider-dashboard" replace />;
    if (roles.includes("admin")) return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  // Rider active ride behavior: allow free navigation (no auto-redirect)
  // We keep the lock state for TripDetails, but do not force
  // riders into the trip page when they visit dashboard or booking.
  // This restores the plain rider dashboard experience.

  return children;
}
