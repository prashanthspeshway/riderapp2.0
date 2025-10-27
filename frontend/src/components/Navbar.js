// src/components/Navbar.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Menu, 
  MenuItem, 
  Avatar,
  Box,
  Chip,
  Divider,
  ListItemIcon,
  ListItemText,
  Tooltip
} from "@mui/material";
import {
  DirectionsCar,
  Dashboard,
  History,
  Person,
  LocalShipping,
  Logout,
  Notifications,
  Settings
} from "@mui/icons-material";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const { token, roles } = auth || {};
  const role = roles[0] || null;
  const [anchorEl, setAnchorEl] = useState(null);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    const currentRole = role; // ✅ capture before logout
    logout();

    if (currentRole === "admin") navigate("/admin");
    else if (currentRole === "rider") navigate("/rider-login");
    else navigate("/login");

    handleMenuClose();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'error';
      case 'rider': return 'warning';
      case 'user': return 'primary';
      default: return 'default';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'rider': return 'Driver';
      case 'user': return 'User';
      default: return 'User';
    }
  };

  return (
    <AppBar 
      position="static" 
      sx={{ 
        background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
        boxShadow: '0 2px 12px rgba(76, 175, 80, 0.3)',
        height: 64,
        display: role === 'rider' ? { xs: 'none', md: 'block' } : 'block' // Hide on mobile only for riders
      }}
    >
      <Toolbar sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        px: { xs: 2, md: 3 },
        minHeight: '64px !important',
        height: '64px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 1
          }}>
            <DirectionsCar sx={{ fontSize: 24, color: 'white' }} />
          </Box>
          <Typography
            variant="h6"
            sx={{ 
              fontWeight: "bold", 
              cursor: "pointer",
              fontSize: { xs: '1.1rem', md: '1.25rem' },
              '&:hover': { opacity: 0.9 }
            }}
            onClick={() => {
              if (role === "rider") navigate("/rider-dashboard");
              else if (role === "user") navigate("/booking");
              else if (role === "admin") navigate("/admin-dashboard");
              else navigate("/");
            }}
          >
            RideShare
          </Typography>
        </Box>

        {token && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Chip
              label={getRoleLabel(role)}
              color={getRoleColor(role)}
              size="small"
              sx={{ 
                fontWeight: 'bold',
                fontSize: '0.75rem',
                height: 28,
                '& .MuiChip-label': {
                  px: 1.5
                }
              }}
            />
            
            <Tooltip title="Rider Profile Pic">
              <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
              {(() => {
                // Compute robust avatar source with multiple fallbacks
                const pic = auth?.user?.profilePicture;
                const docsPic = auth?.user?.documents?.profilePicture;
                const avatarSrc =
                  // string URL in profilePicture
                  (typeof pic === 'string' && pic) ||
                  // object with url field
                  (pic && pic.url) ||
                  // legacy profileImage field
                  auth?.user?.profileImage ||
                  // documents.profilePicture may be string or object
                  (docsPic && (typeof docsPic === 'string' ? docsPic : docsPic.url)) ||
                  null;

                const showInitial = !avatarSrc;

                return (
                  <Avatar 
                    src={avatarSrc || undefined}
                    sx={{ 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      width: 36,
                      height: 36,
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      border: '2px solid rgba(255,255,255,0.3)',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.3)',
                        transform: 'scale(1.05)'
                      }
                    }}
                    alt="Rider Profile Pic"
                    aria-label="Rider Profile Pic"
                  >
                    {showInitial && (auth?.user?.fullName?.charAt(0) || (role === "rider" ? "D" : role === "user" ? "R" : "A"))}
                  </Avatar>
                );
              })()}
              </IconButton>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{ 
                elevation: 12, 
                sx: { 
                  mt: 1.5, 
                  borderRadius: 3,
                  minWidth: 220,
                  border: '1px solid rgba(76, 175, 80, 0.1)',
                  '& .MuiMenuItem-root': {
                    px: 2,
                    py: 0.8,
                    fontSize: '0.9rem',
                    '&:hover': {
                      bgcolor: 'rgba(76, 175, 80, 0.08)'
                    }
                  }
                } 
              }}
            >
              <Box sx={{ 
                px: 2, 
                py: 1.5,
                bgcolor: 'rgba(76, 175, 80, 0.05)',
                borderBottom: '1px solid rgba(76, 175, 80, 0.1)'
              }}>
                <Typography variant="subtitle2" color="text.primary" sx={{ fontWeight: 'bold' }}>
                  {auth?.user?.fullName || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                  {auth?.user?.mobile || ''}
                </Typography>
              </Box>

              {role === "admin" && (
                <>
                  <MenuItem onClick={() => { navigate("/admin-dashboard"); handleMenuClose(); }}>
                    <ListItemIcon><Dashboard /></ListItemIcon>
                    <ListItemText>Dashboard</ListItemText>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                    <ListItemIcon><Logout /></ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </>
              )}

              {role === "user" && (
                <>
                  <MenuItem onClick={() => { navigate("/booking"); handleMenuClose(); }}>
                    <ListItemIcon><Dashboard /></ListItemIcon>
                    <ListItemText>Home</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { navigate("/booking"); handleMenuClose(); }}>
                    <ListItemIcon><DirectionsCar /></ListItemIcon>
                    <ListItemText>Book Ride</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { navigate("/history"); handleMenuClose(); }}>
                    <ListItemIcon><History /></ListItemIcon>
                    <ListItemText>Ride History</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { navigate("/parcel"); handleMenuClose(); }}>
                    <ListItemIcon><LocalShipping /></ListItemIcon>
                    <ListItemText>Parcel</ListItemText>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { navigate("/profile"); handleMenuClose(); }}>
                    <ListItemIcon><Person /></ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                    <ListItemIcon><Logout /></ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </>
              )}

              {role === "rider" && (
                <>
                  <MenuItem onClick={() => { navigate("/rider-dashboard"); handleMenuClose(); }}>
                    <ListItemIcon><Dashboard /></ListItemIcon>
                    <ListItemText>Dashboard</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={() => { navigate("/history"); handleMenuClose(); }}>
                    <ListItemIcon><History /></ListItemIcon>
                    <ListItemText>Ride History</ListItemText>
                  </MenuItem>
                  <Divider />
                  <MenuItem onClick={() => { navigate("/profile"); handleMenuClose(); }}>
                    <ListItemIcon><Person /></ListItemIcon>
                    <ListItemText>Profile</ListItemText>
                  </MenuItem>
                  <MenuItem onClick={handleLogout} sx={{ color: "error.main" }}>
                    <ListItemIcon><Logout /></ListItemIcon>
                    <ListItemText>Logout</ListItemText>
                  </MenuItem>
                </>
              )}
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
